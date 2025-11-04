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
import AlgoStakeX from "algostakex";

// Initialize
const sdk = new AlgoStakeX({
  network: "testnet", // 'testnet' or 'mainnet'
  contractAppId: 123456789, // Your deployed contract app ID
  tokenId: 987654321, // ASA token ID for staking
});

// Connect wallet
await sdk.connectWallet("pera"); // 'pera', 'defly', or 'custodial'
```

### 3. Start Staking

```javascript
// Stake tokens
await sdk.stake({
  poolId: "GAME_POOL_1",
  amount: 1000, // Amount of tokens to stake
  lockPeriod: 2592000, // 30 days in seconds
  rewardType: "APY",
  rewardRate: 1000, // 10% APY (in basis points: 1000 = 10%)
});

// Check if user has valid stake (for access control)
const canPlay = await sdk.hasValidStake({
  poolId: "GAME_POOL_1",
  userAddress: userWallet,
  minimumAmount: 100,
});

// Withdraw staked tokens
await sdk.withdraw({ poolId: "GAME_POOL_1" });
```

**That's it!** You now have a fully functional staking system. 🎉

---

## 🎮 Use Cases

### Gaming 🎮

```javascript
// Require token staking to play game
const canPlay = await sdk.hasValidStake({
  poolId: "GAME_ACCESS",
  userAddress: player.address,
  minimumAmount: 100, // Minimum 100 tokens staked
});

if (canPlay) {
  startGame();
}
```

**Examples:**

- Stake-to-play mechanics
- Stake-to-unlock levels/features
- Guild systems with pooled stakes
- Play-to-earn tokenomics

### DeFi 💰

```javascript
// Yield farming with flexible staking
await sdk.stake({
  poolId: "YIELD_FARM_1",
  amount: 10000,
  lockPeriod: 0, // Flexible (withdraw anytime)
  rewardType: "APY",
  rewardRate: 1200, // 12% APY
});
```

**Examples:**

- Yield farming infrastructure
- Liquidity mining rewards
- Collateralized lending
- Savings accounts

### Membership & Access Control 🎫

```javascript
// Premium feature access
const isPremium = await sdk.hasValidStake({
  poolId: "PREMIUM_TIER",
  userAddress: user.address,
  minimumAmount: 500,
});

if (isPremium) {
  unlockPremiumFeatures();
}
```

**Examples:**

- Premium feature access (stake X tokens = premium member)
- Subscription alternatives (stake instead of monthly payment)
- VIP tier systems
- Content creator patronage

### Governance 🗳️

```javascript
// DAO voting power based on staked tokens
const stakeInfo = await sdk.getStakeInfo({
  poolId: "DAO_GOVERNANCE",
  userAddress: voter.address,
});

const votingPower = stakeInfo.stakedAmount; // 1 token = 1 vote
```

**Examples:**

- DAO voting power (1 staked token = 1 vote)
- Proposal submission requirements
- Long-term holder benefits

### NFT Utilities 🖼️

```javascript
// NFT holder bonuses
const hasStake = await sdk.hasValidStake({
  poolId: "NFT_HOLDER_BONUS",
  userAddress: holder.address,
  minimumAmount: 1000,
});

if (hasStake && holdsNFT) {
  grantExclusiveAccess();
}
```

**Examples:**

- NFT holder bonuses (stake tokens + hold NFT = rewards)
- Gated communities
- Exclusive drops access

---

## 📦 SDK API

### Initialization Options

```typescript
const sdk = new AlgoStakeX({
  network: "testnet" | "mainnet", // Required
  contractAppId: number, // Required: Your deployed contract app ID
  tokenId: number, // Required: ASA token ID for staking
  walletType: "pera" | "defly" | "custodial", // Optional
  mnemonic: string, // Required only for custodial wallet
});
```

### Core Methods

#### 🔐 Wallet Operations

```typescript
// Connect wallet
await sdk.connectWallet(walletType: 'pera' | 'defly' | 'custodial');

// Disconnect wallet
await sdk.disconnectWallet();

// Get connected address
const address = sdk.getConnectedAddress();
```

#### 💰 Staking Operations

```typescript
// Stake tokens
await sdk.stake({
  poolId: string, // Unique pool identifier
  amount: number, // Amount of tokens to stake
  lockPeriod: number, // Lock period in seconds (0 for flexible)
  rewardType: "APY" | "UTILITY" | "CUSTOM",
  rewardRate: number, // Basis points (1000 = 10%)
  utility: string, // Optional: Utility description for utility-based rewards
});

// Withdraw staked tokens
await sdk.withdraw({
  poolId: string,
});

// Emergency withdraw with penalty
await sdk.emergencyWithdraw({
  poolId: string,
  penaltyPercentage: number, // 0-100 (e.g., 10 = 10% penalty)
});
```

#### 📊 Query Methods

```typescript
// Check if user has valid stake (for access control)
const hasStake = await sdk.hasValidStake({
  poolId: string,
  userAddress: string,
  minimumAmount: number,
});
// Returns: boolean

// Get detailed stake information
const stakeInfo = await sdk.getStakeInfo({
  poolId: string,
  userAddress: string,
});

// Calculate pending rewards
const pendingRewards = await sdk.calculatePendingRewards({
  poolId: string,
  userAddress: string,
});
```

#### 🛠️ Administrative Methods

```typescript
// Donate tokens to contract for rewards
await sdk.donateTokens({
  tokenId: number,
  amount: number,
});

