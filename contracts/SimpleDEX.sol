// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title SimpleDEX
 * @dev Decentralized exchange for trading TestBTC/ETH/SOL against USDC
 * Prices are set by backend oracle (CoinGecko feed)
 * 
 * Flow:
 * 1. Backend updates prices every 60s from CoinGecko
 * 2. Users/Agents swap USDC <-> TestBTC/ETH/SOL at oracle prices
 * 3. All liquidity held in this contract
 */
contract SimpleDEX is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Token addresses
    IERC20 public immutable usdc;
    
    // Supported trading tokens
    mapping(address => bool) public supportedTokens;
    
    // Prices in USDC (6 decimals) per 1 whole token
    // e.g., BTC price = 70000 * 1e6 = 70,000,000,000 (70k USDC)
    mapping(address => uint256) public tokenPrices;
    
    // Token decimals cache
    mapping(address => uint8) public tokenDecimals;
    
    // Price updater (backend wallet)
    address public priceUpdater;
    
    // Trading fee (0.1% = 10 basis points)
    uint256 public tradingFee = 10; // 0.1%
    uint256 public constant FEE_DENOMINATOR = 10000;
    
    // Collected fees
    uint256 public collectedFees;

    // Events
    event TokenAdded(address indexed token, uint8 decimals);
    event PriceUpdated(address indexed token, uint256 oldPrice, uint256 newPrice);
    event Swap(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 fee
    );
    event LiquidityAdded(address indexed token, uint256 amount);
    event PriceUpdaterChanged(address indexed newUpdater);

    modifier onlyPriceUpdater() {
        require(msg.sender == priceUpdater || msg.sender == owner(), "Not authorized");
        _;
    }

    constructor(address _usdc) {
        require(_usdc != address(0), "Invalid USDC");
        usdc = IERC20(_usdc);
        priceUpdater = msg.sender;
    }

    // ============ Admin Functions ============

    /**
     * @dev Add a new tradeable token
     */
    function addToken(address token, uint8 decimals, uint256 initialPrice) external onlyOwner {
        require(token != address(0), "Invalid token");
        require(!supportedTokens[token], "Already added");
        
        supportedTokens[token] = true;
        tokenDecimals[token] = decimals;
        tokenPrices[token] = initialPrice;
        
        emit TokenAdded(token, decimals);
        emit PriceUpdated(token, 0, initialPrice);
    }

    /**
     * @dev Update token price (called by backend oracle)
     */
    function updatePrice(address token, uint256 newPrice) external onlyPriceUpdater {
        require(supportedTokens[token], "Token not supported");
        require(newPrice > 0, "Invalid price");
        
        uint256 oldPrice = tokenPrices[token];
        tokenPrices[token] = newPrice;
        
        emit PriceUpdated(token, oldPrice, newPrice);
    }

    /**
     * @dev Batch update prices (gas efficient)
     */
    function updatePrices(
        address[] calldata tokens,
        uint256[] calldata prices
    ) external onlyPriceUpdater {
        require(tokens.length == prices.length, "Length mismatch");
        
        for (uint256 i = 0; i < tokens.length; i++) {
            if (supportedTokens[tokens[i]] && prices[i] > 0) {
                uint256 oldPrice = tokenPrices[tokens[i]];
                tokenPrices[tokens[i]] = prices[i];
                emit PriceUpdated(tokens[i], oldPrice, prices[i]);
            }
        }
    }

    /**
     * @dev Add liquidity to the pool
     */
    function addLiquidity(address token, uint256 amount) external {
        require(supportedTokens[token] || token == address(usdc), "Token not supported");
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit LiquidityAdded(token, amount);
    }

    /**
     * @dev Set price updater address
     */
    function setPriceUpdater(address _priceUpdater) external onlyOwner {
        priceUpdater = _priceUpdater;
        emit PriceUpdaterChanged(_priceUpdater);
    }

    /**
     * @dev Set trading fee
     */
    function setTradingFee(uint256 _fee) external onlyOwner {
        require(_fee <= 100, "Max 1%");
        tradingFee = _fee;
    }

    /**
     * @dev Withdraw collected fees
     */
    function withdrawFees() external onlyOwner {
        uint256 fees = collectedFees;
        collectedFees = 0;
        usdc.safeTransfer(owner(), fees);
    }

    // ============ Trading Functions ============

    /**
     * @dev Swap USDC for a token (BUY)
     * @param tokenOut The token to receive (tBTC, tETH, tSOL)
     * @param amountIn Amount of USDC to spend
     * @param minAmountOut Minimum tokens to receive (slippage protection)
     */
    function buyToken(
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) external nonReentrant returns (uint256 amountOut) {
        require(supportedTokens[tokenOut], "Token not supported");
        require(amountIn > 0, "Amount must be > 0");
        
        uint256 price = tokenPrices[tokenOut];
        require(price > 0, "Price not set");
        
        // Calculate fee
        uint256 fee = (amountIn * tradingFee) / FEE_DENOMINATOR;
        uint256 amountInAfterFee = amountIn - fee;
        collectedFees += fee;
        
        // Calculate tokens out
        // amountOut = amountIn (USDC, 6 dec) * 10^tokenDecimals / price (USDC per token, 6 dec)
        uint8 decimals = tokenDecimals[tokenOut];
        amountOut = (amountInAfterFee * (10 ** decimals)) / price;
        
        require(amountOut >= minAmountOut, "Slippage exceeded");
        require(IERC20(tokenOut).balanceOf(address(this)) >= amountOut, "Insufficient liquidity");
        
        // Transfer USDC in
        usdc.safeTransferFrom(msg.sender, address(this), amountIn);
        
        // Transfer tokens out
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);
        
        emit Swap(msg.sender, address(usdc), tokenOut, amountIn, amountOut, fee);
    }

    /**
     * @dev Swap a token for USDC (SELL)
     * @param tokenIn The token to sell (tBTC, tETH, tSOL)
     * @param amountIn Amount of tokens to sell
     * @param minAmountOut Minimum USDC to receive (slippage protection)
     */
    function sellToken(
        address tokenIn,
        uint256 amountIn,
        uint256 minAmountOut
    ) external nonReentrant returns (uint256 amountOut) {
        require(supportedTokens[tokenIn], "Token not supported");
        require(amountIn > 0, "Amount must be > 0");
        
        uint256 price = tokenPrices[tokenIn];
        require(price > 0, "Price not set");
        
        // Calculate USDC out (before fee)
        // amountOut = amountIn (token dec) * price (USDC per token, 6 dec) / 10^tokenDecimals
        uint8 decimals = tokenDecimals[tokenIn];
        uint256 rawAmountOut = (amountIn * price) / (10 ** decimals);
        
        // Calculate fee
        uint256 fee = (rawAmountOut * tradingFee) / FEE_DENOMINATOR;
        amountOut = rawAmountOut - fee;
        collectedFees += fee;
        
        require(amountOut >= minAmountOut, "Slippage exceeded");
        require(usdc.balanceOf(address(this)) >= amountOut, "Insufficient USDC liquidity");
        
        // Transfer tokens in
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        
        // Transfer USDC out
        usdc.safeTransfer(msg.sender, amountOut);
        
        emit Swap(msg.sender, tokenIn, address(usdc), amountIn, amountOut, fee);
    }

    // ============ View Functions ============

    /**
     * @dev Get quote for buying tokens with USDC
     */
    function getBuyQuote(address tokenOut, uint256 amountIn) external view returns (uint256 amountOut, uint256 fee) {
        require(supportedTokens[tokenOut], "Token not supported");
        uint256 price = tokenPrices[tokenOut];
        require(price > 0, "Price not set");
        
        fee = (amountIn * tradingFee) / FEE_DENOMINATOR;
        uint256 amountInAfterFee = amountIn - fee;
        uint8 decimals = tokenDecimals[tokenOut];
        amountOut = (amountInAfterFee * (10 ** decimals)) / price;
    }

    /**
     * @dev Get quote for selling tokens for USDC
     */
    function getSellQuote(address tokenIn, uint256 amountIn) external view returns (uint256 amountOut, uint256 fee) {
        require(supportedTokens[tokenIn], "Token not supported");
        uint256 price = tokenPrices[tokenIn];
        require(price > 0, "Price not set");
        
        uint8 decimals = tokenDecimals[tokenIn];
        uint256 rawAmountOut = (amountIn * price) / (10 ** decimals);
        fee = (rawAmountOut * tradingFee) / FEE_DENOMINATOR;
        amountOut = rawAmountOut - fee;
    }

    /**
     * @dev Get pool balance for a token
     */
    function getPoolBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    /**
     * @dev Get price for a token in USDC
     */
    function getPrice(address token) external view returns (uint256) {
        return tokenPrices[token];
    }

    /**
     * @dev Check if token is supported
     */
    function isTokenSupported(address token) external view returns (bool) {
        return supportedTokens[token];
    }
}
