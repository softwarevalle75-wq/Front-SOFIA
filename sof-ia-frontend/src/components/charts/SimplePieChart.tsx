import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface SimplePieChartProps {
  data: Array<{ name: string; value: number; color: string }>;
  height?: number;
  title?: string;
}

const SimplePieChart: React.FC<SimplePieChartProps> = ({ data, height = 300, title }) => {
  const RADIAN = Math.PI / 180;
  
  const renderCustomLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
    const radius = innerRadius + (outerRadius - innerRadius);
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={midAngle < 180 ? "start" : "end"} 
        dominantBaseline="central"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-university-indigo mb-4 font-poppins">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            innerRadius={40}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
            labelLine={false}
            label={renderCustomLabel}

            animationBegin={0}
            animationDuration={800}
          >
{data.map((entry) => (
            <Cell 
              key={entry.name}
              fill={entry.color} 
              stroke="#fff"
              strokeWidth={2}
            />
          ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SimplePieChart;