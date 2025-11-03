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

async function createFTAndDispense(toAddress, amountToSend) {
  setProcessing(true);
  setStatus("Connecting dispenser...");
  const treasury = algosdk.mnemonicToSecretKey(TREASURY_MNEMONIC);
  const creatorAddr = treasury.addr;

  setStatus("Fetching suggested params...");
  const params = await algodClient.getTransactionParams().do();

  // Normalize and validate requested amount (base units)
  const integerRequest = Number.parseInt(String(amountToSend), 10);
  if (!Number.isFinite(integerRequest) || integerRequest <= 0) {
    throw new Error("Invalid amount: must be a positive integer (base units)");
  }

  // Create a new FT (ASA) with enough total supply (fixed supply for demo)
  const unitName = "TKN";
  const assetName = "Test Token";
  const decimals = 6;
  const total = integerRequest; // 1,000,000.000000 units

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

  // Attempt to transfer requested amount
  const microAmount = integerRequest;
  if (microAmount > total) {
    throw new Error("Requested amount exceeds dispenser asset supply");
  }
  const transferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject(
    {
      sender: creatorAddr,
      receiver: toAddress,
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
  const amountInput = document.getElementById("amount");

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
      setStatus("Preparing...");
      const addr = getConnectedAccount();
      if (!addr) {
        alert("Please connect your wallet first.");
        setStatus("Idle");
        return;
      }
      const raw = Number(amountInput.value || 0);
      if (!raw || raw <= 0) {
        alert("Enter a valid amount (in base units, e.g., micro tokens)");
        setStatus("Idle");
        return;
      }
      await createFTAndDispense(addr, raw);
    } catch (e) {
      console.error(e);
      setStatus(`Error: ${e.message || e}`);
      alert(
        "Transfer failed. Ensure your wallet opted-in to the newly created asset before transfer."
      );
      setProcessing(false);
    }
  });
});

function setProcessing(isProcessing) {
  processing = !!isProcessing;
  const buttons = document.querySelectorAll("button");
  buttons.forEach((b) => (b.disabled = processing));
}
