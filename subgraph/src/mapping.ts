import { BigInt, json, JSONValue, log, Bytes } from "@graphprotocol/graph-ts";
import {
  DiaryUpdated,
  RewardIssued,
  PremiumStatusChanged,
} from "../generated/CeloDiary/CeloDiary";
import {
  User,
  DiaryVolume,
  DiaryEntry,
  Reward,
  PremiumStatusChange,
  GlobalStats,
} from "../generated/schema";
import { ipfs } from "@graphprotocol/graph-ts";

// Helper function to get or create user
function getOrCreateUser(address: string, timestamp: BigInt): User {
  let user = User.load(address);
  
  if (user == null) {
    user = new User(address);
    user.isPremium = false;
    user.lastRewardTimestamp = BigInt.fromI32(0);
    user.freeImageUploadsUsed = 0;
    user.totalVolumes = 0;
    user.totalEntries = 0;
    user.streak = 0;
    user.createdAt = timestamp;
    user.updatedAt = timestamp;
    user.save();
    
    // Update global stats
    updateGlobalStats(timestamp, true, false, false, false);
  }
  
  return user;
}

// Helper function to update global stats
function updateGlobalStats(
  timestamp: BigInt,
  newUser: boolean,
  newVolume: boolean,
  newEntry: boolean,
  premiumChange: boolean
): void {
  let stats = GlobalStats.load("global");
  
  if (stats == null) {
    stats = new GlobalStats("global");
    stats.totalUsers = 0;
    stats.totalVolumes = 0;
    stats.totalEntries = 0;
    stats.totalRewards = BigInt.fromI32(0);
    stats.premiumUsers = 0;
  }
  
  if (newUser) stats.totalUsers += 1;
  if (newVolume) stats.totalVolumes += 1;
  if (newEntry) stats.totalEntries += 1;
  if (premiumChange) stats.premiumUsers += 1;
  
  stats.updatedAt = timestamp;
  stats.save();
}

// Helper function to calculate day of year
function getDayOfYear(timestamp: BigInt): i32 {
  let timestampNum = timestamp.toI32();
  let days = timestampNum / 86400; // 86400 seconds in a day
  return days;
}

// Helper function to fetch and parse IPFS JSON
function fetchIPFSData(cid: string): JSONValue | null {
  let ipfsHash = cid;
  
  // Handle both raw CIDs and ipfs:// URIs
  if (cid.startsWith("ipfs://")) {
    ipfsHash = cid.slice(7);
  }
  
  let data = ipfs.cat(ipfsHash);
  
  if (data == null) {
    log.warning("Failed to fetch IPFS data for CID: {}", [cid]);
    return null;
  }
  
  let jsonData = json.try_fromBytes(data as Bytes);
  
  if (jsonData.isError) {
    log.warning("Failed to parse JSON from IPFS CID: {}", [cid]);
    return null;
  }
  
  return jsonData.value;
}

// Helper function to calculate streak
function calculateStreak(user: User): i32 {
  let volumes = user.volumes.load();
  if (volumes.length == 0) return 0;
  
  let sortedVolumes: DiaryVolume[] = [];
  for (let i = 0; i < volumes.length; i++) {
    sortedVolumes.push(volumes[i]);
  }
  
  // Sort by timestamp descending
  sortedVolumes.sort((a, b) => {
    return b.timestamp.minus(a.timestamp).toI32();
  });
  
  let currentStreak = 0;
  let lastDay = -1;
  
  for (let i = 0; i < sortedVolumes.length; i++) {
    let volume = sortedVolumes[i];
    let entries = volume.entries.load();
    
    for (let j = 0; j < entries.length; j++) {
      let entry = entries[j];
      let dayOfYear = entry.dayOfYear;
      
      if (lastDay == -1) {
        lastDay = dayOfYear;
        currentStreak = 1;
      } else if (dayOfYear == lastDay - 1) {
        lastDay = dayOfYear;
        currentStreak += 1;
      } else if (dayOfYear != lastDay) {
        break;
      }
    }
  }
  
  return currentStreak;
}

