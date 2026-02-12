// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TestBTC
 * @dev Test Bitcoin token for Monad Testnet
 * Mirrors real BTC: 21M max supply, 8 decimals
 */
contract TestBTC is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 21_000_000 * 10**8; // 21M with 8 decimals
    
    constructor() ERC20("Test Bitcoin", "tBTC") {
        // Mint full supply to deployer (will transfer to SimpleDEX)
        _mint(msg.sender, MAX_SUPPLY);
    }
    
    /**
     * @dev Override decimals to match real BTC (8 decimals)
     */
    function decimals() public pure override returns (uint8) {
        return 8;
    }
    
    /**
     * @dev Burn tokens (for any future needs)
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
