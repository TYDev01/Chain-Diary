import { expect } from "chai";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { CeloDiary } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("CeloDiary", function () {
  let celoDiary: CeloDiary;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  
  const ONE_DAY = 24 * 60 * 60; // 1 day in seconds
  const SAMPLE_CID = "QmSampleCID123456789";
  const SAMPLE_CID_2 = "QmSampleCID987654321";

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await hre.ethers.getSigners();
    
    // Deploy contract
    const CeloDiary = await hre.ethers.getContractFactory("CeloDiary");
    celoDiary = await CeloDiary.deploy();
    await celoDiary.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await celoDiary.owner()).to.equal(owner.address);
    });

    it("Should have correct constants", async function () {
      expect(await celoDiary.ONE_DAY()).to.equal(ONE_DAY);
      expect(await celoDiary.MAX_FREE_IMAGES()).to.equal(5);
    });
  });

  describe("Diary Updates", function () {
    it("Should allow users to update diary", async function () {
      const tx = await celoDiary.connect(user1).updateDiary(SAMPLE_CID);
      const receipt = await tx.wait();
      
      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "DiaryUpdated"
      );
      expect(event).to.not.be.undefined;
      if (event) {
        expect((event as any).args[0]).to.equal(user1.address);
        expect((event as any).args[1]).to.equal(SAMPLE_CID);
      }
    });

    it("Should reject empty CID", async function () {
      await expect(celoDiary.connect(user1).updateDiary(""))
        .to.be.revertedWith("CID cannot be empty");
    });

    it("Should return correct latest CID", async function () {
      await celoDiary.connect(user1).updateDiary(SAMPLE_CID);
      expect(await celoDiary.latestCID(user1.address)).to.equal(SAMPLE_CID);
    });

    it("Should return empty string if no volumes", async function () {
      expect(await celoDiary.latestCID(user1.address)).to.equal("");
    });

    it("Should create multiple volumes", async function () {
      await celoDiary.connect(user1).updateDiary(SAMPLE_CID);
      await celoDiary.connect(user1).updateDiary(SAMPLE_CID_2);
      
      const volumes = await celoDiary.getUserVolumes(user1.address);
      expect(volumes.length).to.equal(2);
      expect(volumes[0].cid).to.equal(SAMPLE_CID);
      expect(volumes[1].cid).to.equal(SAMPLE_CID_2);
    });

    it("Should return correct volume count", async function () {
      await celoDiary.connect(user1).updateDiary(SAMPLE_CID);
      await celoDiary.connect(user1).updateDiary(SAMPLE_CID_2);
      
      expect(await celoDiary.getVolumeCount(user1.address)).to.equal(2);
    });

    it("Should get specific volume by index", async function () {
      await celoDiary.connect(user1).updateDiary(SAMPLE_CID);
      const volume = await celoDiary.getVolumeAtIndex(user1.address, 0);
      expect(volume.cid).to.equal(SAMPLE_CID);
    });

    it("Should revert when getting invalid volume index", async function () {
      await celoDiary.connect(user1).updateDiary(SAMPLE_CID);
      await expect(celoDiary.getVolumeAtIndex(user1.address, 5))
        .to.be.revertedWith("Volume index out of bounds");
    });
  });

  describe("Daily Rewards", function () {
    it("Should issue reward on first diary update", async function () {
      const tx = await celoDiary.connect(user1).updateDiary(SAMPLE_CID);
      const receipt = await tx.wait();
      
      // Check for RewardIssued event
      const rewardEvent = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "RewardIssued"
      );
      expect(rewardEvent).to.not.be.undefined;
    });

    it("Should not issue reward twice in same day", async function () {
      // First update - should issue reward
      await celoDiary.connect(user1).updateDiary(SAMPLE_CID);
      
      // Second update same day - should not issue reward
      const tx = await celoDiary.connect(user1).updateDiary(SAMPLE_CID_2);
      const receipt = await tx.wait();
      
      const rewardEvents = receipt?.logs.filter(
        (log: any) => log.fragment && log.fragment.name === "RewardIssued"
      );
      expect(rewardEvents?.length || 0).to.equal(0);
    });

    it("Should issue reward after 24 hours", async function () {
      // First update
      await celoDiary.connect(user1).updateDiary(SAMPLE_CID);
      
      // Fast forward 24 hours + 1 second
      await time.increase(ONE_DAY + 1);
      
      // Second update - should issue reward
      const tx = await celoDiary.connect(user1).updateDiary(SAMPLE_CID_2);
      const receipt = await tx.wait();
      
      const rewardEvent = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "RewardIssued"
      );
      expect(rewardEvent).to.not.be.undefined;
    });

    it("Should correctly report reward eligibility", async function () {
      // Initially eligible (no reward yet)
      expect(await celoDiary.isEligibleForReward(user1.address)).to.be.true;
      
      // After update, not eligible
      await celoDiary.connect(user1).updateDiary(SAMPLE_CID);
      expect(await celoDiary.isEligibleForReward(user1.address)).to.be.false;
      
      // After 24 hours, eligible again
      await time.increase(ONE_DAY + 1);
      expect(await celoDiary.isEligibleForReward(user1.address)).to.be.true;
    });

    it("Should correctly calculate time until next reward", async function () {
      await celoDiary.connect(user1).updateDiary(SAMPLE_CID);
      
      const timeUntilNext = await celoDiary.timeUntilNextReward(user1.address);
      expect(timeUntilNext).to.be.closeTo(BigInt(ONE_DAY), BigInt(5)); // Allow 5 second tolerance
      
      // After 12 hours
      await time.increase(ONE_DAY / 2);
      const timeUntilNext2 = await celoDiary.timeUntilNextReward(user1.address);
      expect(timeUntilNext2).to.be.closeTo(BigInt(ONE_DAY / 2), BigInt(5));
      
      // After 24+ hours
      await time.increase(ONE_DAY / 2 + 1);
      expect(await celoDiary.timeUntilNextReward(user1.address)).to.equal(0);
    });
  });

  describe("Premium Status", function () {
    it("Should allow owner to set premium status", async function () {
      await expect(celoDiary.setPremium(user1.address, true))
        .to.emit(celoDiary, "PremiumStatusChanged")
        .withArgs(user1.address, true);
      
      expect(await celoDiary.premiumUser(user1.address)).to.be.true;
    });

    it("Should not allow non-owner to set premium status", async function () {
      await expect(celoDiary.connect(user1).setPremium(user2.address, true))
        .to.be.revertedWithCustomError(celoDiary, "OwnableUnauthorizedAccount");
    });

    it("Should reject zero address", async function () {
      await expect(celoDiary.setPremium(hre.ethers.ZeroAddress, true))
        .to.be.revertedWith("Invalid user address");
    });

    it("Should toggle premium status", async function () {
      await celoDiary.setPremium(user1.address, true);
      expect(await celoDiary.premiumUser(user1.address)).to.be.true;
      
      await celoDiary.setPremium(user1.address, false);
      expect(await celoDiary.premiumUser(user1.address)).to.be.false;
    });
  });

  describe("Image Upload Limits", function () {
    it("Should allow free users to upload up to 5 images", async function () {
      for (let i = 0; i < 5; i++) {
        await expect(celoDiary.connect(user1).incrementImageUpload())
          .to.emit(celoDiary, "FreeImageUploaded")
          .withArgs(user1.address, i + 1);
      }
      
      expect(await celoDiary.freeImageUploadsUsed(user1.address)).to.equal(5);
    });

    it("Should reject 6th image upload for free users", async function () {
      for (let i = 0; i < 5; i++) {
        await celoDiary.connect(user1).incrementImageUpload();
      }
      
      await expect(celoDiary.connect(user1).incrementImageUpload())
        .to.be.revertedWith("Free image limit reached. Upgrade to premium for unlimited uploads.");
    });

    it("Should allow premium users unlimited uploads", async function () {
      await celoDiary.setPremium(user1.address, true);
      
      // Try uploading more than 5 images
      for (let i = 0; i < 10; i++) {
        await celoDiary.connect(user1).incrementImageUpload();
      }
      
      // Counter should remain 0 for premium users
      expect(await celoDiary.freeImageUploadsUsed(user1.address)).to.equal(0);
    });

    it("Should correctly report image upload ability", async function () {
      expect(await celoDiary.canUploadImage(user1.address)).to.be.true;
      
      // Upload 5 images
      for (let i = 0; i < 5; i++) {
        await celoDiary.connect(user1).incrementImageUpload();
      }
      
      expect(await celoDiary.canUploadImage(user1.address)).to.be.false;
      
      // Grant premium
      await celoDiary.setPremium(user1.address, true);
      expect(await celoDiary.canUploadImage(user1.address)).to.be.true;
    });

    it("Should not increment counter for premium users", async function () {
      await celoDiary.setPremium(user1.address, true);
      await celoDiary.connect(user1).incrementImageUpload();
      await celoDiary.connect(user1).incrementImageUpload();
      
      expect(await celoDiary.freeImageUploadsUsed(user1.address)).to.equal(0);
    });
  });

  describe("User Status", function () {
    it("Should return comprehensive user status", async function () {
      // Upload some images and create entries
      await celoDiary.connect(user1).incrementImageUpload();
      await celoDiary.connect(user1).incrementImageUpload();
      await celoDiary.connect(user1).updateDiary(SAMPLE_CID);
      
      const status = await celoDiary.getUserStatus(user1.address);
      
      expect(status.isPremium).to.be.false;
      expect(status.imagesUsed).to.equal(2);
      expect(status.volumeCount).to.equal(1);
      expect(status.lastReward).to.be.greaterThan(0);
      expect(status.nextRewardIn).to.be.closeTo(BigInt(ONE_DAY), BigInt(5));
    });

    it("Should show correct status for premium user", async function () {
      await celoDiary.setPremium(user1.address, true);
      await celoDiary.connect(user1).incrementImageUpload();
      await celoDiary.connect(user1).incrementImageUpload();
      
      const status = await celoDiary.getUserStatus(user1.address);
      
      expect(status.isPremium).to.be.true;
      expect(status.imagesUsed).to.equal(0); // Premium users don't increment counter
    });

    it("Should show zero nextRewardIn when eligible", async function () {
      await celoDiary.connect(user1).updateDiary(SAMPLE_CID);
      
      // Fast forward past reward cooldown
      await time.increase(ONE_DAY + 1);
      
      const status = await celoDiary.getUserStatus(user1.address);
      expect(status.nextRewardIn).to.equal(0);
    });
  });

  describe("Multiple Users", function () {
    it("Should handle multiple users independently", async function () {
      await celoDiary.connect(user1).updateDiary(SAMPLE_CID);
      await celoDiary.connect(user2).updateDiary(SAMPLE_CID_2);
      
      expect(await celoDiary.latestCID(user1.address)).to.equal(SAMPLE_CID);
      expect(await celoDiary.latestCID(user2.address)).to.equal(SAMPLE_CID_2);
      
      const volumes1 = await celoDiary.getUserVolumes(user1.address);
      const volumes2 = await celoDiary.getUserVolumes(user2.address);
      
      expect(volumes1.length).to.equal(1);
      expect(volumes2.length).to.equal(1);
    });

    it("Should track image uploads independently", async function () {
      await celoDiary.connect(user1).incrementImageUpload();
      await celoDiary.connect(user1).incrementImageUpload();
      await celoDiary.connect(user2).incrementImageUpload();
      
      expect(await celoDiary.freeImageUploadsUsed(user1.address)).to.equal(2);
      expect(await celoDiary.freeImageUploadsUsed(user2.address)).to.equal(1);
    });

    it("Should track rewards independently", async function () {
      await celoDiary.connect(user1).updateDiary(SAMPLE_CID);
      await time.increase(ONE_DAY / 2); // 12 hours
      await celoDiary.connect(user2).updateDiary(SAMPLE_CID_2);
      
      const time1 = await celoDiary.timeUntilNextReward(user1.address);
      const time2 = await celoDiary.timeUntilNextReward(user2.address);
      
      // user1 should have less time remaining than user2
      expect(time1).to.be.lessThan(time2);
    });
  });

  describe("Reentrancy Protection", function () {
    it("Should have reentrancy guards on critical functions", async function () {
      // updateDiary and incrementImageUpload use nonReentrant modifier
      // This test ensures the contract compiles with these modifiers
      // Actual reentrancy attacks would require a malicious contract
      
      await expect(celoDiary.connect(user1).updateDiary(SAMPLE_CID))
        .to.not.be.reverted;
      
      await expect(celoDiary.connect(user1).incrementImageUpload())
        .to.not.be.reverted;
    });
  });
});
