'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, Eye, TrendingUp, Clock } from 'lucide-react';

const statsData = [
  {
    title: 'Total Videos',
    value: '24',
    change: '+12%',
    changeType: 'positive' as const,
    icon: Video,
    description: 'from last month',
  },
  {
    title: 'Total Views',
    value: '2.4M',
    change: '+18%',
    changeType: 'positive' as const,
    icon: Eye,
    description: 'from last month',
  },
  {
    title: 'Engagement Rate',
    value: '8.2%',
    change: '+5.1%',
    changeType: 'positive' as const,
    icon: TrendingUp,
    description: 'from last month',
  },
  {
    title: 'Avg. Watch Time',
    value: '3m 24s',
    change: '-2.3%',
    changeType: 'negative' as const,
    icon: Clock,
    description: 'from last month',
  },
];

export const StatsCards: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsData.map((stat) => {
        const IconComponent = stat.icon;
        return (
          <Card key={stat.title} className="relative overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {stat.title}
              </CardTitle>
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <IconComponent className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stat.value}
              </div>
              <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span
                  className={`font-medium ${
                    stat.changeType === 'positive'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {stat.change}
                </span>
                <span>{stat.description}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}; 