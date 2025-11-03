import { useState, useEffect, useCallback } from "react";

// Create a singleton instance outside the hook
let sdkInstance = null;

export function useSDK() {
  const [algoStakeXClient, setAlgoStakeXClient] = useState(null);

  const initializeSDK = useCallback(() => {
    if (window.AlgoStakeX && !sdkInstance) {
      try {
        // Initialize SDK with required parameters
        sdkInstance = new window.AlgoStakeX({
          env: "testnet", // testnet | mainnet
          namespace: "STAKX", // unique namespace
          token_id: 31566704, // ASA ID - replace with actual token ID
          enable_ui: true,
          disableToast: false,
          toastLocation: "TOP_RIGHT", // TOP_LEFT | TOP_RIGHT
          minimizeUILocation: "right", // left | right
          logo: "./logo.png", // your website logo (URL / path to image)
          staking: {
            type: "FLEXIBLE", // FLEXIBLE | FIXED
            stake_period: 1440, // optional for FLEXIBLE (in minutes)
            withdraw_penalty: 5, // optional for FLEXIBLE (percentage)
            reward: {
              type: "APY", // APY | UTILITY
              value_type1: 5, // 5% APY or "feature 1,2" for UTILITY
              value_type2: [
                {
                  name: "Bronze",
                  stake_amount: 100,
                  value: 5, // 5% APY or "feature 1,2" for UTILITY
                },
                {
                  name: "Silver",
                  stake_amount: 1000,
                  value: 10, // 10% APY or "feature 1,2,3" for UTILITY
                },
                {
                  name: "Gold",
                  stake_amount: 10000,
                  value: 20, // 20% APY or "feature 1,2,3,4,5" for UTILITY
                },
              ],
            },
          },
        });

        setAlgoStakeXClient(sdkInstance);
      } catch (error) {
        console.error("SDK initialization error:", error);
      }
    } else if (sdkInstance) {
      // If SDK is already initialized, use the existing instance
      setAlgoStakeXClient(sdkInstance);
    }
  }, []);

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

  return { algoStakeXClient };
}