// Withdraw excess tokens from contract
await sdk.withdrawExcessTokens({
  tokenId: number,
  amount: number,
  recipient: string,
});

// Update existing stake parameters
await sdk.updateStake({
  poolId: string,
  newRewardRate: number,
  newLockPeriod: number,
  newIsFlexible: boolean,
});

// Transfer admin rights
await sdk.transferAdmin({
  newAdminAddress: string,
});
```

---

## 🎯 Staking Models

### Flexible Staking

Users can withdraw anytime without penalties.

```javascript
await sdk.stake({
  poolId: "FLEXIBLE_POOL",
  amount: 1000,
  lockPeriod: 0, // 0 = flexible
  rewardType: "APY",
  rewardRate: 500, // 5% APY
});
```

### Fixed-Term Staking

Users must wait for the lock period to expire.

```javascript
await sdk.stake({
  poolId: "FIXED_POOL",
  amount: 5000,
  lockPeriod: 7776000, // 90 days in seconds
  rewardType: "APY",
  rewardRate: 1500, // 15% APY (higher reward for longer lock)
});
```

### Utility-Based Staking

Stake to unlock features instead of earning tokens.

```javascript
await sdk.stake({
  poolId: "UTILITY_POOL",
  amount: 100,
  lockPeriod: 2592000, // 30 days
  rewardType: "UTILITY",
  rewardRate: 0,
  utility: "Premium membership access",
});
```

---

## 🔄 Reward Types

| Reward Type | Description                                   | Example Use Case                        |
| ----------- | --------------------------------------------- | --------------------------------------- |
| **APY**     | Percentage-based returns calculated over time | DeFi yield farming, savings accounts    |
| **UTILITY** | Access to features/services                   | Gaming access, premium memberships      |
| **CUSTOM**  | Different token as reward                     | Liquidity mining with governance tokens |

---

## 💡 Code Examples

### Example 1: Gaming Platform

```javascript
import AlgoStakeX from "algostakex";

const stakingSDK = new AlgoStakeX({
  network: "mainnet",
  contractAppId: 123456789,
  tokenId: 987654321,
});

// Connect player's wallet
await stakingSDK.connectWallet("pera");

// Check if player can access the game
async function canPlayerPlay(playerAddress) {
  return await stakingSDK.hasValidStake({
    poolId: "GAME_ACCESS",
    userAddress: playerAddress,
    minimumAmount: 50, // Minimum 50 tokens required
  });
}

// Start game if player has valid stake
if (await canPlayerPlay(playerAddress)) {
  console.log("Welcome to the game! 🎮");
  startGame();
} else {
  console.log("Please stake at least 50 tokens to play.");
  showStakingUI();
}
```

### Example 2: DeFi Yield Farming

```javascript
// High APY for long-term stakers
await stakingSDK.stake({
  poolId: "YIELD_FARM_90D",
  amount: 10000,
  lockPeriod: 7776000, // 90 days
  rewardType: "APY",
  rewardRate: 2000, // 20% APY
});

// Check pending rewards
const rewards = await stakingSDK.calculatePendingRewards({
  poolId: "YIELD_FARM_90D",
  userAddress: userAddress,
});

console.log(`You've earned ${rewards} tokens!`);
```

### Example 3: Membership Platform

```javascript
// Stake for premium membership
await stakingSDK.stake({
  poolId: "PREMIUM_MEMBERSHIP",
  amount: 500,
  lockPeriod: 2592000, // 30 days
  rewardType: "UTILITY",
  rewardRate: 0,
  utility: "Premium features + ad-free experience",
});

// Check membership status
const isPremium = await stakingSDK.hasValidStake({
  poolId: "PREMIUM_MEMBERSHIP",
  userAddress: userAddress,
  minimumAmount: 500,
});

if (isPremium) {
  enablePremiumFeatures();
  removeAds();
}
```

### Example 4: DAO Governance

```javascript
// Stake for voting power
await stakingSDK.stake({
  poolId: "DAO_GOVERNANCE",
  amount: 1000,
  lockPeriod: 0, // Flexible
  rewardType: "UTILITY",
  rewardRate: 0,
  utility: "Voting rights in DAO proposals",
});

// Get voting power
const stakeInfo = await stakingSDK.getStakeInfo({
  poolId: "DAO_GOVERNANCE",
  userAddress: voterAddress,
});

const votingPower = stakeInfo.stakedAmount;
console.log(`Your voting power: ${votingPower} votes`);
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

### Custom Wallet Integration

```javascript
// Use custodial wallet (for backend integration)
const sdk = new AlgoStakeX({
  network: "mainnet",
  contractAppId: 123456789,
  tokenId: 987654321,
  walletType: "custodial",
  mnemonic: "your 25-word mnemonic phrase here...",
});
```

### Multiple Pool Management

```javascript
// Create different pools for different use cases
const pools = {
  gaming: 'GAME_ACCESS_POOL',
  premium: 'PREMIUM_MEMBERSHIP',
  governance: 'DAO_VOTING_POOL',
  yield: 'YIELD_FARM_90D'
};

// Stake in multiple pools
await sdk.stake({ poolId: pools.gaming, amount: 100, ... });
await sdk.stake({ poolId: pools.premium, amount: 500, ... });
```

### Dynamic Reward Updates

```javascript
// Update reward rate for existing stakes
await sdk.updateStake({
  poolId: "YIELD_FARM_90D",
  newRewardRate: 2500, // Increase to 25% APY
  newLockPeriod: 7776000, // Keep 90 days
  newIsFlexible: false,
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
