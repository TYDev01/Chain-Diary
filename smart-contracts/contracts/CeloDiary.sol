// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CeloDiary
 * @dev Decentralized diary contract for Chain Diary application
 * @notice This contract manages diary volumes, rewards, and premium features
 */
contract CeloDiary is Ownable, ReentrancyGuard {
    // ============ Structs ============
    
    /**
     * @dev Represents a diary volume stored on IPFS
     */
    struct DiaryVolume {
        string cid;           // IPFS CID of the volume
        uint256 timestamp;    // Creation timestamp
    }

    // ============ State Variables ============
    
    /// @dev Maps user addresses to their diary volumes
    mapping(address => DiaryVolume[]) public userVolumes;
    
    /// @dev Maps user addresses to their last reward timestamp
    mapping(address => uint256) public lastRewardTimestamp;
    
    /// @dev Maps user addresses to count of free image uploads used
    mapping(address => uint8) public freeImageUploadsUsed;
    
    /// @dev Maps user addresses to premium status
    mapping(address => bool) public premiumUser;
    
    /// @dev Constant for 1 day in seconds
    uint256 public constant ONE_DAY = 1 days;
    
    /// @dev Maximum free image uploads for non-premium users
    uint8 public constant MAX_FREE_IMAGES = 5;

    // ============ Events ============
    
    /**
     * @dev Emitted when a user updates their diary
     * @param user Address of the user
     * @param cid IPFS CID of the new volume
     * @param timestamp Time of the update
     */
    event DiaryUpdated(
        address indexed user,
        string cid,
        uint256 timestamp
    );
    
    /**
     * @dev Emitted when a user receives a daily reward
     * @param user Address of the user
     * @param timestamp Time of the reward
     */
    event RewardIssued(
        address indexed user,
        uint256 timestamp
    );
    
    /**
     * @dev Emitted when a user's premium status changes
     * @param user Address of the user
     * @param premium New premium status
     */
    event PremiumStatusChanged(
        address indexed user,
        bool premium
    );
    
    /**
     * @dev Emitted when a user uploads an image (free tier tracking)
     * @param user Address of the user
     * @param count Current count of free images used
     */
    event FreeImageUploaded(
        address indexed user,
        uint8 count
    );

    // ============ Constructor ============
    
    constructor() Ownable(msg.sender) {}

    // ============ External Functions ============
    
    /**
     * @dev Updates user's diary with a new IPFS CID
     * @notice Checks for daily reward eligibility
     * @param cid IPFS CID of the new volume
     */
    function updateDiary(string calldata cid) external nonReentrant {
        require(bytes(cid).length > 0, "CID cannot be empty");
        
        // Create new volume
        userVolumes[msg.sender].push(DiaryVolume({
            cid: cid,
            timestamp: block.timestamp
        }));
        
        // Check and issue reward if eligible
        _rewardUser(msg.sender);
        
        emit DiaryUpdated(msg.sender, cid, block.timestamp);
    }
    
    /**
     * @dev Returns the latest IPFS CID for a user
     * @param user Address of the user
     * @return Latest CID or empty string if no volumes exist
     */
    function latestCID(address user) external view returns (string memory) {
        uint256 volumeCount = userVolumes[user].length;
        if (volumeCount == 0) {
            return "";
        }
        return userVolumes[user][volumeCount - 1].cid;
    }
    
    /**
     * @dev Returns all volumes for a user
     * @param user Address of the user
     * @return Array of DiaryVolume structs
     */
    function getUserVolumes(address user) external view returns (DiaryVolume[] memory) {
        return userVolumes[user];
    }
    
    /**
     * @dev Sets premium status for a user (owner only)
     * @param user Address of the user
     * @param status Premium status to set
     */
    function setPremium(address user, bool status) external onlyOwner {
        require(user != address(0), "Invalid user address");
        premiumUser[user] = status;
        emit PremiumStatusChanged(user, status);
    }
    
    /**
     * @dev Increments free image upload counter for a user
     * @notice Only callable for non-premium users who haven't reached the limit
     */
    function incrementImageUpload() external nonReentrant {
        require(
            premiumUser[msg.sender] || freeImageUploadsUsed[msg.sender] < MAX_FREE_IMAGES,
            "Free image limit reached. Upgrade to premium for unlimited uploads."
        );
        
        if (!premiumUser[msg.sender]) {
            freeImageUploadsUsed[msg.sender]++;
            emit FreeImageUploaded(msg.sender, freeImageUploadsUsed[msg.sender]);
        }
    }
    
    /**
     * @dev Checks if a user can upload more images
     * @param user Address of the user
     * @return True if user can upload, false otherwise
     */
    function canUploadImage(address user) external view returns (bool) {
        return premiumUser[user] || freeImageUploadsUsed[user] < MAX_FREE_IMAGES;
    }
    
    /**
     * @dev Checks if a user is eligible for a reward
     * @param user Address of the user
     * @return True if eligible, false otherwise
     */
    function isEligibleForReward(address user) external view returns (bool) {
        return block.timestamp >= lastRewardTimestamp[user] + ONE_DAY;
    }
    
    /**
     * @dev Gets time until next reward is available
     * @param user Address of the user
     * @return Seconds until next reward (0 if already eligible)
     */
    function timeUntilNextReward(address user) external view returns (uint256) {
        uint256 nextRewardTime = lastRewardTimestamp[user] + ONE_DAY;
        if (block.timestamp >= nextRewardTime) {
            return 0;
        }
        return nextRewardTime - block.timestamp;
    }
    
    /**
     * @dev Gets comprehensive user status
     * @param user Address of the user
     * @return isPremium Premium status
     * @return imagesUsed Number of free images used
     * @return volumeCount Number of volumes created
     * @return lastReward Last reward timestamp
     * @return nextRewardIn Seconds until next reward
     */
    function getUserStatus(address user) 
        external 
        view 
        returns (
            bool isPremium,
            uint8 imagesUsed,
            uint256 volumeCount,
            uint256 lastReward,
            uint256 nextRewardIn
        ) 
    {
        isPremium = premiumUser[user];
        imagesUsed = freeImageUploadsUsed[user];
        volumeCount = userVolumes[user].length;
        lastReward = lastRewardTimestamp[user];
        
        uint256 nextRewardTime = lastReward + ONE_DAY;
        nextRewardIn = block.timestamp >= nextRewardTime ? 0 : nextRewardTime - block.timestamp;
    }

    // ============ Internal Functions ============
    
    /**
     * @dev Internal function to reward user if eligible
     * @param user Address of the user
     */
    function _rewardUser(address user) internal {
        // Check if eligible for reward (24 hours since last reward)
        if (block.timestamp >= lastRewardTimestamp[user] + ONE_DAY) {
            lastRewardTimestamp[user] = block.timestamp;
            emit RewardIssued(user, block.timestamp);
        }
    }
    
    /**
     * @dev Returns the number of volumes for a user
     * @param user Address of the user
     * @return Number of volumes
     */
    function getVolumeCount(address user) external view returns (uint256) {
        return userVolumes[user].length;
    }
    
    /**
     * @dev Gets a specific volume by index
     * @param user Address of the user
     * @param index Volume index
     * @return DiaryVolume struct
     */
    function getVolumeAtIndex(address user, uint256 index) 
        external 
        view 
        returns (DiaryVolume memory) 
    {
        require(index < userVolumes[user].length, "Volume index out of bounds");
        return userVolumes[user][index];
    }
}
