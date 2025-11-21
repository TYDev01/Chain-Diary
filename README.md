# Chain Diary 📔⛓️

> A fully decentralized, mobile-first diary application with Thirdweb Smart Accounts, Farcaster integration, and gasless transactions on Celo.

## 🌟 Features

- **Multi-Method Authentication**: Farcaster, Email, Phone, Google, Apple, or Web3 Wallet
- **Smart Account Abstraction**: Every user gets an ERC-4337 smart account via Thirdweb
- **Gasless Transactions**: All writes sponsored by Thirdweb Paymaster
- **Decentralized Storage**: Diary entries on IPFS (Pinata), indexed by The Graph
- **Daily Rewards**: One reward per day for consistent diary writing
- **Image Support**: Optimized image uploads with free tier (5 images) and premium tier
- **Volume Management**: Automatic JSON volume creation when entries exceed 25MB

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│              Next.js 15 + Thirdweb SDK                       │
│     (Email/Phone/Social/Farcaster/Wallet Login)             │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    TypeScript Backend                        │
│         Thirdweb AA + Paymaster + Pinata IPFS               │
└──────┬──────────────────────┬───────────────────────────────┘
       │                      │
       ▼                      ▼
┌──────────────┐    ┌──────────────────────┐
│   Python     │    │   Smart Contract     │
│ Compression  │    │   (Celo Network)     │
│   Service    │    │   CeloDiary.sol      │
└──────────────┘    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    The Graph         │
                    │     Subgraph         │
                    │  (Event Indexing)    │
                    └──────────────────────┘
```

## 📦 Technology Stack

### Blockchain
- **Network**: Celo (Mainnet + Alfajores Testnet)
- **Smart Contracts**: Solidity, Hardhat, OpenZeppelin
- **Account Abstraction**: Thirdweb Smart Accounts (ERC-4337)
- **Gas Sponsorship**: Thirdweb Paymaster

### Identity & Authentication
- Thirdweb Embedded Wallet
- Farcaster Login (Frames)
- Email/Phone/Google/Apple Social Login
- Traditional Web3 Wallet Support

### Storage & Indexing
- **IPFS**: Pinata for decentralized storage
- **The Graph**: Event indexing and querying

### Backend
- **TypeScript**: Node.js + Express/Fastify
- **Python**: FastAPI compression service
- **Image Processing**: Pillow (WEBP compression <5MB)

### Frontend
- **Framework**: Next.js 15 + TypeScript
- **Auth**: Thirdweb React SDK
- **UI**: Shadcn UI + TailwindCSS
- **State**: Zustand
- **Data**: GraphQL client for Subgraph

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/TYDev01/Chain-Diary.git
cd Chain-Diary
```

2. **Install Smart Contract Dependencies**
```bash
cd smart-contracts
npm install
cp .env.example .env
# Configure your .env file
```

3. **Install Backend Dependencies**
```bash
cd ../backend
npm install
cp .env.example .env
# Configure your .env file
```

4. **Install Frontend Dependencies**
```bash
cd ../frontend
npm install
cp .env.example .env.local
# Configure your .env.local file
```

5. **Setup Python Compression Service**
```bash
cd ../compression-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

6. **Setup The Graph Subgraph**
```bash
cd ../subgraph
npm install
```

## 🔧 Configuration

### Environment Variables

#### Smart Contracts (.env)
```env
PRIVATE_KEY=your_private_key
CELO_RPC_URL=https://forno.celo.org
ALFAJORES_RPC_URL=https://alfajores-forno.celo-testnet.org
CELOSCAN_API_KEY=your_celoscan_api_key
```

#### Backend (.env)
```env
THIRDWEB_CLIENT_ID=your_thirdweb_client_id
THIRDWEB_SECRET_KEY=your_thirdweb_secret_key
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key
PINATA_JWT=your_pinata_jwt
COMPRESSION_SERVICE_URL=http://localhost:8000
CONTRACT_ADDRESS=deployed_contract_address
CELO_RPC_URL=https://forno.celo.org
PORT=3001
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_thirdweb_client_id
NEXT_PUBLIC_CONTRACT_ADDRESS=deployed_contract_address
NEXT_PUBLIC_CHAIN_ID=42220
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_SUBGRAPH_URL=your_subgraph_url
```

#### Compression Service (.env)
```env
PORT=8000
MAX_FILE_SIZE=5242880
```

## 📝 Development

### Deploy Smart Contract
```bash
cd smart-contracts
npm run test
npm run deploy:alfajores  # Testnet
npm run deploy:celo       # Mainnet
```

### Run Backend
```bash
cd backend
npm run dev
```

### Run Compression Service
```bash
cd compression-service
source venv/bin/activate
python main.py
```

### Run Frontend
```bash
cd frontend
npm run dev
```

### Deploy Subgraph
```bash
cd subgraph
npm run codegen
npm run build
npm run deploy
```

## 📚 API Documentation

### Backend Endpoints

#### POST /auth/session
Creates or recovers a Thirdweb embedded wallet session.
```json
{
  "authMethod": "farcaster|email|phone|google|wallet",
  "credential": "fid|email|phone|walletAddress"
}
```

#### POST /image/upload
Uploads and compresses an image to IPFS.
```json
{
  "image": "base64_encoded_image",
  "userAddress": "0x..."
}
```

#### POST /entry/create
Creates a new diary entry.
```json
{
  "text": "diary entry text",
  "imageCIDs": ["Qm...", "Qm..."],
  "userAddress": "0x..."
}
```

#### GET /user/status/:address
Returns user status information.

## 🧪 Testing

```bash
# Smart Contract Tests
cd smart-contracts
npm run test

# Backend Tests
cd backend
npm run test

# Frontend Tests
cd frontend
npm run test
```

## 🎯 Key Workflows

### Authentication Flow
1. User selects auth method (Farcaster/Email/Phone/Social/Wallet)
2. Thirdweb creates/recovers embedded wallet
3. Smart account is automatically provisioned
4. User gains gasless access to write diary entries

### Diary Entry Flow
1. User writes text entry + optionally uploads images
2. Images sent to Python service → compressed to <5MB WEBP
3. Compressed images uploaded to Pinata IPFS
4. Text + image CIDs appended to JSON volume
5. If volume >25MB, new volume created
6. Updated JSON uploaded to IPFS
7. Smart account calls `updateDiary(newCID)` (gasless)
8. The Graph indexes the event
9. Frontend updates via GraphQL query

### Reward System
- One reward per 24 hours
- Automatic check on `updateDiary` call
- Reward timestamp tracked on-chain
- Streak calculated via The Graph queries

## 🔐 Security

- No private keys exposed to frontend
- Thirdweb manages wallet security
- Pinata API keys server-side only
- Smart contract access controls
- Image size validation
- Rate limiting on backend endpoints

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please read CONTRIBUTING.md for guidelines.

## 📞 Support

For issues and questions:
- GitHub Issues: [Chain-Diary Issues](https://github.com/TYDev01/Chain-Diary/issues)
- Documentation: See `/docs` folder

---

Built with ❤️ using Celo, Thirdweb, and IPFS
