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
  #walletConnectors;
  #walletConnected;
  #connectionInfo;
  #connectionInProgress;
  #supportedWallets;
  #selectedWalletType;
  #algodClient;
  #contractApplicationId;
  #contractWalletAddress;
  #indexerUrl;
  #messageElement;
  #minimizeUILocation;
  #disableToast;
  #disableUi;
  #logo;
  #supportedNetworks;
  #theme;
  #toastLocation;
  #currentLoadingMessage;
  #tempWalletOverlay;
  #namespace;
  //
  #processing;
  #network;
  #treasuryWallet;
  #tokenId;
  #stakingConfig;
  #mnemonicAccount; // For programmatic wallet connection
  #uiManager; // UI Manager instance

  constructor({
    token_id,
    enable_ui = true,
    staking = {},
    //
    env,
    namespace,
    disableToast = false,
    toastLocation = "TOP_RIGHT",
    minimizeUILocation = "right",
    logo = null,
  }) {
    try {
      // Validate all parameters
      this.#network = Validator.validateEnvironment(env);
      this.#namespace = Validator.validateNamespace(namespace);
      this.#tokenId = Validator.validateTokenId(token_id);
      this.#disableToast = Validator.validateDisableToast(disableToast);
      this.#disableUi = Validator.validateDisableUi(!enable_ui);
      this.#minimizeUILocation =
        Validator.validateMinimizeUILocation(minimizeUILocation);
      this.#logo = Validator.validateLogo(logo);
      this.#toastLocation = Validator.validateToastLocation(toastLocation);
      this.#stakingConfig = Validator.validateStakingConfig(staking);

      // Initialize other properties
      this.#treasuryWallet = null;
      this.sdkEnabled = false;
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

      // Initialize algosdk client
      this.#algodClient = new algosdk.Algodv2(
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        this.#network === "mainnet"
          ? "https://mainnet-api.algonode.cloud"
          : "https://testnet-api.algonode.cloud",
        443
      );

      this.#contractApplicationId =
        this.#network === "mainnet" ? 749041504 : 749041504;
      this.#contractWalletAddress =
        this.#network === "mainnet"
          ? "PMQMLZXHMQK2AA3XQ7KVVDWAXKGJMFSIGJOC4TSPANGUKQWZZT6R7SB5XE"
          : "PMQMLZXHMQK2AA3XQ7KVVDWAXKGJMFSIGJOC4TSPANGUKQWZZT6R7SB5XE";

      // Initialize SDK variables
      this.#indexerUrl =
        this.#network === "mainnet"
          ? "https://mainnet-idx.algonode.cloud"
          : "https://testnet-idx.algonode.cloud";
      this.events = eventBus;

      // Initialize UI state
      this.#messageElement = null;
      this.#processing = false;

      // Initialize UI Manager
      this.#uiManager = new UIManager(this, {
        disableUi: this.#disableUi,
        disableToast: this.#disableToast,
        logo: this.#logo,
        minimizeUILocation: this.#minimizeUILocation,
        toastLocation: this.#toastLocation,
      });

      // Load saved UI state (only if UI is not disabled)
      if (!this.#disableUi) {
        const savedState = localStorage.getItem("asx");
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
        this.#uiManager.saveUIState(this.isMinimized, this.theme);
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

  #initUI() {
    // Initialize UI with callbacks
    this.#uiManager.initUI({
      onMinimize: () => this.minimizeSDK(),
      onMaximize: () => this.maximizeSDK(),
      onThemeToggle: () => {
        this.theme = this.theme === "light" ? "dark" : "light";
        this.#uiManager.saveUIState(this.isMinimized, this.theme);
        this.#uiManager.applyTheme();
      },
      onLogout: () => this.#handleLogout(),
      onWalletConnect: (walletType) => this.#startWalletConnection(walletType),
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
      onStake: async () => {
        try {
          const selected = document.querySelector(".asxAssetItem.selected");
          if (!selected) {
            this.#uiManager.showToast("Select an asset first", "warning");
            return;
          }
          const amount = Number(selected.getAttribute("data-amount")) || 0;
          if (!amount || amount <= 0) {
            this.#uiManager.showToast("Invalid amount", "error");
            return;
          }
          this.#uiManager.showLoadingOverlay("Staking...");
          await this.stack({ poolId: this.#namespace, amount });
        } catch (e) {
          this.#uiManager.showToast(e.message || "Stake failed", "error");
        } finally {
          this.#uiManager.hideLoadingOverlay();
        }
      },
      onWithdraw: async () => {
        try {
          await this.withdraw(this.#namespace);
        } catch (e) {
          this.#uiManager.showToast(e.message || "Withdraw failed", "error");
        }
      },
      onEmergencyWithdraw: async () => {
        try {
          await this.emergencyWithdraw(
            this.#namespace,
            this.#stakingConfig.withdraw_penalty || 5
          );
        } catch (e) {
          this.#uiManager.showToast(
            e.message || "Emergency withdraw failed",
            "error"
          );
        }
      },
    });

    // Try restore wallet connection
    this.#loadConnectionFromStorage?.();
  }

  async #loadConnectionFromStorage() {
    try {
      const peraWallet = localStorage.getItem("PeraWallet.Wallet");
      const deflyWallet = localStorage.getItem("DeflyWallet.Wallet");
      let walletType = null;
      let accounts = null;
      if (peraWallet) {
        try {
          const a = await this.#walletConnectors.pera.reconnectSession();
          if (a && a.length) {
            walletType = "pera";
            accounts = a;
          }
        } catch {}
      }
      if (!accounts && deflyWallet) {
        try {
          const a = await this.#walletConnectors.defly.reconnectSession();
          if (a && a.length) {
            walletType = "defly";
            accounts = a;
          }
        } catch {}
      }
      if (accounts && accounts.length && walletType) {
        this.#walletConnected = true;
        this.account = accounts[0];
        this.#selectedWalletType = walletType;
        this.#connectionInfo = { address: this.account, walletType };
        // Emit both for compatibility
        this.events.emit("wallet:connected", {
          address: this.account,
          type: walletType,
        });
        this.events.emit("wallet:connection:connected", {
          address: this.account,
        });
        this.#uiManager.refreshUI(this.#walletConnected, this.account);
      } else {
        this.#uiManager.refreshUI(this.#walletConnected, this.account);
      }
    } catch (error) {
      this.events.emit("wallet:connection:failed", { error: error.message });
      this.#uiManager.refreshUI(this.#walletConnected, this.account);
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
    const connector = this.#walletConnectors[walletType];
    this.#connectionInProgress = true;
    try {
      const timeout = new Promise((_, r) =>
        setTimeout(() => r(new Error("Wallet connection timed out.")), 60000)
      );
      const accounts = await Promise.race([connector.connect(), timeout]);
      if (!accounts || !accounts.length)
        throw new Error("Wallet connection declined or no account returned.");
      this.#walletConnected = true;
      this.account = accounts[0];
      this.#connectionInfo = { address: this.account, walletType };
      this.#uiManager.showToast(`Connected to ${walletType} wallet`, "success");
      this.events.emit("wallet:connected", {
        address: this.account,
        type: walletType,
      });
      this.events.emit("wallet:connection:connected", {
        address: this.account,
      });
      this.#uiManager.refreshUI(this.#walletConnected, this.account);
    } catch (error) {
      try {
        await connector.disconnect();
        if (connector.killSession) await connector.killSession();
      } catch {}
      this.#uiManager.showToast("Failed to connect wallet!", "error");
      this.events.emit("wallet:connection:failed", { error: error.message });
    } finally {
      this.#connectionInProgress = false;
    }
  }

  async #handleLogout() {
    if (this.processing) return;
    if (!confirm("Are you sure you want to logout?")) return;
    try {
      if (this.#selectedWalletType) {
        const connector = this.#walletConnectors[this.#selectedWalletType];
        if (connector?.disconnect) await connector.disconnect();
        if (connector?.killSession) await connector.killSession();
      }
      localStorage.removeItem("walletconnect");
      localStorage.removeItem("DeflyWallet.Wallet");
      localStorage.removeItem("PeraWallet.Wallet");
    } catch {}
    this.#walletConnected = false;
    this.account = null;
    this.#connectionInfo = null;
    this.#selectedWalletType = null;
    this.#uiManager.refreshUI(this.#walletConnected, this.account);
    this.events.emit("wallet:disconnected", {});
    this.events.emit("wallet:connection:disconnected", { address: null });
  }

  /**
   *********** SDK public methods
   */

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
   * Treasury Wallet Management
   */

  addTreasuryWallet(walletAddress, mnemonic) {
    try {
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
      });

      if (!this.#disableUi) {
        this.#uiManager.refreshUI(this.#walletConnected, this.account);
      }

      return true;
    } catch (error) {
      console.error("Error adding treasury wallet:", error.message);
      eventBus.emit("treasury:add:failed", { error: error.message });
      throw error;
    }
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
        this.#uiManager.refreshUI(this.#walletConnected, this.account);
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
    try {
      // Disconnect from all supported wallets
      for (const [walletType, connector] of Object.entries(
        this.#walletConnectors
      )) {
        try {
          if (connector.disconnect) {
            await connector.disconnect();
          }
          if (connector.killSession) {
            await connector.killSession();
          }
        } catch (error) {
          console.error(`Error disconnecting from ${walletType}:`, error);
        }
      }

      // Clear localStorage
      localStorage.removeItem("walletconnect");
      localStorage.removeItem("DeflyWallet.Wallet");
      localStorage.removeItem("PeraWallet.Wallet");

      // Reset internal state
      this.#walletConnected = false;
      this.account = null;
      this.#connectionInfo = null;
      this.#selectedWalletType = null;
      this.#connectionInProgress = false;
      this.#mnemonicAccount = null;

      // Emit disconnect event
      eventBus.emit("wallet:disconnected", {});

      if (!this.#disableUi) {
        this.#uiManager.refreshUI(this.#walletConnected, this.account);
      }

      return true;
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
      return false;
    }
  }

  /**
   * Staking Operations
   */

  async stack({
    poolId = this.#namespace,
    amount,
    lockPeriod = this.#stakingConfig.stake_period
      ? this.#stakingConfig.stake_period
      : null,
    rewardType = this.#stakingConfig.reward.type,
    rewardRate = this.#stakingConfig.reward.type === "APY"
      ? this.#stakingConfig.reward?.value?.value
        ? this.#stakingConfig.reward.value.value
        : this.#stakingConfig.reward.value
      : 0,
    utility = this.#stakingConfig.reward.type === "UTILITY"
      ? this.#stakingConfig.reward?.value?.value
        ? this.#stakingConfig.reward.value.value
        : this.#stakingConfig.reward.value
      : "",
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

      if (!amount || amount <= 0) {
        throw new Error("Amount must be greater than 0");
      }

      // Use config defaults if not provided
      const isFlexible = this.#stakingConfig.type === "FLEXIBLE";
      const finalLockPeriod =
        lockPeriod !== null
          ? lockPeriod
          : this.#stakingConfig.stake_period || 0;
      const finalRewardType = rewardType || this.#stakingConfig.reward.type;
      let defaultRate = 0;
      let defaultUtility = "";
      if (this.#stakingConfig.reward) {
        const cfg = this.#stakingConfig.reward;
        if (cfg.type === "APY") {
          if (typeof cfg.value === "number") defaultRate = cfg.value;
        } else if (cfg.type === "UTILITY") {
          if (typeof cfg.value === "string") defaultUtility = cfg.value;
        }
      }
      const finalRewardRate = rewardRate || defaultRate || 0;
      const finalUtility = utility || defaultUtility || "";

      // Validate reward type and rate
      if (finalRewardType === "APY" && finalRewardRate <= 0) {
        throw new Error("Reward rate must be greater than 0 for APY type");
      }

      if (finalRewardType !== "APY" && finalRewardRate !== 0) {
        throw new Error("Reward rate must be 0 when reward type is not APY");
      }

      this.#processing = true;
      eventBus.emit("sdk:processing:started", { processing: this.#processing });

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
          amount: BigInt(amount),
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
          algosdk.ABIType.from("uint64").encode(BigInt(amount)),
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

      this.#processing = false;
      eventBus.emit("sdk:processing:stopped", { processing: this.#processing });
      eventBus.emit("stake:success", { transactionId: txid });

      return {
        transactionId: txid,
        poolId,
        amount,
      };
    } catch (error) {
      console.error("Error stacking:", error.message);
      this.#processing = false;
      eventBus.emit("sdk:processing:stopped", { processing: this.#processing });
      eventBus.emit("stake:failed", { error: error.message });
      throw error;
    }
  }

  async withdraw(poolId = this.#namespace) {
    try {
      if (!this.#walletConnected || !this.account) {
        throw new Error("Wallet is not connected");
      }

      this.#processing = true;
      eventBus.emit("sdk:processing:started", { processing: this.#processing });

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

      const withdrawTxn = algosdk.makeApplicationCallTxnFromObject({
        sender: this.account,
        appIndex: this.#contractApplicationId,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: [
          withdrawMethod.getSelector(),
          algosdk.ABIType.from("string").encode(poolId),
        ],
        suggestedParams: {
          ...suggestedParams,
          flatFee: true,
          fee: 2000,
        },
      });

      // Sign and send
      let signedTxn;
      if (this.#mnemonicAccount) {
        signedTxn = [withdrawTxn.signTxn(this.#mnemonicAccount.sk)];
      } else {
        const signedGroup = await walletConnector.signTransaction([
          [{ txn: withdrawTxn, signers: [this.account] }],
        ]);
        signedTxn = Array.isArray(signedGroup[0])
          ? signedGroup[0]
          : signedGroup;
      }

      const { txid } = await this.#algodClient
        .sendRawTransaction(signedTxn)
        .do();

      await algosdk.waitForConfirmation(this.#algodClient, txid, 10);

      this.#processing = false;
      eventBus.emit("sdk:processing:stopped", { processing: this.#processing });
      eventBus.emit("withdraw:success", { transactionId: txid });

      return {
        transactionId: txid,
        poolId,
      };
    } catch (error) {
      console.error("Error withdrawing:", error.message);
      this.#processing = false;
      eventBus.emit("sdk:processing:stopped", { processing: this.#processing });
      eventBus.emit("withdraw:failed", { error: error.message });
      throw error;
    }
  }

  async stackingStatus(poolId = this.#namespace) {
    try {
      if (!this.#walletConnected || !this.account) {
        throw new Error("Wallet is not connected");
      }

      // Read stake data from box storage
      const stakeKey = getStakeKey(poolId, this.account);

      try {
        const boxValue = await this.#algodClient
          .getApplicationBoxByName(this.#contractApplicationId, stakeKey)
          .do();

        if (!boxValue || !boxValue.value) {
          return {
            poolId,
            exists: false,
            stakeData: null,
          };
        }

        // Decode the stake data from box value
        // The box contains ARC-4 encoded StakeData struct
        const stakeData = decodeStakeData(boxValue.value);

        return {
          poolId,
          exists: true,
          stakeData: stakeData,
        };
      } catch (error) {
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
      console.error("Error fetching stacking status:", error.message);
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
            amount: asset.amount,
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

  async optInAsset(assetId) {
    try {
      if (!this.#walletConnected || !this.account) {
        throw new Error("Wallet is not connected");
      }

      const suggestedParams = await this.#algodClient
        .getTransactionParams()
        .do();

      const optInTxn =
        algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          sender: this.account,
          receiver: this.account,
          amount: 0,
          assetIndex: Number(assetId),
          suggestedParams,
        });

      let signedTxn;
      if (this.#mnemonicAccount) {
        signedTxn = [optInTxn.signTxn(this.#mnemonicAccount.sk)];
      } else {
        const walletConnector =
          this.#walletConnectors[this.#selectedWalletType];
        if (!walletConnector) {
          throw new Error("No wallet connector available");
        }
        const signedGroup = await walletConnector.signTransaction([
          [{ txn: optInTxn, signers: [this.account] }],
        ]);
        signedTxn = Array.isArray(signedGroup[0])
          ? signedGroup[0]
          : signedGroup;
      }

      const { txid } = await this.#algodClient
        .sendRawTransaction(signedTxn)
        .do();
      await algosdk.waitForConfirmation(this.#algodClient, txid, 10);
      return txid;
    } catch (error) {
      // If already opted-in, Algod can throw; caller may ignore
      throw error;
    }
  }

  /**
   * Admin Operations
   */

  async emergencyWithdraw(poolId = this.#namespace, penaltyPercentage = 5) {
    try {
      if (!this.#walletConnected || !this.account) {
        throw new Error("Wallet is not connected");
      }

      this.#processing = true;
      eventBus.emit("sdk:processing:started", { processing: this.#processing });

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

      const emergencyWithdrawTxn = algosdk.makeApplicationCallTxnFromObject({
        sender: this.account,
        appIndex: this.#contractApplicationId,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: [
          emergencyWithdrawMethod.getSelector(),
          algosdk.ABIType.from("string").encode(poolId),
          algosdk.ABIType.from("uint64").encode(BigInt(penaltyPercentage)),
        ],
        suggestedParams: {
          ...suggestedParams,
          flatFee: true,
          fee: 2000,
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

      this.#processing = false;
      eventBus.emit("sdk:processing:stopped", { processing: this.#processing });
      eventBus.emit("emergencyWithdraw:success", {
        transactionId: txid,
      });

      return {
        transactionId: txid,
        poolId,
      };
    } catch (error) {
      console.error("Error emergency withdrawing:", error.message);
      this.#processing = false;
      eventBus.emit("sdk:processing:stopped", { processing: this.#processing });
      eventBus.emit("emergencyWithdraw:failed", { error: error.message });
      throw error;
    }
  }

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

      this.#processing = true;
      eventBus.emit("sdk:processing:started", { processing: this.#processing });

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

      this.#processing = false;
      eventBus.emit("sdk:processing:stopped", { processing: this.#processing });
      eventBus.emit("donation:success", { transactionId: txid });

      return {
        transactionId: txid,
        tokenId,
        amount,
      };
    } catch (error) {
      console.error("Error adding donation:", error.message);
      this.#processing = false;
      eventBus.emit("sdk:processing:stopped", { processing: this.#processing });
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

      this.#processing = true;
      eventBus.emit("sdk:processing:started", { processing: this.#processing });

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

      this.#processing = false;
      eventBus.emit("sdk:processing:stopped", { processing: this.#processing });
      eventBus.emit("withdrawExcess:success", { transactionId: txid });

      return {
        transactionId: txid,
        tokenId,
        amount,
      };
    } catch (error) {
      console.error("Error withdrawing excess tokens:", error.message);
      this.#processing = false;
      eventBus.emit("sdk:processing:stopped", { processing: this.#processing });
      eventBus.emit("withdrawExcess:failed", { error: error.message });
      throw error;
    }
  }
}

export default AlgoStakeX;
