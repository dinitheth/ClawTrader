// Deploy AgentVaultV2 to Monad Testnet
// This version integrates with SimpleDEX for real on-chain trading

const hre = require("hardhat");

async function main() {
    console.log("Deploying AgentVaultV2 to Monad Testnet...");

    // Existing contract addresses on Monad Testnet
    const USDC_ADDRESS = "0xE0A5E15e3f779eCF261dF003B6BDe36177a64D01";
    const SIMPLE_DEX_ADDRESS = "0x7f09C84a42A5f881d8cebC3c319DC108c20eE762";
    const TEST_BTC_ADDRESS = "0x26C4F4c9B1a662B56a3a03a9D52a063b673d54d4";
    const TEST_ETH_ADDRESS = "0xa4c47256E0ED804D32e44f174C0fba7E14342b51";
    const TEST_SOL_ADDRESS = "0x42FCdBFC0f8c955c1E82eEcC8a4F0F5067ED2dFd";

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(balance), "MON");

    // Deploy AgentVaultV2
    console.log("\n📦 Deploying AgentVaultV2...");
    const AgentVaultV2 = await hre.ethers.getContractFactory("AgentVaultV2");
    const agentVaultV2 = await AgentVaultV2.deploy(USDC_ADDRESS, SIMPLE_DEX_ADDRESS);
    await agentVaultV2.waitForDeployment();

    const vaultAddress = await agentVaultV2.getAddress();
    console.log("✅ AgentVaultV2 deployed to:", vaultAddress);

    // Configure supported tokens
    console.log("\n🔧 Adding supported tokens...");

    let tx = await agentVaultV2.addSupportedToken(TEST_BTC_ADDRESS);
    await tx.wait();
    console.log("  ✓ Added tBTC");

    tx = await agentVaultV2.addSupportedToken(TEST_ETH_ADDRESS);
    await tx.wait();
    console.log("  ✓ Added tETH");

    tx = await agentVaultV2.addSupportedToken(TEST_SOL_ADDRESS);
    await tx.wait();
    console.log("  ✓ Added tSOL");

    // Set operator to deployer (for backend)
    console.log("\n🔧 Setting operator...");
    tx = await agentVaultV2.setOperator(deployer.address);
    await tx.wait();
    console.log("  ✓ Operator set to:", deployer.address);

    console.log("\n" + "=".repeat(60));
    console.log("DEPLOYMENT COMPLETE");
    console.log("=".repeat(60));
    console.log("\n📋 Update these addresses in your config:");
    console.log(`   AGENT_VAULT_V2: "${vaultAddress}"`);
    console.log("\n⚠️  Remember to update:");
    console.log("   1. .env with new AGENT_VAULT address");
    console.log("   2. src/lib/contracts.ts with new address");
    console.log("   3. server/trading-server.js with new contract ABI");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
