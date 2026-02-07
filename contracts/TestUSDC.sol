// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title TestUSDC
 * @dev Testnet USDC token with minter role for faucet functionality
 * 
 * Deployment Steps:
 * 1. Deploy this contract (deployer becomes DEFAULT_ADMIN_ROLE and MINTER_ROLE)
 * 2. Initial supply of 10 billion USDC is minted to deployer
 * 3. Transfer initial supply to VaultB for profit distribution
 * 4. Grant MINTER_ROLE to faucet contract if using on-chain faucet
 */
contract TestUSDC is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    uint8 private constant DECIMALS = 6;
    uint256 public constant INITIAL_SUPPLY = 10_000_000_000 * 10**DECIMALS; // 10 billion
    uint256 public constant FAUCET_AMOUNT = 1000 * 10**DECIMALS; // 1000 USDC per claim
    
    // Faucet cooldowns
    mapping(address => uint256) public lastClaim;
    uint256 public constant FAUCET_COOLDOWN = 1 hours;

    event FaucetClaim(address indexed user, uint256 amount);

    constructor() ERC20("Test USDC", "USDC") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        
        // Mint initial supply to deployer
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    /**
     * @dev Mint tokens (only minters)
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /**
     * @dev Public faucet function - anyone can claim 1000 USDC per hour
     */
    function faucet() external {
        require(
            block.timestamp >= lastClaim[msg.sender] + FAUCET_COOLDOWN,
            "Faucet: cooldown not expired"
        );
        
        lastClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
        
        emit FaucetClaim(msg.sender, FAUCET_AMOUNT);
    }

    /**
     * @dev Check if address can claim from faucet
     */
    function canClaim(address user) external view returns (bool) {
        return block.timestamp >= lastClaim[user] + FAUCET_COOLDOWN;
    }

    /**
     * @dev Get seconds until next claim
     */
    function timeUntilClaim(address user) external view returns (uint256) {
        if (block.timestamp >= lastClaim[user] + FAUCET_COOLDOWN) {
            return 0;
        }
        return (lastClaim[user] + FAUCET_COOLDOWN) - block.timestamp;
    }
}
