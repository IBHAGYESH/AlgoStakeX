import algosdk from "algosdk";

// Network configurations
const NETWORK_CONFIG = {
  mainnet: {
    contractApplicationId: 749429587,
    contractWalletAddress:
      "ESEUVKN4EGRLZHQJPS7AH3ITLQMFG3LABXD4VXZVJGHZEZU2JMEMJRA6NU",
    indexerUrl: "https://mainnet-idx.algonode.cloud",
    algodUrl: "https://mainnet-api.algonode.cloud",
  },
  testnet: {
    contractApplicationId: 749429587,
    contractWalletAddress:
      "ESEUVKN4EGRLZHQJPS7AH3ITLQMFG3LABXD4VXZVJGHZEZU2JMEMJRA6NU",
    indexerUrl: "https://testnet-idx.algonode.cloud",
    algodUrl: "https://testnet-api.algonode.cloud",
  },
};

// Decode box name to extract pool ID (based on buildStakeBoxName structure)
function decodeBoxName(boxNameBytes) {
  try {
    let offset = 0;

    // Skip "stake_" prefix (6 bytes)
    const prefix = new TextDecoder().decode(boxNameBytes.slice(0, 6));
    if (prefix !== "stake_") {
      return null; // Not a stake box
    }
    offset += 6;

    // Read poolId length (2 bytes, big-endian)
    const view = new DataView(
      boxNameBytes.buffer,
      boxNameBytes.byteOffset,
      boxNameBytes.byteLength
    );
    const poolIdLength = view.getUint16(offset, false);
    offset += 2;

    // Read poolId bytes
    const poolIdBytes = boxNameBytes.slice(offset, offset + poolIdLength);
    const poolId = new TextDecoder().decode(poolIdBytes);
    offset += poolIdLength;

    // Read separator length (2 bytes, big-endian)
    const separatorLength = view.getUint16(offset, false);
    offset += 2;

    // Read separator bytes (should be "_")
    const separatorBytes = boxNameBytes.slice(offset, offset + separatorLength);
    const separator = new TextDecoder().decode(separatorBytes);
    offset += separatorLength;

    // Remaining 32 bytes are user address
    const userAddressBytes = boxNameBytes.slice(offset, offset + 32);
    const userAddress = algosdk.encodeAddress(userAddressBytes);

    return {
      poolId,
      separator,
      userAddress,
      isValid: separator === "_",
    };
  } catch (error) {
    console.warn("Error decoding box name:", error);
    return null;
  }
}

// SDK utility function for decoding stake data (copied exactly from utils.js)
function decodeStakeData(boxValueBytes) {
  try {
    const view = new DataView(
      boxValueBytes.buffer,
      boxValueBytes.byteOffset,
      boxValueBytes.byteLength
    );
    let offset = 0;

    // Decode staker (32 bytes)
    const stakerBytes = boxValueBytes.slice(offset, offset + 32);
    const staker = algosdk.encodeAddress(stakerBytes);
    offset += 32;

    // Decode tokenId (8 bytes, big-endian)
    const tokenId = view.getBigUint64(offset, false);
    offset += 8;

    // Decode isFlexible (1 byte)
    const isFlexible = boxValueBytes[offset] !== 0;
    offset += 1;

    // Decode amount (8 bytes, big-endian)
    const amount = view.getBigUint64(offset, false);
    offset += 8;

    // Decode stakedAt (8 bytes, big-endian)
    const stakedAt = view.getBigUint64(offset, false);
    offset += 8;

    // Decode lockPeriod (8 bytes, big-endian)
    const lockPeriod = view.getBigUint64(offset, false);
    offset += 8;

    // Decode lockEndTime (8 bytes, big-endian)
    const lockEndTime = view.getBigUint64(offset, false);
    offset += 8;

    // Decode dynamic fields with offset pointers
    const rewardTypeOffset = view.getUint16(offset, false);
    offset += 2;

    const rewardRate = view.getBigUint64(offset, false);
    offset += 8;

    const utilityOffset = view.getUint16(offset, false);
    offset += 2;

    // Decode rewardType string
    let rewardTypeLength = view.getUint16(rewardTypeOffset, false);
    let rewardTypeBytes = boxValueBytes.slice(
      rewardTypeOffset + 2,
      rewardTypeOffset + 2 + rewardTypeLength
    );
    const rewardType = new TextDecoder().decode(rewardTypeBytes);

    // Decode utility string
    let utilityLength = view.getUint16(utilityOffset, false);
    let utilityBytes = boxValueBytes.slice(
      utilityOffset + 2,
      utilityOffset + 2 + utilityLength
    );
    const utility = new TextDecoder().decode(utilityBytes);

    return {
      staker: staker,
      tokenId: Number(tokenId),
      isFlexible: isFlexible,
      amount: Number(amount),
      stakedAt: Number(stakedAt),
      lockPeriod: Number(lockPeriod),
      lockEndTime: Number(lockEndTime),
      rewardType: rewardType,
      rewardRate: Number(rewardRate),
      utility: utility,
    };
  } catch (error) {
    console.error("Error decoding stake data:", error);
    throw error;
  }
}

