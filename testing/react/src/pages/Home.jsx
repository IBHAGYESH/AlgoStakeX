import { useState, useEffect, useMemo } from "react";
import { useSDK } from "../hooks/useSDK";
import { useSDKEvents } from "../hooks/useSDKEvents";
import { Star, Rocket, EmojiEvents, Diamond, AutoAwesome, LocalFireDepartment } from "@mui/icons-material";

function Home() {
  const { algoStakeXClient } = useSDK();
  const [stackingStatus, setStackingStatus] = useState(null);
  const [currentTier, setCurrentTier] = useState(null);
  const [stakedTokens, setStakedTokens] = useState(0);

  const tiers = useMemo(() => ([
    { name: "Explorer", minStake: 5, icon: <Star />, color: "#8B5CF6", benefits: ["Basic Game Access", "Daily Rewards", "Community Chat"] },
    { name: "Adventurer", minStake: 10, icon: <Rocket />, color: "#3B82F6", benefits: ["Premium Game Modes", "Priority Matchmaking", "Exclusive Events"] },
    { name: "Champion", minStake: 15, icon: <EmojiEvents />, color: "#F59E0B", benefits: ["VIP Support", "Beta Access", "Custom Avatar", "Leaderboard Highlights"] },
    { name: "Legend", minStake: 20, icon: <Diamond />, color: "#EF4444", benefits: ["Private Tournaments", "NFT Rewards", "Developer Access", "Revenue Sharing"] },
  ]), []);

  const computeStatus = async () => {
    try {
      if (!algoStakeXClient || !algoStakeXClient.account) {
        setStackingStatus(null);
        setCurrentTier(null);
        setStakedTokens(0);
        return;
      }

      const status = await algoStakeXClient.stackingStatus();
      setStackingStatus(status);

      if (status?.exists && status.stakeData?.amount) {
        let amountRaw = Number(status.stakeData.amount) || 0;
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
    } catch (e) {
      setStackingStatus(null);
      setCurrentTier(null);
      setStakedTokens(0);
    }
  };

  useEffect(() => {
    computeStatus();
  }, [algoStakeXClient?.account]);

  useSDKEvents({
    onWalletConnect: computeStatus,
    onWalletDisconnect: () => {
      setStackingStatus(null);
      setCurrentTier(null);
      setStakedTokens(0);
    },
    onStakeSuccess: computeStatus,
    onWithdrawSuccess: computeStatus,
    onEmergencyWithdrawSuccess: computeStatus,
  });

  return (
    <div className="home-container">
      <div className="hero-section">
        <h1>Welcome to Solo Arena</h1>
        <p className="hero-subtitle">A single-game demo showcasing tier-based utilities powered by staking</p>

        {!algoStakeXClient?.account && (
          <div className="cta-section">
            <button
              className="btn btn-primary btn-large"
              onClick={() => algoStakeXClient?.maximizeSDK && algoStakeXClient.maximizeSDK()}
            >
              Connect Wallet to Start
            </button>
          </div>
        )}

        {algoStakeXClient?.account && currentTier && (
          <div className="access-badge" style={{ background: `linear-gradient(135deg, ${currentTier.color}20, ${currentTier.color}40)`, border: `2px solid ${currentTier.color}` }}>
            {currentTier.icon}
            <span>{currentTier.name} Member - {stakedTokens} Tokens Staked</span>
            <LocalFireDepartment style={{ color: currentTier.color }} />
          </div>
        )}
      </div>

      <div className="tiers-section">
        <h2 className="section-title">Membership Tiers</h2>
        <p className="section-subtitle">Stake more tokens to unlock higher tiers and exclusive in-game benefits</p>
        <div className="tiers-grid">
          {tiers.map((tier) => {
            const isUnlocked = stakedTokens >= tier.minStake;
            const isCurrent = currentTier?.name === tier.name;
            const progress = Math.min((stakedTokens / tier.minStake) * 100, 100);
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
                        style={{ width: `${progress}%`, backgroundColor: tier.color }}
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

      {stackingStatus?.exists && (
        <div className="stacking-notification">
          <div className="notification-content">
            {currentTier ? currentTier.icon : <Star />}
            <div>
              <h4>You're actively staking!</h4>
              <p>
                Amount: {stakedTokens} tokens
                {currentTier && ` • ${currentTier.name} Tier`}
              </p>
            </div>
          </div>
          <button
            className="btn btn-outline"
            onClick={() => algoStakeXClient?.maximizeSDK && algoStakeXClient.maximizeSDK()}
          >
            Open SDK Panel
          </button>
        </div>
      )}
    </div>
  );
}

export default Home;

