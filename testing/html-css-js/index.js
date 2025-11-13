/**
 * DeFi Yield Farm - Enhanced JavaScript with APY Tiers
 * Powered by AlgoStakeX SDK
 */

// APY Tier Configuration
const APY_TIERS = [
  {
    name: "Bronze",
    minStake: 100,
    apy: 15,
    features: ["Basic Staking", "Daily Rewards", "Community Access"],
    color: "#CD7F32",
    icon: "fas fa-medal",
  },
  {
    name: "Silver",
    minStake: 500,
    apy: 18,
    features: [
      "Enhanced APY",
      "Priority Support",
      "Advanced Analytics",
      "Bonus Rewards",
    ],
    color: "#C0C0C0",
    icon: "fas fa-trophy",
  },
  {
    name: "Gold",
    minStake: 1000,
    apy: 22,
    features: [
      "Premium APY",
      "VIP Support",
      "Exclusive Events",
      "NFT Rewards",
      "Early Access",
    ],
    color: "#FFD700",
    icon: "fas fa-crown",
  },
  {
    name: "Platinum",
    minStake: 5000,
    apy: 25,
    features: [
      "Maximum APY",
      "Personal Manager",
      "Private Events",
      "Revenue Sharing",
      "Governance Rights",
      "Custom Features",
    ],
    color: "#E5E4E2",
    icon: "fas fa-gem",
  },
];

// Initialize AlgoStakeX with enhanced APY tier configuration
window.algoStakeXClient = new window.AlgoStakeX({
  env: "testnet",
  namespace: "", // Different namespace for DeFi demo
  token_id: 749398662,
  enable_ui: true,
  disableToast: false,
  toastLocation: "TOP_RIGHT",
  minimizeUILocation: "right",
  logo: "./logo.png",
  staking: {
    type: "FLEXIBLE", // Flexible staking for DeFi
    stake_period: 1, // No mandatory lock period
    withdraw_penalty: 0, // Small penalty for early withdrawal
    reward: {
      type: "APY",
      stop_reward_on_stake_completion: false, // Continuous rewards
      value: APY_TIERS.map((tier) => ({
        name: tier.name,
        stake_amount: tier.minStake,
        value: tier.apy,
      })),
    },
  },
});

// Global state
let currentStakeAmount = 0;
let currentTier = null;
let stakingStartTime = null;
let rewardsEarned = 0;

// DOM Elements
const connectWalletBtn = document.getElementById("connect-wallet-btn");
const walletConnectionSection = document.getElementById(
  "wallet-connection-section"
);
const stakingSection = document.getElementById("staking-section");
const profileSection = document.getElementById("profile-section");
const walletAddress = document.getElementById("wallet-address");
const walletBalance = document.getElementById("wallet-balance");
const copyAddressBtn = document.getElementById("copy-address");

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
  initializeApp();
  renderTiers();
  setupEventListeners();
});

function initializeApp() {
  // Check if wallet is already connected
  if (window.algoStakeXClient && window.algoStakeXClient.account) {
    handleWalletConnected();
  }

  // Set up SDK event listeners
  if (window.algoStakeXClient) {
    window.algoStakeXClient.on("walletConnected", handleWalletConnected);
    window.algoStakeXClient.on("walletDisconnected", handleWalletDisconnected);
    window.algoStakeXClient.on("stakeSuccess", handleStakeSuccess);
    window.algoStakeXClient.on("withdrawSuccess", handleWithdrawSuccess);
  }
}

