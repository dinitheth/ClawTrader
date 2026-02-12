// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BettingEscrow
 * @dev Parimutuel betting escrow for esports matches using CLAW tokens
 * 
 * Flow:
 * 1. Owner creates a match (two teams)
 * 2. Users approve CLAW → call placeBet() to bet on a team
 * 3. Owner calls settleMatch(winnerTeamId) after match ends
 * 4. Winners receive proportional share of the pool automatically
 * 5. 5% platform fee stays in the contract
 * 6. Loser funds are distributed to winners (minus fee)
 *
 * Payout formula:
 *   totalPool = teamA_total + teamB_total
 *   fee = totalPool * 5%
 *   winnerPool = totalPool - fee
 *   payout(user) = (user_bet / winning_team_total) * winnerPool
 */
contract BettingEscrow is Ownable, ReentrancyGuard {
    IERC20 public immutable claw;

    uint256 public constant FEE_BPS = 500; // 5% = 500 basis points
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public accumulatedFees;

    // ── Match data ──────────────────────────────────────────────
    struct Match {
        uint256 teamAId;
        uint256 teamBId;
        uint256 teamATotal;
        uint256 teamBTotal;
        uint256 winnerTeamId;
        bool settled;
        bool cancelled;
        bool exists;
    }

    struct Bet {
        address bettor;
        uint256 teamId;
        uint256 amount;
        bool paid; // true after settlement payout or refund
    }

    // matchId → Match
    mapping(uint256 => Match) public matches;
    // matchId → array of Bets
    mapping(uint256 => Bet[]) public bets;
    // matchId → bettor address → total amount bet
    mapping(uint256 => mapping(address => uint256)) public userBetAmount;
    // matchId → bettor address → teamId they bet on
    mapping(uint256 => mapping(address => uint256)) public userBetTeam;

    // Track all match IDs
    uint256[] public matchIds;

    // ── Events ──────────────────────────────────────────────────
    event MatchCreated(uint256 indexed matchId, uint256 teamAId, uint256 teamBId);
    event BetPlaced(uint256 indexed matchId, address indexed bettor, uint256 teamId, uint256 amount);
    event MatchSettled(uint256 indexed matchId, uint256 winnerTeamId, uint256 totalPool, uint256 fee);
    event WinnerPaid(uint256 indexed matchId, address indexed winner, uint256 payout);
    event MatchCancelled(uint256 indexed matchId);
    event BetRefunded(uint256 indexed matchId, address indexed bettor, uint256 amount);
    event FeesWithdrawn(address indexed owner, uint256 amount);

    constructor(address _claw) Ownable(msg.sender) {
        claw = IERC20(_claw);
    }

    // ── Owner: Create Match ─────────────────────────────────────
    function createMatch(
        uint256 matchId,
        uint256 teamAId,
        uint256 teamBId
    ) external onlyOwner {
        require(!matches[matchId].exists, "Match already exists");
        require(teamAId != teamBId, "Teams must be different");

        matches[matchId] = Match({
            teamAId: teamAId,
            teamBId: teamBId,
            teamATotal: 0,
            teamBTotal: 0,
            winnerTeamId: 0,
            settled: false,
            cancelled: false,
            exists: true
        });

        matchIds.push(matchId);
        emit MatchCreated(matchId, teamAId, teamBId);
    }

    // ── User: Place Bet ─────────────────────────────────────────
    // Auto-creates the match on-chain if it doesn't exist yet.
    // teamAId / teamBId are used only for the first bet that creates the match.
    function placeBet(
        uint256 matchId,
        uint256 teamAId,
        uint256 teamBId,
        uint256 teamId,
        uint256 amount
    ) external nonReentrant {
        // Auto-create match if it doesn't exist
        if (!matches[matchId].exists) {
            require(teamAId != teamBId, "Teams must be different");
            require(teamId == teamAId || teamId == teamBId, "Invalid team");
            matches[matchId] = Match({
                teamAId: teamAId,
                teamBId: teamBId,
                teamATotal: 0,
                teamBTotal: 0,
                winnerTeamId: 0,
                settled: false,
                cancelled: false,
                exists: true
            });
            matchIds.push(matchId);
            emit MatchCreated(matchId, teamAId, teamBId);
        }

        Match storage m = matches[matchId];
        require(!m.settled, "Match already settled");
        require(!m.cancelled, "Match was cancelled");
        require(amount > 0, "Amount must be > 0");
        require(
            teamId == m.teamAId || teamId == m.teamBId,
            "Invalid team for this match"
        );

        // If user already bet on this match, must bet on same team
        if (userBetAmount[matchId][msg.sender] > 0) {
            require(
                userBetTeam[matchId][msg.sender] == teamId,
                "Cannot bet on both teams"
            );
        }

        // Pull CLAW from user
        require(
            claw.transferFrom(msg.sender, address(this), amount),
            "CLAW transfer failed"
        );

        // Record bet
        bets[matchId].push(Bet({
            bettor: msg.sender,
            teamId: teamId,
            amount: amount,
            paid: false
        }));

        // Update totals
        if (teamId == m.teamAId) {
            m.teamATotal += amount;
        } else {
            m.teamBTotal += amount;
        }

        userBetAmount[matchId][msg.sender] += amount;
        userBetTeam[matchId][msg.sender] = teamId;

        emit BetPlaced(matchId, msg.sender, teamId, amount);
    }

    // ── Owner: Settle Match ─────────────────────────────────────
    function settleMatch(
        uint256 matchId,
        uint256 winnerTeamId
    ) external onlyOwner nonReentrant {
        Match storage m = matches[matchId];
        require(m.exists, "Match does not exist");
        require(!m.settled, "Already settled");
        require(!m.cancelled, "Match was cancelled");
        require(
            winnerTeamId == m.teamAId || winnerTeamId == m.teamBId,
            "Invalid winner team"
        );

        m.settled = true;
        m.winnerTeamId = winnerTeamId;

        uint256 totalPool = m.teamATotal + m.teamBTotal;

        // If no bets on one side, refund the other side
        uint256 winningTotal = winnerTeamId == m.teamAId ? m.teamATotal : m.teamBTotal;

        if (totalPool == 0) {
            emit MatchSettled(matchId, winnerTeamId, 0, 0);
            return;
        }

        // If nobody bet on the losing team, refund winners (no profit possible)
        uint256 losingTotal = totalPool - winningTotal;
        if (losingTotal == 0) {
            // Refund all bets — no losers to profit from
            _refundAllBets(matchId);
            emit MatchSettled(matchId, winnerTeamId, totalPool, 0);
            return;
        }

        // Calculate fee
        uint256 fee = (totalPool * FEE_BPS) / BPS_DENOMINATOR;
        uint256 winnerPool = totalPool - fee;
        accumulatedFees += fee;

        // Distribute to winners
        Bet[] storage matchBets = bets[matchId];
        for (uint256 i = 0; i < matchBets.length; i++) {
            if (matchBets[i].teamId == winnerTeamId && !matchBets[i].paid) {
                matchBets[i].paid = true;
                // payout = (user_bet / winning_total) * winnerPool
                uint256 payout = (matchBets[i].amount * winnerPool) / winningTotal;
                if (payout > 0) {
                    claw.transfer(matchBets[i].bettor, payout);
                    emit WinnerPaid(matchId, matchBets[i].bettor, payout);
                }
            }
        }

        emit MatchSettled(matchId, winnerTeamId, totalPool, fee);
    }

    // ── Owner: Cancel Match (refund everyone) ───────────────────
    function cancelMatch(uint256 matchId) external onlyOwner nonReentrant {
        Match storage m = matches[matchId];
        require(m.exists, "Match does not exist");
        require(!m.settled, "Already settled");
        require(!m.cancelled, "Already cancelled");

        m.cancelled = true;
        _refundAllBets(matchId);
        emit MatchCancelled(matchId);
    }

    // ── Owner: Withdraw Accumulated Fees ────────────────────────
    function withdrawFees() external onlyOwner {
        uint256 amount = accumulatedFees;
        require(amount > 0, "No fees to withdraw");
        accumulatedFees = 0;
        require(claw.transfer(owner(), amount), "Fee withdrawal failed");
        emit FeesWithdrawn(owner(), amount);
    }

    // ── View Functions ──────────────────────────────────────────

    function getMatch(uint256 matchId) external view returns (
        uint256 teamAId,
        uint256 teamBId,
        uint256 teamATotal,
        uint256 teamBTotal,
        uint256 winnerTeamId,
        bool settled,
        bool cancelled
    ) {
        Match storage m = matches[matchId];
        return (m.teamAId, m.teamBId, m.teamATotal, m.teamBTotal, m.winnerTeamId, m.settled, m.cancelled);
    }

    function getBetCount(uint256 matchId) external view returns (uint256) {
        return bets[matchId].length;
    }

    function getUserBet(uint256 matchId, address user) external view returns (
        uint256 teamId,
        uint256 amount
    ) {
        return (userBetTeam[matchId][user], userBetAmount[matchId][user]);
    }

    function getMatchCount() external view returns (uint256) {
        return matchIds.length;
    }

    function getTotalPool(uint256 matchId) external view returns (uint256) {
        Match storage m = matches[matchId];
        return m.teamATotal + m.teamBTotal;
    }

    // ── Internal ────────────────────────────────────────────────
    function _refundAllBets(uint256 matchId) internal {
        Bet[] storage matchBets = bets[matchId];
        for (uint256 i = 0; i < matchBets.length; i++) {
            if (!matchBets[i].paid) {
                matchBets[i].paid = true;
                claw.transfer(matchBets[i].bettor, matchBets[i].amount);
                emit BetRefunded(matchId, matchBets[i].bettor, matchBets[i].amount);
            }
        }
    }
}
