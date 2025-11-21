import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || "development",
  
  thirdweb: {
    clientId: process.env.THIRDWEB_CLIENT_ID || "",
    secretKey: process.env.THIRDWEB_SECRET_KEY || "",
  },
  
  pinata: {
    apiKey: process.env.PINATA_API_KEY || "",
    secretKey: process.env.PINATA_SECRET_KEY || "",
    jwt: process.env.PINATA_JWT || "",
    gateway: process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud",
  },
  
  compression: {
    serviceUrl: process.env.COMPRESSION_SERVICE_URL || "http://localhost:8000",
  },
  
  blockchain: {
    contractAddress: process.env.CONTRACT_ADDRESS || "",
    celoRpcUrl: process.env.CELO_RPC_URL || "https://forno.celo.org",
    alfajoresRpcUrl: process.env.ALFAJORES_RPC_URL || "https://alfajores-forno.celo-testnet.org",
    network: process.env.NETWORK || "alfajores",
  },
};

export default config;
