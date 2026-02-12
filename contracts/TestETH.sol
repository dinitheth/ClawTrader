// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TestETH
 * @dev Test Ethereum token for Monad Testnet
 * Mirrors real ETH: ~120M supply, 18 decimals
 */
contract TestETH is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 120_000_000 * 10**18; // 120M with 18 decimals
    
    constructor() ERC20("Test Ethereum", "tETH") {
        // Mint full supply to deployer (will transfer to SimpleDEX)
        _mint(msg.sender, MAX_SUPPLY);
    }
    
    /**
     * @dev Burn tokens (for any future needs)
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