class AlgorandService {
  constructor(network = "testnet") {
    this.network = network;
    this.config = NETWORK_CONFIG[network];

    // Initialize algod client
    this.algodClient = new algosdk.Algodv2("", this.config.algodUrl, 443);
  }

  // Switch network
  switchNetwork(network) {
    this.network = network;
    this.config = NETWORK_CONFIG[network];

    this.algodClient = new algosdk.Algodv2("", this.config.algodUrl, 443);
  }

  // Get all boxes for the application using REST API
  async getAllApplicationBoxes() {
    try {
      const url = `${this.config.algodUrl}/v2/applications/${this.config.contractApplicationId}/boxes`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.boxes || [];
    } catch (error) {
      console.error("Error fetching application boxes:", error);
      throw error;
    }
  }

  // Get specific box data using REST API
  async getBoxData(boxNameBase64) {
    try {
      // Algorand API expects format: encoding:value (e.g., b64:base64string)
      const encodedName = `b64:${boxNameBase64}`;
      const url = `${this.config.algodUrl}/v2/applications/${
        this.config.contractApplicationId
      }/box?name=${encodeURIComponent(encodedName)}`;

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          return null; // Box not found
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching box data:", error);
      throw error;
    }
  }

  // Get pool data by fetching all boxes and filtering by pool ID
  async getPoolData(poolId) {
    try {
      console.log(`Fetching pool data for ${poolId} on ${this.network}`);

      // Get all application boxes
      const allBoxes = await this.getAllApplicationBoxes();

      if (!allBoxes || allBoxes.length === 0) {
        throw new Error(`No boxes found for contract application`);
      }

      console.log(`Found ${allBoxes.length} total boxes`);

      // Filter boxes for this pool ID using proper ARC-4 decoding
      const poolBoxes = [];

      for (const box of allBoxes) {
        try {
          // Decode box name from base64
          const boxNameBytes = new Uint8Array(
            atob(box.name)
              .split("")
              .map((c) => c.charCodeAt(0))
          );

          // Decode the ARC-4 structured box name
          const decodedBoxName = decodeBoxName(boxNameBytes);

          if (
            decodedBoxName &&
            decodedBoxName.isValid &&
            decodedBoxName.poolId === poolId
          ) {
            console.log(
              `Found matching box for pool ${poolId}: ${decodedBoxName.userAddress}`
            );

            // Get the full box data using the original base64 name
            const boxData = await this.getBoxData(box.name);

            if (boxData && boxData.value) {
              // Decode box value from base64
              const boxValueBytes = new Uint8Array(
                atob(boxData.value)
                  .split("")
                  .map((c) => c.charCodeAt(0))
              );
              const stakeData = decodeStakeData(boxValueBytes);

              poolBoxes.push({
                boxName: `stake_${decodedBoxName.poolId}_${decodedBoxName.userAddress}`,
                userAddress: decodedBoxName.userAddress,
                stakeData,
              });
            }
          }
        } catch (error) {
          console.warn(`Failed to process box:`, error);
        }
      }

      console.log(`Found ${poolBoxes.length} boxes for pool ${poolId}`);

      if (poolBoxes.length === 0) {
        throw new Error(`Pool ${poolId} not found`);
      }

      // Calculate pool metrics from real stake data
      const poolMetrics = this.calculatePoolMetricsFromStakes(poolBoxes);

      return {
        poolId,
        network: this.network,
        ...poolMetrics,
        stakes: poolBoxes,
      };
    } catch (error) {
      console.error("Error fetching pool data:", error);
      throw error;
    }
  }

