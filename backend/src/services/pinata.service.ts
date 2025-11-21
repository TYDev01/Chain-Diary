import axios from "axios";
import FormData from "form-data";
import config from "../config";

class PinataService {
  private apiKey: string;
  private secretKey: string;
  private jwt: string;
  private gateway: string;

  constructor() {
    this.apiKey = config.pinata.apiKey;
    this.secretKey = config.pinata.secretKey;
    this.jwt = config.pinata.jwt;
    this.gateway = config.pinata.gateway;
  }

  async uploadJSON(data: any, name?: string): Promise<string> {
    try {
      const response = await axios.post(
        "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        {
          pinataContent: data,
          pinataMetadata: {
            name: name || `diary-volume-${Date.now()}`,
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.jwt}`,
          },
        }
      );

      return response.data.IpfsHash;
    } catch (error: any) {
      console.error("Error uploading JSON to Pinata:", error.response?.data || error.message);
      throw new Error("Failed to upload JSON to IPFS");
    }
  }

  async uploadFile(buffer: Buffer, filename: string): Promise<string> {
    try {
      const formData = new FormData();
      formData.append("file", buffer, filename);
      formData.append(
        "pinataMetadata",
        JSON.stringify({
          name: filename,
        })
      );

      const response = await axios.post(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${this.jwt}`,
          },
          maxBodyLength: Infinity,
        }
      );

      return response.data.IpfsHash;
    } catch (error: any) {
      console.error("Error uploading file to Pinata:", error.response?.data || error.message);
      throw new Error("Failed to upload file to IPFS");
    }
  }

  async fetchJSON(cid: string): Promise<any> {
    try {
      const response = await axios.get(`${this.gateway}/ipfs/${cid}`);
      return response.data;
    } catch (error: any) {
      console.error("Error fetching JSON from IPFS:", error.message);
      throw new Error("Failed to fetch JSON from IPFS");
    }
  }

  async getFileSize(cid: string): Promise<number> {
    try {
      const response = await axios.head(`${this.gateway}/ipfs/${cid}`);
      const contentLength = response.headers["content-length"];
      return contentLength ? parseInt(contentLength, 10) : 0;
    } catch (error: any) {
      console.error("Error getting file size:", error.message);
      return 0;
    }
  }
}

export default new PinataService();
