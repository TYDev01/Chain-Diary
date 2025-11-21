import { Request, Response } from "express";
import contractService from "../services/contract.service";
import pinataService from "../services/pinata.service";
import thirdwebService from "../services/thirdweb.service";
import config from "../config";
import { EntryCreateRequest, DiaryVolume, DiaryEntry } from "../types";

const MAX_VOLUME_SIZE = 25 * 1024 * 1024; // 25MB

export class EntryController {
  /**
   * POST /entry/create
   * Create a new diary entry with IPFS volume management
   */
  async createEntry(req: Request, res: Response): Promise<void> {
    try {
      const { text, imageCIDs = [], userAddress }: EntryCreateRequest = req.body;

      if (!text || !userAddress) {
        res.status(400).json({
          error: "Missing required fields: text and userAddress",
        });
        return;
      }

      // Fetch latest CID from contract
      const latestCID = await contractService.getLatestCID(userAddress);

      let volume: DiaryVolume | null = null;
      let needsNewVolume = false;

      if (latestCID) {
        // Fetch existing volume from IPFS
        try {
          volume = await pinataService.fetchJSON(latestCID);
          
          // Check volume size
          const volumeSize = await pinataService.getFileSize(latestCID);
          if (volumeSize >= MAX_VOLUME_SIZE) {
            console.log("Volume size exceeded, creating new volume");
            needsNewVolume = true;
          }
        } catch (error) {
          console.log("Could not fetch existing volume, creating new one");
          needsNewVolume = true;
        }
      } else {
        needsNewVolume = true;
      }

      // Create new entry
      const newEntry: DiaryEntry = {
        entryId: needsNewVolume ? 0 : (volume?.entries?.length || 0),
        date: new Date().toISOString(),
        text,
        imageCIDs,
      };

      // Create or update volume
      let finalVolume: DiaryVolume;
      if (needsNewVolume) {
        finalVolume = {
          volumeId: Date.now(),
          entries: [newEntry],
        };
      } else {
        finalVolume = volume!;
        finalVolume.entries.push(newEntry);
      }

      // Upload updated volume to IPFS
      console.log("Uploading volume to IPFS...");
      const newCID = await pinataService.uploadJSON(
        finalVolume,
        `diary-volume-${finalVolume.volumeId}`
      );

      // Update contract with new CID (gasless transaction)
      console.log("Updating contract with new CID...");
      await thirdwebService.executeGaslessTransaction(
        userAddress,
        config.blockchain.contractAddress,
        "updateDiary",
        [newCID]
      );

      res.status(200).json({
        success: true,
        entryCID: newCID,
        entryId: newEntry.entryId,
        volumeId: finalVolume.volumeId,
        newVolume: needsNewVolume,
        message: "Diary entry created successfully",
      });
    } catch (error: any) {
      console.error("Entry creation error:", error);
      res.status(500).json({
        error: "Failed to create diary entry",
        details: error.message,
      });
    }
  }
}

export default new EntryController();
