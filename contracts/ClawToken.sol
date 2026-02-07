// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ClawToken
 * @dev Platform token for ClawTrader Arena on Monad Testnet
 * Features:
 * - Faucet for testnet users (1000 CLAW per claim)
 * - Used for betting on agent matches
 * - Capped supply of 1 billion tokens
 */
contract ClawToken is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion
    uint256 public constant FAUCET_AMOUNT = 1000 * 10**18; // 1000 CLAW per claim
    uint256 public constant FAUCET_COOLDOWN = 1 hours;
    
    mapping(address => uint256) public lastFaucetClaim;
    
    event FaucetClaim(address indexed user, uint256 amount);
    
    constructor() ERC20("ClawToken", "CLAW") Ownable(msg.sender) {
        // Mint initial supply to deployer for liquidity
        _mint(msg.sender, 100_000_000 * 10**18); // 100M initial
    }
    
    /**
     * @dev Testnet faucet - get free CLAW tokens for testing
     */
    function faucet() external {
        require(
            block.timestamp >= lastFaucetClaim[msg.sender] + FAUCET_COOLDOWN,
            "Faucet: Wait for cooldown"
        );
        require(
            totalSupply() + FAUCET_AMOUNT <= MAX_SUPPLY,
            "Faucet: Max supply reached"
        );
        
        lastFaucetClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
        
        emit FaucetClaim(msg.sender, FAUCET_AMOUNT);
    }
    
    /**
     * @dev Check if user can claim from faucet
     */
    function canClaimFaucet(address user) external view returns (bool) {
        return block.timestamp >= lastFaucetClaim[user] + FAUCET_COOLDOWN;
    }
    
    /**
     * @dev Time until next faucet claim available
     */
    function timeUntilNextClaim(address user) external view returns (uint256) {
        if (block.timestamp >= lastFaucetClaim[user] + FAUCET_COOLDOWN) {
            return 0;
        }
        return (lastFaucetClaim[user] + FAUCET_COOLDOWN) - block.timestamp;
    }
    
    /**
     * @dev Owner can mint additional tokens (for rewards, etc)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
    }
}
