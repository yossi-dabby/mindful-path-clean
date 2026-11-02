import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

const moodToNumber = {
  'very_low': 1,
  'low': 2,
  'okay': 3,
  'good': 4,
  'excellent': 5
};

const moodLabels = ['', 'Very Low', 'Low', 'Okay', 'Good', 'Excellent'];

export default function MoodChart({ data }) {
  const chartData = data
    .map(entry => ({
      date: entry.date,
      mood: moodToNumber[entry.mood],
      intensity: entry.intensity,
      label: format(new Date(entry.date), 'MMM d')
    }))
    .reverse();

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={{ stroke: '#e5e7eb' }}
        />
        <YAxis
          domain={[0, 6]}
          ticks={[1, 2, 3, 4, 5]}
          tickFormatter={(value) => moodLabels[value]}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={{ stroke: '#e5e7eb' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '8px 12px'
          }}
          formatter={(value) => [moodLabels[value], 'Mood']}
          labelFormatter={(label) => `Date: ${label}`}
        />
        <Line
          type="monotone"
          dataKey="mood"
          stroke="#10b981"
          strokeWidth={3}
          dot={{ fill: '#10b981', r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}