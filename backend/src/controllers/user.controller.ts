import { Request, Response } from "express";
import contractService from "../services/contract.service";
import pinataService from "../services/pinata.service";
import { UserStatusResponse, DiaryVolume } from "../types";

export class UserController {
  /**
   * GET /user/status/:address
   * Get comprehensive user status including premium, images, volumes, rewards, and streak
   */
  async getUserStatus(req: Request, res: Response): Promise<void> {
    try {
      const { address } = req.params;

      if (!address) {
        res.status(400).json({
          error: "Missing user address parameter",
        });
        return;
      }

      // Get user status from smart contract
      const contractStatus = await contractService.getUserStatus(address);
      
      // Get volumes from contract
      const volumes = await contractService.getUserVolumes(address);

      // Calculate streak by analyzing diary entries
      let streak = 0;
      if (volumes.length > 0) {
        streak = await this.calculateStreak(volumes);
      }

      // Calculate when next reward is available
      const nextRewardAvailable = contractStatus.nextRewardIn === 0 
        ? Date.now() 
        : Date.now() + (contractStatus.nextRewardIn * 1000);

      const response: UserStatusResponse = {
        premium: contractStatus.isPremium,
        freeImageCount: contractStatus.imagesUsed,
        volumes: volumes.map(v => ({
          cid: v.cid,
          timestamp: v.timestamp,
        })),
        lastRewardTimestamp: contractStatus.lastReward,
        streak,
        nextRewardAvailable,
      };

      res.status(200).json(response);
    } catch (error: any) {
      console.error("User status error:", error);
      res.status(500).json({
        error: "Failed to fetch user status",
        details: error.message,
      });
    }
  }

  /**
   * Calculate user's diary streak (consecutive days with entries)
   */
  private async calculateStreak(volumes: any[]): Promise<number> {
    try {
      const allDates: Set<string> = new Set();

      // Fetch all volumes and collect entry dates
      for (const volume of volumes) {
        try {
          const volumeData: DiaryVolume = await pinataService.fetchJSON(volume.cid);
          volumeData.entries.forEach(entry => {
            const date = new Date(entry.date).toISOString().split("T")[0];
            allDates.add(date);
          });
        } catch (error) {
          console.error(`Error fetching volume ${volume.cid}:`, error);
        }
      }

      // Sort dates in descending order
      const sortedDates = Array.from(allDates).sort().reverse();

      if (sortedDates.length === 0) return 0;

      // Calculate streak from today backwards
      const today = new Date().toISOString().split("T")[0];
      let streak = 0;
      let currentDate = new Date(today);

      for (const entryDate of sortedDates) {
        const checkDate = currentDate.toISOString().split("T")[0];
        
        if (entryDate === checkDate) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else if (entryDate < checkDate) {
          // Gap found, streak broken
          break;
        }
      }

      return streak;
    } catch (error) {
      console.error("Streak calculation error:", error);
      return 0;
    }
  }
}

export default new UserController();
