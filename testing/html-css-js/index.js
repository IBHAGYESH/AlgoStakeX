/**
 * DeFi Yield Farm - Enhanced JavaScript with APY Tiers
 * Powered by AlgoStakeX SDK
 */

// APY Tier Configuration
// Governance Tier Configuration with voting weights
const GOV_TIERS = [
  {
    name: "Bronze",
    minStake: 5,
    weight: 1,
    color: "#CD7F32",
    icon: "fas fa-medal",
  },
  {
    name: "Silver",
    minStake: 10,
    weight: 2,
    color: "#C0C0C0",
    icon: "fas fa-trophy",
  },
  {
    name: "Gold",
    minStake: 15,
    weight: 3,
    color: "#FFD700",
    icon: "fas fa-crown",
  },
  {
    name: "Platinum",
    minStake: 20,
    weight: 4,
    color: "#E5E4E2",
    icon: "fas fa-gem",
  },
];

// Dummy proposals for demonstration
const PROPOSALS = [
  {
    id: "p1",
    title: "Increase Treasury Allocation to Staking Rewards",
    description:
      "Allocate an additional 10% of the protocol treasury to staking rewards to incentivize long-term participation.",
  },
  {
    id: "p2",
    title: "Add New Governance Council Seat",
    description:
      "Create one additional council seat selected by community vote each quarter.",
  },
  {
    id: "p3",
    title: "Adopt Quarterly Protocol Parameter Reviews",
    description:
      "Formalize a quarterly schedule to review and adjust key protocol parameters.",
  },
];

// Initialize AlgoStakeX with enhanced APY tier configuration
window.algoStakeXClient = new window.AlgoStakeX({
  env: "testnet",
  namespace: "DAOX", // Namespace for governance demo
  token_id: 749398662,
  disableUi: false,
  disableToast: false,
  toastLocation: "TOP_RIGHT",
  minimizeUILocation: "right",
  logo: "./logo.png",
  staking: {
    type: "FLEXIBLE",
    stake_period: 1440,
    withdraw_penalty: 0,
    reward: {
      type: "APY",
      stop_reward_on_stake_completion: false,
      // Not used in governance demo; provided to satisfy SDK schema
      value: GOV_TIERS.map((tier) => ({
        name: tier.name,
        stake_amount: tier.minStake,
        value: 1,
      })),
    },
  },
});

// Global state
let currentStakeAmount = 0; // in tokens (adjusted for decimals)
let currentTier = null; // from GOV_TIERS
let currentVotingPower = 0; // weight based on tier

// DOM Elements
const connectWalletBtn = document.getElementById("connect-wallet-btn");
const disconnectWalletBtn = document.getElementById("disconnect-wallet-btn");
const walletConnectionSection = document.getElementById(
  "wallet-connection-section"
);
const governanceSection = document.getElementById("governance-section");
const profileSection = document.getElementById("profile-section");
const walletAddress = document.getElementById("wallet-address");
const walletBalance = document.getElementById("wallet-balance");
const copyAddressBtn = document.getElementById("copy-address");
const connectedWalletLabel = document.getElementById("connected-wallet");
const votingPowerValue = document.getElementById("voting-power-value");
const currentTierLabel = document.getElementById("current-tier-label");
const proposalsList = document.getElementById("proposals-list");
const homeHero = document.getElementById("home-hero");

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
  initializeApp();
  renderProposals();
  setupEventListeners();
});

function attemptEnableSDKFromEnv() {
  try {
    const addr = (window.ENV && window.ENV.ALGOSTAKEX_TREASURY_ADDRESS) || null;
    const mnem =
      (window.ENV && window.ENV.ALGOSTAKEX_TREASURY_MNEMONIC) || null;
    if (!addr || !mnem) return;
    if (!window.algoStakeXClient || !window.algoStakeXClient.account) return;
    if (window.algoStakeXClient.sdkEnabled) return;
    window.algoStakeXClient.addTreasuryWallet(addr, mnem);
    showToast("SDK unlocked with treasury wallet", "success");
  } catch (e) {
    console.warn("Failed to enable SDK from env:", e?.message || e);
  }
}

