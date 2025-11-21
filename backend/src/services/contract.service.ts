import { ethers } from "ethers";
import config from "../config";

// CeloDiary ABI (minimal interface for backend interactions)
const CELO_DIARY_ABI = [
  "function updateDiary(string cid) external",
  "function latestCID(address user) external view returns (string)",
  "function getUserVolumes(address user) external view returns (tuple(string cid, uint256 timestamp)[])",
  "function setPremium(address user, bool status) external",
  "function incrementImageUpload() external",
  "function canUploadImage(address user) external view returns (bool)",
  "function isEligibleForReward(address user) external view returns (bool)",
  "function timeUntilNextReward(address user) external view returns (uint256)",
  "function getUserStatus(address user) external view returns (bool isPremium, uint8 imagesUsed, uint256 volumeCount, uint256 lastReward, uint256 nextRewardIn)",
  "function freeImageUploadsUsed(address user) external view returns (uint8)",
  "function premiumUser(address user) external view returns (bool)",
  "function lastRewardTimestamp(address user) external view returns (uint256)",
];

class ContractService {
  private provider: ethers.providers.JsonRpcProvider;
  private contract: ethers.Contract;

  constructor() {
    const rpcUrl = config.blockchain.network === "celo" 
      ? config.blockchain.celoRpcUrl 
      : config.blockchain.alfajoresRpcUrl;
    
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this.contract = new ethers.Contract(
      config.blockchain.contractAddress,
      CELO_DIARY_ABI,
      this.provider
    );
  }

  async getUserStatus(userAddress: string) {
    const status = await this.contract.getUserStatus(userAddress);
    return {
      isPremium: status.isPremium,
      imagesUsed: status.imagesUsed,
      volumeCount: status.volumeCount.toNumber(),
      lastReward: status.lastReward.toNumber(),
      nextRewardIn: status.nextRewardIn.toNumber(),
    };
  }

  async getUserVolumes(userAddress: string) {
    const volumes = await this.contract.getUserVolumes(userAddress);
    return volumes.map((v: any) => ({
      cid: v.cid,
      timestamp: v.timestamp.toNumber(),
    }));
  }

  async canUploadImage(userAddress: string): Promise<boolean> {
    return await this.contract.canUploadImage(userAddress);
  }

  async getLatestCID(userAddress: string): Promise<string> {
    return await this.contract.latestCID(userAddress);
  }

  getContractWithSigner(signer: ethers.Signer) {
    return new ethers.Contract(
      config.blockchain.contractAddress,
      CELO_DIARY_ABI,
      signer
    );
  }
}

export default new ContractService();
