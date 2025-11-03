import { useState, useEffect } from "react";
import { useSDK } from "../hooks/useSDK";
import { useSDKEvents } from "../hooks/useSDKEvents";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  LockOutlined,
  CheckCircleOutlined,
  Star,
  AutoAwesome,
  Diamond,
} from "@mui/icons-material";

function Feature() {
  const { algoStakeXClient } = useSDK();
  const navigate = useNavigate();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stackingStatus, setStackingStatus] = useState(null);

  const checkAccess = async () => {
    if (!algoStakeXClient || !algoStakeXClient.account) {
      setHasAccess(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Check if user has valid stake (minimum 100 tokens)
      const validation = await algoStakeXClient.validateStacking("default", 100);
      setHasAccess(validation.valid);

      const status = await algoStakeXClient.stackingStatus("default");
      setStackingStatus(status);
    } catch (error) {
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAccess();
  }, [algoStakeXClient?.account]);

  useSDKEvents({
    onWalletConnect: checkAccess,
    onWalletDisconnect: () => {
      setHasAccess(false);
      setStackingStatus(null);
    },
    onStakeSuccess: checkAccess,
    onWithdrawSuccess: checkAccess,
  });

  const handleUnlockFeature = () => {
    if (!algoStakeXClient?.account) {
      toast.info("Please connect your wallet first");
      navigate("/profile");
      return;
    }

    toast.info("Redirecting to staking page...");
    navigate("/profile");
  };

  const premiumFeatures = [
    {
      id: 1,
      name: "Exclusive Game Modes",
      description: "Access to premium game modes and special events",
      icon: <AutoAwesome />,
      locked: !hasAccess,
    },
    {
      id: 2,
      name: "Priority Support",
      description: "24/7 priority customer support",
      icon: <Star />,
      locked: !hasAccess,
    },
    {
      id: 3,
      name: "Advanced Analytics",
      description: "Detailed stats and analytics dashboard",
      icon: <Diamond />,
      locked: !hasAccess,
    },
    {
      id: 4,
      name: "Early Access",
      description: "Get early access to new games and features",
      icon: <CheckCircleOutlined />,
      locked: !hasAccess,
    },
  ];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Checking access...</p>
      </div>
    );
  }

  return (
    <div className="feature-container">
      <div className="feature-header">
        <h2 className="page-title">Premium Features</h2>
        {!algoStakeXClient?.account && (
          <p className="feature-subtitle">
            Connect your wallet and stake tokens to unlock premium features
          </p>
        )}
        {algoStakeXClient?.account && !hasAccess && (
          <p className="feature-subtitle">
            Stake a minimum of 100 tokens to unlock all premium features
          </p>
        )}
        {hasAccess && (
          <div className="access-badge-large">
            <CheckCircleOutlined />
            <span>Premium Access Active</span>
          </div>
        )}
      </div>

      {!hasAccess && (
        <div className="locked-banner">
          <div className="locked-content">
            <LockOutlined className="locked-icon" />
            <div>
              <h3>Features Locked</h3>
              <p>
                {!algoStakeXClient?.account
                  ? "Connect your wallet and stake tokens to unlock these premium features"
                  : stackingStatus?.exists
                  ? "You need to stake at least 100 tokens to unlock premium features"
                  : "You need to stake tokens to unlock premium features"}
              </p>
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleUnlockFeature}>
            {!algoStakeXClient?.account
              ? "Connect Wallet & Stake"
              : "Stake Tokens Now"}
          </button>
        </div>
      )}

      <div className="features-grid">
        {premiumFeatures.map((feature) => (
          <div
            key={feature.id}
            className={`feature-card ${feature.locked ? "locked" : "unlocked"}`}
          >
            <div className="feature-icon-wrapper">
              {feature.locked ? (
                <LockOutlined className="feature-icon locked" />
              ) : (
                <div className="feature-icon unlocked">{feature.icon}</div>
              )}
            </div>
            <div className="feature-content">
              <h3 className="feature-name">
                {feature.name}
                {!feature.locked && (
                  <CheckCircleOutlined className="check-icon" />
                )}
              </h3>
              <p className="feature-description">{feature.description}</p>
              {feature.locked && (
                <div className="locked-overlay">
                  <LockOutlined />
                  <span>Locked</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {stackingStatus?.exists && (
        <div className="stacking-info-card">
          <h3>Your Current Stacking</h3>
          <div className="stacking-details-grid">
            <div className="detail-card">
              <span className="detail-label">Amount Stacked</span>
              <span className="detail-value">
                {stackingStatus.stakeData?.amount || "N/A"}
              </span>
            </div>
            <div className="detail-card">
              <span className="detail-label">Reward Type</span>
              <span className="detail-value">
                {stackingStatus.stakeData?.rewardType || "N/A"}
              </span>
            </div>
            {stackingStatus.stakeData?.rewardType === "APY" && (
              <div className="detail-card">
                <span className="detail-label">APY Rate</span>
                <span className="detail-value">
                  {stackingStatus.stakeData?.rewardRate || 0}%
                </span>
              </div>
            )}
          </div>
          {!hasAccess && (
            <div className="access-warning">
              <p>
                ⚠️ You need to stake at least 100 tokens to unlock premium
                features
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Feature;

