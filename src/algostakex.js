import algosdk from "algosdk";
import { PeraWalletConnect } from "@perawallet/connect";
import { DeflyWalletConnect } from "@blockshake/defly-connect";
import eventBus from "./event-bus.js";
import { Validator } from "./validation.js";
import { UIManager } from "./ui.js";
import {
  algosToMicroAlgos,
  microAlgosToAlgos,
  getStakeKey,
  buildStakeBoxName,
  decodeStakeData,
} from "./utils.js";

const appSpecJson = require("../AlgoKit/smart_contracts/artifacts/AlgoStakeX/AlgoStakeX.arc32.json");
const encoder = new algosdk.ABIContract({
  name: appSpecJson.contract.name,
  methods: appSpecJson.contract.methods,
});

class AlgoStakeX {
  // ==========================================
  // COMMON SDK PRIVATE FIELDS
  // ==========================================
  #walletConnectors;
  #walletConnected;
  #connectionInfo;
  #connectionInProgress;
  #supportedWallets;
  #selectedWalletType;
  #algodClient;
  #disableToast;
  #disableUi;
  #minimizeUILocation;
  #logo;
  #supportedNetworks;
  #theme;
  #toastLocation;
  #mnemonicAccount; // For programmatic wallet connection
  #uiManager; // UI Manager instance
  #indexerUrl;

  // ==========================================
  // SDK-SPECIFIC PRIVATE FIELDS (ALGOSTAKEX)
  // ==========================================
  #contractApplicationId;
  #contractWalletAddress;
  #namespace;
  #treasuryWallet;
  #tokenId;
  #stakingConfig;

