import { useEffect, useMemo, useState } from "react";
import { useSDK } from "../hooks/useSDK";
import { useSDKEvents } from "../hooks/useSDKEvents";
import {
  Gamepad,
  LocalFireDepartment,
  Star,
  Rocket,
  EmojiEvents,
  Diamond,
  AutoAwesome,
} from "@mui/icons-material";

function Game() {
  const { algoStakeXClient } = useSDK();
  const [stakedTokens, setStakedTokens] = useState(0);
  const [currentTier, setCurrentTier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [matchStatus, setMatchStatus] = useState("idle");

  const tiers = useMemo(
    () => [
      {
        name: "Explorer",
        minStake: 10,
        icon: <Star />,
        color: "#8B5CF6",
        benefits: [
          "Basic Game Access",
          "Daily Rewards",
          "Community Chat",
        ],
      },
      {
        name: "Adventurer",
        minStake: 30,
        icon: <Rocket />,
        color: "#3B82F6",
        benefits: [
          "Premium Game Modes",
          "Priority Matchmaking",
          "Exclusive Events",
        ],
      },
      {
        name: "Champion",
        minStake: 50,
        icon: <EmojiEvents />,
        color: "#F59E0B",
        benefits: [
          "VIP Support",
          "Beta Access",
          "Custom Avatar",
          "Leaderboard Highlights",
        ],
      },
      {
        name: "Legend",
        minStake: 60,
        icon: <Diamond />,
        color: "#EF4444",
        benefits: [
          "Private Tournaments",
          "NFT Rewards",
          "Developer Access",
          "Revenue Sharing",
        ],
      },
    ],
    []
  );

  const getUnlockedBenefits = () => {
    if (!currentTier) return [];
    const idx = tiers.findIndex((t) => t.name === currentTier.name);
    let list = [];
    for (let i = 0; i <= idx; i++) list = [...list, ...tiers[i].benefits];
    return list;
  };

  const refreshStatus = async () => {
    try {
      if (!algoStakeXClient || !algoStakeXClient.account) {
        setStakedTokens(0);
        setCurrentTier(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      const status = await algoStakeXClient.stackingStatus();
      if (status?.exists && status.stakeData?.amount) {
        const amountRaw = Number(status.stakeData.amount) || 0;
        let decimals = 0;
        try {
          const meta = await algoStakeXClient.getFTMetadata(status.stakeData.tokenId);
          decimals = meta?.decimals || 0;
        } catch {}
        const tokens = amountRaw / Math.pow(10, decimals);
        setStakedTokens(tokens);
        const tier = [...tiers].reverse().find((t) => tokens >= t.minStake) || null;
        setCurrentTier(tier);
      } else {
        setStakedTokens(0);
        setCurrentTier(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [algoStakeXClient?.account]);

  useSDKEvents({
    onWalletConnect: refreshStatus,
    onWalletDisconnect: () => {
      setStakedTokens(0);
      setCurrentTier(null);
    },
    onStakeSuccess: refreshStatus,
    onWithdrawSuccess: refreshStatus,
    onEmergencyWithdrawSuccess: refreshStatus,
  });

  const handleStartMatch = () => {
    if (!currentTier) {
      setMatchStatus("locked");
      return;
    }
    setMatchStatus("starting");
    setTimeout(() => setMatchStatus("in_progress"), 800);
    setTimeout(() => setMatchStatus("completed"), 3000);
  };

  return (
    <div className="game-container" style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div
        className="game-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Gamepad style={{ color: "#667eea" }} />
          <h2 className="page-title" style={{ margin: 0 }}>
            Solo Arena
          </h2>
        </div>
        <div>
          <button
            className="btn btn-outline"
            onClick={() =>
              algoStakeXClient?.maximizeSDK && algoStakeXClient.maximizeSDK()
            }
          >
            Open SDK Panel
          </button>
        </div>
      </div>

      {currentTier && (
        <div
          className="access-badge"
          style={{
            background: `linear-gradient(135deg, ${currentTier.color}20, ${currentTier.color}40)`,
            border: `2px solid ${currentTier.color}`,
            marginBottom: "1rem",
          }}
        >
          {currentTier.icon}
          <span>
            {currentTier.name} Member • {stakedTokens} tokens staked
          </span>
          <LocalFireDepartment style={{ color: currentTier.color }} />
        </div>
      )}

      <div
        className="game-screen"
        style={{
          height: 360,
          borderRadius: 16,
          background:
            "radial-gradient(1200px 300px at 50% -40%, rgba(102,126,234,0.35), rgba(118,75,162,0.25) 60%, rgba(0,0,0,0.15) 100%)",
          border: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#1f2937",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            Non-playable Demo
          </div>
          <div style={{ color: "#6b7280" }}>
            Your tier affects matchmaking, rewards and perks inside this game.
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 12,
            right: 12,
            background: "rgba(255,255,255,0.7)",
            padding: "6px 10px",
            borderRadius: 8,
            fontSize: 12,
          }}
        >
          Status: {loading ? "Loading..." : matchStatus.replace("_", " ")}
        </div>
      </div>

      <div
        className="game-controls"
        style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}
      >
        <button
          className="btn btn-primary"
          onClick={handleStartMatch}
          disabled={loading}
        >
          Start Match
        </button>
        {!currentTier && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: 8,
              background: "#fff3e0",
              color: "#e65100",
              border: "1px solid #ffe0b2",
              fontWeight: 600,
            }}
          >
            Stake tokens via SDK to unlock gameplay perks
          </div>
        )}
      </div>

      {currentTier && (
        <div className="tiers-section" style={{ marginTop: 24 }}>
          <h2 className="section-title">Your Active Perks</h2>
          <p className="section-subtitle">
            Unlocked based on your current tier ({currentTier.name})
          </p>
          <div
            className="tiers-grid"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}
          >
            {getUnlockedBenefits().map((benefit, idx) => (
              <div key={idx} className="tier-card unlocked" style={{ padding: 16 }}>
                <div className="benefit-item">
                  <AutoAwesome style={{ color: currentTier.color }} />
                  <span style={{ color: "#374151" }}>{benefit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Game;
