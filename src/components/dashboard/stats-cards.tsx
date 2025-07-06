'use client';

import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Video, FileText, Mic, Eye } from 'lucide-react';

interface StatCard {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ReactNode;
  color: string;
}

const stats: StatCard[] = [
  {
    title: 'Total Videos',
    value: '24',
    change: '+12%',
    trend: 'up',
    icon: <Video className="h-5 w-5" />,
    color: 'from-blue-500 to-blue-600'
  },
  {
    title: 'Generated Scripts',
    value: '187',
    change: '+23%',
    trend: 'up',
    icon: <FileText className="h-5 w-5" />,
    color: 'from-green-500 to-green-600'
  },
  {
    title: 'Voice Generations',
    value: '156',
    change: '+8%',
    trend: 'up',
    icon: <Mic className="h-5 w-5" />,
    color: 'from-purple-500 to-purple-600'
  },
  {
    title: 'Total Views',
    value: '2.4M',
    change: '+15%',
    trend: 'up',
    icon: <Eye className="h-5 w-5" />,
    color: 'from-orange-500 to-orange-600'
  }
];

export const StatsCards: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => (
        <Card 
          key={stat.title} 
          className="p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg animate-fadeIn"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                {stat.title}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </p>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  stat.trend === 'up' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {stat.trend === 'up' ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {stat.change}
                </div>
              </div>
            </div>
            <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.color} text-white shadow-lg`}>
              {stat.icon}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}; 