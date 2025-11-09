/**
 * Initialize AlgoStakeX
 */
window.algoStakeXClient = new window.AlgoStakeX({
  env: "testnet", // testnet | mainnet
  namespace: "STAKX", // unique namespace
  token_id: 749347951, // ASA ID - replace with actual token ID
  enable_ui: true,
  disableToast: false,
  toastLocation: "TOP_RIGHT", // TOP_LEFT | TOP_RIGHT
  minimizeUILocation: "right", // left | right
  logo: "./logo.png", // your website logo (URL / path to image)
  staking: {
    type: "FLEXIBLE", // FLEXIBLE | FIXED
    stake_period: 1440, // optional for FLEXIBLE (in minutes) [24 hours]
    withdraw_penalty: 5, // optional for FLEXIBLE (percentage)
    reward: {
      type: "APY", // APY | UTILITY
      value: 5, // 5% APY or "feature 1,2" for UTILITY
    },
  },
});

const TREASURY_MNEMONIC = "";

/**
 * SDK events
 */

algoStakeXClient.events.on(
  "wallet:connection:connected",
  async ({ address }) => {
    console.log("wallet:connection:connected:", address);
    updateProfileSection(address);
    // await loadStakingInfo();
    // await loadWalletTokens();
    showStakingSection();
    window.algoStakeXClient.addTreasuryWallet(
      "YUF5JD4S6T764QQMHYUKZYN2BEWFZMHPPIHHSRXHW64TI3IQHEDVBIUUHQ",
      TREASURY_MNEMONIC
    );
  }
);

algoStakeXClient.events.on("wallet:disconnected", async () => {
  console.log("Wallet disconnected");
  updateProfileSection(null);
  hideStakingSection();
});

algoStakeXClient.events.on("wallet:connection:failed", async ({ error }) => {
  console.log("wallet:connection:failed:", error);
});

algoStakeXClient.events.on("window:size:minimized", async ({ minimized }) => {
  console.log("SDK window minimized:", minimized);
});

algoStakeXClient.events.on("sdk:processing:started", async ({ processing }) => {
  console.log("SDK processing started:", processing);
  showLoading();
});

algoStakeXClient.events.on("sdk:processing:stopped", async ({ processing }) => {
  console.log("SDK processing stopped:", processing);
  hideLoading();
});

algoStakeXClient.events.on("stake:success", async ({ transactionId }) => {
  console.log("stake:success:", transactionId);
  // await loadStakingInfo();
  // await loadWalletTokens();
  closeStakeModal();
});

algoStakeXClient.events.on("stake:failed", async ({ error }) => {
  console.log("stake:failed:", error);
});

algoStakeXClient.events.on("withdraw:success", async ({ transactionId }) => {
  console.log("withdraw:success:", transactionId);
  // await loadStakingInfo();
  // await loadWalletTokens();
});

algoStakeXClient.events.on("withdraw:failed", async ({ error }) => {
  console.log("withdraw:failed:", error);
});

algoStakeXClient.events.on(
  "emergencyWithdraw:success",
  async ({ transactionId }) => {
    console.log("emergencyWithdraw:success:", transactionId);
    // await loadStakingInfo();
    // await loadWalletTokens();
  }
);

algoStakeXClient.events.on("emergencyWithdraw:failed", async ({ error }) => {
  console.log("emergencyWithdraw:failed:", error);
});

algoStakeXClient.events.on("treasury:added", async ({ address }) => {
  console.log("Treasury wallet added:", address);
});

algoStakeXClient.events.on("treasury:add:failed", async ({ error }) => {
  console.log("treasury:add:failed:", error);
});

/**
 * UI Functions
 */

function showLoading() {
  document.getElementById("loading").style.display = "flex";
}

function hideLoading() {
  document.getElementById("loading").style.display = "none";
}

function showStakingSection() {
  document.getElementById("wallet-connection-section").style.display = "none";
  document.getElementById("staking-section").style.display = "block";
}

function hideStakingSection() {
  document.getElementById("wallet-connection-section").style.display = "block";
  document.getElementById("staking-section").style.display = "none";
}

async function connectWallet() {
  try {
    if (algoStakeXClient.maximizeSDK) {
      algoStakeXClient.maximizeSDK();
    } else {
      alert("Please use the SDK UI to connect your wallet");
    }
  } catch (error) {
    console.error("Error connecting wallet:", error);
  }
}

async function loadStakingInfo() {
  try {
    if (!algoStakeXClient.account) {
      return;
    }

    const status = await algoStakeXClient.stackingStatus("STAKX");

    if (status.exists && status.stakeData) {
      const stakeData = status.stakeData;
      document.getElementById("staked-amount").textContent = formatNumber(
        stakeData.amount || 0
      );
      document.getElementById("reward-type").textContent =
        stakeData.rewardType || "-";

      if (stakeData.rewardType === "APY") {
        document.getElementById("reward-info").textContent = `${
          stakeData.rewardRate || 0
        }% APY`;
      } else {
        document.getElementById("reward-info").textContent =
          stakeData.utility || "-";
      }

      const currentTime = Math.floor(Date.now() / 1000);
      const lockEndTime = stakeData.lockEndTime || 0;
      const isLocked = currentTime < lockEndTime;

      if (isLocked) {
        const remainingTime = lockEndTime - currentTime;
        const days = Math.floor(remainingTime / 86400);
        const hours = Math.floor((remainingTime % 86400) / 3600);
        document.getElementById("staking-status").textContent = "Locked";
        document.getElementById(
          "staking-details"
        ).textContent = `Unlocks in ${days}d ${hours}h`;
        document.getElementById("withdraw-btn").disabled = true;
      } else {
        document.getElementById("staking-status").textContent = "Active";
        document.getElementById("staking-details").textContent =
          "Ready to withdraw";
        document.getElementById("withdraw-btn").disabled = false;
      }

      document.getElementById("emergency-withdraw-btn").disabled = false;
    } else {
      document.getElementById("staked-amount").textContent = "0";
      document.getElementById("reward-type").textContent = "-";
      document.getElementById("reward-info").textContent = "-";
      document.getElementById("staking-status").textContent = "Not Staking";
      document.getElementById("staking-details").textContent = "-";
      document.getElementById("withdraw-btn").disabled = true;
      document.getElementById("emergency-withdraw-btn").disabled = true;
    }
  } catch (error) {
    console.error("Error loading staking info:", error);
  }
}

