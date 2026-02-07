// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AgentWallet
 * @dev Smart contract wallet that holds funds for AI trading agents
 * Features:
 * - Users deposit MON to fund their agent
 * - Authorized operator (backend) can execute trades on behalf of agents
 * - Users can withdraw their funds anytime
 * - Tracks agent balances and trade history
 */
contract AgentWallet is Ownable, ReentrancyGuard {
    
    // DEX Router interface (Uniswap V2 style)
    interface IRouter {
        function swapExactETHForTokens(
            uint amountOutMin,
            address[] calldata path,
            address to,
            uint deadline
        ) external payable returns (uint[] memory amounts);
        
        function swapExactTokensForETH(
            uint amountIn,
            uint amountOutMin,
            address[] calldata path,
            address to,
            uint deadline
        ) external returns (uint[] memory amounts);
        
        function WETH() external pure returns (address);
    }

    // Monad Testnet DEX Router
    address public constant ROUTER = 0x7139332aa7C461bfC6463586D0fbf5A7cdEf5324;
    address public constant WMON = 0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37;
    
    // Authorized trading operator (backend wallet)
    address public operator;
    
    // Agent balances: agentId => balance in MON (wei)
    mapping(bytes32 => uint256) public agentBalances;
    
    // Agent owners: agentId => owner address
    mapping(bytes32 => address) public agentOwners;
    
    // Trade counter
    uint256 public totalTrades;
    
    // Platform fee (2%)
    uint256 public platformFee = 200;
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public collectedFees;

    // Events
    event AgentFunded(bytes32 indexed agentId, address indexed funder, uint256 amount);
    event AgentWithdraw(bytes32 indexed agentId, address indexed owner, uint256 amount);
    event TradeExecuted(
        bytes32 indexed agentId,
        bool isBuy,
        uint256 amountIn,
        uint256 amountOut,
        address tokenTraded
    );
    event OperatorUpdated(address indexed oldOperator, address indexed newOperator);

    modifier onlyOperator() {
        require(msg.sender == operator || msg.sender == owner(), "Not authorized");
        _;
    }

    modifier onlyAgentOwner(bytes32 agentId) {
        require(agentOwners[agentId] == msg.sender, "Not agent owner");
        _;
    }

    constructor() Ownable(msg.sender) {
        operator = msg.sender;
    }

    /**
     * @dev Deposit MON to fund an agent
     * @param agentId The off-chain agent UUID (as bytes32)
     */
    function fundAgent(bytes32 agentId) external payable nonReentrant {
        require(msg.value > 0, "Must send MON");
        
        // First funder becomes the owner
        if (agentOwners[agentId] == address(0)) {
            agentOwners[agentId] = msg.sender;
        }
        
        agentBalances[agentId] += msg.value;
        
        emit AgentFunded(agentId, msg.sender, msg.value);
    }

    /**
     * @dev Withdraw MON from an agent
     * @param agentId The agent to withdraw from
     * @param amount Amount to withdraw in wei
     */
    function withdrawFromAgent(bytes32 agentId, uint256 amount) 
        external 
        nonReentrant 
        onlyAgentOwner(agentId) 
    {
        require(agentBalances[agentId] >= amount, "Insufficient balance");
        
        agentBalances[agentId] -= amount;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit AgentWithdraw(agentId, msg.sender, amount);
    }

    /**
     * @dev Execute a buy trade (MON -> Token) for an agent
     * @param agentId The agent executing the trade
     * @param tokenOut The token to buy
     * @param amountIn Amount of MON to spend
     * @param amountOutMin Minimum tokens to receive
     */
    function executeBuy(
        bytes32 agentId,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin
    ) external onlyOperator nonReentrant returns (uint256 amountOut) {
        require(agentBalances[agentId] >= amountIn, "Insufficient agent balance");
        
        // Deduct from agent balance
        agentBalances[agentId] -= amountIn;
        
        // Take platform fee
        uint256 fee = (amountIn * platformFee) / FEE_DENOMINATOR;
        collectedFees += fee;
        uint256 tradeAmount = amountIn - fee;
        
        // Build swap path
        address[] memory path = new address[](2);
        path[0] = WMON;
        path[1] = tokenOut;
        
        // Execute swap
        IRouter router = IRouter(ROUTER);
        uint[] memory amounts = router.swapExactETHForTokens{value: tradeAmount}(
            amountOutMin,
            path,
            address(this), // Tokens stay in contract
            block.timestamp + 300
        );
        
        amountOut = amounts[amounts.length - 1];
        totalTrades++;
        
        emit TradeExecuted(agentId, true, amountIn, amountOut, tokenOut);
    }

    /**
     * @dev Execute a sell trade (Token -> MON) for an agent
     * @param agentId The agent executing the trade
     * @param tokenIn The token to sell
     * @param amountIn Amount of tokens to sell
     * @param amountOutMin Minimum MON to receive
     */
    function executeSell(
        bytes32 agentId,
        address tokenIn,
        uint256 amountIn,
        uint256 amountOutMin
    ) external onlyOperator nonReentrant returns (uint256 amountOut) {
        // Approve router
        IERC20(tokenIn).approve(ROUTER, amountIn);
        
        // Build swap path
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = WMON;
        
        // Execute swap
        IRouter router = IRouter(ROUTER);
        uint[] memory amounts = router.swapExactTokensForETH(
            amountIn,
            amountOutMin,
            path,
            address(this),
            block.timestamp + 300
        );
        
        amountOut = amounts[amounts.length - 1];
        
        // Take platform fee and credit agent
        uint256 fee = (amountOut * platformFee) / FEE_DENOMINATOR;
        collectedFees += fee;
        agentBalances[agentId] += (amountOut - fee);
        
        totalTrades++;
        
        emit TradeExecuted(agentId, false, amountIn, amountOut, tokenIn);
    }

    // ============ View Functions ============

    function getAgentBalance(bytes32 agentId) external view returns (uint256) {
        return agentBalances[agentId];
    }

    function getAgentOwner(bytes32 agentId) external view returns (address) {
        return agentOwners[agentId];
    }

    // ============ Admin Functions ============

    function setOperator(address _operator) external onlyOwner {
        emit OperatorUpdated(operator, _operator);
        operator = _operator;
    }

    function setPlatformFee(uint256 _fee) external onlyOwner {
        require(_fee <= 500, "Max 5%");
        platformFee = _fee;
    }

    function withdrawFees() external onlyOwner {
        uint256 amount = collectedFees;
        collectedFees = 0;
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Transfer failed");
    }

    // Allow contract to receive MON
    receive() external payable {}
}

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}
