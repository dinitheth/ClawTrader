// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ClawSwap
 * @dev Swap USDC for CLAW tokens at a fixed rate on Monad Testnet
 * Rate: 1 USDC = 100 CLAW
 * 
 * Flow:
 * 1. Owner funds contract with CLAW tokens
 * 2. Users approve USDC spending
 * 3. Users call swap() → sends USDC to contract, receives CLAW
 * 4. Owner can withdraw accumulated USDC
 */
contract ClawSwap is Ownable {
    IERC20 public immutable usdc;
    IERC20 public immutable claw;
    
    uint256 public constant RATE = 100; // 1 USDC = 100 CLAW
    // USDC = 6 decimals, CLAW = 18 decimals
    // For 1 USDC (1e6), give 100 CLAW (100e18)
    // Multiplier: 100 * 1e18 / 1e6 = 100e12
    uint256 public constant CLAW_PER_USDC_UNIT = 100 * 1e12;
    
    uint256 public totalSwapped; // Total USDC swapped
    
    event Swapped(address indexed user, uint256 usdcAmount, uint256 clawAmount);
    event ClawDeposited(address indexed owner, uint256 amount);
    event UsdcWithdrawn(address indexed owner, uint256 amount);
    event ClawWithdrawn(address indexed owner, uint256 amount);
    
    constructor(address _usdc, address _claw) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        claw = IERC20(_claw);
    }
    
    /**
     * @dev Swap USDC for CLAW tokens
     * @param usdcAmount Amount of USDC to swap (in 6-decimal units)
     */
    function swap(uint256 usdcAmount) external {
        require(usdcAmount > 0, "Amount must be > 0");
        
        uint256 clawAmount = usdcAmount * CLAW_PER_USDC_UNIT;
        require(claw.balanceOf(address(this)) >= clawAmount, "Insufficient CLAW liquidity");
        
        // Transfer USDC from user to this contract
        require(usdc.transferFrom(msg.sender, address(this), usdcAmount), "USDC transfer failed");
        
        // Transfer CLAW to user
        require(claw.transfer(msg.sender, clawAmount), "CLAW transfer failed");
        
        totalSwapped += usdcAmount;
        
        emit Swapped(msg.sender, usdcAmount, clawAmount);
    }
    
    /**
     * @dev Get CLAW balance in the swap pool
     */
    function clawBalance() external view returns (uint256) {
        return claw.balanceOf(address(this));
    }
    
    /**
     * @dev Get USDC balance accumulated from swaps
     */
    function usdcBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
    
    /**
     * @dev Preview how much CLAW you get for a given USDC amount
     */
    function preview(uint256 usdcAmount) external pure returns (uint256) {
        return usdcAmount * CLAW_PER_USDC_UNIT;
    }
    
    // ── Owner functions ──────────────────────────────────────────
    
    /**
     * @dev Owner withdraws accumulated USDC
     */
    function withdrawUSDC(uint256 amount) external onlyOwner {
        require(usdc.transfer(owner(), amount), "USDC withdraw failed");
        emit UsdcWithdrawn(owner(), amount);
    }
    
    /**
     * @dev Owner withdraws CLAW (if needed)
     */
    function withdrawClaw(uint256 amount) external onlyOwner {
        require(claw.transfer(owner(), amount), "CLAW withdraw failed");
        emit ClawWithdrawn(owner(), amount);
    }
}