export function handleDiaryUpdated(event: DiaryUpdated): void {
  let userAddress = event.params.user.toHexString();
  let cid = event.params.cid;
  let timestamp = event.params.timestamp;
  
  // Get or create user
  let user = getOrCreateUser(userAddress, timestamp);
  
  // Create or update volume
  let volumeId = timestamp.toString();
  let volume = DiaryVolume.load(volumeId);
  let isNewVolume = volume == null;
  
  if (volume == null) {
    volume = new DiaryVolume(volumeId);
    volume.user = userAddress;
    volume.timestamp = timestamp;
    volume.entryCount = 0;
    volume.totalSize = BigInt.fromI32(0);
    volume.isCurrent = true;
    
    // Mark previous volumes as not current
    let previousVolumes = user.volumes.load();
    for (let i = 0; i < previousVolumes.length; i++) {
      previousVolumes[i].isCurrent = false;
      previousVolumes[i].save();
    }
    
    user.totalVolumes += 1;
  }
  
  volume.cid = cid;
  volume.save();
  
  // Fetch IPFS data and create entries
  let ipfsData = fetchIPFSData(cid);
  
  if (ipfsData != null) {
    let volumeData = ipfsData.toObject();
    
    if (volumeData != null) {
      let entries = volumeData.get("entries");
      
      if (entries != null && !entries.isNull()) {
        let entriesArray = entries.toArray();
        volume.entryCount = entriesArray.length;
        
        // Process each entry
        for (let i = 0; i < entriesArray.length; i++) {
          let entryObj = entriesArray[i].toObject();
          if (entryObj == null) continue;
          
          let entryId = volumeId + "-" + i.toString();
          let entry = DiaryEntry.load(entryId);
          let isNewEntry = entry == null;
          
          if (entry == null) {
            entry = new DiaryEntry(entryId);
            entry.volume = volumeId;
            entry.user = userAddress;
            entry.entryIndex = i;
            
            let textField = entryObj.get("text");
            entry.text = textField != null && !textField.isNull() ? textField.toString() : "";
            
            let timestampField = entryObj.get("timestamp");
            let entryTimestamp = timestampField != null && !timestampField.isNull() 
              ? BigInt.fromString(timestampField.toString()) 
              : timestamp;
            entry.timestamp = entryTimestamp;
            entry.dayOfYear = getDayOfYear(entryTimestamp);
            
            let imageCIDsField = entryObj.get("imageCIDs");
            let imageCIDs: string[] = [];
            if (imageCIDsField != null && !imageCIDsField.isNull()) {
              let imageCIDsArray = imageCIDsField.toArray();
              for (let j = 0; j < imageCIDsArray.length; j++) {
                imageCIDs.push(imageCIDsArray[j].toString());
              }
            }
            entry.imageCIDs = imageCIDs;
            
            entry.save();
            
            if (isNewEntry) {
              user.totalEntries += 1;
            }
          }
        }
        
        volume.save();
      }
    }
  }
  
  // Recalculate streak
  user.streak = calculateStreak(user);
  user.updatedAt = timestamp;
  user.save();
  
  // Update global stats
  if (isNewVolume) {
    updateGlobalStats(timestamp, false, true, true, false);
  } else {
    updateGlobalStats(timestamp, false, false, true, false);
  }
}

export function handleRewardIssued(event: RewardIssued): void {
  let userAddress = event.params.user.toHexString();
  let timestamp = event.params.timestamp;
  
  // Get or create user
  let user = getOrCreateUser(userAddress, timestamp);
  user.lastRewardTimestamp = timestamp;
  user.updatedAt = timestamp;
  user.save();
  
  // Create reward entity
  let rewardId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let reward = new Reward(rewardId);
  reward.user = userAddress;
  reward.timestamp = timestamp;
  reward.blockNumber = event.block.number;
  reward.save();
  
  // Update global stats
  let stats = GlobalStats.load("global");
  if (stats != null) {
    stats.totalRewards = stats.totalRewards.plus(BigInt.fromI32(1));
    stats.updatedAt = timestamp;
    stats.save();
  }
}

export function handlePremiumStatusChanged(event: PremiumStatusChanged): void {
  let userAddress = event.params.user.toHexString();
  let isPremium = event.params.isPremium;
  let timestamp = event.block.timestamp;
  
  // Get or create user
  let user = getOrCreateUser(userAddress, timestamp);
  let wasPremium = user.isPremium;
  user.isPremium = isPremium;
  user.updatedAt = timestamp;
  user.save();
  
  // Create status change entity
  let statusChangeId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let statusChange = new PremiumStatusChange(statusChangeId);
  statusChange.user = userAddress;
  statusChange.isPremium = isPremium;
  statusChange.timestamp = timestamp;
  statusChange.blockNumber = event.block.number;
  statusChange.save();
  
  // Update global stats
  let stats = GlobalStats.load("global");
  if (stats != null) {
    if (isPremium && !wasPremium) {
      stats.premiumUsers += 1;
    } else if (!isPremium && wasPremium) {
      stats.premiumUsers -= 1;
    }
    stats.updatedAt = timestamp;
    stats.save();
  }
}
