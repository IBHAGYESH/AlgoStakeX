import { useState, useEffect } from "react";
import { useSDK } from "../hooks/useSDK";
import { useSDKEvents } from "../hooks/useSDKEvents";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { 
  PlayArrow, 
  Star, 
  TrendingUp, 
  People, 
  EmojiEvents,
  Security,
  Rocket,
  Diamond,
  LocalFireDepartment,
  AutoAwesome
} from "@mui/icons-material";

function Home() {
  const { algoStakeXClient } = useSDK();
  const navigate = useNavigate();
  const [games, setGames] = useState([
    {
      id: 1,
      name: "Battle Arena",
      description: "Epic multiplayer battle game with tier-based matchmaking",
      players: 12500,
      rating: 4.8,
      image: "https://via.placeholder.com/300x200?text=Battle+Arena",
      tierBenefits: {
        Explorer: "Basic matches",
        Adventurer: "Priority matchmaking", 
        Champion: "VIP tournaments",
        Legend: "Private leagues"
      }
    },
    {
      id: 2,
      name: "Crypto Quest",
      description: "Adventure RPG with blockchain rewards and NFT drops",
      players: 8900,
      rating: 4.6,
      image: "https://via.placeholder.com/300x200?text=Crypto+Quest",
      tierBenefits: {
        Explorer: "Daily quests",
        Adventurer: "Exclusive events",
        Champion: "Beta access", 
        Legend: "NFT rewards"
      }
    },
    {
      id: 3,
      name: "Racing Legends",
      description: "High-speed racing championship with custom vehicles",
      players: 15600,
      rating: 4.9,
      image: "https://via.placeholder.com/300x200?text=Racing+Legends",
      tierBenefits: {
        Explorer: "Standard races",
        Adventurer: "Premium tracks",
        Champion: "Custom avatars",
        Legend: "Revenue sharing"
      }
    },
    {
      id: 4,
      name: "Strategy Empire",
      description: "Build and conquer strategy game with alliance features",
      players: 11200,
      rating: 4.7,
      image: "https://via.placeholder.com/300x200?text=Strategy+Empire",
      tierBenefits: {
        Explorer: "Basic gameplay",
        Adventurer: "Alliance features",
        Champion: "VIP support",
        Legend: "Developer access"
      }
    },
  ]);

  const [stackingStatus, setStackingStatus] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [currentTier, setCurrentTier] = useState(null);
  const [stakedAmount, setStakedAmount] = useState(0);

  const tiers = [
    {
      name: "Explorer",
      minStake: 100,
      icon: <Star />,
      color: "#8B5CF6",
      benefits: ["Basic Game Access", "Daily Rewards", "Community Chat"]
    },
    {
      name: "Adventurer", 
      minStake: 500,
      icon: <Rocket />,
      color: "#3B82F6",
      benefits: ["Premium Game Modes", "Priority Matchmaking", "Exclusive Events"]
    },
    {
      name: "Champion",
      minStake: 1000, 
      icon: <EmojiEvents />,
      color: "#F59E0B",
      benefits: ["VIP Support", "Beta Access", "Custom Avatar", "Leaderboard Highlights"]
    },
    {
      name: "Legend",
      minStake: 2500,
      icon: <Diamond />,
      color: "#EF4444", 
      benefits: ["Private Tournaments", "NFT Rewards", "Developer Access", "Revenue Sharing"]
    }
  ];

  const checkAccess = async () => {
    if (!algoStakeXClient || !algoStakeXClient.account) {
      setHasAccess(false);
      setCurrentTier(null);
      setStakedAmount(0);
      return;
    }

    try {
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

  const handlePlayGame = (gameId) => {
    if (!algoStakeXClient?.account) {
      toast.info("Please connect your wallet first");
      navigate("/profile");
      return;
    }

    if (!hasAccess) {
      toast.warning(
        "Stake at least 100 tokens to unlock game access!"
      );
      navigate("/profile");
      return;
    }

    const game = games.find((g) => g.id === gameId);
    const tierMessage = currentTier ? ` as a ${currentTier.name} member` : "";
    toast.success(`Starting ${game?.name}${tierMessage}...`);
    
    // Show tier-specific benefits
    if (currentTier) {
      setTimeout(() => {
        toast.info(`${currentTier.name} benefits active: ${currentTier.benefits[0]}`, {
          autoClose: 3000
        });
      }, 1000);
    }
  };

  return (
    <div className="home-container">
      <div className="hero-section">
        <h1>Welcome to AlgoStakeX Game Platform</h1>
        <p className="hero-subtitle">
          Play amazing games and earn rewards by staking your tokens
        </p>

        {!algoStakeXClient?.account && (
          <div className="cta-section">
            <button
              className="btn btn-primary btn-large"
              onClick={() => navigate("/profile")}
            >
              Connect Wallet to Start
            </button>
          </div>
        )}

        {algoStakeXClient?.account && !hasAccess && (
          <div className="cta-section">
            <div className="access-prompt">
              <p>Stake tokens to unlock premium features!</p>
              <button
                className="btn btn-primary btn-large"
                onClick={() => navigate("/profile")}
              >
                Start Stacking
              </button>
            </div>
          </div>
        )}

        {hasAccess && currentTier && (
          <div className="access-badge" style={{ background: `linear-gradient(135deg, ${currentTier.color}20, ${currentTier.color}40)`, border: `2px solid ${currentTier.color}` }}>
            {currentTier.icon}
            <span>{currentTier.name} Member - {stakedAmount} Tokens Staked</span>
            <LocalFireDepartment style={{ color: currentTier.color }} />
          </div>
        )}
      </div>

      <div className="stats-section">
        <div className="stat-card">
          <TrendingUp className="stat-icon" />
          <div className="stat-content">
            <h3>Active Players</h3>
            <p className="stat-value">48,200+</p>
          </div>
        </div>
        <div className="stat-card">
          <People className="stat-icon" />
          <div className="stat-content">
            <h3>Games Available</h3>
            <p className="stat-value">12+</p>
          </div>
        </div>
        <div className="stat-card">
          <Star className="stat-icon" />
          <div className="stat-content">
            <h3>Average Rating</h3>
            <p className="stat-value">4.8/5</p>
          </div>
        </div>
        {currentTier && (
          <div className="stat-card" style={{ background: `linear-gradient(135deg, ${currentTier.color}10, ${currentTier.color}20)` }}>
            {currentTier.icon}
            <div className="stat-content">
              <h3>Your Tier</h3>
              <p className="stat-value" style={{ color: currentTier.color }}>{currentTier.name}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tier Information Section */}
      <div className="tiers-section">
        <h2 className="section-title">Membership Tiers</h2>
        <p className="section-subtitle">Stake more tokens to unlock higher tiers and exclusive benefits</p>
        <div className="tiers-grid">
          {tiers.map((tier, index) => {
            const isUnlocked = stakedAmount >= tier.minStake;
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
                        style={{ 
                          width: `${Math.min((stakedAmount / tier.minStake) * 100, 100)}%`,
                          backgroundColor: tier.color
                        }}
                      ></div>
                    </div>
                    <p className="progress-text">
                      {tier.minStake - stakedAmount} more tokens needed
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="games-section">
        <h2 className="section-title">Featured Games</h2>
        <div className="games-grid">
          {games.map((game) => (
            <div key={game.id} className="game-card">
              <div className="game-image-container">
                <img src={game.image} alt={game.name} className="game-image" />
                <div className="game-overlay">
                  <button
                    className="btn-play"
                    onClick={() => handlePlayGame(game.id)}
                  >
                    <PlayArrow />
                    Play Now
                  </button>
                </div>
              </div>
              <div className="game-info">
                <h3 className="game-name">{game.name}</h3>
                <p className="game-description">{game.description}</p>
                <div className="game-stats">
                  <div className="game-stat">
                    <People />
                    <span>{game.players.toLocaleString()} players</span>
                  </div>
                  <div className="game-stat">
                    <Star />
                    <span>{game.rating} rating</span>
                  </div>
                </div>
                {currentTier && game.tierBenefits[currentTier.name] && (
                  <div className="tier-benefit-badge">
                    {currentTier.icon}
                    <span>{game.tierBenefits[currentTier.name]}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {stackingStatus?.exists && (
        <div className="stacking-notification">
          <div className="notification-content">
            {currentTier ? currentTier.icon : <Star />}
            <div>
              <h4>You're actively staking!</h4>
              <p>
                Amount: {stackingStatus.stakeData?.amount || "N/A"} tokens
                {currentTier && ` • ${currentTier.name} Tier`}
              </p>
              {currentTier && (
                <p className="tier-benefits-summary">
                  Enjoying: {currentTier.benefits.slice(0, 2).join(", ")} and more!
                </p>
              )}
            </div>
          </div>
          <button
            className="btn btn-outline"
            onClick={() => navigate("/profile")}
          >
            View Details
          </button>
        </div>
      )}
    </div>
  );
}

export default Home;

