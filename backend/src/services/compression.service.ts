import axios from "axios";
import config from "../config";

class CompressionService {
  private serviceUrl: string;

  constructor() {
    this.serviceUrl = config.compression.serviceUrl;
  }

  async compressImage(imageBuffer: Buffer, filename: string): Promise<Buffer> {
    try {
      const FormData = require("form-data");
      const formData = new FormData();
      formData.append("file", imageBuffer, filename);

      const response = await axios.post(`${this.serviceUrl}/compress`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        responseType: "arraybuffer",
      });

      return Buffer.from(response.data);
    } catch (error: any) {
      console.error("Compression service error:", error.response?.data || error.message);
      throw new Error("Failed to compress image");
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.serviceUrl}/health`);
      return response.data.status === "healthy";
    } catch (error) {
      return false;
    }
  }
}

export default new CompressionService();