function initializeApp() {
  // Check if wallet is already connected
  if (window.algoStakeXClient && window.algoStakeXClient.account) {
    handleWalletConnected();
    attemptEnableSDKFromEnv();
  }

  // Set up SDK event listeners via SDK event bus
  if (window.algoStakeXClient && window.algoStakeXClient.events) {
    const ev = window.algoStakeXClient.events;
    // Wallet lifecycle
    ev.on("wallet:connection:connected", handleWalletConnected);
    ev.on("wallet:connection:disconnected", handleWalletDisconnected);
    // Programmatic (mnemonic) connect/disconnect
    ev.on("wallet:connected", handleWalletConnected);
    ev.on("wallet:disconnected", handleWalletDisconnected);
    ev.on("wallet:connection:failed", () =>
      showToast("Wallet connection failed", "error")
    );
    ev.on("wallet:connection:cancelled", () =>
      showToast("Wallet connection cancelled", "info")
    );
    // Processing indicators
    ev.on("sdk:processing:started", () => showLoading(true));
    ev.on("sdk:processing:stopped", () => showLoading(false));
    // Staking state changes
    ev.on("stake:success", () => {
      loadStakingData();
    });
    ev.on("withdraw:success", () => {
      loadStakingData();
    });
    ev.on("emergencyWithdraw:success", () => {
      loadStakingData();
    });
    // Treasury enablement
    ev.on("treasury:added", () => {
      showToast("SDK unlocked with treasury wallet", "success");
      loadStakingData();
    });
  }
}

function setupEventListeners() {
  // Connect wallet button
  connectWalletBtn?.addEventListener("click", connectWallet);
  disconnectWalletBtn?.addEventListener("click", disconnectWallet);

  // Copy address button
  copyAddressBtn?.addEventListener("click", copyWalletAddress);

  // Navigation
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      document
        .querySelectorAll(".nav-link")
        .forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
    });
  });
}

function renderProposals() {
  if (!proposalsList) return;

  const votes = getStoredVotes();
  const account = window.algoStakeXClient?.account || null;

  proposalsList.innerHTML = PROPOSALS.map((p) => {
    const tallies = getTallies(votes, p.id);
    const total = Math.max(tallies.for + tallies.against + tallies.abstain, 1);
    const voted = account && getUserVote(votes, p.id, account);
    const youVoted = voted
      ? `<div class="your-vote">You voted: <strong>${voted.choice}</strong> (weight ${voted.weight})</div>`
      : "";
    const disabled = voted || !account || (currentVotingPower || 0) <= 0;

    return `
      <div class="proposal-card" data-id="${p.id}">
        <div class="proposal-header">
          <h3>${p.title}</h3>
        </div>
        <p class="proposal-desc">${p.description}</p>
        <div class="tally">
          <div class="tally-row"><span>For</span><span>${
            tallies.for
          }</span></div>
          <div class="tally-progress">
            <div class="bar bar-for" style="width:${
              (tallies.for / total) * 100
            }%"></div>
          </div>
          <div class="tally-row"><span>Against</span><span>${
            tallies.against
          }</span></div>
          <div class="tally-progress">
            <div class="bar bar-against" style="width:${
              (tallies.against / total) * 100
            }%"></div>
          </div>
          <div class="tally-row"><span>Abstain</span><span>${
            tallies.abstain
          }</span></div>
          <div class="tally-progress">
            <div class="bar bar-abstain" style="width:${
              (tallies.abstain / total) * 100
            }%"></div>
          </div>
        </div>
        ${youVoted}
        <div class="vote-options">
          <button class="btn vote-btn vote-for" data-id="${
            p.id
          }" data-choice="For" ${
      disabled ? "disabled" : ""
    }><i class="fas fa-thumbs-up"></i> For</button>
          <button class="btn vote-btn vote-against" data-id="${
            p.id
          }" data-choice="Against" ${
      disabled ? "disabled" : ""
    }><i class="fas fa-thumbs-down"></i> Against</button>
          <button class="btn vote-btn vote-abstain" data-id="${
            p.id
          }" data-choice="Abstain" ${
      disabled ? "disabled" : ""
    }><i class="fas fa-hand"></i> Abstain</button>
        </div>
      </div>
    `;
  }).join("");

  // Attach vote handlers
  proposalsList.querySelectorAll(".vote-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const choice = btn.getAttribute("data-choice");
      handleVote(id, choice);
    });
  });
}

async function connectWallet() {
  try {
    // Open the SDK UI so the user can pick a wallet (Pera/Defly)
    window.algoStakeXClient?.maximizeSDK();
  } catch (error) {
    console.error("Failed to open wallet UI:", error);
    showToast("Unable to open wallet UI. Please try again.", "error");
  }
}

async function disconnectWallet() {
  try {
    if (window.algoStakeXClient?.disconnectWallet) {
      await window.algoStakeXClient.disconnectWallet();
    }
  } catch (e) {
    // Fallback to UI state reset
  } finally {
    handleWalletDisconnected();
  }
}

