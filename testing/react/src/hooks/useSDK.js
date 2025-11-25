import { useState, useEffect, useCallback } from "react";

// Create a singleton instance outside the hook
let sdkInstance = null;

export function useSDK() {
  const [algoStakeXClient, setAlgoStakeXClient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [treasuryConfigured, setTreasuryConfigured] = useState(false);

  const initializeSDK = useCallback(() => {
    if (window.AlgoStakeX && !sdkInstance) {
      try {
        // Initialize SDK with enhanced tiered utility rewards
        sdkInstance = new window.AlgoStakeX({
          env: "testnet", // testnet | mainnet
          namespace: "GAMEX", // unique namespace for gaming platform
          token_id: 749398662, // ASA ID - replace with actual token ID
          disableUi: false,
          disableToast: false,
          toastLocation: "TOP_RIGHT", // TOP_LEFT | TOP_RIGHT
          minimizeUILocation: "right", // left | right
          logo: "./src/assets/game-controller.png", // your website logo (URL / path to image)
          staking: {
            type: "FIXED", // FLEXIBLE | FIXED
            stake_period: 1440, // 24 hours in minutes
            withdraw_penalty: 10, // 10% penalty for early withdrawal
            reward: {
              type: "UTILITY", // APY | UTILITY
              stop_reward_on_stake_completion: false, // Allow ongoing rewards
              value: [
                {
                  name: "Explorer", // Starter tier
                  stake_amount: 5, // required
                  value: "Basic Game Access + Daily Rewards + Community Chat", // utility features
                },
                {
                  name: "Adventurer", // Mid tier
                  stake_amount: 10, // required
                  value:
                    "All Explorer Benefits + Premium Game Modes + Priority Matchmaking + Exclusive Events", // enhanced features
                },
                {
                  name: "Champion", // High tier
                  stake_amount: 15, // required
                  value:
                    "All Adventurer Benefits + VIP Support + Beta Access + Custom Avatar + Leaderboard Highlights", // premium features
                },
                {
                  name: "Legend", // Ultimate tier
                  stake_amount: 20, // required
                  value:
                    "All Champion Benefits + Private Tournaments + NFT Rewards + Developer Access + Revenue Sharing", // ultimate features
                },
              ],
            },
          },
        });

        setAlgoStakeXClient(sdkInstance);
        console.log("AlgoStakeX SDK initialized");

        // Set up treasury wallet configuration
      } catch (error) {
        console.error("SDK initialization error:", error);
      }
    } else if (sdkInstance) {
      // If SDK is already initialized, use the existing instance
      setAlgoStakeXClient(sdkInstance);
    }
  }, []);

  // Function to set up treasury wallet
  const setupTreasuryWallet = async (client) => {
    try {
      const treasuryAddress = import.meta.env.VITE_TREASURY_ADDRESS;
      const treasuryMnemonic = import.meta.env.VITE_TREASURY_MNEMONIC;

      if (treasuryAddress && treasuryMnemonic) {
        console.log("Setting up treasury wallet...");
        await client.addTreasuryWallet(treasuryAddress, treasuryMnemonic);
        setTreasuryConfigured(true);
        console.log("Treasury wallet configured successfully");
      } else {
        console.warn(
          "Treasury wallet credentials not found in environment variables"
        );
        console.warn(
          "Please set VITE_TREASURY_ADDRESS and VITE_TREASURY_MNEMONIC in your .env file"
        );
      }
    } catch (error) {
      console.error("Failed to configure treasury wallet:", error);
    }
  };

  // Function to manually add treasury wallet (can be called when wallet connects)
  const addTreasuryWallet = async () => {
    if (!algoStakeXClient) {
      console.error("SDK not initialized");
      return false;
    }

    try {
      const treasuryAddress = import.meta.env.VITE_TREASURY_ADDRESS;
      const treasuryMnemonic = import.meta.env.VITE_TREASURY_MNEMONIC;

      if (treasuryAddress && treasuryMnemonic) {
        console.log("Adding treasury wallet...");
        await algoStakeXClient.addTreasuryWallet(
          treasuryAddress,
          treasuryMnemonic
        );
        setTreasuryConfigured(true);
        console.log("Treasury wallet added successfully");
        return true;
      } else {
        console.error(
          "Treasury wallet credentials not found in environment variables"
        );
        return false;
      }
    } catch (error) {
      console.error("Failed to add treasury wallet:", error);
      return false;
    }
  };

  useEffect(() => {
    let intervalId;

    const checkAndInitializeSDK = () => {
      if (window.AlgoStakeX) {
        initializeSDK();
        clearInterval(intervalId);
      }
    };

    // Start checking every 100ms
    intervalId = setInterval(checkAndInitializeSDK, 100);

    // Cleanup interval on component unmount
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [initializeSDK]);

  return { algoStakeXClient, isLoading, treasuryConfigured, addTreasuryWallet };
}
