// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ISimpleDEX
 * @dev Interface for SimpleDEX trading functions
 */
interface ISimpleDEX {
    function buyToken(address tokenOut, uint256 amountIn, uint256 minAmountOut) external returns (uint256 amountOut);
    function sellToken(address tokenIn, uint256 amountIn, uint256 minAmountOut) external returns (uint256 amountOut);
    function getBuyQuote(address tokenOut, uint256 amountIn) external view returns (uint256 amountOut, uint256 fee);
    function getSellQuote(address tokenIn, uint256 amountIn) external view returns (uint256 amountOut, uint256 fee);
}

/**
 * @title AgentVaultV2
 * @dev Holds user USDC deposits for AI trading agents with REAL on-chain trading and PnL tracking
 */
contract AgentVaultV2 is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    address public simpleDex;
    address public operator;

    // USDC balances: user => agent => balance
    mapping(address => mapping(bytes32 => uint256)) public userAgentBalances;
    
    // Token holdings: user => agent => token => amount
    mapping(address => mapping(bytes32 => mapping(address => uint256))) public userAgentTokens;
    
    // ============ PnL TRACKING ============
    
    // Cost basis: user => agent => token => total USDC spent (for calculating avg cost)
    mapping(address => mapping(bytes32 => mapping(address => uint256))) public tokenCostBasis;
    
    // Realized PnL: user => agent => cumulative realized profit/loss in USDC (scaled by 1e6)
    mapping(address => mapping(bytes32 => int256)) public realizedPnL;
    
    // Total deposited: user => agent => total USDC ever deposited
    mapping(address => mapping(bytes32 => uint256)) public totalDeposited;
    
    // Total withdrawn: user => agent => total USDC ever withdrawn
    mapping(address => mapping(bytes32 => uint256)) public totalWithdrawn;
    
    // ============ END PnL TRACKING ============
    
    // Total USDC balance per agent
    mapping(bytes32 => uint256) public agentTotalBalances;
    
    // User's list of agents
    mapping(address => bytes32[]) public userAgents;
    mapping(address => mapping(bytes32 => bool)) public userHasAgent;

    // Supported tokens for trading
    mapping(address => bool) public supportedTokens;
    address[] public tokenList;

    // Platform fee (1%)
    uint256 public platformFee = 100;
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public collectedFees;

    // Events
    event Deposited(address indexed user, bytes32 indexed agentId, uint256 amount);
    event Withdrawn(address indexed user, bytes32 indexed agentId, uint256 amount);
    event TokenWithdrawn(address indexed user, bytes32 indexed agentId, address token, uint256 amount);
    event TradeBuy(address indexed user, bytes32 indexed agentId, address token, uint256 usdcIn, uint256 tokensOut, uint256 avgCost);
    event TradeSell(address indexed user, bytes32 indexed agentId, address token, uint256 tokensIn, uint256 usdcOut, int256 pnl);
    event OperatorUpdated(address indexed newOperator);
    event SimpleDexUpdated(address indexed newDex);
    event TokenAdded(address indexed token);

    modifier onlyOperator() {
        require(msg.sender == operator || msg.sender == owner(), "Not authorized");
        _;
    }

    constructor(address _usdc, address _simpleDex) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        usdc = IERC20(_usdc);
        simpleDex = _simpleDex;
        operator = msg.sender;
    }

    // ============ User Functions ============

    function deposit(bytes32 agentId, uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        
        userAgentBalances[msg.sender][agentId] += amount;
        agentTotalBalances[agentId] += amount;
        totalDeposited[msg.sender][agentId] += amount;
        
        if (!userHasAgent[msg.sender][agentId]) {
            userAgents[msg.sender].push(agentId);
            userHasAgent[msg.sender][agentId] = true;
        }
        
        emit Deposited(msg.sender, agentId, amount);
    }

    function withdraw(bytes32 agentId, uint256 amount) external nonReentrant {
        require(userAgentBalances[msg.sender][agentId] >= amount, "Insufficient balance");
        
        userAgentBalances[msg.sender][agentId] -= amount;
        agentTotalBalances[agentId] -= amount;
        totalWithdrawn[msg.sender][agentId] += amount;
        
        usdc.safeTransfer(msg.sender, amount);
        
        emit Withdrawn(msg.sender, agentId, amount);
    }

    function withdrawToken(bytes32 agentId, address token, uint256 amount) external nonReentrant {
        require(supportedTokens[token], "Token not supported");
        require(userAgentTokens[msg.sender][agentId][token] >= amount, "Insufficient token balance");
        
        userAgentTokens[msg.sender][agentId][token] -= amount;
        
        // Reduce cost basis proportionally
        uint256 totalTokens = userAgentTokens[msg.sender][agentId][token] + amount;
        if (totalTokens > 0) {
            uint256 proportionalCost = (tokenCostBasis[msg.sender][agentId][token] * amount) / totalTokens;
            tokenCostBasis[msg.sender][agentId][token] -= proportionalCost;
        }
        
        IERC20(token).safeTransfer(msg.sender, amount);
        
        emit TokenWithdrawn(msg.sender, agentId, token, amount);
    }

    // ============ Trading Functions (Operator Only) ============

    function executeBuy(
        bytes32 agentId,
        address user,
        address token,
        uint256 usdcAmount,
        uint256 minTokensOut
    ) external onlyOperator nonReentrant returns (uint256 tokensReceived) {
        require(simpleDex != address(0), "SimpleDEX not set");
        require(supportedTokens[token], "Token not supported");
        require(userAgentBalances[user][agentId] >= usdcAmount, "Insufficient USDC balance");
        
        // Take platform fee
        uint256 fee = (usdcAmount * platformFee) / FEE_DENOMINATOR;
        collectedFees += fee;
        uint256 tradeAmount = usdcAmount - fee;
        
        // Deduct USDC from agent balance
        userAgentBalances[user][agentId] -= usdcAmount;
        agentTotalBalances[agentId] -= usdcAmount;
        
        // Approve SimpleDEX to spend USDC
        usdc.forceApprove(simpleDex, tradeAmount);
        
        // Execute buy on SimpleDEX
        tokensReceived = ISimpleDEX(simpleDex).buyToken(token, tradeAmount, minTokensOut);
        
        // Add tokens to agent holdings
        userAgentTokens[user][agentId][token] += tokensReceived;
        
        // Track cost basis (USDC spent on this token)
        tokenCostBasis[user][agentId][token] += tradeAmount;
        
        // Calculate new average cost
        uint256 avgCost = getAverageCost(user, agentId, token);
        
        emit TradeBuy(user, agentId, token, usdcAmount, tokensReceived, avgCost);
    }

    function executeSell(
        bytes32 agentId,
        address user,
        address token,
        uint256 tokenAmount,
        uint256 minUsdcOut
    ) external onlyOperator nonReentrant returns (uint256 usdcReceived) {
        require(simpleDex != address(0), "SimpleDEX not set");
        require(supportedTokens[token], "Token not supported");
        require(userAgentTokens[user][agentId][token] >= tokenAmount, "Insufficient token balance");
        
        uint256 totalTokensBefore = userAgentTokens[user][agentId][token];
        uint256 costBasisBefore = tokenCostBasis[user][agentId][token];
        
        // Calculate proportional cost basis for this sale
        uint256 proportionalCostBasis = (costBasisBefore * tokenAmount) / totalTokensBefore;
        
        // Deduct tokens from agent holdings
        userAgentTokens[user][agentId][token] -= tokenAmount;
        
        // Reduce cost basis proportionally
        tokenCostBasis[user][agentId][token] -= proportionalCostBasis;
        
        // Approve SimpleDEX to spend tokens
        IERC20(token).forceApprove(simpleDex, tokenAmount);
        
        // Execute sell on SimpleDEX
        usdcReceived = ISimpleDEX(simpleDex).sellToken(token, tokenAmount, minUsdcOut);
        
        // Take platform fee
        uint256 fee = (usdcReceived * platformFee) / FEE_DENOMINATOR;
        collectedFees += fee;
        uint256 netUsdc = usdcReceived - fee;
        
        // Calculate realized PnL for this trade
        int256 tradePnL = int256(netUsdc) - int256(proportionalCostBasis);
        realizedPnL[user][agentId] += tradePnL;
        
        // Add USDC to agent balance
        userAgentBalances[user][agentId] += netUsdc;
        agentTotalBalances[agentId] += netUsdc;
        
        emit TradeSell(user, agentId, token, tokenAmount, netUsdc, tradePnL);
    }

    // ============ PnL View Functions ============

    /**
     * @dev Get average cost per token (in USDC with 6 decimals)
     */
    function getAverageCost(address user, bytes32 agentId, address token) public view returns (uint256) {
        uint256 tokenBalance = userAgentTokens[user][agentId][token];
        if (tokenBalance == 0) return 0;
        
        uint256 costBasis = tokenCostBasis[user][agentId][token];
        // Return average cost with 18 decimal precision (token has 18 decimals, USDC has 6)
        return (costBasis * 1e18) / tokenBalance;
    }

    /**
     * @dev Get current value of token position in USDC
     */
    function getTokenPositionValue(address user, bytes32 agentId, address token) public view returns (uint256) {
        uint256 tokenBalance = userAgentTokens[user][agentId][token];
        if (tokenBalance == 0 || simpleDex == address(0)) return 0;
        
        (uint256 usdcValue, ) = ISimpleDEX(simpleDex).getSellQuote(token, tokenBalance);
        return usdcValue;
    }

    /**
     * @dev Get unrealized PnL for a specific token position
     */
    function getUnrealizedPnL(address user, bytes32 agentId, address token) public view returns (int256) {
        uint256 tokenBalance = userAgentTokens[user][agentId][token];
        if (tokenBalance == 0) return 0;
        
        uint256 currentValue = getTokenPositionValue(user, agentId, token);
        uint256 costBasis = tokenCostBasis[user][agentId][token];
        
        return int256(currentValue) - int256(costBasis);
    }

    /**
     * @dev Get total unrealized PnL across all token positions
     */
    function getTotalUnrealizedPnL(address user, bytes32 agentId) public view returns (int256 totalUnrealized) {
        for (uint256 i = 0; i < tokenList.length; i++) {
            totalUnrealized += getUnrealizedPnL(user, agentId, tokenList[i]);
        }
    }

    /**
     * @dev Get total PnL (realized + unrealized)
     */
    function getTotalPnL(address user, bytes32 agentId) external view returns (int256) {
        return realizedPnL[user][agentId] + getTotalUnrealizedPnL(user, agentId);
    }

    /**
     * @dev Get total portfolio value (USDC balance + all token positions in USDC)
     */
    function getPortfolioValue(address user, bytes32 agentId) external view returns (uint256 totalValue) {
        // USDC balance
        totalValue = userAgentBalances[user][agentId];
        
        // Add value of all token positions
        for (uint256 i = 0; i < tokenList.length; i++) {
            totalValue += getTokenPositionValue(user, agentId, tokenList[i]);
        }
    }

    /**
     * @dev Get ROI percentage (scaled by 100, e.g., 1500 = 15.00%)
     */
    function getROI(address user, bytes32 agentId) external view returns (int256) {
        uint256 deposited = totalDeposited[user][agentId];
        if (deposited == 0) return 0;
        
        int256 totalPnL = realizedPnL[user][agentId] + getTotalUnrealizedPnL(user, agentId);
        
        // Return ROI as percentage * 100 (e.g., 15.5% = 1550)
        return (totalPnL * 10000) / int256(deposited);
    }

    // ============ Standard View Functions ============

    function getUserAgentBalance(address user, bytes32 agentId) external view returns (uint256) {
        return userAgentBalances[user][agentId];
    }

    function getUserAgentTokenBalance(address user, bytes32 agentId, address token) external view returns (uint256) {
        return userAgentTokens[user][agentId][token];
    }

    function getUserAgents(address user) external view returns (bytes32[] memory) {
        return userAgents[user];
    }

    function getAgentTotalBalance(bytes32 agentId) external view returns (uint256) {
        return agentTotalBalances[agentId];
    }

    function getSupportedTokens() external view returns (address[] memory) {
        return tokenList;
    }

    function getBuyQuote(address token, uint256 usdcAmount) external view returns (uint256 tokensOut, uint256 dexFee) {
        require(simpleDex != address(0), "SimpleDEX not set");
        return ISimpleDEX(simpleDex).getBuyQuote(token, usdcAmount);
    }

    function getSellQuote(address token, uint256 tokenAmount) external view returns (uint256 usdcOut, uint256 dexFee) {
        require(simpleDex != address(0), "SimpleDEX not set");
        return ISimpleDEX(simpleDex).getSellQuote(token, tokenAmount);
    }

    // ============ Admin Functions ============

    function setOperator(address _operator) external onlyOwner {
        operator = _operator;
        emit OperatorUpdated(_operator);
    }

    function setSimpleDex(address _simpleDex) external onlyOwner {
        simpleDex = _simpleDex;
        emit SimpleDexUpdated(_simpleDex);
    }

    function addSupportedToken(address token) external onlyOwner {
        require(!supportedTokens[token], "Already supported");
        supportedTokens[token] = true;
        tokenList.push(token);
        emit TokenAdded(token);
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
