import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const RewardsChart = ({ data }) => {
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const css = typeof window !== 'undefined' ? getComputedStyle(document.documentElement) : null;
  const axisColor = css ? css.getPropertyValue('--text-muted').trim() || '#94a3b8' : '#94a3b8';
  const gridColor = css ? css.getPropertyValue('--border-color').trim() || 'rgba(148,163,184,0.3)' : 'rgba(148,163,184,0.3)';
  const tooltipBg = css ? css.getPropertyValue('--bg-primary').trim() || 'white' : 'white';
  const tooltipBorder = css ? css.getPropertyValue('--border-color').trim() || '#e5e7eb' : '#e5e7eb';
  const tooltipText = css ? css.getPropertyValue('--text-primary').trim() || '#111827' : '#111827';

  return (
    <div style={{ width: '100%', height: '300px' }}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <defs>
            <linearGradient id="rewardsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.3}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis 
            dataKey="date" 
            stroke={axisColor}
            fontSize={12}
            tickFormatter={formatDate}
          />
          <YAxis 
            stroke={axisColor}
            fontSize={12}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: tooltipBg,
              border: `1px solid ${tooltipBorder}`,
              borderRadius: '8px',
              color: tooltipText
            }}
            formatter={(value) => [value.toLocaleString(), 'Daily Rewards']}
            labelFormatter={(label) => `Date: ${formatDate(label)}`}
          />
          <Bar 
            dataKey="rewards" 
            fill="url(#rewardsGradient)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RewardsChart;
