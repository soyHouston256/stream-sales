'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSalesByCategory } from '@/lib/hooks/useProviderStats';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = {
  netflix: '#E50914',
  spotify: '#1DB954',
  hbo: '#9D4EDD',
  disney: '#0063E5',
  prime: '#00A8E1',
  youtube: '#FF0000',
  other: '#6B7280',
};

export function SalesByCategoryChart() {
  const { data: salesByCategory = [], isLoading } = useSalesByCategory();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sales by Category</CardTitle>
          <CardDescription>Distribution of your sales across categories</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (salesByCategory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sales by Category</CardTitle>
          <CardDescription>Distribution of your sales across categories</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-sm text-muted-foreground">No sales data available yet</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = salesByCategory.map((item) => ({
    name: item.category.charAt(0).toUpperCase() + item.category.slice(1),
    value: item.count,
    earnings: parseFloat(item.totalEarnings),
    category: item.category,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            Sales: {data.value}
          </p>
          <p className="text-sm text-muted-foreground">
            Earnings: ${data.earnings.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales by Category</CardTitle>
        <CardDescription>Distribution of your sales across categories</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) =>
                percent ? `${name}: ${(percent * 100).toFixed(0)}%` : name
              }
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[entry.category as keyof typeof COLORS]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
