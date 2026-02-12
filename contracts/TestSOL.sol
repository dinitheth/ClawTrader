// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TestSOL
 * @dev Test Solana token for Monad Testnet
 * Mirrors real SOL: ~500M supply, 9 decimals
 */
contract TestSOL is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 500_000_000 * 10**9; // 500M with 9 decimals
    
    constructor() ERC20("Test Solana", "tSOL") {
        // Mint full supply to deployer (will transfer to SimpleDEX)
        _mint(msg.sender, MAX_SUPPLY);
    }
    
    /**
     * @dev Override decimals to match real SOL (9 decimals)
     */
    function decimals() public pure override returns (uint8) {
        return 9;
    }
    
    /**
     * @dev Burn tokens (for any future needs)
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
