import { useState, useEffect } from "react";
import { useSDK } from "../hooks/useSDK";
import { useSDKEvents } from "../hooks/useSDKEvents";
import { toast } from "react-toastify";
import { LockOutlined, CheckCircleOutlined } from "@mui/icons-material";

function Profile() {
  const { algoStakeXClient } = useSDK();
  const [stackingStatus, setStackingStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [validStake, setValidStake] = useState(false);

  const checkStackingStatus = async () => {
    if (!algoStakeXClient || !algoStakeXClient.account) {
      setStackingStatus(null);
      setValidStake(false);
      return;
    }

    try {
      setLoading(true);
      const status = await algoStakeXClient.stackingStatus("default");
      setStackingStatus(status);

      // Check if stake is valid (minimum 100 tokens)
      const validation = await algoStakeXClient.validateStacking("default", 100);
      setValidStake(validation.valid);
    } catch (error) {
      console.error("Error checking stacking status:", error);
      if (error.message.includes("No stake found")) {
        setStackingStatus({ exists: false });
        setValidStake(false);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStackingStatus();
  }, [algoStakeXClient?.account]);

  useSDKEvents({
    onWalletConnect: checkStackingStatus,
    onWalletDisconnect: () => {
      setStackingStatus(null);
      setValidStake(false);
    },
    onStakeSuccess: checkStackingStatus,
    onWithdrawSuccess: checkStackingStatus,
    onEmergencyWithdrawSuccess: checkStackingStatus,
  });

  const handleConnectWallet = () => {
    if (algoStakeXClient) {
      // Maximize SDK to show wallet connection UI
      if (algoStakeXClient.maximizeSDK) {
        algoStakeXClient.maximizeSDK();
      } else {
        toast.info("Please use the SDK UI to connect your wallet");
      }
    }
  };

  const handleConnectPera = async () => {
    try {
      if (!algoStakeXClient) {
        toast.error("SDK not initialized");
        return;
      }

      // Connect Pera wallet via SDK
      // Note: This would need to be implemented in the SDK's UI
      toast.info("Opening Pera wallet connection...");
    } catch (error) {
      console.error("Error connecting Pera wallet:", error);
      toast.error("Failed to connect Pera wallet");
    }
  };

  const handleConnectDefly = async () => {
    try {
      if (!algoStakeXClient) {
        toast.error("SDK not initialized");
        return;
      }

      // Connect Defly wallet via SDK
      // Note: This would need to be implemented in the SDK's UI
      toast.info("Opening Defly wallet connection...");
    } catch (error) {
      console.error("Error connecting Defly wallet:", error);
      toast.error("Failed to connect Defly wallet");
    }
  };

  if (!algoStakeXClient) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading SDK...</p>
      </div>
    );
  }

  if (!algoStakeXClient.account) {
    return (
      <div className="profile-container">
        <h2 className="page-title">Connect Your Wallet</h2>
        <div className="wallet-connection-section">
          <p className="wallet-connection-description">
            Connect your wallet to start staking and unlock premium features.
          </p>
          <div className="wallet-buttons">
            <button
              className="btn btn-primary wallet-btn"
              onClick={handleConnectPera}
            >
              <img
                src="https://perawallet.app/favicon.ico"
                alt="Pera"
                className="wallet-icon"
              />
              Connect with Pera
            </button>
            <button
              className="btn btn-secondary wallet-btn"
              onClick={handleConnectDefly}
            >
              <img
                src="https://defly.app/favicon.ico"
                alt="Defly"
                className="wallet-icon"
              />
              Connect with Defly
            </button>
            <button
              className="btn btn-outline wallet-btn"
              onClick={handleConnectWallet}
            >
              Use SDK UI
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <h2 className="page-title">Your Profile</h2>

      <div className="profile-info-card">
        <div className="profile-header">
          <h3>Wallet Address</h3>
          <p className="wallet-address">{algoStakeXClient.account}</p>
        </div>

        <div className="stacking-status-section">
          <h3>Stacking Status</h3>
          {loading ? (
            <div className="loading-small">
              <div className="loading-spinner-small"></div>
              <span>Checking status...</span>
            </div>
          ) : stackingStatus?.exists ? (
            <div className="stacking-info">
              <div className="status-badge success">
                <CheckCircleOutlined />
                <span>Active Stacking</span>
              </div>
              <div className="stacking-details">
                <div className="detail-item">
                  <span className="detail-label">Amount Stacked:</span>
                  <span className="detail-value">
                    {stackingStatus.stakeData?.amount || "N/A"}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Reward Type:</span>
                  <span className="detail-value">
                    {stackingStatus.stakeData?.rewardType || "N/A"}
                  </span>
                </div>
                {stackingStatus.stakeData?.rewardType === "APY" && (
                  <div className="detail-item">
                    <span className="detail-label">Reward Rate:</span>
                    <span className="detail-value">
                      {stackingStatus.stakeData?.rewardRate || 0}% APY
                    </span>
                  </div>
                )}
                {stackingStatus.stakeData?.rewardType === "UTILITY" && (
                  <div className="detail-item">
                    <span className="detail-label">Utilities:</span>
                    <span className="detail-value">
                      {stackingStatus.stakeData?.utility || "N/A"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="status-badge inactive">
              <LockOutlined />
              <span>No Active Stacking</span>
            </div>
          )}

          {validStake && (
            <div className="access-status">
              <CheckCircleOutlined className="access-icon" />
              <span>You have access to premium features!</span>
            </div>
          )}
        </div>

        <div className="profile-actions">
          <button
            className="btn btn-primary"
            onClick={() => {
              toast.info("Staking functionality will open SDK UI");
              if (algoStakeXClient.maximizeSDK) {
                algoStakeXClient.maximizeSDK();
              }
            }}
          >
            Stake Tokens
          </button>
          <button
            className="btn btn-secondary"
            onClick={async () => {
              try {
                await algoStakeXClient.withdraw("default");
                toast.success("Withdrawal successful!");
              } catch (error) {
                toast.error(error.message || "Withdrawal failed");
              }
            }}
            disabled={!stackingStatus?.exists}
          >
            Withdraw
          </button>
          <button
            className="btn btn-outline"
            onClick={async () => {
              try {
                await algoStakeXClient.disconnectWallet();
                toast.success("Wallet disconnected");
              } catch (error) {
                toast.error("Failed to disconnect wallet");
              }
            }}
          >
            Disconnect Wallet
          </button>
        </div>
      </div>
    </div>
  );
}

export default Profile;

