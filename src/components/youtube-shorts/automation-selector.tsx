'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Zap, 
  Settings, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Sparkles
} from 'lucide-react';

export type Niche = 'reddit-stories' | 'motivational' | 'facts' | 'gaming' | 'finance';
export type AutomationLevel = 'full' | 'partial';

interface AutomationOption {
  id: AutomationLevel;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  features: string[];
  timeEstimate: string;
  pros: string[];
  cons: string[];
  recommended: boolean;
}

const automationOptions: AutomationOption[] = [
  {
    id: 'full',
    title: 'Full Automation',
    description: 'Complete hands-off video creation from start to finish',
    icon: Zap,
    features: [
      'AI generates topic ideas',
      'Auto-creates engaging scripts',
      'Generates natural voice',
      'Selects background video',
      'Adds subtitles & effects',
      'Optimizes for YouTube'
    ],
    timeEstimate: '5-10 minutes',
    pros: [
      'Zero manual work required',
      'Consistent content creation',
      'Great for beginners',
      'Scalable production'
    ],
    cons: [
      'Less creative control',
      'Generic content possible',
      'May need fine-tuning'
    ],
    recommended: true
  },
  {
    id: 'partial',
    title: 'Partial Automation',
    description: 'Use your existing content with AI automation',
    icon: Settings,
    features: [
      'Use your existing scripts',
      'Leverage generated voices',
      'Custom content control',
      'Flexible workflow',
      'Quality assurance',
      'Brand consistency'
    ],
    timeEstimate: '10-15 minutes',
    pros: [
      'Full creative control',
      'Use existing assets',
      'Higher quality output',
      'Brand consistency'
    ],
    cons: [
      'Requires existing content',
      'More time investment',
      'Manual oversight needed'
    ],
    recommended: false
  }
];

interface AutomationSelectorProps {
  niche: Niche;
  onSelect: (automation: AutomationLevel) => void;
}

export const AutomationSelector: React.FC<AutomationSelectorProps> = ({ niche, onSelect }) => {
  const getNicheName = (niche: Niche) => {
    return niche.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Choose Automation Level
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          How much control do you want over your {getNicheName(niche)} content?
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {automationOptions.map((option) => {
          const IconComponent = option.icon;
          return (
            <Card 
              key={option.id}
              className={`p-6 hover:shadow-lg transition-all cursor-pointer group relative ${
                option.recommended ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
              }`}
              onClick={() => onSelect(option.id)}
            >
              {option.recommended && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Recommended
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-lg ${
                  option.recommended ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-50 dark:bg-gray-800'
                }`}>
                  <IconComponent className={`h-6 w-6 ${
                    option.recommended ? 'text-blue-600' : 'text-gray-600'
                  }`} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {option.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">{option.timeEstimate}</span>
                  </div>
                </div>
              </div>

              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {option.description}
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Features:</h4>
                  <ul className="space-y-1">
                    {option.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Pros
                    </h4>
                    <ul className="space-y-1">
                      {option.pros.map((pro, index) => (
                        <li key={index} className="text-sm text-gray-600 dark:text-gray-400">
                          • {pro}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      Cons
                    </h4>
                    <ul className="space-y-1">
                      {option.cons.map((con, index) => (
                        <li key={index} className="text-sm text-gray-600 dark:text-gray-400">
                          • {con}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <Button 
                className={`w-full group-hover:scale-105 transition-transform ${
                  option.recommended ? 'bg-blue-600 hover:bg-blue-700' : ''
                }`}
                variant={option.recommended ? "default" : "outline"}
              >
                Choose {option.title}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}; 