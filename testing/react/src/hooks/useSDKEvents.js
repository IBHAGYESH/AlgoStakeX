import { useEffect } from "react";
import { useSDK } from "./useSDK";

export const useSDKEvents = (refreshFunctions) => {
  const { algoStakeXClient } = useSDK();

  useEffect(() => {
    if (!algoStakeXClient) return;

    const handleWalletConnect = () => {
      if (refreshFunctions.onWalletConnect) {
        refreshFunctions.onWalletConnect();
      }
    };

    const handleWalletDisconnect = () => {
      if (refreshFunctions.onWalletDisconnect) {
        refreshFunctions.onWalletDisconnect();
      }
    };

    const handleStakeSuccess = () => {
      if (refreshFunctions.onStakeSuccess) {
        refreshFunctions.onStakeSuccess();
      }
    };

    const handleWithdrawSuccess = () => {
      if (refreshFunctions.onWithdrawSuccess) {
        refreshFunctions.onWithdrawSuccess();
      }
    };

    const handleEmergencyWithdrawSuccess = () => {
      if (refreshFunctions.onEmergencyWithdrawSuccess) {
        refreshFunctions.onEmergencyWithdrawSuccess();
      }
    };

    // Subscribe to events
    algoStakeXClient.events.on("wallet:connected", handleWalletConnect);
    algoStakeXClient.events.on("wallet:disconnected", handleWalletDisconnect);
    algoStakeXClient.events.on("stake:success", handleStakeSuccess);
    algoStakeXClient.events.on("withdraw:success", handleWithdrawSuccess);
    algoStakeXClient.events.on(
      "emergencyWithdraw:success",
      handleEmergencyWithdrawSuccess
    );

    // Cleanup subscriptions
    return () => {
      algoStakeXClient.events.off("wallet:connected", handleWalletConnect);
      algoStakeXClient.events.off(
        "wallet:disconnected",
        handleWalletDisconnect
      );
      algoStakeXClient.events.off("stake:success", handleStakeSuccess);
      algoStakeXClient.events.off("withdraw:success", handleWithdrawSuccess);
      algoStakeXClient.events.off(
        "emergencyWithdraw:success",
        handleEmergencyWithdrawSuccess
      );
    };
  }, [algoStakeXClient, refreshFunctions]);
};
