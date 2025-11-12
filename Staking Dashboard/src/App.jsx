import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, Users, DollarSign, Activity, BarChart3, PieChart, Zap, Shield, Award, Target, Wifi, WifiOff } from 'lucide-react';
import StakingChart from './components/StakingChart';
import StakersChart from './components/StakersChart';
import RewardsChart from './components/RewardsChart';
import PoolMetrics from './components/PoolMetrics';
import StakersList from './components/StakersList';
import AlgorandService from './services/algorandService';
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

  // Fetch network status
  const fetchNetworkStatus = async (service = algorandService) => {
    try {
      const status = await service.getNetworkStatus();
      setNetworkStatus(status);
    } catch (error) {
      console.error('Failed to fetch network status:', error);
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

  // Initialize network status on component mount
  useEffect(() => {
    fetchNetworkStatus();
  }, [algorandService]);

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="header-content">
            <div className="header-left">
              {/* Network Switch */}
              <div className="network-switch">
                <div className="network-switch-label">Network:</div>
                <div className="radio-group">
                  <label className={`radio-option ${network === 'testnet' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="network"
                      value="testnet"
                      checked={network === 'testnet'}
                      onChange={(e) => handleNetworkChange(e.target.value)}
                    />
                    <span className="radio-label">
                      <Wifi size={16} />
                      TestNet
                    </span>
                  </label>
                  <label className={`radio-option ${network === 'mainnet' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="network"
                      value="mainnet"
                      checked={network === 'mainnet'}
                      onChange={(e) => handleNetworkChange(e.target.value)}
                    />
                    <span className="radio-label">
                      <Shield size={16} />
                      MainNet
                    </span>
                  </label>
                </div>
              </div>
              
              <div className="logo">
                <div className="logo-icon">
                  <BarChart3 size={32} />
                </div>
                <div className="logo-text">
                  <h1>AlgoStakeX Analytics</h1>
                  <p>Staking Pool Dashboard</p>
                </div>
              </div>
            </div>
            
            <div className="header-stats">
              <div className="stat-item">
                <div className={`network-indicator ${networkStatus ? 'online' : 'offline'}`}>
                  {networkStatus ? <Wifi className="stat-icon" /> : <WifiOff className="stat-icon" />}
                </div>
                <div>
                  <div className="stat-value">{network.toUpperCase()}</div>
                  <div className="stat-label">
                    {networkStatus ? `Round ${networkStatus.lastRound}` : 'Offline'}
                  </div>
                </div>
              </div>
              <div className="stat-item">
                <Activity className="stat-icon" />
                <div>
                  <div className="stat-value">{poolData ? '1' : '0'}</div>
                  <div className="stat-label">Active Pool</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main">
        <div className="container">
          {/* Search Section */}
          <section className="search-section">
            <div className="search-container">
              <div className="search-header">
                <h2>Pool Analytics Dashboard</h2>
                <p>Enter a staking pool ID to view real-time analytics from {network === 'mainnet' ? 'Algorand MainNet' : 'Algorand TestNet'}</p>
              </div>
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
                  className="btn btn-primary search-btn"
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
                <div className="error">
                  <strong>Error:</strong> {error}
                </div>
              )}
            </div>
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
                      <div className={`status-indicator ${poolData.status.toLowerCase()}`}></div>
                      <span>{poolData.status}</span>
                    </div>
                  </div>
                  <div className="pool-actions">
                    <button className="btn btn-secondary">
                      <Target size={16} />
                      Export Data
                    </button>
                    <button className="btn btn-secondary">
                      <Award size={16} />
                      Share Pool
                    </button>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="metrics-grid">
                  <div className="metric-card">
                    <div className="metric-header">
                      <DollarSign className="metric-icon" />
                      <span>Total Pool Value</span>
                    </div>
                    <div className="metric-value">{poolData.totalValue.toLocaleString()} ALGO</div>
                    <div className="metric-change positive">Real-time data</div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-header">
                      <Users className="metric-icon" />
                      <span>Active Stakers</span>
                    </div>
                    <div className="metric-value">{poolData.totalStakers.toLocaleString()}</div>
                    <div className="metric-change positive">Unique addresses</div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-header">
                      <TrendingUp className="metric-icon" />
                      <span>Estimated APY</span>
                    </div>
                    <div className="metric-value">{poolData.apy.toFixed(2)}%</div>
                    <div className="metric-change neutral">Based on rewards</div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-header">
                      <Zap className="metric-icon" />
                      <span>Total Rewards</span>
                    </div>
                    <div className="metric-value">{poolData.totalRewards.toLocaleString()} ALGO</div>
                    <div className="metric-change positive">All-time distributed</div>
                  </div>
                </div>
              </section>

              {/* Pool Metrics Component */}
              <PoolMetrics poolData={poolData} stakingHistory={stakingHistory} stakers={stakers} />

              {/* Charts Section */}
              <section className="charts-section">
                <div className="charts-grid">
                  <div className="chart-container">
                    <div className="chart-header">
                      <h4>Staking Volume Over Time</h4>
                      <div className="chart-controls">
                        <button className="chart-btn active">30D</button>
                      </div>
                    </div>
                    <StakingChart data={stakingHistory} />
                  </div>

                  <div className="chart-container">
                    <div className="chart-header">
                      <h4>Stakers Growth</h4>
                      <div className="chart-controls">
                        <button className="chart-btn active">30D</button>
                      </div>
                    </div>
                    <StakersChart data={stakingHistory} />
                  </div>
                </div>

                <div className="chart-container full-width">
                  <div className="chart-header">
                    <h4>Rewards Distribution</h4>
                    <p>Daily rewards distributed to stakers</p>
                  </div>
                  <RewardsChart data={stakingHistory} />
                </div>
              </section>

              {/* Stakers List */}
              <StakersList stakers={stakers} />

              {/* Pool Details */}
              <section className="pool-details">
                <div className="details-grid">
                  <div className="detail-card">
                    <h4>Pool Configuration</h4>
                    <div className="detail-list">
                      <div className="detail-item">
                        <span>Network:</span>
                        <span>{network.toUpperCase()}</span>
                      </div>
                      <div className="detail-item">
                        <span>Staking Type:</span>
                        <span>{poolData.stakingType}</span>
                      </div>
                      <div className="detail-item">
                        <span>Lock Period:</span>
                        <span>{poolData.lockPeriod}</span>
                      </div>
                      <div className="detail-item">
                        <span>Minimum Stake:</span>
                        <span>{poolData.minStake} ALGO</span>
                      </div>
                    </div>
                  </div>

                  <div className="detail-card">
                    <h4>Pool Statistics</h4>
                    <div className="detail-list">
                      <div className="detail-item">
                        <span>Created:</span>
                        <span>{new Date(poolData.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="detail-item">
                        <span>Last Updated:</span>
                        <span>{new Date(poolData.lastUpdated).toLocaleDateString()}</span>
                      </div>
                      <div className="detail-item">
                        <span>Total Transactions:</span>
                        <span>{poolData.totalTransactions.toLocaleString()}</span>
                      </div>
                      <div className="detail-item">
                        <span>Average Stake:</span>
                        <span>{poolData.averageStake.toFixed(2)} ALGO</span>
                      </div>
                    </div>
                  </div>

                  <div className="detail-card">
                    <h4>Performance Metrics</h4>
                    <div className="detail-list">
                      <div className="detail-item">
                        <span>30-Day Volume:</span>
                        <span>{poolData.monthlyVolume.toFixed(2)} ALGO</span>
                      </div>
                      <div className="detail-item">
                        <span>Rewards Paid:</span>
                        <span>{poolData.rewardsPaid.toFixed(2)} ALGO</span>
                      </div>
                      <div className="detail-item">
                        <span>Success Rate:</span>
                        <span>{poolData.successRate}%</span>
                      </div>
                      <div className="detail-item">
                        <span>Avg. Stake Duration:</span>
                        <span>{poolData.avgStakeDuration} days</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          {/* Empty State */}
          {!poolData && !loading && (
            <section className="empty-state">
              <div className="empty-content">
                <PieChart size={64} className="empty-icon" />
                <h3>No Pool Selected</h3>
                <p>Enter a real pool ID above to view detailed analytics from the Algorand {network} network.</p>
                <div className="network-info">
                  <h4>Current Network: {network.toUpperCase()}</h4>
                  <p>Contract Application ID: 749429587</p>
                  <p>Contract Address: ESEUVKN4EGRLZHQJPS7AH3ITLQMFG3LABXD4VXZVJGHZEZU2JMEMJRA6NU</p>
                  {networkStatus && (
                    <p>Network Status: Round {networkStatus.lastRound}</p>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h4>AlgoStakeX Analytics</h4>
              <p>Real-time staking pool analytics powered by Algorand Indexer API</p>
            </div>
            <div className="footer-section">
              <h5>Resources</h5>
              <ul>
                <li><a href="#">Documentation</a></li>
                <li><a href="#">API Reference</a></li>
                <li><a href="#">SDK Guide</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h5>Support</h5>
              <ul>
                <li><a href="#">Help Center</a></li>
                <li><a href="#">Community</a></li>
                <li><a href="#">Contact Us</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 AlgoStakeX Analytics. Built with Algorand SDK and real blockchain data.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
