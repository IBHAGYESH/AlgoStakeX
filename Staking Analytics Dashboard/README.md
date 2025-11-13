# AlgoStakeX Analytics Dashboard

A comprehensive React-based analytics dashboard for viewing staking pool data and insights powered by the AlgoStakeX SDK. Built with Vite for fast development and modern tooling.

## Features

### 🔍 Pool Search & Discovery
- Search pools by Pool ID
- Real-time pool data fetching
- Pool status and configuration display

### 📊 Comprehensive Analytics
- **Pool Overview**: Total value, stakers count, APY, and rewards
- **Interactive Charts**: 
  - Staking volume over time (Line Chart)
  - Stakers growth (Area Chart) 
  - Daily rewards distribution (Bar Chart)
- **Pool Metrics**: 
  - Staking distribution by tier (Pie Chart)
  - Rewards distribution breakdown
  - Staking duration analysis

### 👥 Staker Management
- Top stakers leaderboard with rankings
- Advanced filtering and sorting
- Tier-based staker categorization
- Individual staker analytics

### 📈 Performance Insights
- Key performance indicators
- Pool utilization metrics
- Retention and success rates
- Historical trend analysis

## Technology Stack

- **Frontend**: React 18 with Vite
- **Charts**: Recharts
- **Icons**: Lucide React
- **Styling**: CSS Modules with modern design
- **Build Tool**: Vite (fast HMR and optimized builds)
- **Data**: Mock data (easily replaceable with real API)

## Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

1. Navigate to the dashboard directory:
```bash
cd "Staking Dashboard"
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.sample .env
# Edit .env with your treasury wallet credentials
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:5173](http://localhost:5173) in your browser

### Building for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Environment Variables

Create a `.env` file based on `.env.sample`:

```bash
# Treasury Wallet Configuration (for SDK operations)
VITE_TREASURY_ADDRESS=your_treasury_wallet_address_here
VITE_TREASURY_MNEMONIC=your_treasury_wallet_mnemonic_here

# API Configuration
VITE_ALGOD_SERVER=https://testnet-api.algonode.cloud
VITE_INDEXER_SERVER=https://testnet-idx.algonode.cloud
VITE_NETWORK=testnet
```

## Project Structure

```
Staking Dashboard/
├── src/
│   ├── components/          # React components
│   │   ├── StakingChart.jsx
│   │   ├── StakersChart.jsx
│   │   ├── RewardsChart.jsx
│   │   ├── PoolMetrics.jsx
│   │   └── StakersList.jsx
│   ├── hooks/               # Custom React hooks
│   │   └── useSDK.js
│   ├── data/                # Mock data and utilities
│   │   └── mockData.js
│   ├── App.jsx              # Main application component
│   ├── App.css              # Application styles
│   ├── main.jsx             # Application entry point
│   └── index.css            # Global styles
├── public/                  # Static assets
├── index.html               # HTML template
├── vite.config.js           # Vite configuration
├── package.json             # Dependencies and scripts
└── README.md                # This file
```

## Usage

### Searching for Pools

1. Enter a Pool ID in the search bar (try "DEMO-POOL-123" or "SAMPLE-DEFI-456")
2. Click "Search Pool" or press Enter
3. View comprehensive analytics for the pool

### Understanding the Dashboard

#### Pool Overview
- **Total Pool Value**: Current USD value of all staked tokens
- **Active Stakers**: Number of users currently staking
- **Current APY**: Annual Percentage Yield for the pool
- **Total Rewards**: Cumulative rewards distributed

#### Charts Section
- **Staking Volume**: Track total staked amount over time
- **Stakers Growth**: Monitor user adoption and growth
- **Rewards Distribution**: Daily rewards paid to stakers

#### Pool Metrics
- **Tier Distribution**: Breakdown of stakers by tier level
- **Reward Types**: Distribution of different reward categories
- **Duration Analysis**: How long users typically stake

#### Top Stakers
- Ranked list of largest stakers
- Filterable by tier and searchable by address
- Sortable by various metrics

## Development

### Available Scripts

- `npm run dev` - Start development server with HMR
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Vite Features

- **Fast HMR**: Instant hot module replacement
- **Optimized Builds**: Tree-shaking and code splitting
- **Modern Tooling**: Native ES modules support
- **TypeScript Ready**: Built-in TypeScript support

## Data Integration

### Mock Data
The dashboard currently uses mock data for demonstration. The data structure includes:

```javascript
// Pool Data
{
  poolId: 'DEMO-POOL-123',
  status: 'Active',
  totalValue: 2450000,
  totalStakers: 1247,
  apy: 18.5,
  // ... more fields
}

// Staking History
[
  {
    date: '2024-11-12',
    totalStaked: 2450000,
    stakers: 1247,
    rewards: 3800
  }
  // ... more entries
]
```

### Real Data Integration
To integrate with real AlgoStakeX data:

1. Replace mock data imports in `App.jsx`
2. Implement API calls to AlgoStakeX indexer
3. Update data fetching logic in the `searchPool` function
4. Ensure data structure matches expected format

Example API integration:
```javascript
const fetchPoolData = async (poolId) => {
  const response = await fetch(`/api/pools/${poolId}`);
  const data = await response.json();
  return data;
};
```

## Customization

### Styling
- Modify `src/App.css` for component-specific styles
- Update `src/index.css` for global styles and utilities
- Color scheme and branding can be customized via CSS variables

### Charts
- Chart configurations are in individual component files
- Colors, tooltips, and formatting can be customized
- Additional chart types can be added using Recharts components

### Components
- All components are modular and reusable
- Located in `src/components/`
- Easy to extend or modify for specific needs

## Performance Considerations

- Charts are optimized with ResponsiveContainer
- Large datasets are handled with pagination and virtualization
- Debounced search to prevent excessive API calls
- Memoized components to prevent unnecessary re-renders
- Vite's optimized bundling for fast loading

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Differences from React Scripts

This project uses **Vite** instead of Create React App for several advantages:

### Vite Benefits
- **Faster Development**: Instant server start and lightning-fast HMR
- **Modern Bundling**: Native ES modules and optimized production builds
- **Better Performance**: Faster builds and smaller bundle sizes
- **Plugin Ecosystem**: Rich plugin ecosystem and extensibility
- **TypeScript Support**: Built-in TypeScript support without configuration

### Migration Notes
- Environment variables use `VITE_` prefix instead of `REACT_APP_`
- Import paths use ES modules syntax
- Vite config instead of webpack config
- Different dev server and build commands

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the AlgoStakeX SDK and follows the same MIT license.

## Support

For questions or issues:
- Check the AlgoStakeX documentation
- Open an issue in the main repository
- Contact the development team

---

**Built with ❤️ using Vite + React for the AlgoStakeX ecosystem**
