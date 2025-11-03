import algosdk from "algosdk";
import { PeraWalletConnect } from "@perawallet/connect";
import { DeflyWalletConnect } from "@blockshake/defly-connect";
import eventBus from "./event-bus.js";
import "./algostakex.css";

const appSpecJson = require("./AlgoStakeXClient/AlgoStakeX.arc32.json");
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
      this.#network = this.#validateEnvironment(env);
      this.#namespace = this.#validateNamespace(namespace);
      this.#tokenId = this.#validateTokenId(token_id);
      this.#disableToast = this.#validateDisableToast(disableToast);
      this.#disableUi = this.#validateDisableUi(!enable_ui);
      this.#minimizeUILocation =
        this.#validateMinimizeUILocation(minimizeUILocation);
      this.#logo = this.#validateLogo(logo);
      this.#toastLocation = this.#validateToastLocation(toastLocation);
      this.#stakingConfig = this.#validateStakingConfig(staking);

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

      // Initialize contract details - TODO: Update with actual contract IDs
      this.#contractApplicationId =
        this.#network === "mainnet" ? 749041504 : 749041504; // Update with real IDs
      this.#contractWalletAddress =
        this.#network === "mainnet"
          ? "PMQMLZXHMQK2AA3XQ7KVVDWAXKGJMFSIGJOC4TSPANGUKQWZZT6R7SB5XE"
          : "PMQMLZXHMQK2AA3XQ7KVVDWAXKGJMFSIGJOC4TSPANGUKQWZZT6R7SB5XE"; // Will be derived from contract

      // Initialize SDK variables
      this.#indexerUrl =
        this.#network === "mainnet"
          ? "https://mainnet-idx.algonode.cloud"
          : "https://testnet-idx.algonode.cloud";
      this.events = eventBus;

      // Initialize UI state
      this.#messageElement = null;
      this.#processing = false;

      // Load saved UI state (only if UI is not disabled)
      if (!this.#disableUi) {
        const savedState = localStorage.getItem("asx");
        if (savedState) {
          try {
            const parsedState = JSON.parse(savedState);
            this.isMinimized = parsedState.minimized || false;
            this.theme = parsedState.theme || this.#getSystemTheme();
          } catch (e) {
            this.isMinimized = false;
            this.theme = this.#getSystemTheme();
          }
        } else {
          this.isMinimized = false;
          this.theme = this.#getSystemTheme();
        }

        // Save initial state and initialize UI
        this.#saveUIState();
        this.#initUI();
      }
    } catch (error) {
      this.#sdkValidationFailed(error.message);
    }
  }

  /**
   * SDK parameters Validation
   */

  #validateRequired(value, paramName) {
    if (value === undefined || value === null) {
      throw new Error(`${paramName} is required`);
    }
    return value;
  }

  #validateString(value, paramName) {
    this.#validateRequired(value, paramName);
    if (typeof value !== "string") {
      throw new Error(`${paramName} must be a string`);
    }
    if (value.trim().length === 0) {
      throw new Error(`${paramName} cannot be empty`);
    }
    return value;
  }

  #validateEnum(value, paramName, validValues) {
    this.#validateString(value, paramName);
    if (!validValues.includes(value)) {
      throw new Error(`${paramName} must be one of: ${validValues.join(", ")}`);
    }
    return value;
  }

  #validateNumber(value, paramName, options = {}) {
    if (value === undefined || value === null) {
      return options.default ?? 0;
    }
    if (typeof value !== "number") {
      throw new Error(`${paramName} must be a number`);
    }
    if (!Number.isFinite(value)) {
      throw new Error(`${paramName} must be a finite number`);
    }
    if (options.min !== undefined && value < options.min) {
      throw new Error(
        `${paramName} must be greater than or equal to ${options.min}`
      );
    }
    if (options.max !== undefined && value > options.max) {
      throw new Error(
        `${paramName} must be less than or equal to ${options.max}`
      );
    }
    return value;
  }

  #validateBoolean(value, paramName, defaultValue = false) {
    if (value === undefined || value === null) {
      return defaultValue;
    }
    if (typeof value !== "boolean") {
      throw new Error(`${paramName} must be a boolean`);
    }
    return value;
  }

  #validateUrl(value, paramName) {
    this.#validateString(value, paramName);
    try {
      new URL(value);
      return value;
    } catch (e) {
      throw new Error(`${paramName} must be a valid URL`);
    }
  }

  #validateEnvironment(env) {
    return this.#validateEnum(env, "Environment", ["testnet", "mainnet"]);
  }

  #validateNamespace(namespace) {
    const validatedNamespace = this.#validateString(namespace, "Namespace");
    if (validatedNamespace.length < 3 || validatedNamespace.length > 20) {
      throw new Error("Namespace must be between 3 and 20 characters long");
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(validatedNamespace)) {
      throw new Error(
        "Namespace must contain only alphanumeric characters, hyphens, and underscores"
      );
    }
    return validatedNamespace;
  }

  #validateTokenId(tokenId) {
    const validatedId = this.#validateNumber(tokenId, "Token ID", {
      min: 0,
    });
    return BigInt(validatedId);
  }

  #validateStakingConfig(staking) {
    if (!staking || typeof staking !== "object") {
      throw new Error("staking configuration is required");
    }

    const type = this.#validateEnum(staking.type, "Staking type", [
      "FLEXIBLE",
      "FIXED",
    ]);

    const config = {
      type,
      stake_period: undefined,
      withdraw_penalty: undefined,
      reward: {
        type: undefined,
        value: undefined,
      },
    };

    // Validate stake_period (optional for FLEXIBLE)
    if (staking.stake_period !== undefined) {
      config.stake_period = this.#validateNumber(
        staking.stake_period,
        "Stake period",
        { min: 0 }
      );
    }

    // Validate withdraw_penalty (optional for FLEXIBLE)
    if (staking.withdraw_penalty !== undefined) {
      config.withdraw_penalty = this.#validateNumber(
        staking.withdraw_penalty,
        "Withdraw penalty",
        { min: 0, max: 100 }
      );
    }

    // Validate reward configuration
    if (!staking.reward || typeof staking.reward !== "object") {
      throw new Error("Reward configuration is required");
    }

    config.reward.type = this.#validateEnum(
      staking.reward.type,
      "Reward type",
      ["APY", "UTILITY"]
    );

    // Validate reward.value: can be a primitive or an array of tiers
    if (staking.reward.value !== undefined) {
      if (Array.isArray(staking.reward.value)) {
        config.reward.value = staking.reward.value.map((tier, index) => {
          if (!tier || typeof tier !== "object") {
            throw new Error(`Tier ${index}: must be an object`);
          }
          if (!tier.name || typeof tier.name !== "string") {
            throw new Error(
              `Tier ${index}: name is required and must be a string`
            );
          }
          const stakeAmount = this.#validateNumber(
            tier.stake_amount,
            `Tier ${index}: stake_amount`,
            { min: 0 }
          );
          if (config.reward.type === "APY") {
            const valueNum = this.#validateNumber(
              tier.value,
              `Tier ${index}: value (APY)`,
              { min: 0 }
            );
            return {
              name: tier.name,
              stake_amount: stakeAmount,
              value: valueNum,
            };
          } else {
            const valueStr = this.#validateString(
              tier.value,
              `Tier ${index}: value (Utility)`
            );
            return {
              name: tier.name,
              stake_amount: stakeAmount,
              value: valueStr,
            };
          }
        });
      } else {
        if (config.reward.type === "APY") {
          config.reward.value = this.#validateNumber(
            staking.reward.value,
            "Reward value (APY)",
            { min: 0 }
          );
        } else {
          config.reward.value = this.#validateString(
            staking.reward.value,
            "Reward value (Utility)"
          );
        }
      }
    }

    return config;
  }

  #validateDisableToast(disableToast) {
    return this.#validateBoolean(disableToast, "disableToast", false);
  }

  #validateDisableUi(disableUi) {
    return this.#validateBoolean(disableUi, "disableUi", false);
  }

  #validateMinimizeUILocation(location) {
    return (
      this.#validateEnum(location, "minimizeUILocation", ["left", "right"]) ||
      "right"
    );
  }

  #validateLogo(logo) {
    if (logo === undefined || logo === null) {
      return null;
    }

    const validatedLogo = this.#validateString(logo, "Logo");

    // Check if it's a URL
    if (
      validatedLogo.startsWith("http://") ||
      validatedLogo.startsWith("https://")
    ) {
      return this.#validateUrl(validatedLogo, "Logo");
    }

    // Check if it's a local file path
    if (
      validatedLogo.startsWith("./") ||
      validatedLogo.startsWith("../") ||
      validatedLogo.startsWith("/")
    ) {
      if (
        !/^[./\\a-zA-Z0-9_-]+\.(png|jpg|jpeg|gif|svg|webp)$/i.test(
          validatedLogo
        )
      ) {
        throw new Error(
          "Invalid logo file path. Must be a valid image file path"
        );
      }
      return validatedLogo;
    }

    throw new Error(
      "Logo must be either a valid URL or a valid local file path"
    );
  }

  #validateToastLocation(location) {
    return this.#validateEnum(location, "Toast location", [
      "TOP_LEFT",
      "TOP_RIGHT",
    ]);
  }

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

  /**
   *********** SDK private methods
   */
  #initUI() {
    if (this.#disableUi) {
      return;
    }

    // Remove any existing
    const existing = document.getElementById("algostakex-sdk-container");
    if (existing) existing.remove();

    // Create SDK container and inner UI
    const container = document.createElement("div");
    container.id = "algostakex-sdk-container";
    container.style.display = this.isMinimized ? "none" : "flex";

    container.innerHTML = `
      <div id="asx-header">
        <div class="header-left">
          ${
            this.#logo
              ? `<img src="${
                  this.#logo
                }" alt="AlgoStakeX" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />`
              : ""
          }
          <h3 style="${
            this.#logo ? "display: none;" : "display: block;"
          }">AlgoStakeX</h3>
        </div>
        <div class="header-right">
          <button id="asxThemeToggleBtn" title="Toggle Theme">🌓</button>
          <button id="asxLogoutBtn" title="Logout">⏻</button>
          <button id="asxMinimizeBtn" title="Minimize">&#x2013;</button>
        </div>
      </div>

      <div id="asxWalletChoice">
        <button class="walletBtn" data-wallet="pera">
          <img src="https://perawallet.s3.amazonaws.com/images/media-kit/logomark-white.svg" alt="Pera Wallet" />
          Connect Pera Wallet
        </button>
        <button class="walletBtn" data-wallet="defly">
          <img src="https://docs.defly.app/~gitbook/image?url=https%3A%2F%2F2700986753-files.gitbook.io%2F~%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fcollections%252FWDbwYIFtoiPa3JoJufCw%252Ficon%252FbQUUOW6VhH6vKR0XH7UB%252Flogo-notext-whiteonblack.png%3Falt%3Dmedia%26token%3D7d62c65b-fd29-47b6-a83b-162caac2fc8f&width=32&dpr=2&quality=100&sign=952138fe&sv=2" alt="Defly Wallet" />
          Connect Defly Wallet
        </button>
      </div>

      <div id="asxUI" style="display:none;">
        <div id="asxWalletAddressBar" title="Click to copy connected wallet"></div>
        <div id="asxTabs">
          <button class="asxTabBtn" data-tab="stake">Stake</button>
          <button class="asxTabBtn" data-tab="mystakes">My Staking</button>
        </div>
        <div id="asxTabContent">
          <div id="asxStakeTab" class="asxTabPane">
            <div id="asxAssetList" class="asxAssetList"></div>
            <div class="asxRow">
              <button id="asxStakeSelectedBtn">Stake Selected</button>
            </div>
          </div>
          <div id="asxMyStakesTab" class="asxTabPane" style="display:none;">
            <div id="asxMyStakeSummary"></div>
            <div class="asxRow">
              <button id="asxWithdrawBtn">Withdraw</button>
              <button id="asxEmergencyWithdrawBtn">Emergency Withdraw</button>
            </div>
          </div>
        </div>
      </div>

      <div id="algostakex-loading-overlay">
        <div id="algostakex-loader"></div>
        <div id="algostakex-processing-message"></div>
      </div>
    `;

    document.body.appendChild(container);

    // Minimized button
    const minimizedBtn = document.createElement("button");
    minimizedBtn.id = "sdkMinimizedBtn";
    minimizedBtn.innerHTML = this.#logo
      ? `<img src="${
          this.#logo
        }" alt="ASX" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" /><span style="display: none;">ASX</span>`
      : "ASX";
    minimizedBtn.style.display = this.isMinimized ? "block" : "none";
    minimizedBtn.className = this.#minimizeUILocation;
    minimizedBtn.addEventListener("click", () => this.maximizeSDK());
    document.body.appendChild(minimizedBtn);

    // Controls
    document
      .getElementById("asxMinimizeBtn")
      ?.addEventListener("click", () => this.minimizeSDK());
    document
      .getElementById("asxThemeToggleBtn")
      ?.addEventListener("click", () => {
        this.theme = this.theme === "light" ? "dark" : "light";
        this.#saveUIState();
        this.#applyTheme();
      });
    document
      .getElementById("asxLogoutBtn")
      ?.addEventListener("click", () => this.#handleLogout());

    // Wallet choice
    document
      .getElementById("asxWalletChoice")
      ?.addEventListener("click", async (evt) => {
        const btn = evt.target.closest(".walletBtn");
        if (!btn) return;
        const walletType = btn.getAttribute("data-wallet");
        await this.#startWalletConnection(walletType);
      });

    // Tabs
    container.querySelectorAll(".asxTabBtn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.getAttribute("data-tab");
        container.querySelector("#asxStakeTab").style.display =
          tab === "stake" ? "block" : "none";
        container.querySelector("#asxMyStakesTab").style.display =
          tab === "mystakes" ? "block" : "none";
        if (tab === "stake") {
          this.#renderWalletAssets().catch(() =>
            this.#showToast("Failed to load assets", "error")
          );
        }
      });
    });

    // Stake actions
    document
      .getElementById("asxStakeSelectedBtn")
      ?.addEventListener("click", async () => {
        try {
          const selected = document.querySelector(".asxAssetItem.selected");
          if (!selected) {
            this.#showToast("Select an asset first", "warning");
            return;
          }
          const amount = Number(selected.getAttribute("data-amount")) || 0;
          if (!amount || amount <= 0) {
            this.#showToast("Invalid amount", "error");
            return;
          }
          this.#showLoadingOverlay("Staking...");
          await this.stack({ poolId: this.#namespace, amount });
        } catch (e) {
          this.#showToast(e.message || "Stake failed", "error");
        } finally {
          this.#hideLoadingOverlay();
        }
      });
    document
      .getElementById("asxWithdrawBtn")
      ?.addEventListener("click", async () => {
        try {
          await this.withdraw(this.#namespace);
        } catch (e) {
          this.#showToast(e.message || "Withdraw failed", "error");
        }
      });
    document
      .getElementById("asxEmergencyWithdrawBtn")
      ?.addEventListener("click", async () => {
        try {
          await this.emergencyWithdraw(
            this.#namespace,
            this.#stakingConfig.withdraw_penalty || 5
          );
        } catch (e) {
          this.#showToast(e.message || "Emergency withdraw failed", "error");
        }
      });

    // Theme + Toast
    this.#applyTheme();
    this.#setupToastContainer();

    // Try restore
    this.#loadConnectionFromStorage?.();
  }

  #refreshUI() {
    if (this.#disableUi) return;
    const walletBar = document.getElementById("asxWalletAddressBar");
    const walletChoice = document.getElementById("asxWalletChoice");
    const ui = document.getElementById("asxUI");
    if (!walletBar || !walletChoice || !ui) return;
    if (this.#walletConnected && this.account) {
      walletBar.innerText = this.account;
      walletBar.style.display = "block";
      walletChoice.style.display = "none";
      ui.style.display = "flex";
    } else {
      walletBar.innerText = "";
      walletBar.style.display = "none";
      walletChoice.style.display = "flex";
      ui.style.display = "none";
    }
  }

  #setupToastContainer() {
    if (this.#disableToast || this.#disableUi) {
      return;
    }

    let toastContainer = document.getElementById("algostakex-toast-container");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.id = "algostakex-toast-container";
      toastContainer.className =
        this.#toastLocation === "TOP_LEFT" ? "top-left" : "top-right";
      document.body.appendChild(toastContainer);
    }
  }

  async #renderWalletAssets() {
    try {
      if (!this.#walletConnected || !this.account) {
        const list = document.getElementById("asxAssetList");
        if (list)
          list.innerHTML =
            '<div class="asxAssetEmpty">Connect wallet to view assets</div>';
        return;
      }
      const list = document.getElementById("asxAssetList");
      if (list)
        list.innerHTML = '<div class="asxAssetLoading">Loading assets...</div>';
      const fts = await this.getWalletFTs();
      const targetId = Number(this.#tokenId);

      const filtered = (fts || []).filter(
        (a) => Number(a.assetId) === targetId
      );
      if (!filtered.length) {
        if (list)
          list.innerHTML =
            '<div class="asxAssetEmpty">No matching assets found</div>';
        return;
      }
      // Optionally fetch metadata for display
      let metaName = "";
      try {
        const meta = await this.getFTMetadata(targetId);
        metaName = meta?.name || "";
      } catch {}
      const itemsHtml = filtered
        .map(
          (a) => `
        <div class="asxAssetItem" data-asset-id="${a.assetId}" data-amount="${
            a.amount
          }">
          <div class="asxAssetRow">
            <div class="asxAssetName">${metaName || "ASA " + a.assetId}</div>
            <div class="asxAssetAmount">Amount: ${a.amount}</div>
          </div>
        </div>`
        )
        .join("");
      if (list) list.innerHTML = itemsHtml;
      // Selection handler
      document.querySelectorAll(".asxAssetItem").forEach((el) => {
        el.addEventListener("click", () => {
          document
            .querySelectorAll(".asxAssetItem")
            .forEach((e2) => e2.classList.remove("selected"));
          el.classList.add("selected");
        });
      });
    } catch (e) {
      const list = document.getElementById("asxAssetList");
      if (list)
        list.innerHTML = `<div class="asxAssetError">${
          e.message || "Failed to load assets"
        }</div>`;
    }
  }

  #showToast(message, type = "info") {
    this.events.emit("toast:show", { message, type });
    if (this.#disableToast || this.#disableUi) return;
    const id = "algostakex-toast";
    const existing = document.getElementById(id);
    if (existing) existing.remove();
    const toast = document.createElement("div");
    toast.id = id;
    const content = document.createElement("div");
    content.className = "toast-content";
    content.innerText = message;
    const close = document.createElement("button");
    close.className = "toast-close";
    close.innerHTML = "×";
    close.onclick = () => {
      toast.style.opacity = "0";
      toast.addEventListener("transitionend", () => toast.remove(), {
        once: true,
      });
    };
    toast.appendChild(content);
    toast.appendChild(close);
    toast.classList.add(
      type === "error" ? "error" : type === "success" ? "success" : "info"
    );
    toast.classList.add(this.#toastLocation.toLowerCase().replace("_", "-"));
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
    });
    setTimeout(() => close.onclick(), 3500);
  }

  #showLoadingOverlay(message = "Processing...") {
    if (this.#disableUi) return;
    const overlay = document.getElementById("algostakex-loading-overlay");
    const msg = document.getElementById("algostakex-processing-message");
    if (!overlay || !msg) return;
    msg.textContent = message;
    this.#currentLoadingMessage = message;
    if (this.theme === "dark") overlay.classList.add("dark-theme");
    else overlay.classList.remove("dark-theme");
    requestAnimationFrame(() => {
      overlay.classList.add("visible");
    });
  }

  #hideLoadingOverlay() {
    if (this.#disableUi) return;
    const overlay = document.getElementById("algostakex-loading-overlay");
    if (!overlay) return;
    requestAnimationFrame(() => {
      overlay.classList.remove("visible");
    });
  }

  #getSystemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  #saveUIState() {
    if (this.#disableUi) {
      return;
    }

    localStorage.setItem(
      "asx",
      JSON.stringify({
        minimized: this.isMinimized,
        theme: this.theme,
      })
    );
  }

  #applyTheme() {
    if (this.#disableUi) {
      return;
    }

    const container = document.getElementById("algostakex-sdk-container");
    const minimizedBtn = document.getElementById("sdkMinimizedBtn");

    if (container) {
      if (this.theme === "dark") {
        container.classList.add("dark-theme");
        if (minimizedBtn) minimizedBtn.classList.add("dark-theme");
      } else {
        container.classList.remove("dark-theme");
        if (minimizedBtn) minimizedBtn.classList.remove("dark-theme");
      }
    }
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
        this.#refreshUI();
      } else {
        this.#refreshUI();
      }
    } catch (error) {
      this.events.emit("wallet:connection:failed", { error: error.message });
      this.#refreshUI();
    }
  }

  async #startWalletConnection(walletType) {
    if (this.#connectionInProgress) {
      this.#showToast("A wallet connection is already in progress.", "warning");
      return;
    }
    if (!this.#supportedWallets.includes(walletType)) {
      this.#showToast("Unsupported wallet selected.", "error");
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
      this.#showToast(`Connected to ${walletType} wallet`, "success");
      this.events.emit("wallet:connected", {
        address: this.account,
        type: walletType,
      });
      this.events.emit("wallet:connection:connected", {
        address: this.account,
      });
      this.#refreshUI();
    } catch (error) {
      try {
        await connector.disconnect();
        if (connector.killSession) await connector.killSession();
      } catch {}
      this.#showToast("Failed to connect wallet!", "error");
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
    this.#refreshUI();
    this.events.emit("wallet:disconnected", {});
    this.events.emit("wallet:connection:disconnected", { address: null });
  }

  /**
   * Helper Methods
   */

  #algosToMicroAlgos(algos) {
    return Math.round(algos * 1000000);
  }

  #microAlgosToAlgos(microAlgos) {
    return microAlgos / 1000000;
  }

  /**
   ********** Public methods
   */

  minimizeSDK(initialLoad) {
    if (this.#disableUi) {
      return;
    }

    if (!initialLoad && this.isMinimized) return;

    const container = document.getElementById("algostakex-sdk-container");
    const minimizedBtn = document.getElementById("sdkMinimizedBtn");

    if (!container || !minimizedBtn) return;

    minimizedBtn.style.right =
      this.#minimizeUILocation === "right" ? "20px" : "auto";
    minimizedBtn.style.left =
      this.#minimizeUILocation === "left" ? "20px" : "auto";

    container.classList.add("minimizing");
    minimizedBtn.style.display = "block";

    setTimeout(() => {
      container.style.display = "none";
      container.classList.remove("minimizing");
      minimizedBtn.classList.add("showing");
    }, 300);

    this.isMinimized = true;
    this.#saveUIState();
    eventBus.emit("window:size:minimized", { minimized: this.isMinimized });
  }

  maximizeSDK(initialLoad) {
    if (this.#disableUi) {
      return;
    }

    if (!initialLoad && !this.isMinimized) return;

    const container = document.getElementById("algostakex-sdk-container");
    const minimizedBtn = document.getElementById("sdkMinimizedBtn");

    if (!container || !minimizedBtn) return;

    minimizedBtn.classList.remove("showing");
    minimizedBtn.classList.add("hiding");

    setTimeout(() => {
      minimizedBtn.style.display = "none";
      minimizedBtn.classList.remove("hiding");
      container.style.display = "flex";
      container.classList.add("maximizing");

      setTimeout(() => {
        container.classList.remove("maximizing");
      }, 300);
    }, 200);

    this.isMinimized = false;
    this.#saveUIState();
    eventBus.emit("window:size:maximized", { minimized: this.isMinimized });
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
        this.#refreshUI();
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
        this.#refreshUI();
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
        this.#refreshUI();
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

  async stackingStatus(poolId = this.#namespace) {
    try {
      if (!this.#walletConnected || !this.account) {
        throw new Error("Wallet is not connected");
      }

      // Read stake data from box storage
      const stakeKey = this.#getStakeKey(poolId, this.account);

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
        const stakeData = this.#decodeStakeData(boxValue.value);

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

  #getStakeKey(poolId, userAddress) {
    // Create stake key: "stake_" + poolId + "_" + userAddress bytes
    const prefix = new TextEncoder().encode("stake_");
    const poolIdBytes = new TextEncoder().encode(poolId);
    const separator = new TextEncoder().encode("_");
    const userAddressBytes = algosdk.decodeAddress(userAddress).publicKey;

    const stakeKey = new Uint8Array(
      prefix.length +
        poolIdBytes.length +
        separator.length +
        userAddressBytes.length
    );
    let offset = 0;
    stakeKey.set(prefix, offset);
    offset += prefix.length;
    stakeKey.set(poolIdBytes, offset);
    offset += poolIdBytes.length;
    stakeKey.set(separator, offset);
    offset += separator.length;
    stakeKey.set(userAddressBytes, offset);

    return stakeKey;
  }

  #decodeStakeData(boxValueBytes) {
    // Decode ARC-4 encoded StakeData struct from box value
    // The box contains ARC-4 encoded data
    try {
      const view = new DataView(boxValueBytes.buffer);
      let offset = 0;

      // ARC-4 encoding for structs includes a type prefix (2 bytes)
      // Skip type prefix (2 bytes for struct type ID)
      offset += 2;

      // Decode staker (arc4.Address = 32 bytes)
      const stakerBytes = boxValueBytes.slice(offset, offset + 32);
      const staker = algosdk.encodeAddress(stakerBytes);
      offset += 32;

      // Decode tokenId (arc4.Uint64 = 8 bytes)
      const tokenId = view.getBigUint64(offset, false);
      offset += 8;

      // Decode isFlexible (arc4.Bool = 1 byte)
      const isFlexible = boxValueBytes[offset] !== 0;
      offset += 1;

      // Decode amount (arc4.Uint64 = 8 bytes)
      const amount = view.getBigUint64(offset, false);
      offset += 8;

      // Decode stakedAt (arc4.Uint64 = 8 bytes)
      const stakedAt = view.getBigUint64(offset, false);
      offset += 8;

      // Decode lockPeriod (arc4.Uint64 = 8 bytes)
      const lockPeriod = view.getBigUint64(offset, false);
      offset += 8;

      // Decode lockEndTime (arc4.Uint64 = 8 bytes)
      const lockEndTime = view.getBigUint64(offset, false);
      offset += 8;

      // Decode rewardType (arc4.Str = length (2 bytes) + string bytes)
      const rewardTypeLength = view.getUint16(offset, false);
      offset += 2;
      const rewardTypeBytes = boxValueBytes.slice(
        offset,
        offset + rewardTypeLength
      );
      const rewardType = new TextDecoder().decode(rewardTypeBytes);
      offset += rewardTypeLength;

      // Decode rewardRate (arc4.Uint64 = 8 bytes)
      const rewardRate = view.getBigUint64(offset, false);
      offset += 8;

      // Decode utility (arc4.Str = length (2 bytes) + string bytes)
      const utilityLength = view.getUint16(offset, false);
      offset += 2;
      const utilityBytes = boxValueBytes.slice(offset, offset + utilityLength);
      const utility = new TextDecoder().decode(utilityBytes);
      offset += utilityLength;

      // Decode totalRewardsClaimed (arc4.Uint64 = 8 bytes)
      const totalRewardsClaimed = view.getBigUint64(offset, false);
      offset += 8;

      return {
        staker: staker,
        tokenId: Number(tokenId),
        isFlexible: isFlexible,
        amount: Number(amount),
        stakedAt: Number(stakedAt),
        lockPeriod: Number(lockPeriod),
        lockEndTime: Number(lockEndTime),
        rewardType: rewardType,
        rewardRate: Number(rewardRate),
        utility: utility,
        totalRewardsClaimed: Number(totalRewardsClaimed),
      };
    } catch (error) {
      console.error("Error decoding stake data:", error);
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

  async stack({
    poolId = this.#namespace,
    amount,
    lockPeriod = this.#stakingConfig.stake_period
      ? this.#stakingConfig.stake_period
      : null,
    rewardType = this.#stakingConfig.reward.type,
    rewardRate = this.#stakingConfig.reward.type === "APY"
      ? this.#stakingConfig.reward.value.value
        ? this.#stakingConfig.reward.value.value
        : this.#stakingConfig.reward.value
      : 0,
    utility = this.#stakingConfig.reward.type === "UTILITY"
      ? this.#stakingConfig.reward.value.value
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
        foreignAssets: [Number(this.#tokenId)],
        suggestedParams: {
          ...suggestedParams,
          flatFee: true,
          fee: 2000, // 0.002 Algo
        },
      });

      // Create transaction group
      const stakeGroup = [stakeAppCallTxn, assetTransferTxn];
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

// Expose to window for browser usage
if (typeof window !== "undefined") {
  window.AlgoStakeX = AlgoStakeX;
}
