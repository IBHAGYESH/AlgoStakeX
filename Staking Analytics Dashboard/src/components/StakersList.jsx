import React, { useState } from 'react';
import { Users, Search, Filter, ExternalLink, Award } from 'lucide-react';

const StakersList = ({ stakers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState('All');
  const [sortBy, setSortBy] = useState('stakedAmount');
  const [sortOrder, setSortOrder] = useState('desc');

  const getTierColor = (tier) => {
    const colors = {
      Bronze: '#CD7F32',
      Silver: '#C0C0C0',
      Gold: '#FFD700',
      Platinum: '#E5E4E2'
    };
    return colors[tier] || '#94a3b8';
  };

  const getTierIcon = (tier) => {
    switch(tier) {
      case 'Bronze': return '🥉';
      case 'Silver': return '🥈';
      case 'Gold': return '🥇';
      case 'Platinum': return '💎';
      default: return '⭐';
    }
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
    .filter(staker => {
      const matchesSearch = staker.address.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTier = filterTier === 'All' || staker.tier === filterTier;
      return matchesSearch && matchesTier;
    })
    .sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'joinDate') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

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
          
          <div className="filter-container">
            <Filter className="filter-icon" />
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              className="filter-select"
            >
              <option value="All">All Tiers</option>
              <option value="Bronze">Bronze</option>
              <option value="Silver">Silver</option>
              <option value="Gold">Gold</option>
              <option value="Platinum">Platinum</option>
            </select>
          </div>
        </div>
      </div>

      <div className="stakers-table-container">
        <table className="stakers-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th 
                className={`sortable ${sortBy === 'address' ? 'active' : ''}`}
                onClick={() => handleSort('address')}
              >
                Address
                {sortBy === 'address' && (
                  <span className="sort-indicator">
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              <th 
                className={`sortable ${sortBy === 'stakedAmount' ? 'active' : ''}`}
                onClick={() => handleSort('stakedAmount')}
              >
                Staked Amount
                {sortBy === 'stakedAmount' && (
                  <span className="sort-indicator">
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              <th 
                className={`sortable ${sortBy === 'rewards' ? 'active' : ''}`}
                onClick={() => handleSort('rewards')}
              >
                Rewards
                {sortBy === 'rewards' && (
                  <span className="sort-indicator">
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              <th 
                className={`sortable ${sortBy === 'tier' ? 'active' : ''}`}
                onClick={() => handleSort('tier')}
              >
                Tier
                {sortBy === 'tier' && (
                  <span className="sort-indicator">
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              <th 
                className={`sortable ${sortBy === 'joinDate' ? 'active' : ''}`}
                onClick={() => handleSort('joinDate')}
              >
                Join Date
                {sortBy === 'joinDate' && (
                  <span className="sort-indicator">
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStakers.map((staker, index) => (
              <tr key={staker.id} className="staker-row">
                <td className="rank-cell">
                  <div className="rank-container">
                    {index + 1 <= 3 && (
                      <Award 
                        size={16} 
                        className={`rank-icon rank-${index + 1}`}
                      />
                    )}
                    <span className="rank-number">#{index + 1}</span>
                  </div>
                </td>
                <td className="address-cell">
                  <div className="address-container">
                    <code className="address-text">
                      {formatAddress(staker.address)}
                    </code>
                    <button 
                      className="copy-btn"
                      onClick={() => navigator.clipboard.writeText(staker.address)}
                      title="Copy full address"
                    >
                      📋
                    </button>
                  </div>
                </td>
                <td className="amount-cell">
                  <div className="amount-container">
                    <span className="amount-value">
                      {staker.stakedAmount.toLocaleString()}
                    </span>
                    <span className="amount-label">tokens</span>
                  </div>
                </td>
                <td className="rewards-cell">
                  <div className="rewards-container">
                    <span className="rewards-value">
                      {staker.rewards.toLocaleString()}
                    </span>
                    <span className="rewards-label">earned</span>
                  </div>
                </td>
                <td className="tier-cell">
                  <div 
                    className="tier-badge"
                    style={{ 
                      backgroundColor: `${getTierColor(staker.tier)}20`,
                      borderColor: getTierColor(staker.tier),
                      color: getTierColor(staker.tier)
                    }}
                  >
                    <span className="tier-icon">{getTierIcon(staker.tier)}</span>
                    <span className="tier-name">{staker.tier}</span>
                  </div>
                </td>
                <td className="date-cell">
                  {formatDate(staker.joinDate)}
                </td>
                <td className="status-cell">
                  <div className={`status-badge ${staker.status.toLowerCase()}`}>
                    <div className="status-indicator"></div>
                    <span>{staker.status}</span>
                  </div>
                </td>
                <td className="actions-cell">
                  <button 
                    className="action-btn"
                    title="View on explorer"
                  >
                    <ExternalLink size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default StakersList;
