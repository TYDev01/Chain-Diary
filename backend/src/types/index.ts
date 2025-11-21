export interface AuthRequest {
  authMethod: "farcaster" | "email" | "phone" | "google" | "wallet";
  credential: string;
}

export interface ImageUploadRequest {
  image: string; // base64 encoded
  userAddress: string;
}

export interface EntryCreateRequest {
  text: string;
  imageCIDs?: string[];
  userAddress: string;
}

export interface UserStatusResponse {
  premium: boolean;
  freeImageCount: number;
  volumes: VolumeInfo[];
  lastRewardTimestamp: number;
  streak: number;
  nextRewardAvailable: number;
}

export interface VolumeInfo {
  cid: string;
  timestamp: number;
}

export interface DiaryEntry {
  entryId: number;
  date: string;
  text: string;
  imageCIDs: string[];
}

export interface DiaryVolume {
  volumeId: number;
  entries: DiaryEntry[];
}
