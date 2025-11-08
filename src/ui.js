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

  // ==========================================
  // COMMON UI METHODS (ALGOXSUITE STANDARD)
  // ==========================================

  /**
   * Initialize the UI
   */
  initUI(callbacks) {
    if (this.#disableUi) {
      return;
    }

    // Remove any existing
    const existing = document.getElementById("algox-sdk-container");
    if (existing) existing.remove();

    // Create SDK container and inner UI
    const container = document.createElement("div");
    container.id = "algox-sdk-container";
    container.style.display = this.#sdk.isMinimized ? "none" : "flex";

    // ========== COMMON HEADER ==========
    const commonHeader = `
      <div id="algox-header">
        <div class="header-left">
          ${
            this.#logo
              ? `<img src="${this.#logo}" alt="AlgoStakeX" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />`
              : ""
          }
          <h3 style="${this.#logo ? "display: none;" : "display: block;"}">AlgoStakeX</h3>
        </div>
        <div class="header-right">
          <button id="algox-theme-btn" title="Toggle Theme">🌓</button>
          <button id="algox-logout-btn" title="Logout" style="display: none;">⏻</button>
          <button id="algox-minimize-btn" title="Minimize">&#x2013;</button>
        </div>
      </div>

      <div id="algox-wallet-choice">
        <button class="algox-wallet-btn" data-wallet="pera">
          <img src="https://perawallet.s3.amazonaws.com/images/media-kit/logomark-white.svg" alt="Pera Wallet" />
          Connect Pera Wallet
        </button>
        <button class="algox-wallet-btn" data-wallet="defly">
          <img src="https://docs.defly.app/~gitbook/image?url=https%3A%2F%2F2700986753-files.gitbook.io%2F~%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fcollections%252FWDbwYIFtoiPa3JoJufCw%252Ficon%252FbQUUOW6VhH6vKR0XH7UB%252Flogo-notext-whiteonblack.png%3Falt%3Dmedia%26token%3D7d62c65b-fd29-47b6-a83b-162caac2fc8f&width=32&dpr=2&quality=100&sign=952138fe&sv=2" alt="Defly Wallet" />
          Connect Defly Wallet
        </button>
      </div>`;

    // ========== SDK-SPECIFIC CONTENT ==========
    const sdkSpecificContent = `
      <div id="algox-stakex-content">
        <div id="algox-stakex-tabs">
          <button class="algox-stakex-tab-btn active" data-tab="stake">Stake</button>
          <button class="algox-stakex-tab-btn" data-tab="mystakes">My Staking</button>
        </div>
        <div id="algox-stakex-tab-content">
          <div id="algox-stakex-stake-tab" class="algox-stakex-tab-pane">
            <div id="algox-stakex-asset-list" class="algox-stakex-asset-list"></div>
            <div class="algox-stakex-row">
              <button id="algox-stakex-stake-btn">Stake Selected</button>
            </div>
          </div>
          <div id="algox-stakex-mystakes-tab" class="algox-stakex-tab-pane" style="display:none;">
            <div id="algox-stakex-mystake-summary"></div>
            <div class="algox-stakex-row">
              <button id="algox-stakex-withdraw-btn">Withdraw</button>
              <button id="algox-stakex-emergency-withdraw-btn">Emergency Withdraw</button>
            </div>
          </div>
        </div>
      </div>`;

    // ========== COMMON FOOTER ==========
    const commonFooter = `
      <div id="algox-wallet-address" title="Click to copy connected wallet address"></div>

      <div id="algox-footer">
        <span>AlgoStakeX crafted with ❤️ by <a href="https://ibhagyesh.site/" target="_blank" rel="noopener noreferrer">ibhagyesh</a></span>
      </div>

      <div id="algox-loading-overlay">
        <div id="algox-loader"></div>
        <div id="algox-processing-message"></div>
      </div>`;

    container.innerHTML = commonHeader + sdkSpecificContent + commonFooter;

    document.body.appendChild(container);

    // Create minimized circle button
    const existingSdkMinimizeBtn = document.getElementById(
      "algox-minimized-btn"
    );
    if (existingSdkMinimizeBtn) existingSdkMinimizeBtn.remove();

    const minimizedBtn = document.createElement("button");
    minimizedBtn.id = "algox-minimized-btn";
    minimizedBtn.innerHTML = this.#logo
      ? `<img src="${
          this.#logo
        }" alt="ASX" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" /><span style="display: none;">AMX</span>`
      : "AMX";

    document.body.appendChild(minimizedBtn);

    // Apply initial theme
    this.applyTheme();

    // Setup theme listener
    this.setupThemeListener();

    // Setup event listeners
    this.#setupEventListeners(callbacks);

    // Setup toast container
    this.setupToastContainer();
  }

  /**
   * Setup all event listeners
   */
  #setupEventListeners(callbacks) {
    // Controls
    document
      .getElementById("algox-minimize-btn")
      ?.addEventListener("click", () => callbacks.onMinimize());

    document
      .getElementById("algox-theme-btn")
      ?.addEventListener("click", () => callbacks.onThemeToggle());

    document
      .getElementById("algox-logout-btn")
      ?.addEventListener("click", () => callbacks.onLogout());

    // Wallet choice
    document
      .getElementById("algox-wallet-choice")
      ?.addEventListener("click", async (evt) => {
        const btn = evt.target.closest(".algox-wallet-btn");
        if (!btn) return;
        const walletType = btn.getAttribute("data-wallet");
        await callbacks.onWalletConnect(walletType);
      });

    // Tabs
    const container = document.getElementById("algox-sdk-container");
    container?.querySelectorAll(".algox-stakex-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.getAttribute("data-tab");
        container.querySelector("#algox-stakex-stake-tab").style.display =
          tab === "stake" ? "block" : "none";
        container.querySelector("#algox-stakex-mystakes-tab").style.display =
          tab === "mystakes" ? "block" : "none";
        if (tab === "stake") {
          callbacks.onRenderAssets();
        }
      });
    });

    // Stake actions
    document
      .getElementById("algox-stakex-stake-btn")
      ?.addEventListener("click", async () => callbacks.onStake());

    document
      .getElementById("algox-stakex-withdraw-btn")
      ?.addEventListener("click", async () => callbacks.onWithdraw());

    document
      .getElementById("algox-stakex-emergency-withdraw-btn")
      ?.addEventListener("click", async () => callbacks.onEmergencyWithdraw());

    // Maximized button
    document.getElementById("algox-minimized-btn").addEventListener("click", () => callbacks.onMaximize());

    // Copy to clipboard for wallet address bar
    const walletAddressBar = document.getElementById("algox-wallet-address");
    walletAddressBar.addEventListener("click", () => {
      if (this.#sdk.account) {
        navigator.clipboard.writeText(this.#sdk.account);
        this.showToast("Wallet address copied to clipboard", "success");
      }
    });
  }

  /**
   * Show SDK UI (after wallet connection)
   */
  showSDKUI() {
    if (this.#disableUi) {
      return;
    }

    document.getElementById("algox-sdk-container").style.display = "flex";
    document.getElementById("algox-header").style.display = "flex";
    document.getElementById("algox-logout-btn").style.display = "contents";
    document.getElementById("algox-wallet-choice").style.display = "none";
    document.getElementById("algox-stakex-content").style.display = "flex";
    this.updateWalletAddressBar();

    if (this.#sdk.isMinimized) {
      this.minimizeSDK(true);
    } else {
      this.maximizeSDK(true);
    }
  }

  /**
   * Reset to login UI
   */
  resetToLoginUI() {
    if (this.#disableUi) {
      return;
    }

    this.updateWalletAddressBar();

    document.getElementById("algox-sdk-container").style.display = "flex";
    document.getElementById("algox-header").style.display = "flex";
    document.getElementById("algox-logout-btn").style.display = "none";
    document.getElementById("algox-wallet-choice").style.display = "flex";
    document.getElementById("algox-stakex-content").style.display = "none";

    if (this.#sdk.isMinimized) {
      this.minimizeSDK(true);
    } else {
      this.maximizeSDK(true);
    }
  }

  /**
   * Update wallet address bar
   */
  updateWalletAddressBar() {
    if (this.#disableUi) {
      return;
    }

    const walletAddressBar = document.getElementById("algox-wallet-address");
    if (walletAddressBar) {
      if (this.#sdk.account) {
        walletAddressBar.innerText = this.#sdk.account;
        walletAddressBar.style.display = "block";
      } else {
        walletAddressBar.innerText = "";
        walletAddressBar.style.display = "none";
      }
    }
  }

  /**
   * Setup toast container
   */
  setupToastContainer() {
    if (this.#disableToast || this.#disableUi) {
      return;
    }

    let toastContainer = document.getElementById("algox-toast-container");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.id = "algox-toast-container";
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
        const list = document.getElementById("algox-stakex-asset-list");
        if (list)
          list.innerHTML =
            '<div class="algox-stakex-asset-empty">Connect wallet to view assets</div>';
        return;
      }

      const list = document.getElementById("algox-stakex-asset-list");
      if (list)
        list.innerHTML =
          '<div class="algox-stakex-asset-loading">Loading assets...</div>';

      const fts = await getAssets();
      const targetId = Number(tokenId);

      const filtered = (fts || []).filter(
        (a) => Number(a.assetId) === targetId
      );

      if (!filtered.length) {
        if (list)
          list.innerHTML =
            '<div class="algox-stakex-asset-empty">No matching assets found</div>';
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
        <div class="algox-stakex-asset-item" data-asset-id="${
          a.assetId
        }" data-amount="${a.amount}">
          <div class="algox-stakex-asset-row">
            <div class="algox-stakex-asset-name">${
              metaName || "ASA " + a.assetId
            }</div>
            <div class="algox-stakex-asset-amount">Amount: ${a.amount}</div>
          </div>
        </div>`
        )
        .join("");

      if (list) list.innerHTML = itemsHtml;

      // Selection handler
      document.querySelectorAll(".algox-asset-item").forEach((el) => {
        el.addEventListener("click", () => {
          document
            .querySelectorAll(".algox-asset-item")
            .forEach((e2) => e2.classList.remove("selected"));
          el.classList.add("selected");
        });
      });
    } catch (e) {
      const list = document.getElementById("algox-stakex-asset-list");
      if (list)
        list.innerHTML = `<div class="algox-stakex-asset-error">${
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

    const id = "algox-toast";
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

    const overlay = document.getElementById("algox-loading-overlay");
    const msg = document.getElementById("algox-processing-message");

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

    const overlay = document.getElementById("algox-loading-overlay");
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
   * Setup theme listener
   */
  setupThemeListener() {
    if (this.#disableUi) {
      return;
    }

    // Listen for system theme changes
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        // Only update if user hasn't manually set a theme
        const savedState = localStorage.getItem("asx");
        if (savedState) {
          try {
            const parsedState = JSON.parse(savedState);
            if (!parsedState.theme) {
              // If theme wasn't manually set
              this.#sdk.theme = e.matches ? "dark" : "light";
              this.saveUIState(this.#sdk.isMinimized, this.#sdk.theme);
              this.applyTheme();
            }
          } catch (error) {
            console.error("Failed to parse saved state:", error);
          }
        }
      });
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

    const container = document.getElementById("algox-sdk-container");
    const minimizedBtn = document.getElementById("algox-minimized-btn");

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

    const container = document.getElementById("algox-sdk-container");
    const minimizedBtn = document.getElementById("algox-minimized-btn");

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

    const container = document.getElementById("algox-sdk-container");
    const minimizedBtn = document.getElementById("algox-minimized-btn");

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

  /**
   * Show temporary wallet connection UI (for headless mode)
   */
  async showTemporaryWalletConnectionUI(walletType, onCancel) {
    // Create a temporary overlay for wallet connection
    const overlay = document.createElement("div");
    overlay.id = "algox-temp-wallet-overlay";

    const container = document.createElement("div");
    container.className = "temp-wallet-container";

    const title = document.createElement("h2");
    title.className = "temp-wallet-title";
    title.textContent = "Connect Wallet";

    const message = document.createElement("p");
    message.className = "temp-wallet-message";
    message.textContent = `Please open your ${walletType} wallet to complete the connection.`;

    const spinner = document.createElement("div");
    spinner.className = "temp-wallet-spinner";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "temp-wallet-cancel-btn";
    cancelBtn.textContent = "Cancel";

    cancelBtn.onclick = async () => {
      onCancel();
      this.hideTemporaryWalletConnectionUI();
    };

    container.appendChild(title);
    container.appendChild(message);
    container.appendChild(spinner);
    container.appendChild(cancelBtn);
    overlay.appendChild(container);
    document.body.appendChild(overlay);

    // Store reference to overlay for later removal
    this.tempWalletOverlay = overlay;

    // Add a safety timeout to auto-hide the UI after 5 minutes
    setTimeout(() => {
      if (this.tempWalletOverlay) {
        this.hideTemporaryWalletConnectionUI();
        eventBus.emit("wallet:connection:timeout", { walletType });
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Hide temporary wallet connection UI
   */
  hideTemporaryWalletConnectionUI() {
    if (this.tempWalletOverlay) {
      this.tempWalletOverlay.remove();
      this.tempWalletOverlay = null;
    }
  }

  // ==========================================
  // SDK-SPECIFIC METHODS (ALGOSTAKEX)
  // ==========================================
  // renderWalletAssets method is defined above in the common section
}
