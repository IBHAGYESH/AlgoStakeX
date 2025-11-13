import React, { useState } from 'react';
import { Users, Search, Award } from 'lucide-react';

const StakersList = ({ stakers }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchClick = () => {
    // No-op: list filters as you type, button kept for UX consistency
  };

  const formatAddress = (address) => {
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredStakers = stakers
    .filter(staker => staker.address.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => b.stakedAmount - a.stakedAmount);

  return (
    <section className="stakers-list">
      <div className="stakers-header">
        <div className="header-info">
          <h3 className="section-title">
            <Users className="section-icon" />
            Top Stakers
          </h3>
          <p className="section-subtitle">
            {filteredStakers.length} of {stakers.length} stakers shown
          </p>
        </div>
        
        <div className="stakers-controls">
          <div className="search-container">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search by address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <button className="search-btn" onClick={handleSearchClick}>Search</button>
        </div>
      </div>

      <div className="staker-cards">
        {filteredStakers.map((staker, index) => (
          <div className="staker-card" key={staker.id}>
            <div className="staker-card-header">
              <div className="rank-container">
                {index + 1 <= 3 && (
                  <Award size={16} className={`rank-icon rank-${index + 1}`} />
                )}
                <span className="rank-number">#{index + 1}</span>
              </div>
              <div className="address-container">
                <code className="address-text">{formatAddress(staker.address)}</code>
                <button
                  className="copy-btn"
                  onClick={() => navigator.clipboard.writeText(staker.address)}
                  title="Copy full address"
                >
                  📋
                </button>
              </div>
            </div>
            <div className="staker-card-body">
              <div className="metric">
                <div className="metric-label">Staked Amount</div>
                <div className="metric-value">{staker.stakedAmount.toLocaleString()} tokens</div>
              </div>
              <div className="metric">
                <div className="metric-label">Rewards</div>
                <div className="metric-value">{staker.rewards.toLocaleString()}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Join Date</div>
                <div className="metric-value">{formatDate(staker.joinDate)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default StakersList;
