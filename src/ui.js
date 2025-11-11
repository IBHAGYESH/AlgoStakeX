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
        <div class="algox-tabs-container">
          <button class="algox-tab-nav-btn" id="algox-tab-prev" title="Previous tabs">‹</button>
          <div class="algox-tabs-wrapper">
            <div class="algox-tabs-track">
              <button class="algox-tab-btn active" data-tab="stake">Stake</button>
              <button class="algox-tab-btn" data-tab="mystakes">My Staking</button>
            </div>
          </div>
          <button class="algox-tab-nav-btn" id="algox-tab-next" title="Next tabs">›</button>
        </div>
        <div class="algox-tab-content">
          <div id="algox-stakex-stake-tab" class="algox-tab-pane active">
            <div id="algox-stakex-asset-list" class="algox-stakex-asset-list"></div>
            <div class="algox-stakex-row">
              <input type="number" id="algox-stakex-amount-input" placeholder="Amount" disabled />
              <button id="algox-stakex-stake-btn" disabled>Stake</button>
            </div>
          </div>
          <div id="algox-stakex-mystakes-tab" class="algox-tab-pane">
            <div id="algox-stakex-mystake-summary"></div>
            <div class="algox-stakex-row">
              <button id="algox-stakex-withdraw-btn" disabled>Withdraw</button>
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
        }" alt="ASX" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" /><span style="display: none;">ASX</span>`
      : "ASX";

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

    // Initialize tab system
    this.#initTabSystem(callbacks);

    // Stake actions
    document
      .getElementById("algox-stakex-stake-btn")
      ?.addEventListener("click", async () => callbacks.onStake());

    document
      .getElementById("algox-stakex-withdraw-btn")
      ?.addEventListener("click", async () => callbacks.onWithdraw());

    // Maximized button
    document
      .getElementById("algox-minimized-btn")
      .addEventListener("click", () => callbacks.onMaximize());

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
   * Initialize common tab system with navigation
   */
  #initTabSystem(callbacks) {
    const container = document.getElementById("algox-sdk-container");
    const tabsTrack = container?.querySelector(".algox-tabs-track");
    const tabButtons = container?.querySelectorAll(".algox-tab-btn");
    const prevBtn = container?.querySelector("#algox-tab-prev");
    const nextBtn = container?.querySelector("#algox-tab-next");

    if (!tabsTrack || !tabButtons || tabButtons.length === 0) return;

    let currentOffset = 0;
    const totalTabs = tabButtons.length;
    const visibleTabs = 2;

    // Hide navigation buttons if only 2 or fewer tabs
    if (totalTabs <= visibleTabs) {
      if (prevBtn) prevBtn.style.display = "none";
      if (nextBtn) nextBtn.style.display = "none";
    }

    // Update navigation button states
    const updateNavButtons = () => {
      if (!prevBtn || !nextBtn || totalTabs <= visibleTabs) return;

      prevBtn.disabled = currentOffset === 0;
      nextBtn.disabled = currentOffset >= totalTabs - visibleTabs;
    };

    // Navigate tabs
    const navigateTabs = (direction) => {
      if (direction === "prev" && currentOffset > 0) {
        currentOffset--;
      } else if (
        direction === "next" &&
        currentOffset < totalTabs - visibleTabs
      ) {
        currentOffset++;
      }

      const offset = currentOffset * -50; // Each tab is 50% width
      tabsTrack.style.transform = `translateX(${offset}%)`;
      updateNavButtons();
    };

    // Tab click handlers
    tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.getAttribute("data-tab");

        // Update active tab styling
        tabButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        // Update tab panes
        const tabPanes = container.querySelectorAll(".algox-tab-pane");
        tabPanes.forEach((pane) => pane.classList.remove("active"));

        const targetPane = container.querySelector(`#algox-stakex-${tab}-tab`);
        if (targetPane) targetPane.classList.add("active");

        // Call SDK-specific callbacks
        if (tab === "stake") {
          callbacks.onRenderAssets();
        } else if (tab === "mystakes") {
          callbacks.onRenderMyStaking();
        }
      });
    });

    // Navigation button handlers
    prevBtn?.addEventListener("click", () => navigateTabs("prev"));
    nextBtn?.addEventListener("click", () => navigateTabs("next"));

    // Initialize navigation state
    updateNavButtons();
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
        // Disable stake button and input
        const stakeBtn = document.getElementById("algox-stakex-stake-btn");
        const amountInput = document.getElementById(
          "algox-stakex-amount-input"
        );
        if (stakeBtn) stakeBtn.disabled = true;
        if (amountInput) amountInput.disabled = true;
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
            '<div class="algox-stakex-asset-empty">No assets available for staking</div>';
        // Disable stake button and input
        const stakeBtn = document.getElementById("algox-stakex-stake-btn");
        const amountInput = document.getElementById(
          "algox-stakex-amount-input"
        );
        if (stakeBtn) stakeBtn.disabled = true;
        if (amountInput) amountInput.disabled = true;
        return;
      }

      // Fetch metadata for display and decimals
      let metaName = "";
      let decimals = 0;
      try {
        const meta = await getMetadata(targetId);
        metaName = meta?.name || "";
        decimals = meta?.decimals || 0;
      } catch {}

      const itemsHtml = filtered
        .map((a) => {
          // Convert amount to human-readable format using decimals
          const displayAmount = (a.amount / Math.pow(10, decimals)).toFixed(
            decimals
          );
          return `
        <div class="algox-stakex-asset-item" data-asset-id="${
          a.assetId
        }" data-amount="${a.amount}" data-decimals="${decimals}">
          <div class="algox-stakex-asset-row">
            <div class="algox-stakex-asset-name">${
              metaName || "ASA " + a.assetId
            }</div>
            <div class="algox-stakex-asset-amount">Amount: ${displayAmount}</div>
          </div>
        </div>`;
        })
        .join("");

      if (list) list.innerHTML = itemsHtml;

      // Selection handler
      document.querySelectorAll(".algox-stakex-asset-item").forEach((el) => {
        el.addEventListener("click", () => {
          const wasSelected = el.classList.contains("selected");
          const stakeBtn = document.getElementById("algox-stakex-stake-btn");
          const amountInput = document.getElementById(
            "algox-stakex-amount-input"
          );

          // Deselect all
          document
            .querySelectorAll(".algox-stakex-asset-item")
            .forEach((e2) => e2.classList.remove("selected"));

          // If clicking the same item, deselect it
          if (wasSelected) {
            if (amountInput) {
              amountInput.value = "";
              amountInput.disabled = true;
            }
            if (stakeBtn) stakeBtn.disabled = true;
          } else {
            // Select the new item
            el.classList.add("selected");

            if (amountInput) {
              amountInput.disabled = false;
              amountInput.value = "";
              amountInput.placeholder = "Enter amount";
              // Prevent negative values
              amountInput.min = "0";
              amountInput.step = "any";
            }
            if (stakeBtn) stakeBtn.disabled = false;
          }
        });
      });
    } catch (e) {
      const list = document.getElementById("algox-stakex-asset-list");
      if (list)
        list.innerHTML = `<div class="algox-stakex-asset-error">${
          e.message || "Failed to load assets"
        }</div>`;
      // Disable stake button and input
      const stakeBtn = document.getElementById("algox-stakex-stake-btn");
      const amountInput = document.getElementById("algox-stakex-amount-input");
      if (stakeBtn) stakeBtn.disabled = true;
      if (amountInput) amountInput.disabled = true;
    }
  }

  /**
   * Reset staking tab UI
   */
  resetStakingTab() {
    // Clear selected asset with a slight delay to ensure DOM is ready
    setTimeout(() => {
      document.querySelectorAll(".algox-stakex-asset-item").forEach((el) => {
        el.classList.remove("selected");
      });

      // Clear and disable amount input
      const amountInput = document.getElementById("algox-stakex-amount-input");
      if (amountInput) {
        amountInput.value = "";
        amountInput.disabled = true;
        amountInput.placeholder = "Amount";
      }

      // Disable stake button
      const stakeBtn = document.getElementById("algox-stakex-stake-btn");
      if (stakeBtn) {
        stakeBtn.disabled = true;
      }
    }, 100);
  }

  /**
   * Reset My Staking tab UI
   */
  resetMyStakingTab() {
    const summary = document.getElementById("algox-stakex-mystake-summary");
    if (summary) {
      summary.innerHTML =
        '<div class="algox-stakex-mystake-empty">You currently don\'t have any staking</div>';
    }

    // Disable withdraw button
    const withdrawBtn = document.getElementById("algox-stakex-withdraw-btn");
    if (withdrawBtn) {
      withdrawBtn.disabled = true;
      withdrawBtn.className = "algox-stakex-withdraw-btn";
      withdrawBtn.textContent = "Withdraw";
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
      "axs",
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

  /**
   * Render My Staking tab with detailed staking info
   */
  async renderMyStaking(
    walletConnected,
    account,
    getStakingStatus,
    poolId,
    getMetadata,
    stakingConfig
  ) {
    try {
      const summary = document.getElementById("algox-stakex-mystake-summary");
      const withdrawBtn = document.getElementById("algox-stakex-withdraw-btn");

      if (!walletConnected || !account) {
        if (summary)
          summary.innerHTML =
            '<div class="algox-stakex-mystake-empty">Connect wallet to view staking info</div>';
        if (withdrawBtn) withdrawBtn.disabled = true;
        return;
      }

      if (summary)
        summary.innerHTML =
          '<div class="algox-stakex-mystake-loading">Loading staking info...</div>';

      const status = await getStakingStatus(poolId);

      if (!status.exists || !status.stakeData) {
        if (summary)
          summary.innerHTML =
            '<div class="algox-stakex-mystake-empty">You currently don\'t have any staking</div>';
        if (withdrawBtn) withdrawBtn.disabled = true;
        return;
      }

      const data = status.stakeData;

      // Fetch asset metadata to get decimals
      let decimals = 0;
      try {
        const meta = await getMetadata(data.tokenId);
        decimals = meta?.decimals || 0;
      } catch {}
      const currentTime = Math.floor(Date.now() / 1000);
      const isLockExpired = currentTime >= data.lockEndTime;
      const remainingSeconds = Math.max(0, data.lockEndTime - currentTime);
      const remainingDays = Math.floor(remainingSeconds / 86400);
      const remainingHours = Math.floor((remainingSeconds % 86400) / 3600);
      const remainingMinutes = Math.floor((remainingSeconds % 3600) / 60);

      // Calculate current generated reward (simple APY calculation)
      let currentReward = 0;
      if (data.rewardType === "APY" && data.rewardRate > 0) {
        let stakeDuration = currentTime - data.stakedAt;

        // If stop_reward_on_stake_completion is true, cap duration at stake_period
        const stopRewardOnCompletion =
          stakingConfig.reward.stop_reward_on_stake_completion;
        const stakePeriodSeconds = stakingConfig.stake_period * 60; // convert minutes to seconds
        if (stopRewardOnCompletion && stakeDuration > stakePeriodSeconds) {
          stakeDuration = stakePeriodSeconds; // Cap rewards at stake period
        }

        const yearInSeconds = 365 * 24 * 60 * 60;
        // rewardRate is in basis points (10000 = 100%)
        currentReward = Math.floor(
          (data.amount * data.rewardRate * stakeDuration) /
            (yearInSeconds * 10000)
        );
      }

      // Convert Unix timestamps (seconds) to JavaScript Date objects
      const stakingDate = new Date(data.stakedAt * 1000).toLocaleString();
      const lockEndDate = new Date(data.lockEndTime * 1000).toLocaleString();
      const lockPeriodDays = Math.floor(data.lockPeriod / 86400);
      const lockPeriodHours = Math.floor((data.lockPeriod % 86400) / 3600);
      const lockPeriodMinutes = Math.floor((data.lockPeriod % 3600) / 60);

      // Calculate total amount (principal + profit) when completed
      const totalAmount = data.amount + currentReward;

      // Calculate current withdraw amount (with penalty if applicable)
      let currentWithdrawAmount = data.amount + currentReward;
      let penaltyAmount = 0;
      let hasPenalty = false;
      let actualPenaltyPercent = 0;

      // For flexible staking or if lock is expired, no penalty
      if (data.isFlexible || isLockExpired) {
        hasPenalty = false;
        // Lock expired or flexible: get principal + rewards
        currentWithdrawAmount = data.amount + currentReward;
      } else {
        // For locked staking before expiry, apply progressive penalty
        hasPenalty = true;
        const configuredPenalty = stakingConfig?.withdraw_penalty || 5;

        // Calculate progressive penalty for FIXED staking (same logic as SDK)
        actualPenaltyPercent = configuredPenalty;
        if (stakingConfig.type === "FIXED") {
          const timeElapsed = currentTime - data.stakedAt;
          const stakePeriodSeconds = stakingConfig.stake_period * 60;
          const completionPercentage = Math.min(
            100,
            (timeElapsed / stakePeriodSeconds) * 100
          );

          // Progressive penalty: reduces linearly with time
          actualPenaltyPercent = Math.floor(
            configuredPenalty * (1 - completionPercentage / 100)
          );
        }

        // Convert penalty percentage to basis points and calculate penalty amount
        // Contract uses basis points (10000 = 100%), so: 2% = 200 basis points
        const penaltyBasisPoints = actualPenaltyPercent * 100;
        penaltyAmount = Math.floor((data.amount * penaltyBasisPoints) / 10000);

        // Emergency withdraw: NO REWARDS, only principal minus penalty
        currentWithdrawAmount = data.amount - penaltyAmount;
      }

      // Determine tier information if tiered rewards (compare using token units)
      let tierInfo = null;
      if (stakingConfig.reward.isTiered) {
        const tiers = stakingConfig.reward.value;
        let selectedTier = null;
        let selectedIndex = -1;

        // Convert current staked amount to token units using decimals
        const currentAmountTokens = data.amount / Math.pow(10, decimals);

        for (let i = 0; i < tiers.length; i++) {
          if (currentAmountTokens >= tiers[i].stake_amount) {
            selectedTier = tiers[i];
            selectedIndex = i;
          } else {
            break;
          }
        }

        if (selectedTier) {
          const next = tiers[selectedIndex + 1] || null;
          const amountNeeded = next
            ? Math.max(0, next.stake_amount - currentAmountTokens)
            : 0;
          tierInfo = {
            name: selectedTier.name,
            index: selectedIndex,
            nextTier: next,
            amountNeeded,
          };
        } else {
          // Not meeting the first tier yet; show progress to the first tier
          const next = tiers[0];
          const amountNeeded = Math.max(
            0,
            next.stake_amount - currentAmountTokens
          );
          tierInfo = {
            name: "No tier",
            index: -1,
            nextTier: next,
            amountNeeded,
          };
        }
      }

      // Convert amounts to human-readable format using decimals
      const displayAmount = (data.amount / Math.pow(10, decimals)).toFixed(
        decimals
      );
      const displayCurrentReward = (
        currentReward / Math.pow(10, decimals)
      ).toFixed(decimals);
      const displayTotalAmount = (totalAmount / Math.pow(10, decimals)).toFixed(
        decimals
      );
      const displayCurrentWithdrawAmount = (
        currentWithdrawAmount / Math.pow(10, decimals)
      ).toFixed(decimals);
      const displayPenaltyAmount = (
        penaltyAmount / Math.pow(10, decimals)
      ).toFixed(decimals);

      const infoHtml = `
        <div class="algox-stakex-mystake-info">
          <div class="algox-stakex-mystake-item">
            <span class="algox-stakex-mystake-label">Token ID</span>
            <span class="algox-stakex-mystake-value">${data.tokenId}</span>
          </div>
          <div class="algox-stakex-mystake-item">
            <span class="algox-stakex-mystake-label">Staking Type</span>
            <span class="algox-stakex-mystake-value">${
              data.isFlexible ? "🔓 Flexible" : "🔒 Locked"
            }</span>
          </div>
          <div class="algox-stakex-mystake-item">
            <span class="algox-stakex-mystake-label">Staking Amount</span>
            <span class="algox-stakex-mystake-value">${displayAmount}</span>
          </div>
          <div class="algox-stakex-mystake-item">
            <span class="algox-stakex-mystake-label">Lock Period</span>
            <span class="algox-stakex-mystake-value">${lockPeriodDays}d ${lockPeriodHours}h ${lockPeriodMinutes}m</span>
          </div>
          <div class="algox-stakex-mystake-item">
            <span class="algox-stakex-mystake-label">Staked At</span>
            <span class="algox-stakex-mystake-value">${stakingDate}</span>
          </div>
          <div class="algox-stakex-mystake-item">
            <span class="algox-stakex-mystake-label">Lock End Time</span>
            <span class="algox-stakex-mystake-value">${lockEndDate}</span>
          </div>
          <div class="algox-stakex-mystake-item full-width">
            <span class="algox-stakex-mystake-label">Remaining Period</span>
            <span class="algox-stakex-mystake-value ${
              isLockExpired ? "algox-stakex-mystake-completed" : ""
            }">${
        isLockExpired
          ? "✓ Completed"
          : `⏳ ${remainingDays}d ${remainingHours}h ${remainingMinutes}m`
      }</span>
          </div>
          <div class="algox-stakex-mystake-item">
            <span class="algox-stakex-mystake-label">Reward Type</span>
            <span class="algox-stakex-mystake-value">${data.rewardType}</span>
          </div>
          ${
            data.rewardType === "APY"
              ? `
          <div class="algox-stakex-mystake-item">
            <span class="algox-stakex-mystake-label">Reward Rate</span>
            <span class="algox-stakex-mystake-value">${(
              data.rewardRate / 100
            ).toFixed(2)}%</span>
          </div>
          `
              : ""
          }
          ${
            data.rewardType === "UTILITY" && data.utility
              ? `
          <div class="algox-stakex-mystake-item">
            <span class="algox-stakex-mystake-label">Utility Value</span>
            <span class="algox-stakex-mystake-value">${data.utility}</span>
          </div>
          `
              : ""
          }
          ${
            stakingConfig.reward.isTiered && tierInfo
              ? `
          <div class="algox-stakex-mystake-item">
            <span class="algox-stakex-mystake-label">🏆 Current Tier</span>
            <span class="algox-stakex-mystake-value algox-stakex-mystake-tier">${
              tierInfo.name
            }</span>
          </div>
          ${
            tierInfo.nextTier
              ? `
          <div class="algox-stakex-mystake-item">
            <span class="algox-stakex-mystake-label">📈 Next Tier</span>
            <span class="algox-stakex-mystake-value">
              ${tierInfo.nextTier.name} (need ${tierInfo.amountNeeded.toFixed(
                  decimals
                )} more)
            </span>
          </div>
          `
              : `
          <div class="algox-stakex-mystake-item">
            <span class="algox-stakex-mystake-label">✨ Status</span>
            <span class="algox-stakex-mystake-value algox-stakex-mystake-completed">Highest Tier Achieved!</span>
          </div>
          `
          }
          `
              : ""
          }
          <div class="algox-stakex-mystake-item">
            <span class="algox-stakex-mystake-label">Current Reward</span>
            <span class="algox-stakex-mystake-value algox-stakex-mystake-reward">${
              data.rewardType === "APY"
                ? `💰 ${displayCurrentReward}`
                : `<span style="color: #888; font-style: italic;">Not Applicable</span>`
            }</span>
          </div>
          <div class="algox-stakex-mystake-item">
            <span class="algox-stakex-mystake-label">${
              hasPenalty
                ? `⚠️ Penalty (${actualPenaltyPercent}%${
                    stakingConfig.type === "FIXED" ? " - Progressive" : ""
                  })`
                : "Penalty Amount"
            }</span>
            <span class="algox-stakex-mystake-value ${
              hasPenalty ? "algox-stakex-mystake-penalty-amount" : ""
            }">${
        hasPenalty ? `-${displayPenaltyAmount}` : (0).toFixed(decimals)
      }</span>
          </div>
          <div class="algox-stakex-mystake-item full-width">
            <span class="algox-stakex-mystake-label">💵 Current Withdraw Amount</span>
            <span class="algox-stakex-mystake-value algox-stakex-mystake-withdraw ${
              hasPenalty ? "algox-stakex-mystake-penalty" : ""
            }">${displayCurrentWithdrawAmount}</span>
          </div>
        </div>
      `;

      if (summary) summary.innerHTML = infoHtml;

      // Update withdraw button based on staking type and lock status
      if (withdrawBtn) {
        withdrawBtn.disabled = false;

        // For flexible staking, always show regular withdraw
        if (data.isFlexible) {
          withdrawBtn.textContent = "Withdraw";
          withdrawBtn.className = "algox-stakex-withdraw-btn-ready";
        }
        // For locked staking, show based on lock expiry
        else {
          if (isLockExpired) {
            withdrawBtn.textContent = "Withdraw";
            withdrawBtn.className = "algox-stakex-withdraw-btn-ready";
          } else {
            withdrawBtn.textContent = "Emergency Withdraw";
            withdrawBtn.className = "algox-stakex-withdraw-btn-emergency";
          }
        }
      }
    } catch (e) {
      const summary = document.getElementById("algox-stakex-mystake-summary");
      if (summary)
        summary.innerHTML = `<div class="algox-stakex-mystake-error">${
          e.message || "Failed to load staking info"
        }</div>`;
      const withdrawBtn = document.getElementById("algox-stakex-withdraw-btn");
      if (withdrawBtn) withdrawBtn.disabled = true;
    }
  }
}
