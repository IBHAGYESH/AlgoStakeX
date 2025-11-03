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
          token_id: 749059499, // ASA ID - replace with actual token ID
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
              type: "UTILITY", // APY | UTILITY
              value: "Feature", // 5% APY or "feature 1,2" for UTILITY
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
