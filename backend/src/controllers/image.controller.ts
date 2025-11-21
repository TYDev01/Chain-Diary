import { Request, Response } from "express";
import contractService from "../services/contract.service";
import compressionService from "../services/compression.service";
import pinataService from "../services/pinata.service";
import thirdwebService from "../services/thirdweb.service";
import config from "../config";
import { ImageUploadRequest } from "../types";

export class ImageController {
  /**
   * POST /image/upload
   * Upload and compress image, then upload to IPFS
   */
  async uploadImage(req: Request, res: Response): Promise<void> {
    try {
      const { image, userAddress }: ImageUploadRequest = req.body;

      if (!image || !userAddress) {
        res.status(400).json({
          error: "Missing required fields: image and userAddress",
        });
        return;
      }

      // Check if user can upload more images
      const canUpload = await contractService.canUploadImage(userAddress);
      if (!canUpload) {
        res.status(403).json({
          error: "Free image limit reached. Please upgrade to premium.",
        });
        return;
      }

      // Decode base64 image
      const imageBuffer = Buffer.from(image, "base64");

      // Compress image via Python service
      console.log("Compressing image...");
      const compressedBuffer = await compressionService.compressImage(
        imageBuffer,
        `image-${Date.now()}.webp`
      );

      // Upload compressed image to IPFS
      console.log("Uploading to IPFS...");
      const imageCID = await pinataService.uploadFile(
        compressedBuffer,
        `compressed-${Date.now()}.webp`
      );

      // Increment image upload counter on smart contract (gasless)
      console.log("Updating contract...");
      await thirdwebService.executeGaslessTransaction(
        userAddress,
        config.blockchain.contractAddress,
        "incrementImageUpload",
        []
      );

      res.status(200).json({
        success: true,
        imageCID,
        message: "Image uploaded successfully",
      });
    } catch (error: any) {
      console.error("Image upload error:", error);
      res.status(500).json({
        error: "Failed to upload image",
        details: error.message,
      });
    }
  }
}

export default new ImageController();