function setupEventListeners() {
  // Connect wallet button
  connectWalletBtn?.addEventListener("click", connectWallet);

  // Copy address button
  copyAddressBtn?.addEventListener("click", copyWalletAddress);

  // Stake amount input for real-time preview
  const stakeAmountInput = document.getElementById("stake-amount");
  stakeAmountInput?.addEventListener("input", updateStakePreview);

  // Lock period selector
  const lockPeriodSelect = document.getElementById("lock-period");
  lockPeriodSelect?.addEventListener("change", updateStakePreview);

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

function renderTiers() {
  const tiersGrid = document.getElementById("tiers-grid");
  if (!tiersGrid) return;

  tiersGrid.innerHTML = APY_TIERS.map(
    (tier) => `
    <div class="tier-card ${
      currentTier?.name === tier.name ? "active" : ""
    }" data-tier="${tier.name}">
      <div class="tier-header">
        <div class="tier-name">
          <i class="${tier.icon}" style="color: ${tier.color}"></i>
          ${tier.name}
        </div>
        <div class="tier-apy">${tier.apy}%</div>
      </div>
      <div class="tier-requirement">
        Minimum stake: ${tier.minStake.toLocaleString()} tokens
      </div>
      <ul class="tier-features">
        ${tier.features
          .map(
            (feature) => `
          <li><i class="fas fa-check"></i> ${feature}</li>
        `
          )
          .join("")}
      </ul>
      ${
        currentStakeAmount < tier.minStake
          ? `
        <div class="tier-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${Math.min(
              (currentStakeAmount / tier.minStake) * 100,
              100
            )}%; background: ${tier.color}"></div>
          </div>
          <div class="progress-text">${
            tier.minStake - currentStakeAmount
          } more tokens needed</div>
        </div>
      `
          : ""
      }
    </div>
  `
  ).join("");
}

async function connectWallet() {
  try {
    showLoading(true);
    await window.algoStakeXClient.connectWallet();
  } catch (error) {
    console.error("Failed to connect wallet:", error);
    showToast("Failed to connect wallet. Please try again.", "error");
  } finally {
    showLoading(false);
  }
}

function handleWalletConnected() {
  const account = window.algoStakeXClient.account;
  if (!account) return;

  // Update UI
  walletConnectionSection.style.display = "none";
  stakingSection.style.display = "block";
  profileSection.style.display = "flex";

  // Display wallet info
  const shortAddress = `${account.slice(0, 6)}...${account.slice(-4)}`;
  walletAddress.textContent = shortAddress;

  // Load staking data
  loadStakingData();
  loadTokenBalance();
  updateStakingHistory();
}

function handleWalletDisconnected() {
  walletConnectionSection.style.display = "block";
  stakingSection.style.display = "none";
  profileSection.style.display = "none";

  // Reset state
  currentStakeAmount = 0;
  currentTier = null;
  stakingStartTime = null;
  rewardsEarned = 0;

  renderTiers();
}

async function loadStakingData() {
  try {
    const status = await window.algoStakeXClient.stackingStatus("default");

    if (status?.exists && status.stakeData) {
      currentStakeAmount = parseInt(status.stakeData.amount) || 0;
      stakingStartTime = status.stakeData.timestamp || Date.now();

      // Calculate current tier
      currentTier = APY_TIERS.reverse().find(
        (tier) => currentStakeAmount >= tier.minStake
      );
      APY_TIERS.reverse(); // Reset order

      // Calculate rewards
      calculateRewards();

      // Update UI
      updatePositionCards();
      renderTiers();
      updateActionButtons();
    }
  } catch (error) {
    console.error("Failed to load staking data:", error);
  }
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

function handleStakeSuccess() {
  showToast("Stake successful!", "success");
  closeStakeModal();
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
document.addEventListener("submit", async function (e) {
  if (e.target.id === "stake-form") {
    e.preventDefault();

    const amount = parseFloat(document.getElementById("stake-amount").value);
    const lockPeriod = parseInt(document.getElementById("lock-period").value);

    if (!amount || amount < 100) {
      showToast("Minimum stake amount is 100 tokens", "error");
      return;
    }

    try {
      showLoading(true);
      await window.algoStakeXClient.stake("default", amount, lockPeriod);
    } catch (error) {
      console.error("Stake failed:", error);
      showToast("Stake failed. Please try again.", "error");
    } finally {
      showLoading(false);
    }
  }
});

// Close modal when clicking outside
document.addEventListener("click", function (e) {
  const modal = document.getElementById("stake-modal");
  if (e.target === modal) {
    closeStakeModal();
  }
});

// Update rewards periodically
setInterval(() => {
  if (currentTier && stakingStartTime) {
    calculateRewards();
    updatePositionCards();
  }
}, 60000); // Update every minute

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
