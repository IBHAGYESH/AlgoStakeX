/**
 * AlgoStakeX SDK UI Manager
 * Handles all UI rendering, interactions, and visual feedback
 */

import eventBus from "./event-bus.js";
import "./ui.css";

export class UIManager {
  #sdk;
  #disableUi;
  #disableToast;
  #logo;
  #minimizeUILocation;
  #toastLocation;
  #currentLoadingMessage;

  constructor(sdk, config) {
    this.#sdk = sdk;
    this.#disableUi = config.disableUi;
    this.#disableToast = config.disableToast;
    this.#logo = config.logo;
    this.#minimizeUILocation = config.minimizeUILocation;
    this.#toastLocation = config.toastLocation;
    this.#currentLoadingMessage = null;
  }

  /**
   * Initialize the UI
   */
  initUI(callbacks) {
    if (this.#disableUi) {
      return;
    }

    // Remove any existing
    const existing = document.getElementById("algostakex-sdk-container");
    if (existing) existing.remove();

    // Create SDK container and inner UI
    const container = document.createElement("div");
    container.id = "algostakex-sdk-container";
    container.style.display = this.#sdk.isMinimized ? "none" : "flex";

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
    minimizedBtn.style.display = this.#sdk.isMinimized ? "block" : "none";
    minimizedBtn.className = this.#minimizeUILocation;
    minimizedBtn.addEventListener("click", () => callbacks.onMaximize());
    document.body.appendChild(minimizedBtn);

    // Setup event listeners
    this.#setupEventListeners(callbacks);

    // Theme + Toast
    this.applyTheme();
    this.setupToastContainer();
  }

  /**
   * Setup all event listeners
   */
  #setupEventListeners(callbacks) {
    // Controls
    document
      .getElementById("asxMinimizeBtn")
      ?.addEventListener("click", () => callbacks.onMinimize());

    document
      .getElementById("asxThemeToggleBtn")
      ?.addEventListener("click", () => callbacks.onThemeToggle());

    document
      .getElementById("asxLogoutBtn")
      ?.addEventListener("click", () => callbacks.onLogout());

    // Wallet choice
    document
      .getElementById("asxWalletChoice")
      ?.addEventListener("click", async (evt) => {
        const btn = evt.target.closest(".walletBtn");
        if (!btn) return;
        const walletType = btn.getAttribute("data-wallet");
        await callbacks.onWalletConnect(walletType);
      });

    // Tabs
    const container = document.getElementById("algostakex-sdk-container");
    container?.querySelectorAll(".asxTabBtn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.getAttribute("data-tab");
        container.querySelector("#asxStakeTab").style.display =
          tab === "stake" ? "block" : "none";
        container.querySelector("#asxMyStakesTab").style.display =
          tab === "mystakes" ? "block" : "none";
        if (tab === "stake") {
          callbacks.onRenderAssets();
        }
      });
    });

    // Stake actions
    document
      .getElementById("asxStakeSelectedBtn")
      ?.addEventListener("click", async () => callbacks.onStake());

    document
      .getElementById("asxWithdrawBtn")
      ?.addEventListener("click", async () => callbacks.onWithdraw());

    document
      .getElementById("asxEmergencyWithdrawBtn")
      ?.addEventListener("click", async () => callbacks.onEmergencyWithdraw());
  }

  /**
   * Refresh UI based on wallet connection state
   */
  refreshUI(walletConnected, account) {
    if (this.#disableUi) return;

    const walletBar = document.getElementById("asxWalletAddressBar");
    const walletChoice = document.getElementById("asxWalletChoice");
    const ui = document.getElementById("asxUI");

    if (!walletBar || !walletChoice || !ui) return;

    if (walletConnected && account) {
      walletBar.innerText = account;
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

  /**
   * Setup toast container
   */
  setupToastContainer() {
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

  /**
   * Render wallet assets
   */
  async renderWalletAssets(
    walletConnected,
    account,
    getAssets,
    getMetadata,
    tokenId
  ) {
    try {
      if (!walletConnected || !account) {
        const list = document.getElementById("asxAssetList");
        if (list)
          list.innerHTML =
            '<div class="asxAssetEmpty">Connect wallet to view assets</div>';
        return;
      }

      const list = document.getElementById("asxAssetList");
      if (list)
        list.innerHTML = '<div class="asxAssetLoading">Loading assets...</div>';

      const fts = await getAssets();
      const targetId = Number(tokenId);

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
        const meta = await getMetadata(targetId);
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

  /**
   * Show toast notification
   */
  showToast(message, type = "info") {
    eventBus.emit("toast:show", { message, type });

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

  /**
   * Show loading overlay
   */
  showLoadingOverlay(message = "Processing...") {
    if (this.#disableUi) return;

    const overlay = document.getElementById("algostakex-loading-overlay");
    const msg = document.getElementById("algostakex-processing-message");

    if (!overlay || !msg) return;

    msg.textContent = message;
    this.#currentLoadingMessage = message;

    if (this.#sdk.theme === "dark") overlay.classList.add("dark-theme");
    else overlay.classList.remove("dark-theme");

    requestAnimationFrame(() => {
      overlay.classList.add("visible");
    });
  }

  /**
   * Hide loading overlay
   */
  hideLoadingOverlay() {
    if (this.#disableUi) return;

    const overlay = document.getElementById("algostakex-loading-overlay");
    if (!overlay) return;

    requestAnimationFrame(() => {
      overlay.classList.remove("visible");
    });
  }

  /**
   * Get system theme preference
   */
  getSystemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  /**
   * Save UI state to localStorage
   */
  saveUIState(isMinimized, theme) {
    if (this.#disableUi) {
      return;
    }

    localStorage.setItem(
      "asx",
      JSON.stringify({
        minimized: isMinimized,
        theme: theme,
      })
    );
  }

  /**
   * Apply theme to UI elements
   */
  applyTheme() {
    if (this.#disableUi) {
      return;
    }

    const container = document.getElementById("algostakex-sdk-container");
    const minimizedBtn = document.getElementById("sdkMinimizedBtn");

    if (container) {
      if (this.#sdk.theme === "dark") {
        container.classList.add("dark-theme");
        if (minimizedBtn) minimizedBtn.classList.add("dark-theme");
      } else {
        container.classList.remove("dark-theme");
        if (minimizedBtn) minimizedBtn.classList.remove("dark-theme");
      }
    }
  }

  /**
   * Minimize SDK UI
   */
  minimizeSDK(initialLoad) {
    if (this.#disableUi) {
      return;
    }

    if (!initialLoad && this.#sdk.isMinimized) return;

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

    this.#sdk.isMinimized = true;
    this.saveUIState(this.#sdk.isMinimized, this.#sdk.theme);
    eventBus.emit("window:size:minimized", {
      minimized: this.#sdk.isMinimized,
    });
  }

  /**
   * Maximize SDK UI
   */
  maximizeSDK(initialLoad) {
    if (this.#disableUi) {
      return;
    }

    if (!initialLoad && !this.#sdk.isMinimized) return;

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

    this.#sdk.isMinimized = false;
    this.saveUIState(this.#sdk.isMinimized, this.#sdk.theme);
    eventBus.emit("window:size:maximized", {
      minimized: this.#sdk.isMinimized,
    });
  }
}
