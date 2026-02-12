// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title AgentVault
 * @dev Holds user USDC deposits for AI trading agents
 * 
 * Features:
 * - Users deposit USDC to fund their agents
 * - Tracks per-user, per-agent balances
 * - Operator (backend) can simulate trades and update balances
 * - Users can withdraw their funds anytime
 * - Profits come from VaultB (profit pool)
 * 
 * Deployment Steps:
 * 1. Deploy TestUSDC first
 * 2. Deploy AgentVault with USDC address
 * 3. Deploy VaultB with USDC and AgentVault addresses
 * 4. Call setVaultB() on AgentVault with VaultB address
 * 5. Set operator address for backend
 */
contract AgentVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    address public vaultB; // Profit distribution vault
    address public operator; // Backend operator

    // User balances: user => agent => balance
    mapping(address => mapping(bytes32 => uint256)) public userAgentBalances;
    
    // Total balance per agent (sum of all user deposits)
    mapping(bytes32 => uint256) public agentTotalBalances;
    
    // User's list of agents
    mapping(address => bytes32[]) public userAgents;
    mapping(address => mapping(bytes32 => bool)) public userHasAgent;

    // Platform fee (1%)
    uint256 public platformFee = 100; // 1% = 100 basis points
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public collectedFees;

    // Events
    event Deposited(address indexed user, bytes32 indexed agentId, uint256 amount);
    event Withdrawn(address indexed user, bytes32 indexed agentId, uint256 amount);
    event ProfitDistributed(address indexed user, bytes32 indexed agentId, uint256 amount);
    event TradeSimulated(bytes32 indexed agentId, int256 pnl, uint256 newBalance);
    event OperatorUpdated(address indexed newOperator);
    event VaultBUpdated(address indexed newVaultB);

    modifier onlyOperator() {
        require(msg.sender == operator || msg.sender == owner(), "Not authorized");
        _;
    }

    constructor(address _usdc) {
        require(_usdc != address(0), "Invalid USDC address");
        usdc = IERC20(_usdc);
        operator = msg.sender;
    }

    /**
     * @dev Deposit USDC for an agent
     * @param agentId The off-chain agent UUID (as bytes32)
     * @param amount Amount of USDC to deposit (6 decimals)
     */
    function deposit(bytes32 agentId, uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        
        userAgentBalances[msg.sender][agentId] += amount;
        agentTotalBalances[agentId] += amount;
        
        // Track user's agents
        if (!userHasAgent[msg.sender][agentId]) {
            userAgents[msg.sender].push(agentId);
            userHasAgent[msg.sender][agentId] = true;
        }
        
        emit Deposited(msg.sender, agentId, amount);
    }

    /**
     * @dev Withdraw USDC from an agent
     * @param agentId The agent to withdraw from
     * @param amount Amount to withdraw
     */
    function withdraw(bytes32 agentId, uint256 amount) external nonReentrant {
        require(userAgentBalances[msg.sender][agentId] >= amount, "Insufficient balance");
        
        userAgentBalances[msg.sender][agentId] -= amount;
        agentTotalBalances[agentId] -= amount;
        
        usdc.safeTransfer(msg.sender, amount);
        
        emit Withdrawn(msg.sender, agentId, amount);
    }

    /**
     * @dev Simulate trade result for an agent (operator only)
     * Updates balances based on simulated P&L
     * Positive P&L pulls from VaultB, negative P&L stays in vault
     */
    function simulateTrade(
        bytes32 agentId,
        address user,
        int256 pnl
    ) external onlyOperator nonReentrant {
        uint256 currentBalance = userAgentBalances[user][agentId];
        require(currentBalance > 0, "No balance");
        
        if (pnl > 0) {
            // Profit - pull from VaultB
            uint256 profit = uint256(pnl);
            require(vaultB != address(0), "VaultB not set");
            
            // Take platform fee from profit
            uint256 fee = (profit * platformFee) / FEE_DENOMINATOR;
            collectedFees += fee;
            uint256 netProfit = profit - fee;
            
            // Request profit from VaultB
            IVaultB(vaultB).distributeProfitTo(user, agentId, netProfit);
            
            userAgentBalances[user][agentId] += netProfit;
            agentTotalBalances[agentId] += netProfit;
            
            emit ProfitDistributed(user, agentId, netProfit);
        } else if (pnl < 0) {
            // Loss - reduce balance (capped at current balance)
            uint256 loss = uint256(-pnl);
            if (loss > currentBalance) {
                loss = currentBalance;
            }
            
            userAgentBalances[user][agentId] -= loss;
            agentTotalBalances[agentId] -= loss;
            
            // Lost funds stay in vault as liquidity
        }
        
        emit TradeSimulated(agentId, pnl, userAgentBalances[user][agentId]);
    }

    // ============ View Functions ============

    function getUserAgentBalance(address user, bytes32 agentId) external view returns (uint256) {
        return userAgentBalances[user][agentId];
    }

    function getUserAgents(address user) external view returns (bytes32[] memory) {
        return userAgents[user];
    }

    function getAgentTotalBalance(bytes32 agentId) external view returns (uint256) {
        return agentTotalBalances[agentId];
    }

    // ============ Admin Functions ============

    function setOperator(address _operator) external onlyOwner {
        operator = _operator;
        emit OperatorUpdated(_operator);
    }

    function setVaultB(address _vaultB) external onlyOwner {
        vaultB = _vaultB;
        emit VaultBUpdated(_vaultB);
    }

    function setPlatformFee(uint256 _fee) external onlyOwner {
        require(_fee <= 500, "Max 5%");
        platformFee = _fee;
    }

    function withdrawFees() external onlyOwner {
        uint256 amount = collectedFees;
        collectedFees = 0;
        usdc.safeTransfer(owner(), amount);
    }
}

interface IVaultB {
    function distributeProfitTo(address user, bytes32 agentId, uint256 amount) external;
}