function handleWalletConnected() {
  const account = window.algoStakeXClient.account;
  if (!account) return;

  // Update UI
  walletConnectionSection.style.display = "none";
  governanceSection.style.display = "block";
  profileSection.style.display = "flex";
  if (homeHero) homeHero.style.display = "none";

  // Display wallet info
  const shortAddress = `${account.slice(0, 6)}...${account.slice(-4)}`;
  walletAddress.textContent = shortAddress;
  if (connectedWalletLabel) connectedWalletLabel.textContent = shortAddress;

  // Attempt to unlock SDK using env treasury
  attemptEnableSDKFromEnv();

  // Load staking data
  loadStakingData();
}

function handleWalletDisconnected() {
  walletConnectionSection.style.display = "block";
  governanceSection.style.display = "none";
  profileSection.style.display = "none";
  if (homeHero) homeHero.style.display = "block";

  // Reset state
  currentStakeAmount = 0;
  currentTier = null;
  currentVotingPower = 0;

  renderProposals();
}

async function loadStakingData() {
  try {
    const status = await window.algoStakeXClient.stackingStatus();
    let decimals = 0;
    try {
      const meta = await window.algoStakeXClient.getFTMetadata(
        status?.stakeData?.tokenId
      );
      decimals = meta?.decimals || 0;
    } catch (_) {}

    if (status?.exists && status.stakeData) {
      const amountRaw = Number(status.stakeData.amount) || 0;
      currentStakeAmount = amountRaw / Math.pow(10, decimals);

      // Determine current governance tier
      currentTier =
        [...GOV_TIERS]
          .reverse()
          .find((t) => currentStakeAmount >= t.minStake) || null;
      currentVotingPower = currentTier?.weight || 0;

      // Update UI
      if (votingPowerValue)
        votingPowerValue.textContent = String(currentVotingPower);
      if (currentTierLabel)
        currentTierLabel.textContent = currentTier
          ? `${currentTier.name} Tier`
          : "No Tier";
    } else {
      currentStakeAmount = 0;
      currentTier = null;
      currentVotingPower = 0;
      if (votingPowerValue) votingPowerValue.textContent = "0";
      if (currentTierLabel) currentTierLabel.textContent = "No Tier";
    }

    renderProposals();
  } catch (error) {
    console.error("Failed to load staking data:", error);
  }
}

// Voting storage helpers
function getStoredVotes() {
  try {
    return JSON.parse(localStorage.getItem("dao_votes") || "{}");
  } catch (_) {
    return {};
  }
}

function getUserVote(votes, proposalId, account) {
  const list = votes[proposalId] || [];
  return list.find((v) => v.account === account);
}

function saveVote(votes, proposalId, record) {
  const list = votes[proposalId] || [];
  const idx = list.findIndex((v) => v.account === record.account);
  if (idx >= 0) list[idx] = record;
  else list.push(record);
  votes[proposalId] = list;
  localStorage.setItem("dao_votes", JSON.stringify(votes));
}

function getTallies(votes, proposalId) {
  const list = votes[proposalId] || [];
  return list.reduce(
    (acc, v) => {
      const key = v.choice.toLowerCase();
      if (key === "for") acc.for += v.weight;
      else if (key === "against") acc.against += v.weight;
      else acc.abstain += v.weight;
      return acc;
    },
    { for: 0, against: 0, abstain: 0 }
  );
}

function handleVote(proposalId, choice) {
  const account = window.algoStakeXClient?.account;
  if (!account) {
    showToast("Connect wallet to vote", "error");
    return;
  }
  if ((currentVotingPower || 0) <= 0) {
    showToast("You need to stake to gain voting power", "error");
    return;
  }

  const votes = getStoredVotes();
  saveVote(votes, proposalId, {
    account,
    choice,
    weight: currentVotingPower,
    time: Date.now(),
  });
  showToast("Vote cast successfully!", "success");
  renderProposals();
}

async function loadTokenBalance() {
  try {
    // This would typically fetch from the Algorand network
    // For demo purposes, we'll simulate it
    const mockBalance = Math.floor(Math.random() * 10000) + 1000;
    walletBalance.textContent = `${mockBalance.toLocaleString()} ALGO`;

    // Update tokens list
    updateTokensList(mockBalance);
  } catch (error) {
    console.error("Failed to load token balance:", error);
  }
}

