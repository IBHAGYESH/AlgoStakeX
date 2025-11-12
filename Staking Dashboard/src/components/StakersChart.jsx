import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const StakersChart = ({ data }) => {
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div style={{ width: '100%', height: '300px' }}>
      <ResponsiveContainer>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="stakersGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis 
            dataKey="date" 
            stroke="#94a3b8"
            fontSize={12}
            tickFormatter={formatDate}
          />
          <YAxis 
            stroke="#94a3b8"
            fontSize={12}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#f8fafc'
            }}
            formatter={(value) => [value.toLocaleString(), 'Active Stakers']}
            labelFormatter={(label) => `Date: ${formatDate(label)}`}
          />
          <Area
            type="monotone"
            dataKey="stakers"
            stroke="#10b981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#stakersGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StakersChart;
