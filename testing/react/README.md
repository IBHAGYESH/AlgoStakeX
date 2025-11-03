# AlgoStakeX React Testing App

This is a React testing application for the AlgoStakeX SDK, similar to the AlgoMintX testing app.

## Features

- **Profile Page**: Connect Pera/Defly wallet using AlgoStakeX SDK
- **Home Page**: Dummy online game platform page
- **Feature Page**: Premium features locked without staking

## Setup

1. **Build the AlgoStakeX SDK first:**
   ```bash
   cd ../../src
   npm run build  # or webpack build command
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

## Pages

### Profile Page (`/profile`)
- Connect wallet using Pera or Defly
- View current staking status
- Stake/withdraw tokens
- Disconnect wallet

### Home Page (`/`)
- Dummy game platform interface
- Shows featured games
- Requires staking for premium access

### Feature Page (`/feature`)
- Premium features locked until staking
- Shows access status
- Redirects to profile for staking

## SDK Configuration

The SDK is configured in `src/hooks/useSDK.js`. Update the configuration to match your setup:

- `env`: "testnet" or "mainnet"
- `namespace`: Your unique namespace
- `token_id`: ASA ID for staking
- `staking`: Staking configuration object

## Note

Make sure to:
1. Build the AlgoStakeX SDK and place it in `../../dist/algostakex.js`
2. Update the contract application ID in the SDK
3. Add treasury wallet before staking operations

