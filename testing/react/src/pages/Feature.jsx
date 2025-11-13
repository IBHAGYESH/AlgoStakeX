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
  Rocket,
  EmojiEvents,
  Security,
  Gamepad,
  Groups,
  TrendingUp,
  LocalFireDepartment,
  WorkspacePremium
} from "@mui/icons-material";

function Feature() {
  const { algoStakeXClient } = useSDK();
  const navigate = useNavigate();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stackingStatus, setStackingStatus] = useState(null);
  const [currentTier, setCurrentTier] = useState(null);
  const [stakedAmount, setStakedAmount] = useState(0);

  const tiers = [
    {
      name: "Explorer",
      minStake: 100,
      icon: <Star />,
      color: "#8B5CF6",
      features: [
        { name: "Basic Game Access", description: "Play standard game modes", icon: <Gamepad /> },
        { name: "Daily Rewards", description: "Earn daily login bonuses", icon: <TrendingUp /> },
        { name: "Community Chat", description: "Access to general chat channels", icon: <Groups /> }
      ],
      exclusives: ["Standard matchmaking", "Basic leaderboards", "Community events"]
    },
    {
      name: "Adventurer",
      minStake: 500,
      icon: <Rocket />,
      color: "#3B82F6",
      features: [
        { name: "Premium Game Modes", description: "Access exclusive game variants", icon: <AutoAwesome /> },
        { name: "Priority Matchmaking", description: "Faster queue times", icon: <LocalFireDepartment /> },
        { name: "Exclusive Events", description: "VIP tournaments and competitions", icon: <EmojiEvents /> }
      ],
      exclusives: ["Advanced analytics", "Custom game rooms", "Priority support", "Beta features"]
    },
    {
      name: "Champion",
      minStake: 1000,
      icon: <EmojiEvents />,
      color: "#F59E0B",
      features: [
        { name: "VIP Support", description: "24/7 dedicated support team", icon: <Security /> },
        { name: "Beta Access", description: "Early access to new features", icon: <Rocket /> },
        { name: "Custom Avatar", description: "Unique avatar customization", icon: <WorkspacePremium /> },
        { name: "Leaderboard Highlights", description: "Special recognition on leaderboards", icon: <Star /> }
      ],
      exclusives: ["Private tournaments", "Developer Q&A sessions", "Exclusive merchandise", "Revenue sharing"]
    },
    {
      name: "Legend",
      minStake: 2500,
      icon: <Diamond />,
      color: "#EF4444",
      features: [
        { name: "Private Tournaments", description: "Exclusive high-stakes competitions", icon: <EmojiEvents /> },
        { name: "NFT Rewards", description: "Unique collectible rewards", icon: <Diamond /> },
        { name: "Developer Access", description: "Direct line to development team", icon: <Security /> },
        { name: "Revenue Sharing", description: "Share in platform profits", icon: <TrendingUp /> }
      ],
      exclusives: ["Governance voting", "Platform roadmap input", "Exclusive partnerships", "Legend-only events"]
    }
  ];

  const checkAccess = async () => {
    if (!algoStakeXClient || !algoStakeXClient.account) {
      setHasAccess(false);
      setCurrentTier(null);
      setStakedAmount(0);
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
      
      if (status?.exists && status.stakeData?.amount) {
        const amount = parseInt(status.stakeData.amount);
        setStakedAmount(amount);
        
        // Determine current tier
        const userTier = tiers.reverse().find(tier => amount >= tier.minStake);
        setCurrentTier(userTier);
        tiers.reverse(); // Reset order
      } else {
        setStakedAmount(0);
        setCurrentTier(null);
      }
    } catch (error) {
      setHasAccess(false);
      setCurrentTier(null);
      setStakedAmount(0);
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
      setCurrentTier(null);
      setStakedAmount(0);
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

  const getUnlockedFeatures = () => {
    if (!currentTier) return [];
    
    const tierIndex = tiers.findIndex(t => t.name === currentTier.name);
    let allFeatures = [];
    
    // Include features from current tier and all lower tiers
    for (let i = 0; i <= tierIndex; i++) {
      allFeatures = [...allFeatures, ...tiers[i].features];
    }
    
    return allFeatures;
  };

  const getNextTier = () => {
    if (!currentTier) return tiers[0];
    const currentIndex = tiers.findIndex(t => t.name === currentTier.name);
    return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
  };

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
        {hasAccess && currentTier && (
          <div className="access-badge-large" style={{ background: `linear-gradient(135deg, ${currentTier.color}20, ${currentTier.color}40)`, border: `2px solid ${currentTier.color}` }}>
            {currentTier.icon}
            <span>{currentTier.name} Tier Active - {stakedAmount} Tokens Staked</span>
            <LocalFireDepartment style={{ color: currentTier.color }} />
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

      {/* Tier Showcase */}
      <div className="tiers-showcase">
        <h2 className="section-title">Membership Tiers</h2>
        <p className="section-subtitle">Unlock exclusive features and benefits by staking more tokens</p>
        
        <div className="tiers-grid">
          {tiers.map((tier, index) => {
            const isUnlocked = stakedAmount >= tier.minStake;
            const isCurrent = currentTier?.name === tier.name;
            const nextTier = getNextTier();
            const isNext = nextTier?.name === tier.name;
            
            return (
              <div 
                key={tier.name}
                className={`tier-showcase-card ${
                  isUnlocked ? 'unlocked' : 'locked'
                } ${isCurrent ? 'current' : ''} ${isNext ? 'next' : ''}`}
                style={{
                  borderColor: isUnlocked ? tier.color : '#374151',
                  background: isCurrent 
                    ? `linear-gradient(135deg, ${tier.color}15, ${tier.color}25)` 
                    : isNext 
                    ? `linear-gradient(135deg, ${tier.color}08, ${tier.color}12)`
                    : 'rgba(255, 255, 255, 0.02)'
                }}
              >
                <div className="tier-showcase-header">
                  <div className="tier-showcase-icon" style={{ color: isUnlocked ? tier.color : '#6b7280' }}>
                    {tier.icon}
                  </div>
                  <div className="tier-showcase-info">
                    <h3 className="tier-showcase-name" style={{ color: isUnlocked ? tier.color : '#9ca3af' }}>
                      {tier.name}
                      {isCurrent && <span className="current-tier-badge">CURRENT</span>}
                      {isNext && <span className="next-tier-badge">NEXT</span>}
                    </h3>
                    <p className="tier-showcase-requirement">{tier.minStake} tokens minimum</p>
                  </div>
                </div>
                
                <div className="tier-showcase-features">
                  <h4>Core Features</h4>
                  {tier.features.map((feature, idx) => (
                    <div key={idx} className="tier-feature-item">
                      <div className="feature-icon-small" style={{ color: isUnlocked ? tier.color : '#6b7280' }}>
                        {feature.icon}
                      </div>
                      <div className="feature-details">
                        <span className="feature-name" style={{ color: isUnlocked ? '#f3f4f6' : '#9ca3af' }}>
                          {feature.name}
                        </span>
                        <span className="feature-description" style={{ color: isUnlocked ? '#d1d5db' : '#6b7280' }}>
                          {feature.description}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  <h4>Exclusive Benefits</h4>
                  <div className="tier-exclusives">
                    {tier.exclusives.map((exclusive, idx) => (
                      <div key={idx} className="exclusive-item">
                        <AutoAwesome style={{ fontSize: '14px', color: isUnlocked ? tier.color : '#6b7280' }} />
                        <span style={{ color: isUnlocked ? '#e5e7eb' : '#9ca3af' }}>{exclusive}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {!isUnlocked && (
                  <div className="tier-progress-section">
                    <div className="tier-progress-bar">
                      <div 
                        className="tier-progress-fill" 
                        style={{ 
                          width: `${Math.min((stakedAmount / tier.minStake) * 100, 100)}%`,
                          backgroundColor: tier.color
                        }}
                      ></div>
                    </div>
                    <p className="tier-progress-text">
                      {tier.minStake - stakedAmount} more tokens to unlock
                    </p>
                  </div>
                )}
                
                {isNext && (
                  <div className="upgrade-section">
                    <button 
                      className="upgrade-btn"
                      style={{ 
                        background: `linear-gradient(135deg, ${tier.color}, ${tier.color}dd)`,
                        color: 'white'
                      }}
                      onClick={() => navigate('/profile')}
                    >
                      Upgrade to {tier.name}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Current Benefits */}
      {hasAccess && currentTier && (
        <div className="current-benefits">
          <h2 className="section-title">Your Active Benefits</h2>
          <p className="section-subtitle">Features you've unlocked with your {currentTier.name} membership</p>
          
          <div className="benefits-grid">
            {getUnlockedFeatures().map((feature, index) => (
              <div key={index} className="benefit-card">
                <div className="benefit-icon">
                  {feature.icon}
                </div>
                <div className="benefit-content">
                  <h4 className="benefit-name">{feature.name}</h4>
                  <p className="benefit-description">{feature.description}</p>
                </div>
                <div className="benefit-status">
                  <CheckCircleOutlined style={{ color: '#10b981' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stackingStatus?.exists && (
        <div className="stacking-info-card">
          <h3>Your Current Staking Status</h3>
          <div className="stacking-details-grid">
            <div className="detail-card">
              <span className="detail-label">Amount Staked</span>
              <span className="detail-value">
                {stackingStatus.stakeData?.amount || "N/A"} tokens
              </span>
            </div>
            <div className="detail-card">
              <span className="detail-label">Current Tier</span>
              <span className="detail-value" style={{ color: currentTier?.color || '#9ca3af' }}>
                {currentTier?.name || "None"}
              </span>
            </div>
            <div className="detail-card">
              <span className="detail-label">Reward Type</span>
              <span className="detail-value">
                {stackingStatus.stakeData?.rewardType || "Utility"}
              </span>
            </div>
            <div className="detail-card">
              <span className="detail-label">Features Unlocked</span>
              <span className="detail-value">
                {getUnlockedFeatures().length} features
              </span>
            </div>
          </div>
          
          {currentTier && (
            <div className="tier-summary">
              <div className="tier-summary-header">
                <div className="tier-summary-icon" style={{ color: currentTier.color }}>
                  {currentTier.icon}
                </div>
                <div>
                  <h4 style={{ color: currentTier.color }}>{currentTier.name} Member</h4>
                  <p>Enjoying {currentTier.features.length} core features + {currentTier.exclusives.length} exclusive benefits</p>
                </div>
              </div>
              
              {getNextTier() && (
                <div className="next-tier-preview">
                  <p>Next tier: <strong>{getNextTier().name}</strong> ({getNextTier().minStake - stakedAmount} more tokens needed)</p>
                  <button 
                    className="btn btn-outline"
                    onClick={() => navigate('/profile')}
                    style={{ borderColor: getNextTier().color, color: getNextTier().color }}
                  >
                    Upgrade Now
                  </button>
                </div>
              )}
            </div>
          )}
          
          {!hasAccess && (
            <div className="access-warning">
              <p>
                ⚠️ You need to stake at least 100 tokens to unlock premium features
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Feature;