async function loadWalletTokens() {
  try {
    if (!algoStakeXClient.account) {
      document.getElementById("tokens-list").innerHTML =
        "<p>Connect wallet to view tokens</p>";
      return;
    }

    const tokens = await algoStakeXClient.getWalletFTs();

    if (!tokens || tokens.length === 0) {
      document.getElementById("tokens-list").innerHTML =
        "<p>No tokens found in wallet</p>";
      return;
    }

    const tokensHtml = tokens
      .map((token) => {
        const tokenId = token.assetId;
        const amount = formatNumber(token.amount);
        return `
        <div class="token-item">
          <div class="token-info">
            <strong>Token ID:</strong> ${tokenId} | 
            <strong>Amount:</strong> ${amount}
          </div>
        </div>
      `;
      })
      .join("");

    document.getElementById("tokens-list").innerHTML = tokensHtml;
  } catch (error) {
    console.error("Error loading wallet tokens:", error);
    document.getElementById("tokens-list").innerHTML =
      "<p>Error loading tokens: " + error.message + "</p>";
  }
}

function openStakeModal() {
  if (!algoStakeXClient.account) {
    alert("Please connect your wallet first");
    return;
  }

  document.getElementById("stake-modal").style.display = "block";
}

function closeStakeModal() {
  document.getElementById("stake-modal").style.display = "none";
  document.getElementById("stake-form").reset();
}

async function withdrawStake() {
  if (!algoStakeXClient.account) {
    alert("Please connect your wallet first");
    return;
  }

  if (
    !confirm(
      "Are you sure you want to withdraw your staked tokens? This will claim your rewards."
    )
  ) {
    return;
  }

  try {
    await algoStakeXClient.withdraw("default");
  } catch (error) {
    console.error("Error withdrawing:", error);
  }
}

async function emergencyWithdrawStake() {
  if (!algoStakeXClient.account) {
    alert("Please connect your wallet first");
    return;
  }

  const penaltyPercentage = prompt(
    "Enter penalty percentage (default 5):",
    "5"
  );

  if (penaltyPercentage === null) {
    return;
  }

  const penalty = parseInt(penaltyPercentage) || 5;

  if (
    !confirm(
      `Are you sure you want to emergency withdraw? You will lose rewards and pay ${penalty}% penalty.`
    )
  ) {
    return;
  }

  try {
    await algoStakeXClient.emergencyWithdraw("default", penalty);
  } catch (error) {
    console.error("Error emergency withdrawing:", error);
  }
}

// Function to format wallet address
function formatWalletAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Function to format numbers
function formatNumber(num) {
  if (!num || num === 0) return "0";
  return num.toLocaleString();
}

// Function to get random avatar
function getRandomAvatar() {
  const styles = [
    "adventurer",
    "avataaars",
    "bottts",
    "fun-emoji",
    "micah",
    "miniavs",
    "pixel-art",
    "personas",
  ];
  const style = styles[Math.floor(Math.random() * styles.length)];
  const seed = Math.random().toString(36).substring(7);
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;
}

// Function to update profile section
function updateProfileSection(address) {
  const profileSection = document.getElementById("profile-section");
  const walletAddress = document.getElementById("wallet-address");
  const profileAvatar = document.querySelector(".profile-avatar img");

  if (address) {
    walletAddress.textContent = formatWalletAddress(address);
    profileAvatar.src = getRandomAvatar();
    profileSection.style.display = "flex";
  } else {
    profileSection.style.display = "none";
  }
}

// Stake form submission
document.addEventListener("DOMContentLoaded", () => {
  // Connect wallet button event listener
  const connectWalletBtn = document.getElementById("connect-wallet-btn");
  if (connectWalletBtn) {
    connectWalletBtn.addEventListener("click", connectWallet);
  }

  const stakeForm = document.getElementById("stake-form");
  if (stakeForm) {
    stakeForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!algoStakeXClient.account) {
        alert("Please connect your wallet first");
        return;
      }

      const amount = document.getElementById("stake-amount").value;
      const lockPeriod = document.getElementById("lock-period").value || 0;

      if (!amount || amount <= 0) {
        alert("Please enter a valid amount");
        return;
      }

      try {
        await algoStakeXClient.stack({
          poolId: "default",
          amount: parseInt(amount),
          lockPeriod: parseInt(lockPeriod) * 60, // Convert minutes to seconds
        });
      } catch (error) {
        console.error("Error stacking:", error);
      }
    });
  }

  // Close modal when clicking outside
  const modal = document.getElementById("stake-modal");
  if (modal) {
    window.onclick = function (event) {
      if (event.target === modal) {
        closeStakeModal();
      }
    };
  }

  // Update profile section on initial load
  if (algoStakeXClient.account) {
    updateProfileSection(algoStakeXClient.account);
    // loadStakingInfo();
    // loadWalletTokens();
    showStakingSection();
  }

  // Load staking info periodically
  setInterval(async () => {
    if (algoStakeXClient.account) {
      // await loadStakingInfo();
    }
  }, 30000); // Every 30 seconds
});
