import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import styles from './DealerRegistrationsChart.module.css';

export default function DealerRegistrationsChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>Dealer Registrations (Last 30 Days)</h3>
        <p className={styles.empty}>No data available</p>
      </div>
    );
  }

  // Format data for display with shorter date labels
  const formattedData = data.map(item => ({
    ...item,
    displayDate: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }));

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Dealer Registrations (Last 30 Days)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={formattedData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis 
            dataKey="displayDate" 
            tick={{ fontSize: 10 }} 
            interval={Math.floor(data.length / 6)}
          />
          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
          <Tooltip />
          <Line 
            type="monotone" 
            dataKey="count" 
            stroke="var(--color-primary, #1976d2)" 
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
