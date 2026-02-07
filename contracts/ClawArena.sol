// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ClawArena
 * @dev On-chain betting and escrow for AI agent matches on Monad
 * Features:
 * - Match creation with agent wagers
 * - Spectator betting on match outcomes
 * - Automatic payout distribution
 * - Platform fee collection
 */
contract ClawArena is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public clawToken;
    address public oracle; // Backend that settles matches
    uint256 public platformFee = 250; // 2.5% (basis points)
    uint256 public constant FEE_DENOMINATOR = 10000;

    enum MatchStatus { Pending, Active, Settled, Cancelled }
    
    struct Match {
        bytes32 agent1Id;
        bytes32 agent2Id;
        address agent1Owner;
        address agent2Owner;
        uint256 wagerAmount;
        uint256 agent1Pool;   // Total bets on agent 1
        uint256 agent2Pool;   // Total bets on agent 2
        MatchStatus status;
        bytes32 winnerId;
        uint256 createdAt;
        uint256 settledAt;
    }
    
    struct Bet {
        address bettor;
        bytes32 matchId;
        bytes32 predictedWinner;
        uint256 amount;
        bool claimed;
    }

    mapping(bytes32 => Match) public matches;
    mapping(bytes32 => Bet[]) public matchBets;
    mapping(address => bytes32[]) public userBets;
    
    uint256 public totalMatches;
    uint256 public totalVolume;
    uint256 public collectedFees;

    event MatchCreated(
        bytes32 indexed matchId,
        bytes32 agent1Id,
        bytes32 agent2Id,
        uint256 wagerAmount
    );
    
    event MatchStarted(bytes32 indexed matchId);
    
    event BetPlaced(
        bytes32 indexed matchId,
        address indexed bettor,
        bytes32 predictedWinner,
        uint256 amount
    );
    
    event MatchSettled(
        bytes32 indexed matchId,
        bytes32 winnerId,
        uint256 totalPot
    );
    
    event WinningsClaimed(
        address indexed user,
        bytes32 indexed matchId,
        uint256 amount
    );
    
    event MatchCancelled(bytes32 indexed matchId);

    modifier onlyOracle() {
        require(msg.sender == oracle, "Only oracle can call");
        _;
    }

    constructor(address _clawToken) Ownable(msg.sender) {
        clawToken = IERC20(_clawToken);
        oracle = msg.sender;
    }

    /**
     * @dev Create a new match between two agents
     * @param agent1Id Off-chain UUID of agent 1 (as bytes32)
     * @param agent2Id Off-chain UUID of agent 2 (as bytes32)
     * @param wagerAmount Amount each agent owner wagers
     */
    function createMatch(
        bytes32 agent1Id,
        bytes32 agent2Id,
        uint256 wagerAmount
    ) external nonReentrant returns (bytes32 matchId) {
        require(wagerAmount > 0, "Wager must be > 0");
        require(agent1Id != agent2Id, "Agents must be different");
        
        // Transfer wager from creator
        clawToken.safeTransferFrom(msg.sender, address(this), wagerAmount);
        
        matchId = keccak256(abi.encodePacked(
            agent1Id,
            agent2Id,
            block.timestamp,
            totalMatches
        ));
        
        matches[matchId] = Match({
            agent1Id: agent1Id,
            agent2Id: agent2Id,
            agent1Owner: msg.sender,
            agent2Owner: address(0), // Set when agent2 owner joins
            wagerAmount: wagerAmount,
            agent1Pool: 0,
            agent2Pool: 0,
            status: MatchStatus.Pending,
            winnerId: bytes32(0),
            createdAt: block.timestamp,
            settledAt: 0
        });
        
        totalMatches++;
        
        emit MatchCreated(matchId, agent1Id, agent2Id, wagerAmount);
    }

    /**
     * @dev Agent 2 owner joins and deposits matching wager
     */
    function joinMatch(bytes32 matchId) external nonReentrant {
        Match storage m = matches[matchId];
        require(m.status == MatchStatus.Pending, "Match not pending");
        require(m.agent2Owner == address(0), "Already joined");
        require(msg.sender != m.agent1Owner, "Cannot join own match");
        
        clawToken.safeTransferFrom(msg.sender, address(this), m.wagerAmount);
        m.agent2Owner = msg.sender;
        
        emit MatchStarted(matchId);
    }

    /**
     * @dev Oracle starts the match (enables betting)
     */
    function startMatch(bytes32 matchId) external onlyOracle {
        Match storage m = matches[matchId];
        require(m.status == MatchStatus.Pending, "Match not pending");
        require(m.agent2Owner != address(0), "Agent 2 not joined");
        
        m.status = MatchStatus.Active;
        emit MatchStarted(matchId);
    }

    /**
     * @dev Place a bet on a match outcome
     * @param matchId The match to bet on
     * @param predictedWinner Agent ID predicted to win
     * @param amount Bet amount in CLAW
     */
    function placeBet(
        bytes32 matchId,
        bytes32 predictedWinner,
        uint256 amount
    ) external nonReentrant {
        Match storage m = matches[matchId];
        require(m.status == MatchStatus.Active, "Betting not open");
        require(amount > 0, "Amount must be > 0");
        require(
            predictedWinner == m.agent1Id || predictedWinner == m.agent2Id,
            "Invalid winner"
        );
        
        clawToken.safeTransferFrom(msg.sender, address(this), amount);
        
        if (predictedWinner == m.agent1Id) {
            m.agent1Pool += amount;
        } else {
            m.agent2Pool += amount;
        }
        
        matchBets[matchId].push(Bet({
            bettor: msg.sender,
            matchId: matchId,
            predictedWinner: predictedWinner,
            amount: amount,
            claimed: false
        }));
        
        userBets[msg.sender].push(matchId);
        totalVolume += amount;
        
        emit BetPlaced(matchId, msg.sender, predictedWinner, amount);
    }

    /**
     * @dev Oracle settles match with winner
     * @param matchId The match to settle
     * @param winnerId The winning agent's ID
     */
    function settleMatch(
        bytes32 matchId,
        bytes32 winnerId
    ) external onlyOracle nonReentrant {
        Match storage m = matches[matchId];
        require(m.status == MatchStatus.Active, "Match not active");
        require(
            winnerId == m.agent1Id || winnerId == m.agent2Id,
            "Invalid winner"
        );
        
        m.status = MatchStatus.Settled;
        m.winnerId = winnerId;
        m.settledAt = block.timestamp;
        
        // Calculate total pot (wagers + all bets)
        uint256 totalPot = (m.wagerAmount * 2) + m.agent1Pool + m.agent2Pool;
        
        // Platform fee
        uint256 fee = (totalPot * platformFee) / FEE_DENOMINATOR;
        collectedFees += fee;
        
        // Winner owner gets their wager back + loser's wager (minus fee on that portion)
        address winnerOwner = winnerId == m.agent1Id ? m.agent1Owner : m.agent2Owner;
        uint256 ownerPayout = m.wagerAmount * 2;
        uint256 ownerFee = (m.wagerAmount * platformFee) / FEE_DENOMINATOR;
        clawToken.safeTransfer(winnerOwner, ownerPayout - ownerFee);
        
        emit MatchSettled(matchId, winnerId, totalPot);
    }

    /**
     * @dev Claim winnings from a settled match
     */
    function claimWinnings(bytes32 matchId, uint256 betIndex) external nonReentrant {
        Match storage m = matches[matchId];
        require(m.status == MatchStatus.Settled, "Match not settled");
        
        Bet storage bet = matchBets[matchId][betIndex];
        require(bet.bettor == msg.sender, "Not your bet");
        require(!bet.claimed, "Already claimed");
        require(bet.predictedWinner == m.winnerId, "Bet lost");
        
        bet.claimed = true;
        
        // Calculate proportional share of losing pool
        uint256 winningPool = m.winnerId == m.agent1Id ? m.agent1Pool : m.agent2Pool;
        uint256 losingPool = m.winnerId == m.agent1Id ? m.agent2Pool : m.agent1Pool;
        
        // Payout = original bet + proportional share of losing pool
        uint256 share = (bet.amount * losingPool) / winningPool;
        uint256 totalPayout = bet.amount + share;
        
        // Deduct platform fee
        uint256 fee = (share * platformFee) / FEE_DENOMINATOR;
        uint256 netPayout = totalPayout - fee;
        
        clawToken.safeTransfer(msg.sender, netPayout);
        
        emit WinningsClaimed(msg.sender, matchId, netPayout);
    }

    /**
     * @dev Cancel a pending match (refunds wager)
     */
    function cancelMatch(bytes32 matchId) external {
        Match storage m = matches[matchId];
        require(m.status == MatchStatus.Pending, "Cannot cancel");
        require(
            msg.sender == m.agent1Owner || msg.sender == oracle,
            "Not authorized"
        );
        
        m.status = MatchStatus.Cancelled;
        
        // Refund wagers
        clawToken.safeTransfer(m.agent1Owner, m.wagerAmount);
        if (m.agent2Owner != address(0)) {
            clawToken.safeTransfer(m.agent2Owner, m.wagerAmount);
        }
        
        emit MatchCancelled(matchId);
    }

    // ============ View Functions ============

    /**
     * @dev Get current odds for a match (as percentages)
     */
    function getOdds(bytes32 matchId) external view returns (
        uint256 agent1Odds,
        uint256 agent2Odds
    ) {
        Match storage m = matches[matchId];
        uint256 total = m.agent1Pool + m.agent2Pool;
        
        if (total == 0) {
            return (50, 50); // Even odds if no bets
        }
        
        agent1Odds = (m.agent1Pool * 100) / total;
        agent2Odds = (m.agent2Pool * 100) / total;
    }

    /**
     * @dev Get potential payout for a bet
     */
    function getPotentialPayout(
        bytes32 matchId,
        bytes32 predictedWinner,
        uint256 amount
    ) external view returns (uint256) {
        Match storage m = matches[matchId];
        
        uint256 winningPool = predictedWinner == m.agent1Id 
            ? m.agent1Pool + amount 
            : m.agent2Pool + amount;
        uint256 losingPool = predictedWinner == m.agent1Id 
            ? m.agent2Pool 
            : m.agent1Pool;
        
        if (winningPool == 0) return amount;
        
        uint256 share = (amount * losingPool) / winningPool;
        uint256 gross = amount + share;
        uint256 fee = (share * platformFee) / FEE_DENOMINATOR;
        
        return gross - fee;
    }

    /**
     * @dev Get all bets for a match
     */
    function getMatchBets(bytes32 matchId) external view returns (Bet[] memory) {
        return matchBets[matchId];
    }

    /**
     * @dev Get match details
     */
    function getMatch(bytes32 matchId) external view returns (Match memory) {
        return matches[matchId];
    }

    // ============ Admin Functions ============

    function setOracle(address _oracle) external onlyOwner {
        oracle = _oracle;
    }

    function setPlatformFee(uint256 _fee) external onlyOwner {
        require(_fee <= 1000, "Max 10%");
        platformFee = _fee;
    }

    function withdrawFees(address to) external onlyOwner {
        uint256 amount = collectedFees;
        collectedFees = 0;
        clawToken.safeTransfer(to, amount);
    }
}
