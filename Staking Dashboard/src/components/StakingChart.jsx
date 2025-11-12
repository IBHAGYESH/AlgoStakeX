import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const StakingChart = ({ data }) => {
  const formatValue = (value) => {
    return `$${(value / 1000000).toFixed(2)}M`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div style={{ width: '100%', height: '300px' }}>
      <ResponsiveContainer>
        <LineChart data={data}>
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
            tickFormatter={formatValue}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#f8fafc'
            }}
            formatter={(value) => [formatValue(value), 'Total Staked']}
            labelFormatter={(label) => `Date: ${formatDate(label)}`}
          />
          <Line 
            type="monotone" 
            dataKey="totalStaked" 
            stroke="#3b82f6" 
            strokeWidth={3}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StakingChart;
