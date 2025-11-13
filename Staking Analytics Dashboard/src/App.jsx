import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, Users, DollarSign, Activity, Wifi, WifiOff, Sun, Moon, Github } from 'lucide-react';
import AlgorandService from './services/algorandService';
import StakingChart from './components/StakingChart';
import StakersChart from './components/StakersChart';
import RewardsChart from './components/RewardsChart';
import PoolMetrics from './components/PoolMetrics';
import StakersList from './components/StakersList';
import './App.css';

function App() {
  const [network, setNetwork] = useState('testnet');
  const [algorandService, setAlgorandService] = useState(new AlgorandService('testnet'));
  const [poolId, setPoolId] = useState('');
  const [poolData, setPoolData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stakingHistory, setStakingHistory] = useState([]);
  const [stakers, setStakers] = useState([]);
  const [networkStatus, setNetworkStatus] = useState(null);
  const [theme, setTheme] = useState('light');
  const [totalPools, setTotalPools] = useState(0);
  const [timeRange, setTimeRange] = useState('30d'); // 30d | 6m | 1y | all
  const [selectedTokenId, setSelectedTokenId] = useState(null);
  const [symbol, setSymbol] = useState('');
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [filteredStakers, setFilteredStakers] = useState([]);
  const [displayData, setDisplayData] = useState(null);
  const [filteredStakes, setFilteredStakes] = useState([]);

  // Handle network switch
  const handleNetworkChange = (newNetwork) => {
    setNetwork(newNetwork);
    const newService = new AlgorandService(newNetwork);
    setAlgorandService(newService);
    
    // Clear current data when switching networks
    setPoolData(null);
    setStakingHistory([]);
    setStakers([]);
    setError('');
    
    // Fetch network status
    fetchNetworkStatus(newService);
  };

  // Toggle theme
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // Fetch network status
  const fetchNetworkStatus = async (service = algorandService) => {
    try {
      const status = await service.getNetworkStatus();
      setNetworkStatus(status);
    } catch (error) {
      console.error('Failed to fetch network status:', error);
      setNetworkStatus(null);
    }
  };

  // Fetch total pools count
  const fetchTotalPools = async (service = algorandService) => {
    try {
      const boxes = await service.getAllApplicationBoxes();
      // Count unique pool IDs from box names
      const poolIds = new Set();
      boxes.forEach(box => {
        try {
          const decoded = service.decodeBoxName(box.name);
          if (decoded && decoded.poolId) {
            poolIds.add(decoded.poolId);
          }
        } catch (e) {
          // Skip invalid box names
        }
      });
      setTotalPools(poolIds.size);
    } catch (error) {
      console.error('Failed to fetch total pools:', error);
      setTotalPools(0);
    }
  };

  const searchPool = async () => {
    if (!poolId.trim()) {
      setError('Please enter a pool ID');
      return;
    }

    setLoading(true);
    setError('');
    setPoolData(null);
    setStakingHistory([]);
    setStakers([]);

    try {
      console.log(`Searching for pool ${poolId} on ${network}`);
      
      // Fetch real pool data
      const poolInfo = await algorandService.getPoolData(poolId);
      setPoolData(poolInfo);
      
      // Fetch staking history
      const history = await algorandService.getStakingHistory(poolId, 30);
      setStakingHistory(history);
      
    } catch (err) {
      console.error('Pool search error:', err);
      setError(err.message || 'Failed to fetch pool data');
      setPoolData(null);
      setStakingHistory([]);
      setStakers([]);
    } finally {
      setLoading(false);
    }
  };

  // Compute filtered analytics for current timeRange and selected token
  useEffect(() => {
    if (!poolData) return;

    const tokensMeta = poolData.tokensMetadata || {};
    const tokenIds = Object.keys(tokensMeta);
    let tokenId = selectedTokenId;
    if (!tokenId && tokenIds.length > 0) {
      tokenId = String(tokenIds[0]);
      setSelectedTokenId(tokenId);
    }

    const tokenMeta = tokenId ? tokensMeta[tokenId] : null;
    const decimals = tokenMeta?.decimals ?? 6;
    const unitSymbol = tokenMeta?.symbol || '';
    setSymbol(unitSymbol);

    const YEAR_SECONDS = 365 * 24 * 60 * 60;
    const pow10 = Math.pow(10, decimals);
    const nowSec = Math.floor(Date.now() / 1000);

    const daysMap = { '30d': 30, '6m': 180, '1y': 365 };
    let startSec;
    if (timeRange === 'all') {
      const earliest = (poolData.stakes || []).reduce((min, s) => Math.min(min, s.stakeData.stakedAt), nowSec);
      startSec = earliest || nowSec;
    } else {
      startSec = nowSec - (daysMap[timeRange] || 30) * 24 * 60 * 60;
    }

    // Filter stakes by token and time range
    const allStakes = poolData.stakes || [];
    const tokenFiltered = tokenId
      ? allStakes.filter(s => String(s.stakeData.tokenId) === String(tokenId))
      : allStakes;
    const stakesInWindow = tokenFiltered.filter(s => s.stakeData.stakedAt >= startSec);

    // Build daily buckets
    const numDays = Math.max(1, Math.floor((nowSec - startSec) / (24*60*60)) + 1);
    const daily = {};
    for (let i = 0; i < numDays; i++) {
      const d = new Date((startSec + i * 24*60*60) * 1000);
      const dateStr = d.toISOString().split('T')[0];
      daily[dateStr] = { date: dateStr, totalStaked: 0, stakers: 0, rewards: 0, transactions: 0 };
    }

    // Compute series similar to service (events on stake date)
    let cumulativeStakedTokens = 0;
    const seenStakers = new Set();
    const sorted = stakesInWindow.slice().sort((a,b) => a.stakeData.stakedAt - b.stakeData.stakedAt);
    sorted.forEach(({ stakeData }) => {
      const amountTokens = stakeData.amount / pow10;
      cumulativeStakedTokens += amountTokens;
      seenStakers.add(stakeData.staker);
      const dateStr = new Date(stakeData.stakedAt * 1000).toISOString().split('T')[0];
      if (daily[dateStr]) {
        daily[dateStr].totalStaked = cumulativeStakedTokens;
        daily[dateStr].stakers = seenStakers.size;
        daily[dateStr].transactions += 1;
        if (stakeData.rewardType === 'APY' && stakeData.rewardRate > 0) {
          const dailyRewardTokens = (stakeData.amount * stakeData.rewardRate) / 10000 / 365 / pow10;
          daily[dateStr].rewards += dailyRewardTokens;
        }
      }
    });

    const series = Object.values(daily);
    setFilteredHistory(series);

    // Compute derived metrics and stakers
    let totalTokens = 0;
    const uniqueStakers = new Set();
    let weightedApy = 0;
    let totalRewardsTokens = 0;
    const stakerAgg = new Map();

    tokenFiltered.forEach(({ stakeData }) => {
      // clip to window
      const startClip = Math.max(startSec, stakeData.stakedAt || 0);
      const endSec = Math.min(nowSec, (stakeData.lockEndTime || 0) > 0 ? stakeData.lockEndTime : nowSec);
      const timeSec = Math.max(0, endSec - startClip);
      const amountTokens = stakeData.amount / pow10;
      if (stakeData.stakedAt >= startSec) {
        totalTokens += amountTokens;
        uniqueStakers.add(stakeData.staker);
      }
      if (stakeData.rewardType === 'APY' && stakeData.rewardRate > 0 && timeSec > 0) {
        const rewardRaw = Math.floor((stakeData.amount * stakeData.rewardRate * timeSec) / (10000 * YEAR_SECONDS));
        totalRewardsTokens += rewardRaw / pow10;
      }
      // Weighted APY based on all stakes in token filter
      if (stakeData.rewardType === 'APY') {
        // rewardRate is in basis points; convert to percent
        weightedApy += (stakeData.amount * (stakeData.rewardRate / 100))
      }
      // Aggregate top stakers for selected token within time window
      if (stakeData.stakedAt >= startSec) {
        const key = stakeData.staker;
        const prev = stakerAgg.get(key) || { address: key, stakedAmount: 0, rewards: 0, joinDate: new Date(stakeData.stakedAt*1000).toISOString().split('T')[0], utilities: [] };
        prev.stakedAmount += amountTokens;
        if (stakeData.rewardType === 'APY' && stakeData.rewardRate > 0 && timeSec > 0) {
          const rewardRaw = Math.floor((stakeData.amount * stakeData.rewardRate * timeSec) / (10000 * YEAR_SECONDS));
          prev.rewards += rewardRaw / pow10;
        } else if (stakeData.rewardType !== 'APY' && stakeData.utility) {
          if (!prev.utilities.includes(stakeData.utility)) {
            prev.utilities.push(stakeData.utility);
          }
        }
        if (stakeData.stakedAt*1000 < new Date(prev.joinDate).getTime()) {
          prev.joinDate = new Date(stakeData.stakedAt*1000).toISOString().split('T')[0];
        }
        stakerAgg.set(key, prev);
      }
    });

    // finalize weighted APY
    const totalAmountRaw = tokenFiltered.reduce((sum, s) => sum + s.stakeData.amount, 0);
    const weightedApyPercent = totalAmountRaw > 0 ? (weightedApy / totalAmountRaw) : 0;

    // average staking time per unique staker (clipped window)
    const stakerDurations = new Map();
    tokenFiltered.forEach(({ stakeData }) => {
      const startClip = Math.max(startSec, stakeData.stakedAt || 0);
      const endSec = Math.min(nowSec, (stakeData.lockEndTime || 0) > 0 ? stakeData.lockEndTime : nowSec);
      const ms = Math.max(0, (endSec - startClip) * 1000);
      const prev = stakerDurations.get(stakeData.staker) || 0;
      stakerDurations.set(stakeData.staker, prev + ms);
    });
    const avgStakingDays = stakerDurations.size > 0
      ? Math.floor(Array.from(stakerDurations.values()).reduce((a,b)=>a+b,0) / stakerDurations.size / (1000*60*60*24))
      : 0;

    // Build display data overlaying poolData
    const merged = {
      ...poolData,
      totalValue: totalTokens,
      totalStakers: uniqueStakers.size,
      apy: weightedApyPercent,
      totalRewards: totalRewardsTokens,
      avgStakingTime: avgStakingDays,
    };
    setDisplayData(merged);

    // Build filtered stakers list (top 50)
    const top = Array.from(stakerAgg.values())
      .sort((a,b) => b.stakedAmount - a.stakedAmount)
      .slice(0,50);
    setFilteredStakers(top);
    setFilteredStakes(tokenFiltered);
  }, [poolData, timeRange, selectedTokenId]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchPool();
    }
  };

  // Initialize network status and total pools on component mount
  useEffect(() => {
    fetchNetworkStatus();
    fetchTotalPools();
  }, [algorandService]);

  // Periodically refresh total active pools in background
  useEffect(() => {
    const id = setInterval(() => {
      fetchTotalPools();
    }, 60000);
    return () => clearInterval(id);
  }, [algorandService]);

  return (
    <div className={`app ${theme}`}>
      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="header-content">
            <div className="header-left">
              <div className="logo">
                <TrendingUp size={24} />
                <h1>AlgoStakeX Analytics</h1>
              </div>
            </div>
            
            <div className="header-center">
              {/* Network Switch */}
              <div className="network-switch">
                <div className="radio-group">
                  <label className={`radio-option ${network === 'testnet' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="network"
                      value="testnet"
                      checked={network === 'testnet'}
                      onChange={(e) => handleNetworkChange(e.target.value)}
                    />
                    <span className="radio-label">TestNet</span>
                  </label>
                  <label className={`radio-option ${network === 'mainnet' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="network"
                      value="mainnet"
                      checked={network === 'mainnet'}
                      onChange={(e) => handleNetworkChange(e.target.value)}
                    />
                    <span className="radio-label">MainNet</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="header-right">
              {/* Network Status */}
              <div className="network-status">
                <div className={`status-indicator ${networkStatus ? 'online' : 'offline'}`}>
                  {networkStatus ? <Wifi size={16} /> : <WifiOff size={16} />}
                </div>
                <div className="status-text">
                  <div className="status-value">{network.toUpperCase()}</div>
                  <div className="status-label">
                    {networkStatus ? 'ONLINE' : 'OFFLINE'}
                  </div>
                </div>
              </div>
              
              {/* Pool Count */}
              <div className="pool-count">
                <Activity size={16} />
                <div className="count-text">
                  <div className="count-value">{totalPools}</div>
                  <div className="count-label">Active Pools</div>
                </div>
              </div>
              
              {/* Theme Toggle */}
              <button className="theme-toggle" onClick={toggleTheme}>
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main">
        <div className="container">
          {/* Hero Section */}
          <section className="hero-section">
            <div className="hero-content">
              <h2>Pool Analytics Dashboard</h2>
              <p>Enter a staking pool ID to view real-time analytics from {network === 'mainnet' ? 'Algorand MainNet' : 'Algorand TestNet'}</p>
            </div>
            
            {/* Search Box */}
            <div className="search-box">
              <div className="search-input-container">
                <Search className="search-icon" />
                <input
                  type="text"
                  placeholder={`Enter Pool ID for ${network.toUpperCase()}`}
                  value={poolId}
                  onChange={(e) => setPoolId(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="search-input"
                />
              </div>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="filter-select"
                aria-label="Select time range"
              >
                <option value="30d">Last 30d</option>
                <option value="6m">Last 6 months</option>
                <option value="1y">Last year</option>
                <option value="all">All time</option>
              </select>
              <button 
                onClick={searchPool}
                disabled={loading}
                className="search-btn"
              >
                {loading ? (
                  <div className="spinner" />
                ) : (
                  <>
                    <Search size={16} />
                    Search Pool
                  </>
                )}
              </button>
            </div>
            
            {error && (
              <div className="error-message">
                <strong>Error:</strong> {error}
              </div>
            )}
          </section>

          {/* Pool Data Section */}
          {poolData && (
            <>
              {/* Pool Overview */}
              <section className="pool-overview">
                <div className="pool-header">
                  <div className="pool-info">
                    <h3>Pool: {poolData.poolId}</h3>
                    <div className="pool-status">
                      <div className={`status-dot ${poolData.status.toLowerCase()}`}></div>
                      <span>{poolData.status}</span>
                    </div>
                  </div>
                  <div className="token-badge" title="Staked token">
                    <span className="token-symbol">{symbol}</span>
                  </div>
                  {poolData.tokensMetadata && Object.keys(poolData.tokensMetadata).length > 1 && (
                    <div className="token-filter">
                      <label className="token-label">Token</label>
                      <select
                        value={selectedTokenId || ''}
                        onChange={(e) => setSelectedTokenId(e.target.value)}
                        className="filter-select"
                        aria-label="Select token"
                      >
                        {Object.entries(poolData.tokensMetadata).map(([tid, meta]) => (
                          <option key={tid} value={tid}>{meta.symbol || tid}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </section>

              {/* Metrics Chips */}
              <section className="chips-section">
                <div className="chips-grid">
                  <div className="chip-card">
                    <DollarSign className="chip-icon" />
                    <div className="chip-content">
                      <div className="chip-value">{(displayData?.totalValue || 0).toLocaleString()} {symbol}</div>
                      <div className="chip-label">Total Staked</div>
                    </div>
                  </div>
                  <div className="chip-card">
                    <Users className="chip-icon" />
                    <div className="chip-content">
                      <div className="chip-value">{displayData?.totalStakers || 0}</div>
                      <div className="chip-label">Total Stakers</div>
                    </div>
                  </div>
                  <div className="chip-card">
                    <TrendingUp className="chip-icon" />
                    <div className="chip-content">
                      <div className="chip-value">{displayData?.apy?.toFixed(2) || '0'}%</div>
                      <div className="chip-label">APY</div>
                    </div>
                  </div>
                  <div className="chip-card">
                    <DollarSign className="chip-icon" />
                    <div className="chip-content">
                      <div className="chip-value">{(displayData?.totalRewards || 0).toLocaleString()} {symbol}</div>
                      <div className="chip-label">Total Rewards</div>
                    </div>
                  </div>
                  <div className="chip-card">
                    <Activity className="chip-icon" />
                    <div className="chip-content">
                      <div className="chip-value">{displayData?.avgStakingTime || '0'} days</div>
                      <div className="chip-label">Avg Staking Time</div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Charts Section */}
              <section className="charts-section">
                <div className="charts-grid">
                  <div className="chart-card">
                    <h4>Staking Volume Over Time</h4>
                    <StakingChart data={filteredHistory} symbol={symbol} />
                  </div>
                  <div className="chart-card">
                    <h4>Stakers Growth</h4>
                    <StakersChart data={filteredHistory} />
                  </div>
                  <div className="chart-card">
                    <h4>Total Rewards by Date</h4>
                    <RewardsChart data={filteredHistory} symbol={symbol} />
                  </div>
                </div>
              </section>

              {/* Pool Metrics */}
              <section className="metrics-section">
                <PoolMetrics poolData={displayData || poolData} stakers={filteredStakers} stakes={filteredStakes} symbol={symbol} stakingHistory={filteredHistory} loading={loading} />
              </section>

              {/* Stakers List */}
              <section className="stakers-section">
                <StakersList stakers={filteredStakers} symbol={symbol} />
              </section>
            </>
          )}

          {/* Empty State */}
          {!poolData && !loading && (
            <section className="empty-state">
              <div className="empty-content">
                <TrendingUp size={48} className="empty-icon" />
                <h3>No Pool Selected</h3>
                <p>Search for a staking pool ID to view detailed analytics and metrics.</p>
              </div>
            </section>
          )}

          {/* Loading Skeletons */}
          {loading && (
            <>
              <section className="pool-overview">
                <div className="skeleton skeleton-title" />
                <div className="skeleton skeleton-badge" />
              </section>
              <section className="chips-section">
                <div className="chips-grid">
                  <div className="chip-card skeleton" />
                  <div className="chip-card skeleton" />
                  <div className="chip-card skeleton" />
                  <div className="chip-card skeleton" />
                  <div className="chip-card skeleton" />
                </div>
              </section>
              <section className="charts-section">
                <div className="charts-grid">
                  <div className="chart-card skeleton-chart" />
                  <div className="chart-card skeleton-chart" />
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-info">
              <div className="footer-brand">
                <TrendingUp size={20} />
                <span>AlgoStakeX Analytics Dashboard</span>
              </div>
              <p>Real-time staking pool analytics for the AlgoStakeX SDK</p>
            </div>
            <div className="footer-links">
              <a href="https://github.com/IBHAGYESH/AlgoStakeX" target="_blank" rel="noopener noreferrer" className="footer-link">
                <Github size={16} />
                GitHub Repository
              </a>
            </div>
          </div>
          <div className="footer-bottom">
            <p>AlgoStakeX crafted with ❤️ by <a href="https://ibhagyesh.site/" target="_blank" rel="noopener noreferrer">ibhagyesh</a></p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
