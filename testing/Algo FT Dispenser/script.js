// Algo FT Dispenser logic
// References for ASA creation & transaction flow (patterns mirrored):
// - https://github.com/algorand/js-algorand-sdk/blob/main/examples/asa.ts
// - https://github.com/algorand/js-algorand-sdk/blob/main/examples/utils.ts

const NETWORK = "testnet"; // or "mainnet"
const ALGOD_TOKEN =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const ALGOD_SERVER =
  NETWORK === "mainnet"
    ? "https://mainnet-api.algonode.cloud"
    : "https://testnet-api.algonode.cloud";
const ALGOD_PORT = 443;

// Hardcoded treasury mnemonic (DISPENSER) — replace with your testing mnemonic
// IMPORTANT: Do NOT use a real mnemonic here in production.
const TREASURY_MNEMONIC = "";

let algodClient;
let processing = false;

// Add input validation event listeners
document.addEventListener("DOMContentLoaded", () => {
  // Unit name: enforce uppercase and 3 char limit
  const unitNameInput = document.getElementById("unitName");
  if (unitNameInput) {
    unitNameInput.addEventListener("input", (e) => {
      e.target.value = e.target.value.toUpperCase().slice(0, 3);
    });
  }

  // Decimals: enforce 0-18 range
  const decimalsInput = document.getElementById("decimals");
  if (decimalsInput) {
    decimalsInput.addEventListener("input", (e) => {
      let value = parseInt(e.target.value, 10);
      if (value < 0) e.target.value = 0;
      if (value > 18) e.target.value = 18;
    });
  }

  // Total: prevent negative values
  const totalInput = document.getElementById("total");
  if (totalInput) {
    totalInput.addEventListener("input", (e) => {
      if (parseInt(e.target.value, 10) < 0) e.target.value = 1;
    });
  }
});

function setStatus(text) {
  const el = document.getElementById("status");
  if (el) el.textContent = `Status: ${text}`;
}

function setAssetInfo(text) {
  const el = document.getElementById("assetInfo");
  if (el) el.textContent = text;
}

function setConnected(addr) {
  const el = document.getElementById("connectedWallet");
  if (el) el.textContent = addr ? `Connected: ${addr}` : "";
  const btn = document.getElementById("connectWalletBtn");
  if (btn) btn.style.display = addr ? "none" : "inline-block";
}

async function ensureSdk() {
  if (!window.algoStakeXClient) {
    // Initialize a minimal SDK instance if not present
    // You can remove this if SDK is already bootstrapped globally elsewhere
    window.algoStakeXClient = new window.AlgoStakeX({
      env: NETWORK,
      namespace: "STAKX",
      token_id: 749059499,
      enable_ui: true,
      disableToast: false,
      minimizeUILocation: "right",
      logo: null,
      staking: { type: "FLEXIBLE", reward: { type: "APY", value: 5 } },
    });
    // enable sdk
    window.algoStakeXClient.addTreasuryWallet(
      "YUF5JD4S6T764QQMHYUKZYN2BEWFZMHPPIHHSRXHW64TI3IQHEDVBIUUHQ",
      TREASURY_MNEMONIC
    );
  }
}

async function connectWalletUI() {
  await ensureSdk();
  if (window.algoStakeXClient && window.algoStakeXClient.maximizeSDK) {
    window.algoStakeXClient.maximizeSDK();
  } else {
    alert("SDK not ready. Please refresh after building the SDK.");
  }
}

function getConnectedAccount() {
  return window.algoStakeXClient && window.algoStakeXClient.account
    ? window.algoStakeXClient.account
    : null;
}

async function waitForConfirmation(algod, txId) {
  const status = await algod.status().do();
  let lastRound =
    Number(status["last-round"]) || Number(status["lastRound"]) || 0;
  let attempts = 0;
  const maxAttempts = 100; // ~100 rounds safety
  // Poll until the transaction is confirmed or rejected
  while (attempts < maxAttempts) {
    const pendingInfo = await algod.pendingTransactionInformation(txId).do();
    if (
      pendingInfo &&
      pendingInfo["confirmed-round"] &&
      pendingInfo["confirmed-round"] > 0
    ) {
      return pendingInfo;
    }
    lastRound = Number(lastRound) + 1;
    await algod.statusAfterBlock(lastRound).do();
    attempts += 1;
  }
  throw new Error("Transaction confirmation timeout");
}

/**
 * Create a new FT (ASA) and transfer it to the user
 */