function updateTokensList(balance) {
  const tokensList = document.getElementById("tokens-list");
  if (!tokensList) return;

  tokensList.innerHTML = `
    <div class="token-item">
      <div class="token-info">
        <div class="token-icon">ALGO</div>
        <div class="token-details">
          <h4>Algorand</h4>
          <p>Native token</p>
        </div>
      </div>
      <div class="token-balance">
        <div class="balance-amount">${balance.toLocaleString()}</div>
        <div class="balance-usd">$${(balance * 0.25).toFixed(2)}</div>
      </div>
    </div>
    <div class="token-item">
      <div class="token-info">
        <div class="token-icon">USDC</div>
        <div class="token-details">
          <h4>USD Coin</h4>
          <p>Stablecoin</p>
        </div>
      </div>
      <div class="token-balance">
        <div class="balance-amount">${Math.floor(
          balance * 0.3
        ).toLocaleString()}</div>
        <div class="balance-usd">$${(balance * 0.3).toFixed(2)}</div>
      </div>
    </div>
  `;
}

function calculateRewards() {
  if (!currentTier || !stakingStartTime) {
    rewardsEarned = 0;
    return;
  }

  const timeStaked = (Date.now() - stakingStartTime) / (1000 * 60 * 60 * 24); // days
  const dailyRate = currentTier.apy / 365 / 100;
  rewardsEarned = currentStakeAmount * dailyRate * timeStaked;
}

function updatePositionCards() {
  // Update staked amount
  document.getElementById("staked-amount").textContent =
    currentStakeAmount.toLocaleString();

  // Update current APY
  const apyElement = document.getElementById("current-apy");
  if (currentTier) {
    apyElement.textContent = `${currentTier.apy}%`;
    document.getElementById(
      "current-tier"
    ).textContent = `${currentTier.name} Tier`;
  } else {
    apyElement.textContent = "0%";
    document.getElementById("current-tier").textContent = "No Tier";
  }

  // Update earned rewards
  document.getElementById("earned-rewards").textContent =
    rewardsEarned.toFixed(2);

  // Update time staked
  if (stakingStartTime) {
    const daysStaked = Math.floor(
      (Date.now() - stakingStartTime) / (1000 * 60 * 60 * 24)
    );
    document.getElementById("time-staked").textContent = `${daysStaked}d`;
    document.getElementById("staking-status").textContent = "Active";
  }

  // Update change indicators
  document.getElementById("staked-change").textContent = "+12.5%";
  document.getElementById("rewards-change").textContent = "+8.2%";
}

function updateActionButtons() {
  const withdrawBtn = document.getElementById("withdraw-btn");
  const emergencyWithdrawBtn = document.getElementById(
    "emergency-withdraw-btn"
  );
  const compoundBtn = document.getElementById("compound-btn");

  const hasStake = currentStakeAmount > 0;

  withdrawBtn.disabled = !hasStake;
  emergencyWithdrawBtn.disabled = !hasStake;
  compoundBtn.disabled = !hasStake || rewardsEarned < 1;
}

function updateStakePreview() {
  const amountInput = document.getElementById("stake-amount");
  const lockPeriodSelect = document.getElementById("lock-period");

  if (!amountInput || !lockPeriodSelect) return;

  const amount = parseFloat(amountInput.value) || 0;
  const lockPeriod = parseInt(lockPeriodSelect.value) || 0;

  // Find applicable tier
  const tier = APY_TIERS.reverse().find((t) => amount >= t.minStake);
  APY_TIERS.reverse();

  if (!tier) {
    document.getElementById("preview-tier").textContent = "None";
    document.getElementById("preview-apy").textContent = "0%";
    document.getElementById("preview-daily").textContent = "0 tokens";
    document.getElementById("preview-monthly").textContent = "0 tokens";
    return;
  }

  // Calculate APY with lock bonus
  let apy = tier.apy;
  const lockBonuses = {
    1440: 0.5, // 1 day
    10080: 1, // 7 days
    43200: 2, // 30 days
    129600: 3, // 90 days
  };

  if (lockBonuses[lockPeriod]) {
    apy += lockBonuses[lockPeriod];
  }

  const dailyReward = amount * (apy / 365 / 100);
  const monthlyReward = dailyReward * 30;

  document.getElementById("preview-tier").textContent = tier.name;
  document.getElementById("preview-apy").textContent = `${apy}%`;
  document.getElementById("preview-daily").textContent = `${dailyReward.toFixed(
    2
  )} tokens`;
  document.getElementById(
    "preview-monthly"
  ).textContent = `${monthlyReward.toFixed(2)} tokens`;
}

