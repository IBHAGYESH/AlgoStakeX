import { useState, useEffect } from "react";
import { useSDK } from "../hooks/useSDK";
import { useSDKEvents } from "../hooks/useSDKEvents";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { PlayArrow, Star, TrendingUp, People } from "@mui/icons-material";

function Home() {
  const { algoStakeXClient } = useSDK();
  const navigate = useNavigate();
  const [games, setGames] = useState([
    {
      id: 1,
      name: "Battle Arena",
      description: "Epic multiplayer battle game",
      players: 12500,
      rating: 4.8,
      image: "https://via.placeholder.com/300x200?text=Battle+Arena",
    },
    {
      id: 2,
      name: "Crypto Quest",
      description: "Adventure RPG with blockchain rewards",
      players: 8900,
      rating: 4.6,
      image: "https://via.placeholder.com/300x200?text=Crypto+Quest",
    },
    {
      id: 3,
      name: "Racing Legends",
      description: "High-speed racing championship",
      players: 15600,
      rating: 4.9,
      image: "https://via.placeholder.com/300x200?text=Racing+Legends",
    },
    {
      id: 4,
      name: "Strategy Empire",
      description: "Build and conquer strategy game",
      players: 11200,
      rating: 4.7,
      image: "https://via.placeholder.com/300x200?text=Strategy+Empire",
    },
  ]);

  const [stackingStatus, setStackingStatus] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);

  const checkAccess = async () => {
    if (!algoStakeXClient || !algoStakeXClient.account) {
      setHasAccess(false);
      return;
    }

    try {
      const validation = await algoStakeXClient.validateStacking("default", 100);
      setHasAccess(validation.valid);

      const status = await algoStakeXClient.stackingStatus("default");
      setStackingStatus(status);
    } catch (error) {
      setHasAccess(false);
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

  const handlePlayGame = (gameId) => {
    if (!algoStakeXClient?.account) {
      toast.info("Please connect your wallet first");
      navigate("/profile");
      return;
    }

    if (!hasAccess) {
      toast.warning(
        "Premium access required! Stake tokens to unlock this feature."
      );
      navigate("/profile");
      return;
    }

    toast.success(`Starting ${games.find((g) => g.id === gameId)?.name}...`);
    // In a real app, this would redirect to the game
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

        {hasAccess && (
          <div className="access-badge">
            <Star />
            <span>Premium Member - Full Access Unlocked!</span>
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
              </div>
            </div>
          ))}
        </div>
      </div>

      {stackingStatus?.exists && (
        <div className="stacking-notification">
          <div className="notification-content">
            <Star className="notification-icon" />
            <div>
              <h4>You're actively stacking!</h4>
              <p>
                Amount: {stackingStatus.stakeData?.amount || "N/A"} tokens
              </p>
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

