const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying BettingEscrow with account:", deployer.address);
    console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

    // CLAW Token address on Monad Testnet
    const CLAW_TOKEN = "0x849DC7064089e9f47c3d102E224302C72b5aC134";

    console.log("\n📦 Deploying BettingEscrow...");
    const BettingEscrow = await hre.ethers.getContractFactory("BettingEscrow");
    const escrow = await BettingEscrow.deploy(CLAW_TOKEN);
    await escrow.waitForDeployment();
    const escrowAddress = await escrow.getAddress();
    console.log("✅ BettingEscrow deployed to:", escrowAddress);

    console.log("\n" + "=".repeat(50));
    console.log("🎉 BETTING ESCROW DEPLOYED!");
    console.log("=".repeat(50));
    console.log(`\n  BettingEscrow:  ${escrowAddress}`);
    console.log(`  CLAW Token:     ${CLAW_TOKEN}`);
    console.log(`  Platform Fee:   5%`);
    console.log("\nNext steps:");
    console.log("1. Update BETTING_ESCROW_ADDRESS in src/hooks/useClawBetting.ts");
    console.log("2. Users approve CLAW spending for the escrow address");
    console.log("3. Call createMatch(matchId, teamAId, teamBId) to open betting markets");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
