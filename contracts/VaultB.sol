// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title VaultB (Profit Distribution Vault)
 * @dev Holds USDC reserves for distributing profits to users
 * 
 * Flow:
 * 1. Owner funds VaultB with initial USDC (from TestUSDC minting)
 * 2. When agents make profitable trades, AgentVault calls distributeProfitTo()
 * 3. VaultB transfers profit amount to AgentVault for user's balance
 * 
 * Deployment Steps:
 * 1. Deploy after TestUSDC and AgentVault
 * 2. Transfer USDC from TestUSDC initial supply to this vault
 * 3. Set AgentVault as authorized caller
 */
contract VaultB is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    address public agentVault; // Only AgentVault can request distributions
    
    uint256 public totalDistributed;
    uint256 public totalDeposited;

    // Events
    event Funded(address indexed from, uint256 amount);
    event ProfitDistributed(address indexed user, bytes32 indexed agentId, uint256 amount);
    event AgentVaultUpdated(address indexed newAgentVault);

    modifier onlyAgentVault() {
        require(msg.sender == agentVault, "Only AgentVault");
        _;
    }

    constructor(address _usdc, address _agentVault) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC");
        usdc = IERC20(_usdc);
        agentVault = _agentVault;
    }

    /**
     * @dev Fund the vault with USDC
     */
    function fund(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        totalDeposited += amount;
        emit Funded(msg.sender, amount);
    }

    /**
     * @dev Distribute profit to a user via AgentVault
     * Called by AgentVault when a trade is profitable
     */
    function distributeProfitTo(
        address user,
        bytes32 agentId,
        uint256 amount
    ) external onlyAgentVault nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(usdc.balanceOf(address(this)) >= amount, "Insufficient vault balance");
        
        // Transfer to AgentVault (which will credit the user's balance)
        usdc.safeTransfer(agentVault, amount);
        totalDistributed += amount;
        
        emit ProfitDistributed(user, agentId, amount);
    }

    // ============ View Functions ============

    function getBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    function getAvailableForDistribution() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    // ============ Admin Functions ============

    function setAgentVault(address _agentVault) external onlyOwner {
        require(_agentVault != address(0), "Invalid address");
        agentVault = _agentVault;
        emit AgentVaultUpdated(_agentVault);
    }

    /**
     * @dev Emergency withdraw (owner only)
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        usdc.safeTransfer(owner(), amount);
    }
}
