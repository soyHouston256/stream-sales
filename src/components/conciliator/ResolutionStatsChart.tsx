'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ResolutionStatsChartProps {
  data: {
    refund_seller: number;
    favor_provider: number;
    partial_refund: number;
    no_action: number;
  };
}

const COLORS = {
  refund_seller: '#ef4444', // red
  favor_provider: '#22c55e', // green
  partial_refund: '#3b82f6', // blue
  no_action: '#9ca3af', // gray
};

const LABELS = {
  refund_seller: 'Refund Seller',
  favor_provider: 'Favor Provider',
  partial_refund: 'Partial Refund',
  no_action: 'No Action',
};

export function ResolutionStatsChart({ data }: ResolutionStatsChartProps) {
  const chartData = Object.entries(data).map(([key, value]) => ({
    name: LABELS[key as keyof typeof LABELS],
    value,
    color: COLORS[key as keyof typeof COLORS],
  }));

  const total = Object.values(data).reduce((sum, val) => sum + val, 0);

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resolutions by Type</CardTitle>
          <CardDescription>Distribution of your resolution decisions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No resolutions yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resolutions by Type</CardTitle>
        <CardDescription>Distribution of your resolution decisions</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [`${value} disputes`, 'Count']}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-2 gap-4">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm font-medium">{item.name}</span>
              </div>
              <span className="text-sm font-bold">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
