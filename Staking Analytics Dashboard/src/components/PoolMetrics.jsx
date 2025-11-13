import React from 'react';

const PoolMetrics = ({ poolData, stakers, stakes, symbol }) => {
  const avgStake = poolData?.totalStakers > 0
    ? (Number(poolData.totalValue || 0) / Number(poolData.totalStakers || 1))
    : 0;

  // Reward types present
  const rewardTypes = new Set();
  const utilities = new Set();
  (stakes || []).forEach(s => {
    const rt = s.stakeData?.rewardType;
    if (rt) rewardTypes.add(rt);
    const util = s.stakeData?.utility;
    if (rt !== 'APY' && util) utilities.add(util);
  });

  return (
    <section className="pool-metrics">
      <h3 className="section-title">Key Statistics</h3>

      <div className="metric-stats-card" style={{ marginBottom: '1rem' }}>
        <h4>Key Statistics</h4>
        <div className="stats-list">
          <div className="stat-row">
            <span className="stat-label">Average Stake Size</span>
            <span className="stat-value">{avgStake.toFixed(2)} {symbol}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Total Transactions</span>
            <span className="stat-value">{poolData?.totalTransactions?.toLocaleString() || '0'}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Network</span>
            <span className="stat-value">{poolData?.network?.toUpperCase() || 'N/A'}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Pool Status</span>
            <span className="stat-value">{poolData?.status || 'Unknown'}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Estimated APY</span>
            <span className="stat-value">{poolData?.apy?.toFixed(2) || '0'}%</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Total Staked Value</span>
            <span className="stat-value">{Number(poolData?.totalValue || 0).toLocaleString()} {symbol}</span>
          </div>
        </div>
      </div>

      <div className="metric-stats-card">
        <h4>Reward Types</h4>
        <div className="stats-list">
          <div className="stat-row">
            <span className="stat-label">Types Present</span>
            <span className="stat-value">{Array.from(rewardTypes).join(', ') || 'N/A'}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Utility Rewards</span>
            <span className="stat-value">{utilities.size > 0 ? Array.from(utilities).join(', ') : 'None'}</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PoolMetrics;
