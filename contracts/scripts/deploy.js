const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Step 1: Deploy ClawToken
  console.log("\n📦 Deploying ClawToken...");
  const ClawToken = await hre.ethers.getContractFactory("ClawToken");
  const clawToken = await ClawToken.deploy();
  await clawToken.waitForDeployment();
  const clawTokenAddress = await clawToken.getAddress();
  console.log("✅ ClawToken deployed to:", clawTokenAddress);

  // Step 2: Deploy ClawArena with ClawToken address
  console.log("\n📦 Deploying ClawArena...");
  const ClawArena = await hre.ethers.getContractFactory("ClawArena");
  const clawArena = await ClawArena.deploy(clawTokenAddress);
  await clawArena.waitForDeployment();
  const clawArenaAddress = await clawArena.getAddress();
  console.log("✅ ClawArena deployed to:", clawArenaAddress);

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(50));
  console.log("\nContract Addresses (save these!):");
  console.log(`  ClawToken:  ${clawTokenAddress}`);
  console.log(`  ClawArena:  ${clawArenaAddress}`);
  console.log("\nNext steps:");
  console.log("1. Verify contracts on Monad Explorer");
  console.log("2. Update src/lib/wagmi.ts with these addresses");
  console.log("3. Set the oracle address in ClawArena for match settlement");
  console.log("\nVerification commands:");
  console.log(`  npx hardhat verify --network monadTestnet ${clawTokenAddress}`);
  console.log(`  npx hardhat verify --network monadTestnet ${clawArenaAddress} "${clawTokenAddress}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
