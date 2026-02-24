import React from 'react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SimpleLineChartProps {
  data: Array<{ name: string; consultas: number }>;
  height?: number;
  title?: string;
  color?: string;
}

const SimpleLineChart: React.FC<SimpleLineChartProps> = ({ data, height = 300, title, color = '#1A1F71' }) => {
  return (
    <div>
      <h3 className="text-lg font-semibold text-university-indigo mb-4 font-poppins">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart
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
          <Line 
            type="monotone" 
            dataKey="consultas" 
            stroke={color}
            strokeWidth={3}
            dot={{ fill: color, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SimpleLineChart;