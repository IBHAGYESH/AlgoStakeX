# AlgoStakeX SDK

**Staking on Algorand shouldn't take months to build.**

AlgoStakeX is the plug-and-play SDK that brings enterprise-grade token staking to any Algorand dApp in minutes—**three lines of code, infinite use cases.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Algorand](https://img.shields.io/badge/Algorand-000000?style=flat&logo=algorand&logoColor=white)](https://algorand.com)

---

## 🎯 What is AlgoStakeX?

AlgoStakeX is an **open-source, plug-and-play staking infrastructure SDK** for the Algorand blockchain. It provides pre-audited smart contracts and a simple JavaScript/TypeScript SDK that enables developers to integrate token staking functionality into their dApps **without writing complex smart contract code**.

### 🚀 Key Innovation

- ✅ **First standardized staking SDK for Algorand**
- ⚡ **Eliminates months of development time** (from 2-3 months to minutes)
- 🎓 **No blockchain expertise required**
- 🪙 **Works with any Algorand Standard Asset (ASA/FT)**
- 💾 **Single box storage optimization** (66% cost reduction)
- 🔥 **No pool creation overhead** (dynamic staking on-demand)

---

## ✨ Features

- 🔐 **Wallet integration** (Pera Wallet, Defly Wallet & Custodial)
- 🎯 **Flexible staking models** (flexible & fixed-term)
- 💰 **Multiple reward types** (APY-based, utility-based, custom tokens)
- ⏱️ **Time-weighted reward calculations**
- 🔒 **Custom lock periods** per user
- 🎮 **Access control system** for games & platforms
- 📊 **Real-time stake info queries**
- 🚨 **Emergency withdrawal** with penalty support
- 💸 **Administrative controls** (donate tokens, update stakes)
- 📦 **Optimized box storage** (95% cost reduction vs traditional)
- ⚡ **Atomic transaction groups** (no clawback required)
- 🌐 **Framework agnostic** (React, Node.js, React Native)
- 🤖 **Headless mode support** (programmatic wallet connection for backends)
- ✅ Works on **Testnet** and **Mainnet**
- 🆓 **No backend required**—all logic runs client-side
- 👐 **Open source & actively maintained**

---

## 🚀 Quick Start

### 1. Installation

```bash
npm install algostakex
```

### 2. Initialize the SDK

```javascript
// Initialize with basic configuration
const sdk = new window.AlgoStakeX({
  env: "testnet", // testnet | mainnet
  namespace: "STAKX", // unique namespace for your project
  token_id: 749059499, // ASA token ID for staking
  enable_ui: true, // Enable built-in UI
  disableToast: false, // Show toast notifications
  toastLocation: "TOP_RIGHT", // TOP_LEFT | TOP_RIGHT
  minimizeUILocation: "right", // left | right
  logo: "./logo.png", // Your website logo (URL or path)
  staking: {
    type: "FLEXIBLE", // FLEXIBLE | FIXED
    stake_period: 1440, // Optional for FLEXIBLE (in minutes)
    withdraw_penalty: 5, // Optional for FLEXIBLE (percentage)
    reward: {
      type: "UTILITY", // APY | UTILITY
      value: "Premium Access", // For single tier
    },
  },
});
```

### 3. Unlock the SDK (Required)

**Important:** Before users can stake or withdraw, you must unlock the SDK by adding a treasury wallet. This wallet is used to fund reward distributions and prevent transaction failures during withdrawals.

```javascript
// Add treasury wallet to unlock SDK
sdk.addTreasuryWallet(
  "TREASURY_WALLET_ADDRESS", // Your treasury wallet address (58 characters)
  "your 25 word treasury mnemonic phrase here..." // Treasury wallet mnemonic
);
```

**Why is this required?**
- The treasury wallet funds reward token distributions
- Prevents withdrawal failures when users claim rewards
- Ensures smooth operation of the staking system
- Only needs to be set once per SDK instance

### 4. Use the SDK

Once unlocked, the SDK provides a built-in UI for staking operations. Users can:
- Connect their wallet (Pera, Defly)
- Stake tokens
- View their stakes
- Withdraw tokens with rewards
- Check rewards

All operations are handled through the UI automatically!

**That's it!** You now have a fully functional staking system. 🎉

---

## 🎮 Use Cases

### Gaming 🎮

```javascript
// Initialize SDK for gaming
const gameSDK = new window.AlgoStakeX({
  env: "testnet",
  namespace: "GAME1",
  token_id: 749059499,
  enable_ui: true,
  staking: {
    type: "FLEXIBLE",
    stake_period: 10080, // 7 days
    reward: {
      type: "UTILITY",
      value: "Game Access",
    },
  },
});
```

**Examples:**

- Stake-to-play mechanics
- Stake-to-unlock levels/features
- Guild systems with pooled stakes
- Play-to-earn tokenomics

### DeFi 💰

```javascript
// Initialize SDK for yield farming
const defiSDK = new window.AlgoStakeX({
  env: "testnet",
  namespace: "DEFI1",
  token_id: 749059499,
  enable_ui: true,
  staking: {
    type: "FIXED",
    stake_period: 129600, // 90 days
    reward: {
      type: "APY",
      value: 15, // 15% APY
    },
  },
});
```

**Examples:**

- Yield farming infrastructure
- Liquidity mining rewards
- Collateralized lending
- Savings accounts

### Membership & Access Control 🎫

```javascript
// Initialize SDK with membership tiers
const memberSDK = new window.AlgoStakeX({
  env: "testnet",
  namespace: "MEMBR",
  token_id: 749059499,
  enable_ui: true,
  staking: {
    type: "FLEXIBLE",
    reward: {
      type: "UTILITY",
      value: [
        { name: "Basic", stake_amount: 100, value: "Basic Access" },
        { name: "Premium", stake_amount: 500, value: "Premium Features" },
        { name: "VIP", stake_amount: 2000, value: "All Features" },
      ],
    },
  },
});
```

**Examples:**

- Premium feature access (stake X tokens = premium member)
- Subscription alternatives (stake instead of monthly payment)
- VIP tier systems
- Content creator patronage

### Governance 🗳️

```javascript
// Initialize SDK for DAO governance
const daoSDK = new window.AlgoStakeX({
  env: "testnet",
  namespace: "DAO01",
  token_id: 749059499,
  enable_ui: true,
  staking: {
    type: "FLEXIBLE",
    reward: {
      type: "UTILITY",
      value: "Voting Rights",
    },
  },
});
```

**Examples:**

- DAO voting power (1 staked token = 1 vote)
- Proposal submission requirements
- Long-term holder benefits

### NFT Utilities 🖼️

```javascript
// Initialize SDK for NFT holder benefits
const nftSDK = new window.AlgoStakeX({
  env: "testnet",
  namespace: "NFT01",
  token_id: 749059499,
  enable_ui: true,
  staking: {
    type: "FLEXIBLE",
    reward: {
      type: "UTILITY",
      value: "Exclusive NFT Drops + Holder Benefits",
    },
  },
});
```

**Examples:**

- NFT holder bonuses (stake tokens + hold NFT = rewards)
- Gated communities
- Exclusive drops access

---

## 📦 SDK API

### Initialization Options

#### Basic Configuration

```javascript
const sdk = new window.AlgoStakeX({
  env: "testnet" | "mainnet", // Required: Network environment
  namespace: string, // Required: Unique 5-character identifier
  token_id: number, // Required: ASA token ID for staking
  enable_ui: boolean, // Optional: Enable built-in UI (default: true)
  disableToast: boolean, // Optional: Disable toast notifications
  toastLocation: "TOP_LEFT" | "TOP_RIGHT", // Optional: Toast position
  minimizeUILocation: "left" | "right", // Optional: Minimize button position
  logo: string, // Optional: Your logo URL or path
  staking: {
    type: "FLEXIBLE" | "FIXED", // Required: Staking type
    stake_period: number, // Optional: For FLEXIBLE (in minutes)
    withdraw_penalty: number, // Optional: For FLEXIBLE (percentage 0-100)
    reward: {
      type: "APY" | "UTILITY", // Required: Reward type
      value: string | number | Array, // Required: Reward value (see examples below)
    },
  },
});
```

#### Reward Configuration Examples

**Single Tier Rewards:**

```javascript
// APY-based rewards
reward: {
  type: "APY",
  value: 10, // 10% APY
}

// Utility-based rewards
reward: {
  type: "UTILITY",
  value: "Premium Access, Ad-free, Feature 1",
}
```

**Multi-Tier Rewards:**

```javascript
reward: {
  type: "UTILITY", // or "APY"
  value: [
    {
      name: "Bronze", // Tier name
      stake_amount: 100, // Minimum stake required
      value: "5 / Feature 1, Feature 2", // APY or utility features
    },
    {
      name: "Silver",
      stake_amount: 1000,
      value: "10 / Feature 1, Feature 2, Feature 3",
    },
    {
      name: "Gold",
      stake_amount: 10000,
      value: "20 / Feature 1, Feature 2, Feature 3, Feature 4, Feature 5",
    },
  ],
}
```

### Built-in UI Features

The SDK provides a complete UI that handles all staking operations automatically:

- **Wallet Connection**: Connect Pera Wallet or Defly Wallet with one click
- **Stake Tokens**: User-friendly interface to stake tokens with amount input
- **View Stakes**: Display current stake amount, rewards, and lock period
- **Withdraw**: Easy withdrawal with automatic penalty calculation (if applicable)
- **Tier Display**: Shows available tiers and current user tier (for multi-tier rewards)
- **Real-time Updates**: Live updates of stake status and rewards
- **Responsive Design**: Works on desktop and mobile devices
- **Toast Notifications**: User feedback for all operations
- **Minimize/Maximize**: Collapsible UI to save screen space

### Headless Mode (Programmatic Access)

For backend applications or custom integrations, the SDK supports **headless mode** where you can disable the UI and connect wallets programmatically:

```javascript
// Initialize SDK in headless mode
const sdk = new window.AlgoStakeX({
  env: "testnet",
  namespace: "STAKX",
  token_id: 749059499,
  enable_ui: false, // Disable built-in UI
  staking: {
    type: "FLEXIBLE",
    reward: {
      type: "APY",
      value: 10,
    },
  },
});

// STEP 1: Unlock SDK with treasury wallet (Required)
sdk.addTreasuryWallet(
  "TREASURY_WALLET_ADDRESS",
  "your 25 word treasury mnemonic phrase here..."
);

// STEP 2: Connect user wallet programmatically
await sdk.connectWallet(
  "USER_WALLET_ADDRESS", // 58-character Algorand address
  "user 25 word mnemonic phrase here..." // 25-word mnemonic
);

// STEP 3: Now you can use the SDK programmatically
// All staking operations are available via SDK methods

// STEP 4: Disconnect wallet when done
await sdk.disconnectWallet();
```

**Use Cases for Headless Mode:**
- Backend services that manage staking on behalf of users
- Automated staking bots
- Server-side reward distribution systems
- Custom UI implementations
- Integration with existing wallet management systems

**Important Notes:**
- Treasury wallet must be added before any staking operations
- Treasury wallet should have sufficient ALGO for transaction fees
- Treasury wallet should hold reward tokens for distribution
- Keep treasury wallet mnemonic secure (server-side only)

---

## 🎯 Staking Models

### Flexible Staking with APY Rewards

Users can withdraw anytime with optional penalty.

```javascript
const sdk = new window.AlgoStakeX({
  env: "testnet",
  namespace: "STAKX",
  token_id: 749059499,
  enable_ui: true,
  staking: {
    type: "FLEXIBLE",
    stake_period: 1440, // 1 day in minutes
    withdraw_penalty: 5, // 5% penalty for early withdrawal
    reward: {
      type: "APY",
      value: 10, // 10% APY
    },
  },
});
```

### Fixed-Term Staking with Higher APY

Users must wait for the lock period to expire.

```javascript
const sdk = new window.AlgoStakeX({
  env: "testnet",
  namespace: "STAKX",
  token_id: 749059499,
  enable_ui: true,
  staking: {
    type: "FIXED",
    stake_period: 129600, // 90 days in minutes
    reward: {
      type: "APY",
      value: 20, // 20% APY (higher reward for longer lock)
    },
  },
});
```

### Utility-Based Staking with Tiers

Stake to unlock features based on stake amount.

```javascript
const sdk = new window.AlgoStakeX({
  env: "testnet",
  namespace: "STAKX",
  token_id: 749059499,
  enable_ui: true,
  staking: {
    type: "FLEXIBLE",
    reward: {
      type: "UTILITY",
      value: [
        {
          name: "Bronze",
          stake_amount: 100,
          value: "Basic Features",
        },
        {
          name: "Silver",
          stake_amount: 1000,
          value: "Premium Features + Ad-free",
        },
        {
          name: "Gold",
          stake_amount: 10000,
          value: "All Features + Priority Support",
        },
      ],
    },
  },
});
```

---

## 🔄 Reward Types

| Reward Type | Description                                   | Example Use Case                     | Value Format                          |
| ----------- | --------------------------------------------- | ------------------------------------ | ------------------------------------- |
| **APY**     | Percentage-based returns calculated over time | DeFi yield farming, savings accounts | Number (e.g., `10` for 10% APY)      |
| **UTILITY** | Access to features/services                   | Gaming access, premium memberships   | String or Array of tier objects      |

---

## 💡 Code Examples

### Example 1: Gaming Platform with Stake-to-Play

```javascript
// Initialize SDK for gaming platform
const stakingSDK = new window.AlgoStakeX({
  env: "mainnet",
  namespace: "GAME1",
  token_id: 987654321,
  enable_ui: true,
  logo: "./game-logo.png",
  staking: {
    type: "FLEXIBLE",
    stake_period: 10080, // 7 days in minutes
    withdraw_penalty: 10, // 10% penalty
    reward: {
      type: "UTILITY",
      value: "Game Access + Daily Rewards",
    },
  },
});

// The SDK UI will automatically handle:
// - Wallet connection
// - Staking tokens
// - Checking stake status
// - Withdrawals
```

### Example 2: DeFi Yield Farming with High APY

```javascript
// Initialize SDK for DeFi platform
const defiSDK = new window.AlgoStakeX({
  env: "mainnet",
  namespace: "DEFI1",
  token_id: 123456789,
  enable_ui: true,
  logo: "./defi-logo.png",
  staking: {
    type: "FIXED",
    stake_period: 129600, // 90 days in minutes
    reward: {
      type: "APY",
      value: 25, // 25% APY for 90-day lock
    },
  },
});

// Built-in UI shows:
// - Current APY
// - Estimated rewards
// - Lock period countdown
// - Automatic reward calculations
```

### Example 3: Membership Platform with Tiered Access

```javascript
// Initialize SDK with membership tiers
const membershipSDK = new window.AlgoStakeX({
  env: "mainnet",
  namespace: "MEMBR",
  token_id: 456789123,
  enable_ui: true,
  logo: "./membership-logo.png",
  staking: {
    type: "FLEXIBLE",
    reward: {
      type: "UTILITY",
      value: [
        {
          name: "Basic",
          stake_amount: 100,
          value: "Ad-free Experience",
        },
        {
          name: "Premium",
          stake_amount: 500,
          value: "Ad-free + Premium Content",
        },
        {
          name: "VIP",
          stake_amount: 2000,
          value: "All Features + Priority Support + Exclusive Events",
        },
      ],
    },
  },
});

// SDK UI automatically shows:
// - Available membership tiers
// - Current user tier
// - Benefits for each tier
// - Upgrade options
```

### Example 4: DAO Governance with Voting Power

```javascript
// Initialize SDK for DAO governance
const daoSDK = new window.AlgoStakeX({
  env: "mainnet",
  namespace: "DAO01",
  token_id: 789123456,
  enable_ui: true,
  logo: "./dao-logo.png",
  staking: {
    type: "FLEXIBLE",
    reward: {
      type: "UTILITY",
      value: [
        {
          name: "Member",
          stake_amount: 100,
          value: "1x Voting Power",
        },
        {
          name: "Council",
          stake_amount: 1000,
          value: "5x Voting Power + Proposal Rights",
        },
        {
          name: "Core",
          stake_amount: 10000,
          value: "10x Voting Power + Veto Rights + Treasury Access",
        },
      ],
    },
  },
});

// SDK tracks:
// - Staked amount = Voting power
// - Governance tier
// - Proposal submission rights
```

---

## 🆚 Comparison

### AlgoStakeX vs Manual Development

| Feature                  | Manual Development     | AlgoStakeX           |
| ------------------------ | ---------------------- | -------------------- |
| **Development Time**     | 2-3 months             | 10 minutes           |
| **Cost**                 | $10,000+ (dev + audit) | Free (open-source)   |
| **Blockchain Expertise** | Required               | Not required         |
| **Security**             | Custom (needs audit)   | Pre-audited          |
| **Storage Cost**         | ~0.103 ALGO/user       | ~0.006 ALGO/user     |
| **Maintenance**          | Your responsibility    | Community maintained |
| **Time to Market**       | Months                 | Minutes              |

### AlgoStakeX vs Other Staking Platforms

| Feature           | Tinyman/AlgoFi          | AlgoStakeX           |
| ----------------- | ----------------------- | -------------------- |
| **Type**          | Platform (use their UI) | SDK (build your own) |
| **Customization** | Limited                 | Full control         |
| **Integration**   | External dependency     | Native to your dApp  |
| **Branding**      | Their brand             | Your brand           |
| **Revenue**       | Shared with platform    | 100% yours           |

---

## 🔧 Advanced Configuration

### UI Customization

```javascript
// Customize SDK appearance and behavior
const sdk = new window.AlgoStakeX({
  env: "mainnet",
  namespace: "MYAPP",
  token_id: 123456789,
  enable_ui: true,
  disableToast: false, // Show notifications
  toastLocation: "TOP_RIGHT", // Toast position
  minimizeUILocation: "right", // Minimize button position
  logo: "https://myapp.com/logo.png", // Your logo
  staking: {
    type: "FLEXIBLE",
    stake_period: 43200, // 30 days in minutes
    withdraw_penalty: 10, // 10% penalty
    reward: {
      type: "APY",
      value: 12,
    },
  },
});
```

### Multiple Staking Instances

```javascript
// Create different SDK instances for different purposes
const gamingSDK = new window.AlgoStakeX({
  env: "mainnet",
  namespace: "GAME1",
  token_id: 123456789,
  staking: {
    type: "FLEXIBLE",
    reward: { type: "UTILITY", value: "Game Access" },
  },
});

const defiSDK = new window.AlgoStakeX({
  env: "mainnet",
  namespace: "DEFI1",
  token_id: 987654321,
  staking: {
    type: "FIXED",
    stake_period: 129600, // 90 days
    reward: { type: "APY", value: 20 },
  },
});
```

### Combining APY with Utility Tiers

```javascript
// Offer both APY rewards and utility benefits
const hybridSDK = new window.AlgoStakeX({
  env: "mainnet",
  namespace: "HYBRD",
  token_id: 456789123,
  enable_ui: true,
  staking: {
    type: "FLEXIBLE",
    reward: {
      type: "UTILITY",
      value: [
        {
          name: "Starter",
          stake_amount: 100,
          value: "5% APY / Basic Features",
        },
        {
          name: "Pro",
          stake_amount: 1000,
          value: "10% APY / Premium Features + Priority Support",
        },
        {
          name: "Enterprise",
          stake_amount: 10000,
          value: "15% APY / All Features + Dedicated Account Manager",
        },
      ],
    },
  },
});
```

---

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

- 🐛 **Report bugs** - Open an issue with detailed reproduction steps
- 💡 **Suggest features** - Share your ideas for new functionality
- 📝 **Improve documentation** - Help make our docs clearer
- 🔧 **Submit pull requests** - Fix bugs or add features
- ⭐ **Star the repo** - Show your support!

## 📄 License

This project is licensed under the **MIT License** - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- **Algorand Foundation** - For building an amazing blockchain platform
- **Algorand Community** - For continuous support and feedback
- **AlgoKit Team** - For excellent developer tools
- **Open Source Contributors** - For making this project better

---

## 💬 Community & Support

- 💼 **LinkedIn:** [Bhagyesh Jahangirpuria](https://in.linkedin.com/in/bhagyesh-jahangirpuria)
- 🌐 **Website:** [ibhagyesh.site](http://ibhagyesh.site)
- 💬 **Discord:** Join our community (Coming soon)

---

## ⭐ Show Your Support

If you found AlgoStakeX useful, please consider:

- ⭐ **Starring the repository**
- 🐦 **Sharing on social media**
- 📝 **Writing a blog post** about your experience
- 💬 **Telling other developers** in the Algorand community

---

## 👨‍💻 About the Author

**Built and maintained by Bhagyesh Jahangirpuria**

Passionate blockchain developer focused on building infrastructure that accelerates the Algorand ecosystem. Creator of AlgoMintX (1st prize winner) and AlgoStakeX.

- 🌐 **Website:** [ibhagyesh.site](http://ibhagyesh.site)
- 🔗 **LinkedIn:** [Bhagyesh Jahangirpuria](https://in.linkedin.com/in/bhagyesh-jahangirpuria)
- 💼 **GitHub:** [@IBHAGYESH](https://github.com/IBHAGYESH)

**Feel free to connect for collaborations, feedback, or consulting!**

---

<div align="center">

**Made with ❤️ for the Algorand Community**

If AlgoStakeX helped you build something awesome, we'd love to hear about it!

</div>
