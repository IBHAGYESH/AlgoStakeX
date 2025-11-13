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
      
      // Fetch top stakers
      const topStakers = await algorandService.getTopStakers(poolId, 50);
      setStakers(topStakers);
      
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
                  <div className="pool-stats">
                    <div className="stat-card">
                      <DollarSign className="stat-icon" />
                      <div className="stat-content">
                        <div className="stat-value">${poolData.totalValue?.toLocaleString() || '0'}</div>
                        <div className="stat-label">Total Value Locked</div>
                      </div>
                    </div>
                    <div className="stat-card">
                      <Users className="stat-icon" />
                      <div className="stat-content">
                        <div className="stat-value">{poolData.totalStakers || 0}</div>
                        <div className="stat-label">Total Stakers</div>
                      </div>
                    </div>
                    <div className="stat-card">
                      <TrendingUp className="stat-icon" />
                      <div className="stat-content">
                        <div className="stat-value">{poolData.apy?.toFixed(2) || '0'}%</div>
                        <div className="stat-label">APY</div>
                      </div>
                    </div>
                    <div className="stat-card">
                      <DollarSign className="stat-icon" />
                      <div className="stat-content">
                        <div className="stat-value">${poolData.totalRewards?.toLocaleString() || '0'}</div>
                        <div className="stat-label">Total Rewards</div>
                      </div>
                    </div>
                    <div className="stat-card">
                      <Activity className="stat-icon" />
                      <div className="stat-content">
                        <div className="stat-value">{poolData.avgStakingTime || '0'} days</div>
                        <div className="stat-label">Avg Staking Time</div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Charts Section */}
              <section className="charts-section">
                <div className="charts-grid">
                  <div className="chart-card">
                    <h4>Staking Volume Over Time</h4>
                    <StakingChart data={stakingHistory} />
                  </div>
                  <div className="chart-card">
                    <h4>Stakers Growth</h4>
                    <StakersChart data={stakingHistory} />
                  </div>
                </div>
              </section>

              {/* Pool Metrics */}
              <section className="metrics-section">
                <PoolMetrics poolData={poolData} stakers={stakers} />
              </section>

              {/* Stakers List */}
              <section className="stakers-section">
                <StakersList stakers={stakers} />
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
              <p>Real-time staking pool analytics for the Algorand blockchain ecosystem.</p>
            </div>
            <div className="footer-links">
              <a href="https://github.com/algoxsuite/algostakex" target="_blank" rel="noopener noreferrer" className="footer-link">
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
