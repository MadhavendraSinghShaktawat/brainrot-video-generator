'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, 
  TrendingUp, 
  Lightbulb, 
  Gamepad2, 
  DollarSign,
  Clock,
  Users,
  BarChart3 
} from 'lucide-react';

export type Niche = 'reddit-stories' | 'motivational' | 'facts' | 'gaming' | 'finance';

interface NicheOption {
  id: Niche;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  examples: string[];
  popularity: 'High' | 'Medium' | 'Growing';
  avgViews: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

const niches: NicheOption[] = [
  {
    id: 'reddit-stories',
    title: 'Reddit Stories',
    description: 'Engaging storytelling from popular Reddit posts',
    icon: MessageSquare,
    examples: ['AITA Stories', 'Relationship Drama', 'Revenge Stories', 'Workplace Stories'],
    popularity: 'High',
    avgViews: '100K - 1M',
    difficulty: 'Easy'
  },
  {
    id: 'motivational',
    title: 'Motivational Content',
    description: 'Inspiring quotes and success stories',
    icon: TrendingUp,
    examples: ['Daily Motivation', 'Success Stories', 'Mindset Tips', 'Life Lessons'],
    popularity: 'High',
    avgViews: '50K - 500K',
    difficulty: 'Medium'
  },
  {
    id: 'facts',
    title: 'Interesting Facts',
    description: 'Mind-blowing facts and trivia',
    icon: Lightbulb,
    examples: ['Science Facts', 'History Trivia', 'Psychology Facts', 'Animal Facts'],
    popularity: 'Medium',
    avgViews: '25K - 250K',
    difficulty: 'Easy'
  },
  {
    id: 'gaming',
    title: 'Gaming Content',
    description: 'Gaming tips, tricks, and highlights',
    icon: Gamepad2,
    examples: ['Game Tips', 'Epic Moments', 'Gaming News', 'Strategy Guides'],
    popularity: 'High',
    avgViews: '75K - 750K',
    difficulty: 'Medium'
  },
  {
    id: 'finance',
    title: 'Finance & Money',
    description: 'Financial advice and money-making tips',
    icon: DollarSign,
    examples: ['Investment Tips', 'Saving Hacks', 'Side Hustles', 'Market Updates'],
    popularity: 'Growing',
    avgViews: '30K - 300K',
    difficulty: 'Hard'
  }
];

interface NicheSelectorProps {
  onSelect: (niche: Niche) => void;
}

export const NicheSelector: React.FC<NicheSelectorProps> = ({ onSelect }) => {
  const getPopularityColor = (popularity: string) => {
    switch (popularity) {
      case 'High': return 'text-green-600 bg-green-50';
      case 'Medium': return 'text-yellow-600 bg-yellow-50';
      case 'Growing': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-600 bg-green-50';
      case 'Medium': return 'text-yellow-600 bg-yellow-50';
      case 'Hard': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Choose Your Niche
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Select the type of content you want to create for YouTube Shorts
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {niches.map((niche) => {
          const IconComponent = niche.icon;
          return (
            <Card 
              key={niche.id} 
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => onSelect(niche.id)}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <IconComponent className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {niche.title}
                </h3>
              </div>

              <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                {niche.description}
              </p>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {niche.avgViews}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${getPopularityColor(niche.popularity)}`}>
                      {niche.popularity}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(niche.difficulty)}`}>
                      {niche.difficulty}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Examples:</p>
                <div className="flex flex-wrap gap-1">
                  {niche.examples.slice(0, 2).map((example, index) => (
                    <span 
                      key={index}
                      className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full text-gray-600 dark:text-gray-400"
                    >
                      {example}
                    </span>
                  ))}
                  {niche.examples.length > 2 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      +{niche.examples.length - 2} more
                    </span>
                  )}
                </div>
              </div>

              <Button 
                className="w-full group-hover:bg-blue-600 transition-colors"
                variant="outline"
              >
                Select {niche.title}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}; 