function updateStakingHistory() {
  const historyContainer = document.getElementById("staking-history");
  if (!historyContainer) return;

  // Mock history data
  const history = [
    {
      action: "Initial Stake",
      amount: "+500",
      time: "2 days ago",
      icon: "fa-arrow-up",
    },
    {
      action: "Rewards Claimed",
      amount: "+12.5",
      time: "1 day ago",
      icon: "fa-gift",
    },
    {
      action: "Additional Stake",
      amount: "+200",
      time: "6 hours ago",
      icon: "fa-plus",
    },
  ];

  historyContainer.innerHTML = history
    .map(
      (item) => `
    <div class="history-item">
      <div class="history-icon">
        <i class="fas ${item.icon}"></i>
      </div>
      <div class="history-details">
        <div class="history-action">${item.action}</div>
        <div class="history-time">${item.time}</div>
      </div>
      <div class="history-amount">${item.amount} tokens</div>
    </div>
  `
    )
    .join("");
}

// Modal functions
function openStakeModal() {
  document.getElementById("stake-modal").style.display = "flex";
  updateStakePreview();
}

function closeStakeModal() {
  document.getElementById("stake-modal").style.display = "none";
}

function setSuggestedAmount(amount) {
  document.getElementById("stake-amount").value = amount;
  updateStakePreview();
}

async function withdrawStake() {
  try {
    showLoading(true);
    await window.algoStakeXClient.withdraw("default");
  } catch (error) {
    console.error("Withdrawal failed:", error);
    showToast("Withdrawal failed. Please try again.", "error");
  } finally {
    showLoading(false);
  }
}

async function emergencyWithdrawStake() {
  if (!confirm("Emergency withdrawal will incur a penalty. Continue?")) return;

  try {
    showLoading(true);
    await window.algoStakeXClient.emergencyWithdraw("default");
  } catch (error) {
    console.error("Emergency withdrawal failed:", error);
    showToast("Emergency withdrawal failed. Please try again.", "error");
  } finally {
    showLoading(false);
  }
}

async function compoundRewards() {
  try {
    showLoading(true);
    // This would compound rewards back into the stake
    showToast("Rewards compounded successfully!", "success");
    loadStakingData();
  } catch (error) {
    console.error("Compound failed:", error);
    showToast("Compound failed. Please try again.", "error");
  } finally {
    showLoading(false);
  }
}

function copyWalletAddress() {
  const fullAddress = window.algoStakeXClient?.account;
  if (fullAddress) {
    navigator.clipboard.writeText(fullAddress);
    showToast("Address copied to clipboard!", "success");
  }
}

// Keep handlers minimal for governance demo
function handleStakeSuccess() {
  showToast("Stake successful!", "success");
  loadStakingData();
}

function handleWithdrawSuccess() {
  showToast("Withdrawal successful!", "success");
  loadStakingData();
}

// Utility functions
function showLoading(show) {
  const loadingContainer = document.getElementById("loading");
  if (loadingContainer) {
    loadingContainer.style.display = show ? "flex" : "none";
  }
}

function showToast(message, type = "info") {
  // Create toast element
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <i class="fas ${
        type === "success"
          ? "fa-check-circle"
          : type === "error"
          ? "fa-exclamation-circle"
          : "fa-info-circle"
      }"></i>
      <span>${message}</span>
    </div>
  `;

  // Add to page
  document.body.appendChild(toast);

  // Animate in
  setTimeout(() => toast.classList.add("show"), 100);

  // Remove after delay
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 3000);
}

// Handle stake form submission
// No forms in governance demo; reserve handler stub
document.addEventListener("submit", async function (e) {
  // no-op
});

// Close modal when clicking outside
// No stake modal in governance demo
document.addEventListener("click", function () {});

// Update rewards periodically
// Periodic updates not required for governance demo

// Add toast styles dynamically
const toastStyles = `
<style>
.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(26, 31, 46, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1rem 1.5rem;
  color: white;
  z-index: 3000;
  transform: translateX(400px);
  transition: transform 0.3s ease;
  backdrop-filter: blur(20px);
}

.toast.show {
  transform: translateX(0);
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.toast-success {
  border-left: 4px solid #10b981;
}

.toast-error {
  border-left: 4px solid #ef4444;
}

.toast-info {
  border-left: 4px solid #3b82f6;
}

.toast-success i {
  color: #10b981;
}

.toast-error i {
  color: #ef4444;
}

.toast-info i {
  color: #3b82f6;
}
</style>
`;

document.head.insertAdjacentHTML("beforeend", toastStyles);
