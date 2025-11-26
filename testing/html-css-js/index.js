/**
 * DeFi Yield Farm - Enhanced JavaScript with APY Tiers
 * Powered by AlgoStakeX SDK
 */

// APY Tier Configuration
// Governance Tier Configuration with voting weights
const SDK_CONFIG = {
  env: "testnet",
  namespace: "DAOX",
  token_id: 749398662,
  disableUi: false,
  disableToast: false,
  toastLocation: "TOP_RIGHT",
  minimizeUILocation: "right",
  logo: "./gold-balance-scale.png",
  staking: {
    type: "FLEXIBLE",
    stake_period: 1440,
    withdraw_penalty: 0,
    reward: {
      type: "APY",
      stop_reward_on_stake_completion: false,
      value: [
        {
          name: "Bronze",
          stake_amount: 5,
          value: 1,
          weight: 1,
          color: "#CD7F32",
          icon: "fas fa-medal",
          benefits: ["Basic governance access", "1x voting power"],
        },
        {
          name: "Silver",
          stake_amount: 10,
          value: 1,
          weight: 2,
          color: "#C0C0C0",
          icon: "fas fa-trophy",
          benefits: ["Priority on proposals", "2x voting power"],
        },
        {
          name: "Gold",
          stake_amount: 15,
          value: 1,
          weight: 3,
          color: "#FFD700",
          icon: "fas fa-crown",
          benefits: ["Increased governance weight", "3x voting power"],
        },
        {
          name: "Platinum",
          stake_amount: 20,
          value: 1,
          weight: 4,
          color: "#E5E4E2",
          icon: "fas fa-gem",
          benefits: ["Highest governance weight", "4x voting power"],
        },
      ],
    },
  },
};

const TIERS = SDK_CONFIG.staking.reward.value;

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
window.algoStakeXClient = new window.AlgoStakeX(SDK_CONFIG);

// Global state
let currentStakeAmount = 0; // in tokens (adjusted for decimals)
let currentTier = null; // from GOV_TIERS
let currentVotingPower = 0; // weight based on tier

// DOM Elements
const connectWalletBtn = document.getElementById("connect-wallet-btn");
const disconnectWalletBtn = document.getElementById("disconnect-wallet-btn");
const governanceSection = document.getElementById("governance-section");
const profileSection = document.getElementById("profile-section");
const connectedWalletLabel = document.getElementById("connected-wallet");
const votingPowerValue = document.getElementById("voting-power-value");
const currentTierLabel = document.getElementById("current-tier-label");
const proposalsList = document.getElementById("proposals-list");
const homeHero = document.getElementById("home-hero");
const publicTiersList = document.getElementById("tiers-public-list");
const dashboardTiersList = document.getElementById("tiers-dashboard-list");
const connectSection = document.getElementById("connect-section");
const navPrimary = document.getElementById("nav-primary");
const publicTiersSection = document.getElementById("public-tiers");

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
  initializeApp();
  renderProposals();
  setupEventListeners();
  renderPublicTiers();
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
      ? `<div class="your-vote">You voted: <strong>${voted.choice}</strong> with <strong>${voted.weight}x</strong> power</div>`
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
    window.algoStakeXClient?.maximizeSDK();
  } catch (e) {}
}

function handleWalletConnected() {
  const account = window.algoStakeXClient.account;
  if (!account) return;

  // Update UI
  governanceSection.style.display = "block";
  profileSection.style.display = "flex";
  if (homeHero) homeHero.style.display = "none";
  if (publicTiersSection) publicTiersSection.style.display = "none";
  if (connectSection) connectSection.style.display = "none";

  // Display wallet info
  const shortAddress = `${account.slice(0, 6)}...${account.slice(-4)}`;
  if (connectedWalletLabel) connectedWalletLabel.textContent = shortAddress;

  // Attempt to unlock SDK using env treasury
  attemptEnableSDKFromEnv();

  // Load staking data
  loadStakingData();

  updateNavigationLabel(true);
}

function handleWalletDisconnected() {
  governanceSection.style.display = "none";
  profileSection.style.display = "none";
  if (homeHero) homeHero.style.display = "block";
  if (publicTiersSection) publicTiersSection.style.display = "block";
  if (connectSection) connectSection.style.display = "block";

  // Reset state
  currentStakeAmount = 0;
  currentTier = null;
  currentVotingPower = 0;

  renderProposals();
  renderPublicTiers();
  if (connectedWalletLabel) connectedWalletLabel.textContent = "—";
  if (votingPowerValue) votingPowerValue.textContent = "0";
  if (currentTierLabel) currentTierLabel.textContent = "No Tier";
  updateNavigationLabel(false);
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
        [...TIERS]
          .reverse()
          .find((t) => currentStakeAmount >= t.stake_amount) || null;
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
    renderDashboardTiers(currentTier?.name || null);
  } catch (error) {
    console.error("Failed to load staking data:", error);
  }
}

function renderTiers(container, tiers, highlightName) {
  if (!container) return;
  container.innerHTML = tiers
    .map((t) => {
      const active = highlightName && t.name === highlightName ? " active" : "";
      const benefits = Array.isArray(t.benefits)
        ? t.benefits
            .map((b) => `<li><i class=\"fas fa-check\"></i>${b}</li>`)
            .join("")
        : "";
      return `
        <div class="tier-card${active}">
          <div class="tier-header">
            <i class="${t.icon}"></i>
            <span class="tier-name" style="color:${t.color}">${t.name}</span>
          </div>
          <div class="tier-requirement">Min stake: ${t.stake_amount} — ${t.weight}x voting power</div>
          <ul class="tier-features">${benefits}</ul>
        </div>
      `;
    })
    .join("");
}

function renderPublicTiers() {
  renderTiers(publicTiersList, TIERS, null);
}

function renderDashboardTiers(activeName) {
  renderTiers(dashboardTiersList, TIERS, activeName);
}

function updateNavigationLabel(connected) {
  if (!navPrimary) return;
  if (connected) {
    navPrimary.innerHTML = `<i class="fas fa-gauge"></i> Dashboard`;
  } else {
    navPrimary.innerHTML = `<i class="fas fa-home"></i> Home`;
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

// Utility functions
function showLoading(show) {
  const loadingContainer = document.getElementById("loading");
  if (loadingContainer) {
    loadingContainer.style.display = show ? "flex" : "none";
  }
}

// Minimal stub: SDK shows notifications; keep function to avoid errors
function showToast() {}

// Update rewards periodically
// Periodic updates not required for governance demo

// demo toast styles removed
