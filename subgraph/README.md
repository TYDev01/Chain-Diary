# Chain Diary Subgraph

The Graph subgraph for indexing Chain Diary smart contract events on Celo.

## Overview

This subgraph indexes:
- Diary entries and volumes
- User premium status
- Daily rewards
- Image upload tracking

## Entities

### User
- Address (ID)
- Premium status
- Last reward timestamp
- Free image uploads used
- Total volumes
- Total entries
- Streak count

### DiaryVolume
- ID (timestamp)
- User address
- IPFS CID
- Timestamp
- Entry count
- Total size

### DiaryEntry
- ID (volumeId-entryIndex)
- Volume
- User address
- Text content
- Image CIDs
- Timestamp
- Entry index

## Events Indexed

- `DiaryUpdated(address indexed user, string cid, uint256 timestamp)`
- `RewardIssued(address indexed user, uint256 timestamp)`
- `PremiumStatusChanged(address indexed user, bool isPremium)`
- `FreeImageUploaded(address indexed user, uint256 count)`

## Setup

1. Install dependencies:
```bash
npm install
```

2. Generate types:
```bash
npm run codegen
```

3. Build subgraph:
```bash
npm run build
```

4. Deploy to The Graph Studio:
```bash
npm run deploy:studio
```

## Queries

### Get User Profile
```graphql
query GetUser($address: String!) {
  user(id: $address) {
    id
    isPremium
    lastRewardTimestamp
    freeImageUploadsUsed
    totalVolumes
    totalEntries
    streak
    volumes {
      id
      cid
      timestamp
      entryCount
    }
  }
}
```

### Get Recent Entries
```graphql
query GetRecentEntries($user: String!, $first: Int = 10) {
  diaryEntries(
    where: { user: $user }
    orderBy: timestamp
    orderDirection: desc
    first: $first
  ) {
    id
    text
    imageCIDs
    timestamp
    volume {
      cid
    }
  }
}
```

### Get Leaderboard
```graphql
query GetLeaderboard($first: Int = 100) {
  users(
    orderBy: streak
    orderDirection: desc
    first: $first
  ) {
    id
    streak
    totalEntries
    isPremium
  }
}
```

## Network

- **Network:** Celo Alfajores Testnet
- **Contract Address:** 0x3134D4b4b3608f460da1A59cd1dF2f5da38C045c
- **Start Block:** TBD (set in subgraph.yaml)

## Development

For local testing:
```bash
npm run create:local
npm run deploy:local
```
