import React from 'react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SimpleBarChartProps {
  data: Array<{ name: string; value: number; color?: string }>;
  height?: number;
  title?: string;
  color?: string;
}

const SimpleBarChart: React.FC<SimpleBarChartProps> = ({ data, height = 300, title, color = '#1A1F71' }) => {
  return (
    <div>
      <h3 className="text-lg font-semibold text-university-indigo mb-4 font-poppins">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
          data={data}
          width={500}
          height={height}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            stroke="#e0e7ff" 
            tick={{ fill: '#e0e7ff' }}
          />
          <YAxis 
            stroke="#e0e7ff" 
            tick={{ fill: '#6b7280' }}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#fff', border: 'none' }}
            labelStyle={{ color: '#666' }}
          />
          <Legend />
          <Bar 
            dataKey="value" 
            fill={color}
            radius={[8, 4, 2, 0]}
          />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SimpleBarChart;