  // Calculate pool metrics from real stake data
  calculatePoolMetricsFromStakes(stakes) {
    const now = Date.now() / 1000;

    let totalStaked = 0;
    let totalRewards = 0;
    const uniqueStakers = new Set();
    const stakingTypes = new Set();
    const rewardTypes = new Set();

    let earliestStake = now;
    let latestStake = 0;
    let totalTransactions = stakes.length;

    stakes.forEach(({ stakeData }) => {
      totalStaked += stakeData.amount;
      uniqueStakers.add(stakeData.staker);
      stakingTypes.add(stakeData.isFlexible ? "Flexible" : "Fixed");
      rewardTypes.add(stakeData.rewardType);

      if (stakeData.stakedAt < earliestStake) {
        earliestStake = stakeData.stakedAt;
      }
      if (stakeData.stakedAt > latestStake) {
        latestStake = stakeData.stakedAt;
      }

      // Calculate rewards based on APY and time staked (like SDK does)
      if (stakeData.rewardType === "APY" && stakeData.rewardRate > 0) {
        const timeStaked = now - stakeData.stakedAt;
        const YEAR_SECONDS = 365 * 24 * 60 * 60;
        const rateBP = stakeData.rewardRate;
        const amountRaw = stakeData.amount;

        if (rateBP > 0 && amountRaw > 0 && timeStaked > 0) {
          const reward = Math.floor(
            (amountRaw * rateBP * timeStaked) / (10000 * YEAR_SECONDS)
          );
          totalRewards += reward;
        }
      }
    });

    // Convert to display units (assuming 6 decimals like ALGO)
    const totalValue = totalStaked / 1000000;
    const rewardsPaid = totalRewards / 1000000;

    // Calculate weighted APY
    let weightedAPY = 0;
    if (totalStaked > 0) {
      stakes.forEach(({ stakeData }) => {
        if (stakeData.rewardType === "APY") {
          const weight = stakeData.amount / totalStaked;
          weightedAPY += (stakeData.rewardRate / 100) * weight;
        }
      });
    }

    // Calculate total rewards (estimated based on staking amounts and time)
    const totalRewardsEstimated = stakes.reduce((sum, stake) => {
      const stakingDays = Math.max(1, Math.floor((Date.now() - stake.stakeData.stakedAt) / (1000 * 60 * 60 * 24)));
      const dailyReward = (stake.stakeData.amount * (weightedAPY / 100)) / 365;
      return sum + (dailyReward * stakingDays);
    }, 0);

    // Calculate average staking time
    const avgStakingTime = stakes.length > 0 
      ? Math.floor(stakes.reduce((sum, stake) => {
          const stakingDays = Math.floor((Date.now() - stake.stakeData.stakedAt) / (1000 * 60 * 60 * 24));
          return sum + stakingDays;
        }, 0) / stakes.length)
      : 0;

    return {
      status: "Active",
      totalValue,
      totalStakers: uniqueStakers.size,
      apy: weightedAPY,
      totalRewards: rewardsPaid,
      totalRewardsEstimated: Math.floor(totalRewardsEstimated),
      avgStakingTime,
      stakingType: Array.from(stakingTypes).join(", ") || "Flexible",
      lockPeriod: "Variable",
      minStake: 1,
      withdrawalPenalty: 0,
      createdAt: new Date(earliestStake * 1000).toISOString(),
      lastUpdated: new Date(latestStake * 1000).toISOString(),
      totalTransactions,
      averageStake:
        uniqueStakers.size > 0 ? totalValue / uniqueStakers.size : 0,
      monthlyVolume: totalValue,
      rewardsPaid,
      successRate: 99.9,
      avgStakeDuration: 30,
    };
  }

