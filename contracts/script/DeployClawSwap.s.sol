// ClawSwap Deployment Script for Monad Testnet
// Run with: forge script contracts/script/DeployClawSwap.s.sol --rpc-url $MONAD_RPC --broadcast --private-key $PRIVATE_KEY

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../ClawSwap.sol";

contract DeployClawSwap is Script {
    // Monad Testnet addresses
    address constant USDC = 0xE5C0a7AB54002FeDfF0Ca7082d242F9D04265f3b;
    address constant CLAW = 0x849DC7064089e9f47c3d102E224302C72b5aC134;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy ClawSwap
        ClawSwap swap = new ClawSwap(USDC, CLAW);
        console.log("ClawSwap deployed at:", address(swap));
        
        // 2. Fund with CLAW liquidity (10M CLAW = 10_000_000e18)
        // This requires the deployer to have CLAW tokens
        // The deployer (ClawToken owner) has 100M initial supply
        uint256 fundAmount = 10_000_000 * 1e18;
        IERC20(CLAW).approve(address(swap), fundAmount);
        IERC20(CLAW).transfer(address(swap), fundAmount);
        
        console.log("Funded ClawSwap with 10M CLAW tokens");
        console.log("Swap rate: 1 USDC = 100 CLAW");
        
        vm.stopBroadcast();
    }
}
