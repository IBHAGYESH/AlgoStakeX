import { useState, useEffect, useMemo } from "react";
import { useSDK } from "../hooks/useSDK";
import { useSDKEvents } from "../hooks/useSDKEvents";
import { Star, Rocket, EmojiEvents, Diamond, AutoAwesome } from "@mui/icons-material";

function Profile() {
  const { algoStakeXClient } = useSDK();
  const [stackingStatus, setStackingStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stakedTokens, setStakedTokens] = useState(0);
  const [currentTier, setCurrentTier] = useState(null);

  const tiers = useMemo(() => ([
    { name: "Explorer", minStake: 5, icon: <Star />, color: "#8B5CF6", benefits: ["Basic Game Access", "Daily Rewards", "Community Chat"] },
    { name: "Adventurer", minStake: 10, icon: <Rocket />, color: "#3B82F6", benefits: ["Premium Game Modes", "Priority Matchmaking", "Exclusive Events"] },
    { name: "Champion", minStake: 15, icon: <EmojiEvents />, color: "#F59E0B", benefits: ["VIP Support", "Beta Access", "Custom Avatar", "Leaderboard Highlights"] },
    { name: "Legend", minStake: 20, icon: <Diamond />, color: "#EF4444", benefits: ["Private Tournaments", "NFT Rewards", "Developer Access", "Revenue Sharing"] },
  ]), []);

  const checkStackingStatus = async () => {
    if (!algoStakeXClient || !algoStakeXClient.account) {
      setStackingStatus(null);
      setStakedTokens(0);
      setCurrentTier(null);
      return;
    }

    try {
      setLoading(true);
      const status = await algoStakeXClient.stackingStatus();
      setStackingStatus(status);

      if (status?.exists && status.stakeData?.amount) {
        const amountRaw = Number(status.stakeData.amount) || 0;
        let decimals = 0;
        try {
          const meta = await algoStakeXClient.getFTMetadata(status.stakeData.tokenId);
          decimals = meta?.decimals || 0;
        } catch {}
        const amountTokens = amountRaw / Math.pow(10, decimals);
        setStakedTokens(amountTokens);

        const userTier = [...tiers].reverse().find(t => amountTokens >= t.minStake) || null;
        setCurrentTier(userTier);
      } else {
        setStakedTokens(0);
        setCurrentTier(null);
      }
    } catch (error) {
      setStackingStatus(null);
      setStakedTokens(0);
      setCurrentTier(null);
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
      setStakedTokens(0);
      setCurrentTier(null);
    },
    onStakeSuccess: checkStackingStatus,
    onWithdrawSuccess: checkStackingStatus,
    onEmergencyWithdrawSuccess: checkStackingStatus,
  });

  if (!algoStakeXClient) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading SDK...</p>
      </div>
    );
  }

  if (!algoStakeXClient.account) {
    return null; // Route is protected; this is a fallback no-op
  }

  return (
    <div className="profile-container">
      <h2 className="page-title">Your Profile</h2>

      <div className="profile-info-card">
        <div className="profile-header">
          <h3>Wallet Address</h3>
          <p className="wallet-address">{algoStakeXClient.account}</p>
        </div>

        <div className="profile-actions">
          <button
            className="btn btn-primary"
            onClick={() => algoStakeXClient?.maximizeSDK && algoStakeXClient.maximizeSDK()}
          >
            Open SDK Panel
          </button>
        </div>
      </div>

      <div className="tiers-section" style={{ marginTop: '2rem' }}>
        <h2 className="section-title">Your Membership Tiers</h2>
        <p className="section-subtitle">Benefits scale with your staked amount</p>
        <div className="tiers-grid">
          {tiers.map((tier) => {
            const isUnlocked = stakedTokens >= tier.minStake;
            const isCurrent = currentTier?.name === tier.name;
            return (
              <div
                key={tier.name}
                className={`tier-card ${isUnlocked ? 'unlocked' : 'locked'} ${isCurrent ? 'current' : ''}`}
                style={{
                  borderColor: isUnlocked ? tier.color : '#e5e7eb',
                  background: isCurrent ? `linear-gradient(135deg, ${tier.color}15, ${tier.color}25)` : 'white'
                }}
              >
                <div className="tier-header">
                  <div className="tier-icon" style={{ color: isUnlocked ? tier.color : '#9ca3af' }}>
                    {tier.icon}
                  </div>
                  <div className="tier-info">
                    <h3 className="tier-name" style={{ color: isUnlocked ? tier.color : '#6b7280' }}>
                      {tier.name}
                      {isCurrent && <span className="current-badge">CURRENT</span>}
                    </h3>
                    <p className="tier-requirement">{tier.minStake} tokens minimum</p>
                  </div>
                </div>
                <div className="tier-benefits">
                  {tier.benefits.map((benefit, idx) => (
                    <div key={idx} className="benefit-item">
                      <AutoAwesome style={{ fontSize: '16px', color: isUnlocked ? tier.color : '#9ca3af' }} />
                      <span style={{ color: isUnlocked ? '#374151' : '#9ca3af' }}>{benefit}</span>
                    </div>
                  ))}
                </div>
                {!isUnlocked && (
                  <div className="tier-progress">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${Math.min((stakedTokens / tier.minStake) * 100, 100)}%`, backgroundColor: tier.color }}
                      ></div>
                    </div>
                    <p className="progress-text">
                      {Math.max(tier.minStake - stakedTokens, 0)} more tokens needed
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Profile;