  constructor({
    // Common SDK parameters
    // Required
    env,
    // Optional
    disableUi = false,
    disableToast = false,
    toastLocation = "TOP_RIGHT",
    minimizeUILocation = "right",
    logo = null,
    // AlgoStakeX-specific parameters
    // Required
    namespace,
    token_id,
    staking = {},
    // Optional
  }) {
    try {
      // Common SDK parameters
      // Required
      this.network = Validator.validateEnvironment(env);
      // Optional
      this.#disableUi = Validator.validateDisableUi(disableUi);
      this.#disableToast = Validator.validateDisableToast(disableToast);
      this.#toastLocation = Validator.validateToastLocation(toastLocation);
      this.#minimizeUILocation =
        Validator.validateMinimizeUILocation(minimizeUILocation);
      this.#logo = Validator.validateLogo(logo);

      // AlgoStakeX-specific parameters
      // Required
      this.#namespace = Validator.validateNamespace(namespace);
      this.#tokenId = Validator.validateTokenId(token_id);
      this.#stakingConfig = Validator.validateStakingConfig(staking);
      // Optional

      // Initialize other common SDK properties
      this.#uiManager = new UIManager(this, {
        disableUi: this.#disableUi,
        disableToast: this.#disableToast,
        logo: this.#logo,
        minimizeUILocation: this.#minimizeUILocation,
        toastLocation: this.#toastLocation,
      });
      this.processing = false;
      this.events = eventBus;
      this.#supportedNetworks = ["mainnet", "testnet"];
      this.#walletConnectors = {
        pera: new PeraWalletConnect(),
        defly: new DeflyWalletConnect(),
      };
      this.#walletConnected = false;
      this.account = null;
      this.#connectionInfo = null;
      this.#connectionInProgress = false;
      this.#supportedWallets = ["pera", "defly"];
      this.#selectedWalletType = null;
      this.#algodClient = new algosdk.Algodv2(
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        this.network === "mainnet"
          ? "https://mainnet-api.algonode.cloud"
          : "https://testnet-api.algonode.cloud",
        443
      );
      this.#indexerUrl =
        this.network === "mainnet"
          ? "https://mainnet-idx.algonode.cloud"
          : "https://testnet-idx.algonode.cloud";

      // Initialize SDK variables (SDK specific)
      this.#treasuryWallet = null;
      this.sdkEnabled = false;

      // Initialize SDK contract details (SDK specific)
      this.#contractApplicationId =
        this.network === "mainnet" ? 749429587 : 749429587;
      this.#contractWalletAddress =
        this.network === "mainnet"
          ? "ESEUVKN4EGRLZHQJPS7AH3ITLQMFG3LABXD4VXZVJGHZEZU2JMEMJRA6NU"
          : "ESEUVKN4EGRLZHQJPS7AH3ITLQMFG3LABXD4VXZVJGHZEZU2JMEMJRA6NU";

      // Load saved UI state (only if UI is not disabled)
      if (!this.#disableUi) {
        const savedState = localStorage.getItem("axs");
        if (savedState) {
          try {
            const parsedState = JSON.parse(savedState);
            this.isMinimized = parsedState.minimized || false;
            this.theme = parsedState.theme || this.#uiManager.getSystemTheme();
          } catch (e) {
            this.isMinimized = false;
            this.theme = this.#uiManager.getSystemTheme();
          }
        } else {
          this.isMinimized = false;
          this.theme = this.#uiManager.getSystemTheme();
        }

        // Save initial state and initialize UI
        this.#uiManager.saveUIState();
        this.#initUI();
      }
    } catch (error) {
      this.#sdkValidationFailed(error.message);
    }
  }

  /**
   *********** SDK private methods
   */
  #sdkValidationFailed(message) {
    localStorage.removeItem("walletconnect");
    localStorage.removeItem("DeflyWallet.Wallet");
    localStorage.removeItem("PeraWallet.Wallet");

    // If UI is disabled, don't show alert or reload
    if (this.#disableUi) {
      console.error("SDK validation failed:", message);
      return;
    }

    alert(message);
    window.location.reload();
  }

  // ==========================================
  // COMMON SDK PRIVATE METHODS
  // ==========================================

  async #initUI() {
    // Initialize UI with callbacks
    this.#uiManager.initUI({
      onWalletConnect: (walletType) => this.#startWalletConnection(walletType),
      onMinimize: () => this.minimizeSDK(),
      onMaximize: () => this.maximizeSDK(),
      onLogout: () => this.#handleLogout(),
      onThemeToggle: () => {
        this.theme = this.theme === "light" ? "dark" : "light";
        this.#uiManager.saveUIState();
        this.#uiManager.applyTheme();
        eventBus.emit("theme:changed", { theme: this.theme });
      },
      onRenderAssets: () => {
        this.#uiManager
          .renderWalletAssets(
            this.#walletConnected,
            this.account,
            () => this.getWalletFTs(),
            (tokenId) => this.getFTMetadata(tokenId),
            this.#tokenId
          )
          .catch(() =>
            this.#uiManager.showToast("Failed to load assets", "error")
          );
      },
      onRenderMyStaking: () => {
        this.#uiManager
          .renderMyStaking(
            this.#walletConnected,
            this.account,
            (poolId) => this.stackingStatus(poolId),
            this.#namespace,
            (tokenId) => this.getFTMetadata(tokenId),
            this.#stakingConfig
          )
          .catch(() =>
            this.#uiManager.showToast("Failed to load staking info", "error")
          );
      },
      onStake: async () => {
        try {
          const selected = document.querySelector(
            ".algox-stakex-asset-item.selected"
          );
          if (!selected) {
            this.#uiManager.showToast("Select an asset first", "warning");
            return;
          }
          const amountInput = document.getElementById(
            "algox-stakex-amount-input"
          );
          const userAmount = Number(amountInput?.value) || 0;
          if (!userAmount || userAmount <= 0) {
            this.#uiManager.showToast("Invalid amount", "error");
            return;
          }
          const decimals = Number(selected.getAttribute("data-decimals")) || 0;
          const valueStr = String(amountInput?.value ?? "");
          if (valueStr.includes(".")) {
            const frac = valueStr.split(".")[1] || "";
            if (frac.length > decimals) {
              this.#uiManager.showToast(
                `Amount supports up to ${decimals} decimals`,
                "error"
              );
              return;
            }
          }

          this.#uiManager.showLoadingOverlay("Staking...");
          await this.stake({
            poolId: this.#namespace,
            amount: userAmount,
          });
          this.#uiManager.showToast("Staking successful!", "success");

          // Wait a moment for blockchain confirmation, then refresh UI
          setTimeout(async () => {
            // Reload wallet assets to show updated balance
            await this.#uiManager.renderWalletAssets(
              this.#walletConnected,
              this.account,
              () => this.getWalletFTs(),
              (tokenId) => this.getFTMetadata(tokenId),
              this.#tokenId
            );

            // Reset the staking form
            this.#uiManager.resetStakingTab();
          }, 1500);
        } catch (e) {
          this.#uiManager.showToast(e.message || "Stake failed", "error");
        } finally {
          this.#uiManager.hideLoadingOverlay();
        }
      },
      onWithdraw: async () => {
        try {
          // Check if it's emergency withdraw or normal withdraw
          const withdrawBtn = document.getElementById(
            "algox-stakex-withdraw-btn"
          );
          const isEmergency =
            withdrawBtn?.className === "algox-stakex-withdraw-btn-emergency";

          this.#uiManager.showLoadingOverlay(
            isEmergency ? "Emergency withdrawing..." : "Withdrawing..."
          );

          if (isEmergency) {
            await this.emergencyWithdraw(
              this.#namespace,
              this.#stakingConfig.withdraw_penalty
            );
            this.#uiManager.showToast(
              "Emergency withdraw successful!",
              "success"
            );
          } else {
            await this.withdraw(this.#namespace);
            this.#uiManager.showToast("Withdraw successful!", "success");
          }

          // Wait a moment for blockchain confirmation, then refresh UI
          setTimeout(async () => {
            // Reset My Staking UI
            this.#uiManager.resetMyStakingTab();

            // Reload wallet assets in Stake tab to show updated balance
            await this.#uiManager.renderWalletAssets(
              this.#walletConnected,
              this.account,
              () => this.getWalletFTs(),
              (tokenId) => this.getFTMetadata(tokenId),
              this.#tokenId
            );
          }, 1500);
        } catch (e) {
          this.#uiManager.showToast(e.message || "Withdraw failed", "error");
        } finally {
          this.#uiManager.hideLoadingOverlay();
        }
      },
    });

    // Try restore wallet connection
    this.#loadConnectionFromStorage();
  }

  async #loadConnectionFromStorage() {
    try {
      // Check for wallet connection data in localStorage
      const walletconnect = localStorage.getItem("walletconnect");
      const peraWallet = localStorage.getItem("PeraWallet.Wallet");
      const deflyWallet = localStorage.getItem("DeflyWallet.Wallet");

      let walletType = null;
      let accounts = null;

      // Try to reconnect to existing sessions
      if (peraWallet) {
        try {
          const peraAccounts =
            await this.#walletConnectors.pera.reconnectSession();
          if (peraAccounts && peraAccounts.length > 0) {
            walletType = "pera";
            accounts = peraAccounts;
          }
        } catch (error) {
          console.log("Failed to reconnect to Pera wallet:", error.message);
        }
      }

      if (!accounts && deflyWallet) {
        try {
          const deflyAccounts =
            await this.#walletConnectors.defly.reconnectSession();
          if (deflyAccounts && deflyAccounts.length > 0) {
            walletType = "defly";
            accounts = deflyAccounts;
          }
        } catch (error) {
          console.log("Failed to reconnect to Defly wallet:", error.message);
        }
      }

      // If we found a valid session, restore the connection
      if (accounts && accounts.length > 0 && walletType) {
        this.#walletConnected = true;
        this.account = accounts[0];
        this.#selectedWalletType = walletType;
        this.#connectionInfo = { address: this.account, walletType };

        this.#uiManager.showToast(
          `Restored connection to ${walletType} wallet`,
          "success"
        );

        if (!this.#disableUi) {
          this.#uiManager.showSDKUI();
          // Auto-fetch assets after wallet connection restore (SDK-Specific)
          setTimeout(() => {
            this.#uiManager
              .renderWalletAssets(
                this.#walletConnected,
                this.account,
                () => this.getWalletFTs(),
                (tokenId) => this.getFTMetadata(tokenId),
                this.#tokenId
              )
              .catch(() =>
                this.#uiManager.showToast("Failed to load assets", "error")
              );
          }, 500);
        }
        eventBus.emit("wallet:connection:connected", { address: this.account });
      } else {
        // No valid session found, reset to login UI
        if (!this.#disableUi) {
          this.#resetToLoginUI();
        }
      }
    } catch (error) {
      console.error("Failed to restore connection", error);
      this.#uiManager.showToast("Failed to restore connection!", "error");
      eventBus.emit("wallet:connection:failed", {
        error: "Failed to restore connection",
      });
      if (!this.#disableUi) {
        this.#resetToLoginUI();
      }
    }
  }

  async #startWalletConnection(walletType) {
    if (this.#connectionInProgress) {
      this.#uiManager.showToast(
        "A wallet connection is already in progress.",
        "warning"
      );
      return;
    }

    if (!this.#supportedWallets.includes(walletType)) {
      this.#uiManager.showToast("Unsupported wallet selected.", "error");
      return;
    }

    this.#selectedWalletType = walletType;

    // If UI is disabled, we need to temporarily show wallet connection UI
    if (this.#disableUi) {
      console.log("UI is disabled, skipping wallet connection UI");
    } else {
      // Only manipulate DOM if UI is not disabled
      document.getElementById("algox-sdk-container").style.display = "none";
    }

    const walletConnector = this.#walletConnectors[walletType];

    this.#connectionInProgress = true;

    try {
      const connectPromise = walletConnector.connect();

      // Set a timeout fallback (e.g., 60s) to detect "hanging" connections
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Wallet connection timed out.")),
          30 * 1000
        )
      );

      const accounts = await Promise.race([connectPromise, timeoutPromise]);

      if (!accounts || accounts.length === 0) {
        throw new Error("Wallet connection declined or no account returned.");
      }

      this.#walletConnected = true;
      this.account = accounts[0];
      this.#connectionInfo = { address: this.account, walletType };

      if (!this.#disableUi) {
        this.#uiManager.showSDKUI();
        // Auto-fetch assets after wallet connection (SDK-Specific)
        setTimeout(() => {
          this.#uiManager
            .renderWalletAssets(
              this.#walletConnected,
              this.account,
              () => this.getWalletFTs(),
              (tokenId) => this.getFTMetadata(tokenId),
              this.#tokenId
            )
            .catch(() =>
              this.#uiManager.showToast("Failed to load assets", "error")
            );
        }, 500);
      }

      this.#uiManager.showToast(`Connected to ${walletType} wallet`, "success");
      eventBus.emit("wallet:connection:connected", { address: this.account });
      this.#connectionInProgress = false;
    } catch (error) {
      if (error.message === "Wallet connection timed out.") {
        await walletConnector.disconnect();
        if (walletConnector.killSession) {
          await walletConnector.killSession(); // Extra hard-kill if supported
        }
        if (this.#disableUi) {
          console.error("UI is disabled, skipping wallet connection UI");
        } else {
          window.location.reload();
        }
      } else {
        console.error("Failed to connect wallet!", error);
        // Handle specific error cases
        if (
          error.message &&
          error.message.includes("Session currently connected")
        ) {
          // Wallet is already connected, try to get the current session
          try {
            const accounts = await walletConnector.reconnectSession();
            if (accounts && accounts.length > 0) {
              // Successfully got the current session
              this.#walletConnected = true;
              this.account = accounts[0];
              this.#selectedWalletType = walletType;
              this.#connectionInfo = { address: this.account, walletType };

              if (!this.#disableUi) {
                this.#uiManager.showSDKUI();
                this.#uiManager.updateWalletAddressBar();
                // Auto-fetch assets after wallet connection (SDK-Specific)
                setTimeout(() => {
                  this.#uiManager
                    .renderWalletAssets(
                      this.#walletConnected,
                      this.account,
                      () => this.getWalletFTs(),
                      (tokenId) => this.getFTMetadata(tokenId),
                      this.#tokenId
                    )
                    .catch(() =>
                      this.#uiManager.showToast(
                        "Failed to load assets",
                        "error"
                      )
                    );
                }, 500);
              } else {
                console.error("UI is disabled, skipping wallet connection UI");
              }

              this.#uiManager.showToast(
                `Connected to existing ${walletType} session`,
                "success"
              );
              eventBus.emit("wallet:connection:connected", {
                address: this.account,
              });
              this.#connectionInProgress = false;
              return; // Exit successfully
            }
          } catch (reconnectError) {
            console.error(
              "Failed to reconnect to existing session:",
              reconnectError
            );
          }
        }

        this.#uiManager.showToast("Failed to connect wallet!", "error");
        eventBus.emit("wallet:connection:failed", {
          error: "Failed to connect wallet!",
        });
        this.#connectionInProgress = false;
        if (this.#disableUi) {
          console.error("UI is disabled, skipping wallet connection UI");
        } else {
          // Ensure the hidden container is shown back before resetting UI
          document.getElementById("algox-sdk-container").style.display = "flex";
          this.#uiManager.resetToLoginUI();
        }
      }
    }
  }

  async #handleLogout() {
    if (this.processing) {
      return;
    }
    if (confirm("Are you sure you want to logout?")) {
      try {
        if (
          this.#selectedWalletType &&
          this.#walletConnectors[this.#selectedWalletType]
        ) {
          const connector = this.#walletConnectors[this.#selectedWalletType];
          await connector.disconnect();
          if (connector.killSession) {
            await connector.killSession(); // Extra hard-kill if supported
          }
        }

        localStorage.removeItem("walletconnect");
        localStorage.removeItem("DeflyWallet.Wallet");
        localStorage.removeItem("PeraWallet.Wallet");
      } catch (error) {
        console.error("Failed to disconnect wallet session:", error);
      }

      eventBus.emit("wallet:connection:disconnected", {
        address: this.account,
      });
      this.#uiManager.showToast("Logged out successfully.", "success");
      if (!this.#disableUi) {
        this.#resetToLoginUI();
      } else {
        // Reset internal state when UI is disabled
        this.#walletConnected = false;
        this.account = null;
        this.#connectionInfo = null;
        this.#selectedWalletType = null;
      }
    }
  }

  #resetToLoginUI() {
    this.#walletConnected = false;
    this.account = null;
    this.#connectionInfo = null;
    this.#selectedWalletType = null;

    this.#uiManager.resetToLoginUI();
  }

  // ==========================================
  // SDK-SPECIFIC PRIVATE METHODS (ALGOSTAKEX)
  // ==========================================

  /**
   * Determine which tier applies based on staked amount
   * Compares using token units (human-readable), not raw base units
   * @param {number} amountRaw - The staked amount in raw base units
   * @returns {Promise<Object>} Tier information including reward type and value
   */
  async #getTierForAmount(amountRaw) {
    const config = this.#stakingConfig;

    if (!config.reward.isTiered) {
      // Simple reward system
      return {
        rewardType: config.reward.type,
        rewardValue: config.reward.value,
        tierName: null,
        tierIndex: -1,
        nextTier: null,
      };
    }

    // Tiered reward system
    const tiers = config.reward.value;
    let selectedTier = null;
    let selectedIndex = -1;

    // Convert raw amount to token units using decimals
    let decimals = 0;
    try {
      const meta = await this.getFTMetadata(this.#tokenId);
      decimals = meta?.decimals || 0;
    } catch {}
    const amountTokens = amountRaw / Math.pow(10, decimals);

    // Find the highest tier that the amount (in tokens) qualifies for
    for (let i = 0; i < tiers.length; i++) {
      if (amountTokens >= tiers[i].stake_amount) {
        selectedTier = tiers[i];
        selectedIndex = i;
      } else {
        break; // Tiers are sorted, so we can stop
      }
    }

    if (!selectedTier) {
      throw new Error(
        `Staked amount does not meet minimum tier requirement of ${tiers[0].stake_amount}`
      );
    }

    return {
      rewardType: config.reward.type,
      rewardValue: selectedTier.value,
      tierName: selectedTier.name,
      tierIndex: selectedIndex,
      nextTier: tiers[selectedIndex + 1] || null,
      currentTier: selectedTier,
    };
  }

  /**
   *********** SDK public methods
   */

  // ==========================================
  // COMMON SDK PUBLIC METHODS
  // ==========================================

  /**
   * SDK UI Management
   */

  minimizeSDK(initialLoad) {
    this.#uiManager.minimizeSDK(initialLoad);
  }

  maximizeSDK(initialLoad) {
    this.#uiManager.maximizeSDK(initialLoad);
  }

  /**
   * Wallet Connection Methods
   */

  async connectWallet(walletAddress, mnemonic) {
    try {
      if (!walletAddress || typeof walletAddress !== "string") {
        throw new Error("Wallet address is required");
      }

      if (walletAddress.length !== 58) {
        throw new Error("Wallet address must be 58 characters long");
      }

      if (!/^[A-Z2-7]{58}$/.test(walletAddress)) {
        throw new Error("Invalid Algorand wallet address format");
      }

      if (!mnemonic || typeof mnemonic !== "string") {
        throw new Error("Wallet mnemonic is required");
      }

      // Validate mnemonic format
      const mnemonicWords = mnemonic.trim().split(/\s+/);
      if (mnemonicWords.length !== 25) {
        throw new Error("Mnemonic must contain 25 words");
      }

      // Verify the mnemonic generates the correct address
      try {
        const account = algosdk.mnemonicToSecretKey(mnemonic);
        const derivedAddr =
          typeof account.addr === "string"
            ? account.addr
            : account.addr?.publicKey
            ? algosdk.encodeAddress(account.addr.publicKey)
            : String(account.addr || "");
        if (derivedAddr !== walletAddress) {
          // throw new Error(
          //   "Mnemonic does not match the provided wallet address"
          // );
        }
        this.#mnemonicAccount = account;
      } catch (error) {
        throw new Error("Invalid mnemonic");
      }

      this.account = walletAddress;
      this.#walletConnected = true;
      this.#connectionInfo = {
        type: "mnemonic",
        address: walletAddress,
      };

      eventBus.emit("wallet:connected", {
        address: walletAddress,
        type: "mnemonic",
      });

      if (!this.#disableUi) {
        this.#uiManager.showSDKUI();
        // Auto-fetch assets after wallet connection SDK-Specific
        setTimeout(() => {
          this.#uiManager
            .renderWalletAssets(
              this.#walletConnected,
              this.account,
              () => this.getWalletFTs(),
              (tokenId) => this.getFTMetadata(tokenId),
              this.#tokenId
            )
            .catch(() =>
              this.#uiManager.showToast("Failed to load assets", "error")
            );
        }, 500);
      }

      return {
        address: walletAddress,
        type: "mnemonic",
      };
    } catch (error) {
      console.error("Error connecting wallet:", error.message);
      eventBus.emit("wallet:connection:failed", { error: error.message });
      throw error;
    }
  }

  async disconnectWallet() {
    if (!this.#walletConnected) {
      throw new Error("No wallet is currently connected");
    }

    // Handle logout process
    await this.#handleLogout();
  }
  // ==========================================
  // SDK-SPECIFIC PUBLIC METHODS (ALGOSTAKEX)
  // ==========================================

  /**
   * Treasury Wallet Management
   */
  addTreasuryWallet(walletAddress, mnemonic) {
    try {
      if (!this.#walletConnected) {
        throw new Error("Cannot add treasury wallet before wallet connection");
      }
      if (!walletAddress || typeof walletAddress !== "string") {
        throw new Error("Treasury wallet address is required");
      }

      if (walletAddress.length !== 58) {
        throw new Error("Treasury wallet address must be 58 characters long");
      }

      if (!/^[A-Z2-7]{58}$/.test(walletAddress)) {
        throw new Error("Invalid Algorand wallet address format");
      }

      if (!mnemonic || typeof mnemonic !== "string") {
        throw new Error("Treasury wallet mnemonic is required");
      }

      // Validate mnemonic format
      const mnemonicWords = mnemonic.trim().split(/\s+/);
      if (mnemonicWords.length !== 25) {
        throw new Error("Mnemonic must contain 25 words");
      }

      // Verify the mnemonic generates the correct address
      try {
        const account = algosdk.mnemonicToSecretKey(mnemonic);
        const derivedAddr =
          typeof account.addr === "string"
            ? account.addr
            : account.addr?.publicKey
            ? algosdk.encodeAddress(account.addr.publicKey)
            : String(account.addr || "");
        if (derivedAddr !== walletAddress) {
          throw new Error(
            "Mnemonic does not match the provided wallet address"
          );
        }
      } catch (error) {
        throw new Error("Invalid mnemonic");
      }

      this.#treasuryWallet = {
        address: walletAddress,
        mnemonic: mnemonic,
      };
      this.sdkEnabled = true;

      // Emit event
      eventBus.emit("treasury:added", {
        address: walletAddress,
        type: "mnemonic",
      });

      return {
        address: walletAddress,
        type: "mnemonic",
      };
    } catch (error) {
      console.error("Error adding treasury wallet:", error.message);
      eventBus.emit("treasury:add:failed", { error: error.message });
      throw error;
    }
  }

  /**
   * Staking Operations
   */

  async stake({
    poolId = this.#namespace,
    amount,
    rawAmount,
    lockPeriod = this.#stakingConfig.stake_period,
  }) {
    try {
      if (!this.sdkEnabled) {
        throw new Error(
          "SDK is not enabled. Please add treasury wallet first."
        );
      }

      if (!this.#walletConnected || !this.account) {
        throw new Error("Wallet is not connected");
      }

      // Determine raw amount from either token units (amount) or base units (rawAmount)
      let amountRaw;
      if (amount !== undefined) {
        const amt = Number(amount);
        if (!amt || amt <= 0) {
          throw new Error("Amount must be greater than 0");
        }
        // Fetch decimals dynamically and validate precision
        let decimals = 0;
        try {
          const meta = await this.getFTMetadata(this.#tokenId);
          decimals = meta?.decimals || 0;
        } catch {}
        const s = String(amount);
        if (s.includes(".")) {
          const frac = s.split(".")[1] || "";
          if (frac.length > decimals) {
            throw new Error(`Amount supports up to ${decimals} decimals`);
          }
        }
        amountRaw = Math.floor(amt * Math.pow(10, decimals));
      } else {
        amountRaw = Number(rawAmount);
      }

      if (!amountRaw || amountRaw <= 0) {
        throw new Error("Amount must be greater than 0");
      }
      if (!Number.isInteger(amountRaw)) {
        throw new Error("Amount must be an integer in base units");
      }

      // Determine tier and rewards based on staked amount (convert using decimals)
      const tierInfo = await this.#getTierForAmount(amountRaw);

      // Use config defaults
      const isFlexible = this.#stakingConfig.type === "FLEXIBLE";
      let finalLockPeriod = lockPeriod || this.#stakingConfig.stake_period;

      // Convert lock period from minutes to seconds
      // Config expects minutes, smart contract expects seconds
      finalLockPeriod = finalLockPeriod * 60;

      const finalRewardType = tierInfo.rewardType;
      let finalRewardRate = 0;
      let finalUtility = "";

      if (finalRewardType === "APY") {
        finalRewardRate = tierInfo.rewardValue;
        // Convert APY percentage to basis points (5% = 500 basis points)
        // Smart contract expects basis points where 10000 = 100%
        finalRewardRate = Math.floor(finalRewardRate * 100);
      } else {
        // UTILITY type
        finalUtility = tierInfo.rewardValue;
      }

      // Validate reward type and rate
      if (finalRewardType === "APY" && finalRewardRate <= 0) {
        throw new Error("Reward rate must be greater than 0 for APY type");
      }

      if (finalRewardType !== "APY" && finalRewardRate !== 0) {
        throw new Error("Reward rate must be 0 when reward type is not APY");
      }

      this.processing = true;
      eventBus.emit("sdk:processing:started", { processing: this.processing });

      const suggestedParams = await this.#algodClient
        .getTransactionParams()
        .do();

      // Get wallet connector or use mnemonic account
      let walletConnector;
      if (this.#mnemonicAccount) {
        // Use mnemonic account for signing
        walletConnector = {
          signTransaction: async (txns) => {
            return txns.map((txnData) => {
              const { txn } = txnData;
              return txn.signTxn(this.#mnemonicAccount.sk);
            });
          },
        };
      } else {
        walletConnector = this.#walletConnectors[this.#selectedWalletType];
        if (!walletConnector) {
          throw new Error("No wallet connector available");
        }
      }

      const stakeMethod = encoder.methods.find((m) => m.name === "stake");

      // Create asset transfer transaction
      const assetTransferTxn =
        algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          sender: this.account,
          receiver: this.#contractWalletAddress,
          amount: BigInt(amountRaw),
          assetIndex: Number(this.#tokenId),
          suggestedParams,
        });

      // Build box reference for stake data
      const boxName = buildStakeBoxName(poolId, this.account);
      const stakeBoxRef = {
        appIndex: this.#contractApplicationId,
        name: boxName,
      };

      const boxMBRPayment = algosdk.makePaymentTxnWithSuggestedParamsFromObject(
        {
          sender: this.account,
          receiver: this.#contractWalletAddress,
          amount: 100000, // 0.1 ALGO - covers box MBR + buffer
          suggestedParams,
        }
      );

      // Create app call transaction
      const stakeAppCallTxn = algosdk.makeApplicationCallTxnFromObject({
        sender: this.account,
        appIndex: this.#contractApplicationId,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: [
          stakeMethod.getSelector(),
          algosdk.ABIType.from("string").encode(poolId),
          algosdk.ABIType.from("uint64").encode(this.#tokenId),
          algosdk.ABIType.from("bool").encode(isFlexible),
          algosdk.ABIType.from("uint64").encode(BigInt(amountRaw)),
          algosdk.ABIType.from("uint64").encode(BigInt(finalLockPeriod)),
          algosdk.ABIType.from("string").encode(finalRewardType),
          algosdk.ABIType.from("uint64").encode(BigInt(finalRewardRate)),
          algosdk.ABIType.from("string").encode(finalUtility),
        ],
        boxes: [stakeBoxRef],
        foreignAssets: [Number(this.#tokenId)],
        suggestedParams: {
          ...suggestedParams,
          flatFee: true,
          fee: 1000000, // 0.002 Algo
        },
      });

      // Create transaction group
      const stakeGroup = [boxMBRPayment, stakeAppCallTxn, assetTransferTxn];
      algosdk.assignGroupID(stakeGroup);

      // Sign transactions
      let signedTxn;
      if (this.#mnemonicAccount) {
        // Sign with mnemonic
        signedTxn = stakeGroup.map((txn) =>
          txn.signTxn(this.#mnemonicAccount.sk)
        );
      } else {
        // Sign with wallet connector
        const signedGroup = await walletConnector.signTransaction([
          stakeGroup.map((txn) => ({ txn, signers: [this.account] })),
        ]);
        signedTxn = Array.isArray(signedGroup[0])
          ? signedGroup[0]
          : signedGroup;
      }

      // Send transaction
      const { txid } = await this.#algodClient
        .sendRawTransaction(signedTxn)
        .do();

      await algosdk.waitForConfirmation(this.#algodClient, txid, 10);

      this.processing = false;
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });
      eventBus.emit("stake:success", { transactionId: txid });

      return {
        transactionId: txid,
        poolId,
        amount: amountRaw,
      };
    } catch (error) {
      console.error("Error stacking:", error.message);
      this.processing = false;
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });
      eventBus.emit("stake:failed", { error: error.message });
      throw error;
    }
  }

  async withdraw(poolId = this.#namespace) {
    try {
      if (!this.#walletConnected || !this.account) {
        throw new Error("Wallet is not connected");
      }

      if (!this.#treasuryWallet || !this.#treasuryWallet.mnemonic) {
        throw new Error(
          "SDK not enabled: treasury wallet is required to pay rewards"
        );
      }

      // Address validations removed per user request

      this.processing = true;
      eventBus.emit("sdk:processing:started", { processing: this.processing });

      const suggestedParams = await this.#algodClient
        .getTransactionParams()
        .do();

      // Get wallet connector
      let walletConnector;
      if (this.#mnemonicAccount) {
        walletConnector = {
          signTransaction: async (txns) => {
            return txns.map((txnData) => {
              const { txn } = txnData;
              return txn.signTxn(this.#mnemonicAccount.sk);
            });
          },
        };
      } else {
        walletConnector = this.#walletConnectors[this.#selectedWalletType];
        if (!walletConnector) {
          throw new Error("No wallet connector available");
        }
      }

      const withdrawMethod = encoder.methods.find((m) => m.name === "withdraw");

      // Build box reference for stake data
      const boxName = buildStakeBoxName(poolId, this.account);
      const stakeBoxRef = {
        appIndex: this.#contractApplicationId,
        name: boxName,
      };

      // Read stake data to compute rewards client-side
      const boxValue = await this.#algodClient
        .getApplicationBoxByName(this.#contractApplicationId, boxName)
        .do();
      if (!boxValue || !boxValue.value) {
        throw new Error("No active stake found");
      }
      const stakeData = decodeStakeData(boxValue.value);

      // Compute rewards in base units: amount * rateBP / 10000 * time / YEAR
      const nowSeconds = Math.floor(Date.now() / 1000);
      let timeStaked = Math.max(
        0,
        nowSeconds - Number(stakeData.stakedAt || 0)
      );

      // If stop_reward_on_stake_completion is true, cap time at stake_period
      const stopRewardOnCompletion =
        this.#stakingConfig.reward.stop_reward_on_stake_completion;
      const stakePeriodSeconds = this.#stakingConfig.stake_period * 60; // convert minutes to seconds
      if (stopRewardOnCompletion && timeStaked > stakePeriodSeconds) {
        timeStaked = stakePeriodSeconds; // Cap rewards at stake period
      }

      const YEAR_SECONDS = 365 * 24 * 60 * 60;
      let rewards = 0;
      if (stakeData.rewardType === "APY") {
        const rateBP = Number(stakeData.rewardRate || 0);
        const amountRaw = Number(stakeData.amount || 0);
        if (rateBP > 0 && amountRaw > 0 && timeStaked > 0) {
          rewards = Math.floor(
            (amountRaw * rateBP * timeStaked) / (10000 * YEAR_SECONDS)
          );
        }
      }

      const withdrawTxn = algosdk.makeApplicationCallTxnFromObject({
        sender: this.account,
        appIndex: this.#contractApplicationId,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: [
          withdrawMethod.getSelector(),
          algosdk.ABIType.from("string").encode(poolId),
        ],
        boxes: [stakeBoxRef],
        foreignAssets: [Number(this.#tokenId)],
        suggestedParams: {
          ...suggestedParams,
          flatFee: true,
          fee: 3000,
        },
      });

      // If rewards > 0, create treasury → user ASA transfer
      let rewardAxferTxn = null;
      if (rewards > 0) {
        // Ensure treasury address from enable flow
        const treasuryAddr = this.#treasuryWallet.address;
        if (!treasuryAddr || !algosdk.isValidAddress(treasuryAddr)) {
          throw new Error("Treasury wallet address not set or invalid");
        }

        // treasury must be opted-in to ASA and have balance
        rewardAxferTxn =
          algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            sender: treasuryAddr,
            receiver: this.account,
            amount: rewards,
            assetIndex: Number(this.#tokenId),
            suggestedParams: {
              ...suggestedParams,
              flatFee: true,
              fee: 1000,
            },
          });
      }

      // Group and sign
      const txns = rewardAxferTxn
        ? [withdrawTxn, rewardAxferTxn]
        : [withdrawTxn];
      algosdk.assignGroupID(txns);

      const signed = [];
      // Sign app call by user
      if (this.#mnemonicAccount) {
        signed.push(withdrawTxn.signTxn(this.#mnemonicAccount.sk));
        // Sign treasury reward transfer (locally) if present
        if (rewardAxferTxn) {
          const treasuryAccount = algosdk.mnemonicToSecretKey(
            this.#treasuryWallet.mnemonic
          );
          signed.push(rewardAxferTxn.signTxn(treasuryAccount.sk));
        }
      } else {
        // Pass the full transaction group to wallet, but mark which txns to sign
        const txnsToSign = rewardAxferTxn
          ? [
              { txn: withdrawTxn, signers: [this.account] },
              { txn: rewardAxferTxn, signers: [] }, // Empty signers = don't sign this one
            ]
          : [{ txn: withdrawTxn, signers: [this.account] }];

        const signedGroup = await walletConnector.signTransaction([txnsToSign]);

        // Extract the signed withdraw txn
        const userSignedTxn = Array.isArray(signedGroup[0])
          ? signedGroup[0][0] // when rewardAxferTxn is present
          : signedGroup[0]; // when rewardAxferTxn is not present
        signed.push(userSignedTxn);

        // Sign treasury reward transfer (locally) AFTER user signs
        if (rewardAxferTxn) {
          const treasuryAccount = algosdk.mnemonicToSecretKey(
            this.#treasuryWallet.mnemonic
          );
          signed.push(rewardAxferTxn.signTxn(treasuryAccount.sk));
        }
      }

      // Send transaction
      const { txid } = await this.#algodClient.sendRawTransaction(signed).do();

      await algosdk.waitForConfirmation(this.#algodClient, txid, 10);

      this.processing = false;
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });
      eventBus.emit("withdraw:success", { transactionId: txid });

      return {
        transactionId: txid,
        poolId,
      };
    } catch (error) {
      console.error("Error withdrawing:", error.message);
      this.processing = false;
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });
      eventBus.emit("withdraw:failed", { error: error.message });
      throw error;
    }
  }

  async emergencyWithdraw(poolId = this.#namespace, penaltyPercentage) {
    try {
      if (!this.#walletConnected || !this.account) {
        throw new Error("Wallet is not connected");
      }

      this.processing = true;
      eventBus.emit("sdk:processing:started", { processing: this.processing });

      const suggestedParams = await this.#algodClient
        .getTransactionParams()
        .do();

      // Get wallet connector
      let walletConnector;
      if (this.#mnemonicAccount) {
        walletConnector = {
          signTransaction: async (txns) => {
            return txns.map((txnData) => {
              const { txn } = txnData;
              return txn.signTxn(this.#mnemonicAccount.sk);
            });
          },
        };
      } else {
        walletConnector = this.#walletConnectors[this.#selectedWalletType];
        if (!walletConnector) {
          throw new Error("No wallet connector available");
        }
      }

      const emergencyWithdrawMethod = encoder.methods.find(
        (m) => m.name === "emergencyWithdraw"
      );

      // Build box reference for stake data
      const boxName = buildStakeBoxName(poolId, this.account);
      const stakeBoxRef = {
        appIndex: this.#contractApplicationId,
        name: boxName,
      };

      // Calculate progressive penalty for FIXED staking
      let finalPenalty = penaltyPercentage;
      if (this.#stakingConfig.type === "FIXED") {
        // Read stake data to calculate time elapsed
        const boxValue = await this.#algodClient
          .getApplicationBoxByName(this.#contractApplicationId, boxName)
          .do();
        if (boxValue && boxValue.value) {
          const stakeData = decodeStakeData(boxValue.value);
          const nowSeconds = Math.floor(Date.now() / 1000);
          const timeElapsed = Math.max(
            0,
            nowSeconds - Number(stakeData.stakedAt || 0)
          );
          const stakePeriodSeconds = this.#stakingConfig.stake_period * 60;

          // Calculate percentage of stake period completed
          const completionPercentage = Math.min(
            100,
            (timeElapsed / stakePeriodSeconds) * 100
          );

          // Progressive penalty reduction: penalty reduces linearly with time
          // If 0% complete: full penalty
          // If 100% complete: 0% penalty
          finalPenalty = Math.floor(
            penaltyPercentage * (1 - completionPercentage / 100)
          );
        }
      }

      // Convert penalty percentage to basis points (contract expects basis points: 100% = 10000)
      const finalPenaltyBasisPoints = finalPenalty * 100;

      // Get treasury address for penalty transfer
      if (!this.#treasuryWallet || !this.#treasuryWallet.address) {
        throw new Error("Treasury wallet not configured");
      }

      const treasuryAddress = this.#treasuryWallet.address;

      const emergencyWithdrawTxn = algosdk.makeApplicationCallTxnFromObject({
        sender: this.account,
        appIndex: this.#contractApplicationId,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: [
          emergencyWithdrawMethod.getSelector(),
          algosdk.ABIType.from("string").encode(poolId),
          algosdk.ABIType.from("uint64").encode(
            BigInt(finalPenaltyBasisPoints)
          ),
          algosdk.ABIType.from("address").encode(treasuryAddress),
        ],
        boxes: [stakeBoxRef],
        foreignAssets: [Number(this.#tokenId)],
        accounts: [treasuryAddress], // Add treasury as foreign account
        suggestedParams: {
          ...suggestedParams,
          flatFee: true,
          fee: 4000, // Increased fee for 2 inner transactions (user + treasury)
        },
      });

      // Sign and send
      let signedTxn;
      if (this.#mnemonicAccount) {
        signedTxn = [emergencyWithdrawTxn.signTxn(this.#mnemonicAccount.sk)];
      } else {
        const signedGroup = await walletConnector.signTransaction([
          [{ txn: emergencyWithdrawTxn, signers: [this.account] }],
        ]);
        signedTxn = Array.isArray(signedGroup[0])
          ? signedGroup[0]
          : signedGroup;
      }

      const { txid } = await this.#algodClient
        .sendRawTransaction(signedTxn)
        .do();

      await algosdk.waitForConfirmation(this.#algodClient, txid, 10);

      this.processing = false;
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });
      eventBus.emit("emergencyWithdraw:success", {
        transactionId: txid,
      });

      return {
        transactionId: txid,
        poolId,
      };
    } catch (error) {
      console.error("Error emergency withdrawing:", error.message);
      this.processing = false;
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });
      eventBus.emit("emergencyWithdraw:failed", { error: error.message });
      throw error;
    }
  }

  async stackingStatus(poolId = this.#namespace) {
    try {
      if (!this.#walletConnected || !this.account) {
        throw new Error("Wallet is not connected");
      }

      // Read stake data from box storage
      const boxName = buildStakeBoxName(poolId, this.account);

      try {
        const boxValue = await this.#algodClient
          .getApplicationBoxByName(this.#contractApplicationId, boxName)
          .do();

        if (!boxValue || !boxValue.value) {
          return {
            poolId,
            exists: false,
            stakeData: null,
          };
        }

        // Decode the stake data from box value
        const stakeData = decodeStakeData(boxValue.value);

        return {
          poolId,
          exists: true,
          stakeData: stakeData,
        };
      } catch (error) {
        console.error("Box lookup error:", error);
        // Box doesn't exist
        if (
          error.message.includes("box not found") ||
          error.message.includes("does not exist") ||
          error.status === 404
        ) {
          return {
            poolId,
            exists: false,
            stakeData: null,
          };
        }
        throw error;
      }
    } catch (error) {
      console.error("Error fetching stacking status:", error.message, error);
      if (
        error.message.includes("No stake found") ||
        error.message.includes("not found") ||
        error.status === 404
      ) {
        return {
          poolId,
          exists: false,
          stakeData: null,
        };
      }
      throw error;
    }
  }

  async validateStacking(poolId = this.#namespace, minimumAmount = 0) {
    try {
      if (!this.#walletConnected || !this.account) {
        return { valid: false, reason: "Wallet not connected" };
      }

      // Check stacking status first
      const status = await this.stackingStatus(poolId);

      if (!status.exists || !status.stakeData) {
        return {
          valid: false,
          reason: "No active stake found",
        };
      }

      // Validate minimum amount (assuming stakeData has amount field)
      // Note: This will need to be updated based on actual stakeData structure
      const stakeAmount = status.stakeData?.amount || 0;
      const isValid = stakeAmount >= minimumAmount;

      return {
        valid: isValid,
        reason: isValid
          ? "Stake is valid"
          : "Stake does not meet minimum requirements",
      };
    } catch (error) {
      console.error("Error validating stacking:", error.message);
      return { valid: false, reason: error.message };
    }
  }

  async getWalletFTs() {
    try {
      if (!this.#walletConnected || !this.account) {
        throw new Error("Wallet is not connected");
      }

      // In browser, pass empty string token instead of undefined
      const indexer = new algosdk.Indexer("", this.#indexerUrl, 443);

      const accountInfo = await indexer.lookupAccountByID(this.account).do();

      const assets = accountInfo.account.assets || [];

      // Filter for FTs (non-zero decimals typically indicates FT)
      const fts = assets
        .filter((asset) => asset.amount > 0)
        .map((asset) => {
          return {
            assetId: asset.assetId,
            amount: Number(asset.amount),
            isFrozen: asset.isFrozen || false,
          };
        });

      return fts;
    } catch (error) {
      console.error("Error fetching wallet FTs:", error.message);
      throw error;
    }
  }

  async getFTMetadata(assetId) {
    try {
      // In browser, pass empty string token instead of undefined
      const indexer = new algosdk.Indexer("", this.#indexerUrl, 443);

      const assetInfo = await indexer.lookupAssetByID(assetId).do();
      const asset = assetInfo.asset;

      return {
        assetId: asset.index,
        name: asset.params.name,
        unitName: asset.params["unit-name"],
        decimals: asset.params.decimals,
        totalSupply: asset.params.total,
        creator: asset.params.creator,
        url: asset.params.url,
        metadataHash: asset.params["metadata-hash"],
      };
    } catch (error) {
      console.error("Error fetching FT metadata:", error.message);
      throw error;
    }
  }

  /**
   * Admin Operations
   */

  async addDonation(walletAddress, mnemonic, tokenId, amount) {
    try {
      // Validate wallet
      if (!walletAddress || typeof walletAddress !== "string") {
        throw new Error("Wallet address is required");
      }

      if (!mnemonic || typeof mnemonic !== "string") {
        throw new Error("Wallet mnemonic is required");
      }

      // Verify mnemonic
      const account = algosdk.mnemonicToSecretKey(mnemonic);
      if (account.addr !== walletAddress) {
        throw new Error("Mnemonic does not match the provided wallet address");
      }

      this.processing = true;
      eventBus.emit("sdk:processing:started", { processing: this.processing });

      const suggestedParams = await this.#algodClient
        .getTransactionParams()
        .do();

      const donateMethod = encoder.methods.find(
        (m) => m.name === "donateTokens"
      );

      // Create asset transfer transaction
      const assetTransferTxn =
        algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          sender: walletAddress,
          receiver: this.#contractWalletAddress,
          amount: BigInt(amount),
          assetIndex: Number(tokenId),
          suggestedParams,
        });

      // Create app call transaction
      const donateAppCallTxn = algosdk.makeApplicationCallTxnFromObject({
        sender: walletAddress,
        appIndex: this.#contractApplicationId,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: [
          donateMethod.getSelector(),
          algosdk.ABIType.from("uint64").encode(BigInt(tokenId)),
          algosdk.ABIType.from("uint64").encode(BigInt(amount)),
        ],
        foreignAssets: [Number(tokenId)],
        suggestedParams: {
          ...suggestedParams,
          flatFee: true,
          fee: 2000,
        },
      });

      // Create transaction group
      const donateGroup = [donateAppCallTxn, assetTransferTxn];
      algosdk.assignGroupID(donateGroup);

      // Sign transactions
      const signedTxn = donateGroup.map((txn) => txn.signTxn(account.sk));

      // Send transaction
      const { txid } = await this.#algodClient
        .sendRawTransaction(signedTxn)
        .do();

      await algosdk.waitForConfirmation(this.#algodClient, txid, 10);

      this.processing = false;
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });
      eventBus.emit("donation:success", { transactionId: txid });

      return {
        transactionId: txid,
        tokenId,
        amount,
      };
    } catch (error) {
      console.error("Error adding donation:", error.message);
      this.processing = false;
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });
      eventBus.emit("donation:failed", { error: error.message });
      throw error;
    }
  }

  async withdrawExcessTokens(tokenId, amount) {
    try {
      if (!this.#treasuryWallet) {
        throw new Error("Treasury wallet is not set");
      }

      const account = algosdk.mnemonicToSecretKey(
        this.#treasuryWallet.mnemonic
      );
      const derivedAddr =
        typeof account.addr === "string"
          ? account.addr
          : account.addr?.publicKey
          ? algosdk.encodeAddress(account.addr.publicKey)
          : String(account.addr || "");
      if (derivedAddr !== this.#treasuryWallet.address) {
        throw new Error("Treasury wallet mnemonic is invalid");
      }

      this.processing = true;
      eventBus.emit("sdk:processing:started", { processing: this.processing });

      const suggestedParams = await this.#algodClient
        .getTransactionParams()
        .do();

      const withdrawExcessMethod = encoder.methods.find(
        (m) => m.name === "withdrawExcessTokens"
      );

      const withdrawExcessTxn = algosdk.makeApplicationCallTxnFromObject({
        sender: this.#treasuryWallet.address,
        appIndex: this.#contractApplicationId,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: [
          withdrawExcessMethod.getSelector(),
          algosdk.ABIType.from("uint64").encode(BigInt(tokenId)),
          algosdk.ABIType.from("uint64").encode(BigInt(amount)),
        ],
        foreignAssets: [Number(tokenId)],
        suggestedParams: {
          ...suggestedParams,
          flatFee: true,
          fee: 2000,
        },
      });

      // Sign and send
      const signedTxn = withdrawExcessTxn.signTxn(account.sk);

      const { txid } = await this.#algodClient
        .sendRawTransaction([signedTxn])
        .do();

      await algosdk.waitForConfirmation(this.#algodClient, txid, 10);

      this.processing = false;
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });
      eventBus.emit("withdrawExcess:success", { transactionId: txid });

      return {
        transactionId: txid,
        tokenId,
        amount,
      };
    } catch (error) {
      console.error("Error withdrawing excess tokens:", error.message);
      this.processing = false;
      eventBus.emit("sdk:processing:stopped", { processing: this.processing });
      eventBus.emit("withdrawExcess:failed", { error: error.message });
      throw error;
    }
  }
}

export default AlgoStakeX;
