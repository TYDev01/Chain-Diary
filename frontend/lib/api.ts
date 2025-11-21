const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface CreateSessionRequest {
  authMethod: "email" | "phone" | "farcaster" | "google" | "wallet";
  credential: string;
}

export interface CreateSessionResponse {
  success: boolean;
  walletAddress: string;
  authMethod: string;
  message: string;
}

export interface UploadImageRequest {
  image: string; // base64
  userAddress: string;
}

export interface UploadImageResponse {
  success: boolean;
  imageCID: string;
  message: string;
}

export interface CreateEntryRequest {
  text: string;
  imageCIDs: string[];
  userAddress: string;
}

export interface CreateEntryResponse {
  success: boolean;
  entryCID: string;
  entryId: number;
  volumeId: number;
  newVolume: boolean;
  message: string;
}

export interface UserStatus {
  premium: boolean;
  freeImageCount: number;
  volumes: Array<{
    cid: string;
    timestamp: number;
  }>;
  lastRewardTimestamp: number;
  streak: number;
  nextRewardAvailable: number;
}

export class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_URL) {
    this.baseURL = baseURL;
  }

  async createSession(
    data: CreateSessionRequest
  ): Promise<CreateSessionResponse> {
    const response = await fetch(`${this.baseURL}/auth/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.statusText}`);
    }

    return response.json();
  }

  async uploadImage(data: UploadImageRequest): Promise<UploadImageResponse> {
    const response = await fetch(`${this.baseURL}/image/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to upload image: ${response.statusText}`);
    }

    return response.json();
  }

  async createEntry(data: CreateEntryRequest): Promise<CreateEntryResponse> {
    const response = await fetch(`${this.baseURL}/entry/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to create entry: ${response.statusText}`);
    }

    return response.json();
  }

  async getUserStatus(address: string): Promise<UserStatus> {
    const response = await fetch(`${this.baseURL}/user/status/${address}`);

    if (!response.ok) {
      throw new Error(`Failed to get user status: ${response.statusText}`);
    }

    return response.json();
  }
}

export const apiClient = new ApiClient();