  // Get staking history from real data
  async getStakingHistory(poolId, days = 30) {
    try {
      const poolData = await this.getPoolData(poolId);
      const stakes = poolData.stakes;

      // Group stakes by day based on their stakedAt timestamp
      const dailyData = {};
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;

      // Initialize days
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now - i * oneDayMs);
        const dateStr = date.toISOString().split("T")[0];
        dailyData[dateStr] = {
          date: dateStr,
          totalStaked: 0,
          stakers: 0,
          rewards: 0,
          transactions: 0,
        };
      }

      // Process stakes chronologically
      let cumulativeStaked = 0;
      const processedStakers = new Set();

      stakes
        .sort((a, b) => a.stakeData.stakedAt - b.stakeData.stakedAt)
        .forEach(({ stakeData }) => {
          const stakeDate = new Date(stakeData.stakedAt * 1000);
          const dateStr = stakeDate.toISOString().split("T")[0];

          if (dailyData[dateStr]) {
            cumulativeStaked += stakeData.amount;
            processedStakers.add(stakeData.staker);

            dailyData[dateStr].totalStaked = cumulativeStaked / 1000000;
            dailyData[dateStr].stakers = processedStakers.size;
            dailyData[dateStr].transactions++;

            // Calculate daily rewards
            if (stakeData.rewardType === "APY" && stakeData.rewardRate > 0) {
              const dailyReward =
                (stakeData.amount * stakeData.rewardRate) / 10000 / 365;
              dailyData[dateStr].rewards += dailyReward / 1000000;
            }
          }
        });

      return Object.values(dailyData);
    } catch (error) {
      console.error("Error fetching staking history:", error);
      throw error;
    }
  }

  // Get top stakers from real data
  async getTopStakers(poolId, limit = 50) {
    try {
      const poolData = await this.getPoolData(poolId);
      const stakes = poolData.stakes;

      // Convert stakes to staker format
      const stakers = stakes
        .map((stake, index) => ({
          id: index + 1,
          address: stake.stakeData.staker,
          stakedAmount: stake.stakeData.amount / 1000000,
          rewards: this.calculateRewards(stake.stakeData) / 1000000,
          joinDate: new Date(stake.stakeData.stakedAt * 1000)
            .toISOString()
            .split("T")[0],
          transactions: 1, // Each stake is one transaction
          status: "Active",
          tier: this.calculateTier(stake.stakeData.amount / 1000000),
          stakingType: stake.stakeData.isFlexible ? "Flexible" : "Fixed",
          rewardType: stake.stakeData.rewardType,
        }))
        .sort((a, b) => b.stakedAmount - a.stakedAmount)
        .slice(0, limit);

      return stakers;
    } catch (error) {
      console.error("Error fetching top stakers:", error);
      throw error;
    }
  }

  // Calculate rewards for a stake (like SDK does)
  calculateRewards(stakeData) {
    if (stakeData.rewardType !== "APY" || stakeData.rewardRate <= 0) {
      return 0;
    }

    const now = Date.now() / 1000;
    const timeStaked = Math.max(0, now - stakeData.stakedAt);
    const YEAR_SECONDS = 365 * 24 * 60 * 60;
    const rateBP = stakeData.rewardRate;
    const amountRaw = stakeData.amount;

    if (rateBP > 0 && amountRaw > 0 && timeStaked > 0) {
      return Math.floor(
        (amountRaw * rateBP * timeStaked) / (10000 * YEAR_SECONDS)
      );
    }

    return 0;
  }

  // Calculate tier based on staked amount
  calculateTier(stakedAmount) {
    if (stakedAmount >= 5000) return "Platinum";
    if (stakedAmount >= 1000) return "Gold";
    if (stakedAmount >= 500) return "Silver";
    return "Bronze";
  }

  // Get network status
  async getNetworkStatus() {
    try {
      const status = await this.algodClient.status().do();
      return {
        network: this.network,
        lastRound: status["last-round"],
        timeSinceLastRound: status["time-since-last-round"],
        catchupTime: status["catchup-time"],
      };
    } catch (error) {
      console.error("Error fetching network status:", error);
      throw error;
    }
  }
}

export default AlgorandService;
