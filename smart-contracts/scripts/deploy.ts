import hre from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface DeploymentInfo {
  network: string;
  contractAddress: string;
  deployer: string;
  deploymentTime: string;
  transactionHash: string;
  blockNumber: number | null;
}

async function main(): Promise<void> {
  console.log("Deploying CeloDiary contract...\n");

  const [deployer] = await hre.ethers.getSigners();
  const network = (await hre.ethers.provider.getNetwork()).name;

  console.log("Deploying with account:", deployer.address);
  console.log("Network:", network);
  console.log(
    "Account balance:",
    hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)),
    "ETH\n"
  );

  // Deploy the contract
  const CeloDiary = await hre.ethers.getContractFactory("CeloDiary");
  const celoDiary = await CeloDiary.deploy();

  await celoDiary.waitForDeployment();
  const contractAddress = await celoDiary.getAddress();
  const deployTx = celoDiary.deploymentTransaction();

  if (!deployTx) {
    throw new Error("Deployment transaction not found");
  }

  console.log("[SUCCESS] CeloDiary deployed to:", contractAddress);
  console.log("Transaction hash:", deployTx.hash);

  // Wait for a few block confirmations
  console.log("\nWaiting for block confirmations...");
  await deployTx.wait(5);
  console.log("[SUCCESS] Confirmed!");

  // Save deployment info
  const deploymentInfo: DeploymentInfo = {
    network: network,
    contractAddress: contractAddress,
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
    transactionHash: deployTx.hash,
    blockNumber: deployTx.blockNumber,
  };

  const deploymentDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentDir, `${network}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

  console.log("\nDeployment info saved to:", deploymentFile);

  // Display useful information
  console.log("\nContract Details:");
  console.log("=======================================");
  console.log("Contract Address:", contractAddress);
  console.log("Owner:", deployer.address);
  console.log("Network:", network);
  console.log("=======================================\n");

  // Verify contract if not on localhost
  if (network !== "hardhat" && network !== "localhost") {
    console.log("[WAIT] Waiting 1 minute before verification...");
    await new Promise((resolve) => setTimeout(resolve, 60000));

    console.log("\n[VERIFY] Verifying contract on block explorer...");
    try {
      await (hre as any).run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
      });
      console.log("[SUCCESS] Contract verified successfully!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("[SUCCESS] Contract is already verified!");
      } else {
        console.error("[ERROR] Verification failed:", error.message);
        console.log("\nYou can manually verify with:");
        console.log(`npx hardhat verify --network ${network} ${contractAddress}`);
      }
    }
  }

  console.log("\n[COMPLETE] Deployment complete!\n");
  console.log("Next steps:");
  console.log("1. Update backend .env with CONTRACT_ADDRESS");
  console.log("2. Update frontend .env.local with NEXT_PUBLIC_CONTRACT_ADDRESS");
  console.log("3. Update subgraph config with contract address");
  console.log("4. Deploy the subgraph\n");
}

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error("[ERROR] Deployment failed:", error);
    process.exit(1);
  });