async function createFTAndDispense(recipientAddr) {
  if (!algodClient) {
    throw new Error("Algod client not initialized");
  }
  if (!TREASURY_MNEMONIC) {
    throw new Error("Treasury mnemonic not set");
  }

  const treasury = algosdk.mnemonicToSecretKey(TREASURY_MNEMONIC);
  const creatorAddr = treasury.addr;

  setStatus("Fetching suggested params...");
  const params = await algodClient.getTransactionParams().do();

  // Get FT configuration from form inputs
  const unitNameInput = document
    .getElementById("unitName")
    .value.trim()
    .toUpperCase();
  const assetNameInput = document.getElementById("assetName").value.trim();
  const decimalsInput = Number.parseInt(
    document.getElementById("decimals").value,
    10
  );
  const totalInput = Number.parseInt(
    document.getElementById("total").value,
    10
  );

  // Validate inputs
  if (!unitNameInput || unitNameInput.length > 3) {
    throw new Error("Unit name must be 1-3 characters");
  }
  if (!assetNameInput || assetNameInput.length > 50) {
    throw new Error("Asset name must be 1-50 characters");
  }
  if (
    !Number.isFinite(decimalsInput) ||
    decimalsInput < 0 ||
    decimalsInput > 18
  ) {
    throw new Error("Decimals must be between 0 and 18");
  }
  if (!Number.isFinite(totalInput) || totalInput <= 0) {
    throw new Error("Total supply must be a positive number");
  }

  // Create a new FT (ASA) with user-specified configuration
  const unitName = unitNameInput;
  const assetName = assetNameInput;
  const decimals = decimalsInput;
  const total = totalInput;

  const createTxn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
    sender: creatorAddr,
    total,
    decimals,
    defaultFrozen: false,
    unitName,
    assetName,
    manager: creatorAddr,
    reserve: undefined,
    freeze: undefined,
    clawback: undefined,
    suggestedParams: params,
  });

  setStatus("Creating FT...");
  const createTxId = createTxn.txID();
  const signedCreate = createTxn.signTxn(treasury.sk);
  await algodClient.sendRawTransaction([signedCreate]).do();
  setStatus("Waiting for FT confirmation...");
  const createResult = await algosdk.waitForConfirmation(
    algodClient,
    createTxId,
    10
  );
  let assetId =
    createResult && (createResult["asset-index"] ?? createResult["assetIndex"]);
  if (assetId == null) {
    const pending = await algodClient
      .pendingTransactionInformation(createTxId)
      .do();
    assetId = pending && (pending["asset-index"] ?? pending["assetIndex"]);
  }
  assetId = Number(assetId);
  if (!Number.isFinite(assetId) || assetId <= 0) {
    throw new Error("Failed to determine created Asset ID");
  }
  setAssetInfo(`Created FT Asset ID: ${assetId}`);

  // Ensure receiver is opted-in (ask connected wallet to sign opt-in via SDK)
  setStatus("Opting-in receiver...");
  try {
    if (window.algoStakeXClient && window.algoStakeXClient.optInAsset) {
      await window.algoStakeXClient.optInAsset(assetId);
    } else {
      throw new Error("SDK opt-in method not available");
    }
  } catch (e) {
    // If already opted-in, continue; otherwise rethrow
    console.warn("Opt-in error (may already be opted-in):", e?.message || e);
  }

  // Transfer the entire total supply to the recipient
  const microAmount = total;
  const transferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject(
    {
      sender: creatorAddr,
      receiver: recipientAddr,
      amount: microAmount,
      assetIndex: assetId,
      suggestedParams: params,
    }
  );

  setStatus("Transferring tokens...");
  const transferTxId = transferTxn.txID();
  const signedTransfer = transferTxn.signTxn(treasury.sk);
  await algodClient.sendRawTransaction([signedTransfer]).do();
  setStatus("Waiting for transfer confirmation...");
  await algosdk.waitForConfirmation(algodClient, transferTxId, 10);
  setStatus("Dispense complete");
  setProcessing(false);
}

document.addEventListener("DOMContentLoaded", async () => {
  // Init clients
  algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);

  // Prevent refresh/close while processing
  window.addEventListener("beforeunload", (e) => {
    if (processing) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  // Hook up UI
  const connectBtn = document.getElementById("connectWalletBtn");
  const dispenseBtn = document.getElementById("getTokensBtn");

  // Update connected wallet display on events
  await ensureSdk();
  if (window.algoStakeXClient && window.algoStakeXClient.events) {
    window.algoStakeXClient.events.on("wallet:connected", ({ address }) => {
      setConnected(address);
    });
    window.algoStakeXClient.events.on("wallet:disconnected", () => {
      setConnected("");
    });
    // If already connected when page loads
    if (getConnectedAccount()) setConnected(getConnectedAccount());
  }

  connectBtn.addEventListener("click", async () => {
    connectWalletUI();
  });

  dispenseBtn.addEventListener("click", async () => {
    try {
      if (processing) return;

      // Disable button and show processing state
      dispenseBtn.disabled = true;
      dispenseBtn.textContent = "Processing...";

      setStatus("Preparing...");
      const addr = getConnectedAccount();
      if (!addr) {
        alert("Please connect your wallet first.");
        setStatus("Idle");
        dispenseBtn.disabled = false;
        dispenseBtn.textContent = "Create & Dispense FT";
        return;
      }
      await createFTAndDispense(addr);

      // Re-enable button after success
      dispenseBtn.disabled = false;
      dispenseBtn.textContent = "Create & Dispense FT";
    } catch (e) {
      console.error(e);
      setStatus(`Error: ${e.message || e}`);
      alert(
        "Transfer failed. Ensure your wallet opted-in to the newly created asset before transfer."
      );
      setProcessing(false);

      // Re-enable button after error
      dispenseBtn.disabled = false;
      dispenseBtn.textContent = "Create & Dispense FT";
    }
  });
});

function setProcessing(isProcessing) {
  processing = !!isProcessing;
  const buttons = document.querySelectorAll("button");
  buttons.forEach((b) => (b.disabled = processing));
}
