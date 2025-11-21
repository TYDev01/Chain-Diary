import { Request, Response } from "express";
import thirdwebService from "../services/thirdweb.service";
import { AuthRequest } from "../types";

export class AuthController {
  /**
   * POST /auth/session
   * Creates or recovers a Thirdweb embedded wallet session
   */
  async createSession(req: Request, res: Response): Promise<void> {
    try {
      const { authMethod, credential }: AuthRequest = req.body;

      if (!authMethod || !credential) {
        res.status(400).json({
          error: "Missing required fields: authMethod and credential",
        });
        return;
      }

      let walletAddress: string;

      switch (authMethod) {
        case "farcaster":
          walletAddress = await thirdwebService.mapFarcasterToWallet(credential);
          break;
        case "email":
          walletAddress = await thirdwebService.mapEmailToWallet(credential);
          break;
        case "phone":
          walletAddress = await thirdwebService.mapPhoneToWallet(credential);
          break;
        case "google":
          walletAddress = await thirdwebService.mapSocialToWallet("google", credential);
          break;
        case "wallet":
          // Direct wallet connection
          walletAddress = credential;
          break;
        default:
          res.status(400).json({
            error: "Invalid auth method",
          });
          return;
      }

      res.status(200).json({
        success: true,
        walletAddress,
        authMethod,
        message: "Session created successfully",
      });
    } catch (error: any) {
      console.error("Auth error:", error);
      res.status(500).json({
        error: "Failed to create session",
        details: error.message,
      });
    }
  }
}

export default new AuthController();
