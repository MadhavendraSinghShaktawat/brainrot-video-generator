'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface AutomationStatus {
  scriptId: string;
  title: string;
  hasAudio: boolean;
  hasVideo: boolean;
  videoUrl?: string;
  duration?: string;
  createdAt: string;
}

interface AutomationProgress {
  automationId: string;
  progress: number;
  completed: number;
  total: number;
  status: AutomationStatus[];
  isComplete: boolean;
}

interface AutomationDashboardProps {
  automationId: string;
  onClose?: () => void;
}

export function AutomationDashboard({ automationId, onClose }: AutomationDashboardProps) {
  const [progress, setProgress] = useState<AutomationProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = async () => {
    try {
      const response = await fetch(`/api/automate-reddit-story?automationId=${automationId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch progress');
      }
      const data = await response.json();
      setProgress(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
    
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchProgress, 10000);
    
    return () => clearInterval(interval);
  }, [automationId]);

  if (loading) {
    return (
      <Card className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-center gap-3">
          <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
          <span className="text-gray-600 dark:text-gray-400">Loading automation status...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 max-w-4xl mx-auto border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/30">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">Error</h3>
        </div>
        <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
        <Button onClick={fetchProgress} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </Card>
    );
  }

  if (!progress) {
    return null;
  }

  const getStatusIcon = (status: AutomationStatus) => {
    if (status.hasVideo) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
    if (status.hasAudio) {
      return <Clock className="h-5 w-5 text-blue-600 animate-pulse" />;
    }
    return <RefreshCw className="h-5 w-5 text-gray-400 animate-spin" />;
  };

  const getStatusText = (status: AutomationStatus) => {
    if (status.hasVideo) return 'Completed';
    if (status.hasAudio) return 'Generating Video';
    return 'Generating Audio';
  };

  return (
    <Card className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Full Automation Progress
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Automation ID: {automationId}
          </p>
        </div>
        {onClose && (
          <Button onClick={onClose} variant="outline" size="sm">
            Close
          </Button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Overall Progress
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {progress.completed}/{progress.total} completed
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress.progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>0%</span>
          <span className="font-medium">{progress.progress}%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Status Messages */}
      {progress.isComplete && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-green-800 dark:text-green-200 font-medium">
              🎉 All videos have been generated successfully!
            </span>
          </div>
        </div>
      )}

      {/* Individual Story Status */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Story Progress
        </h3>
        {progress.status.map((status, index) => (
          <Card key={status.scriptId} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(status)}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Story {index + 1}: {status.title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {getStatusText(status)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {status.duration && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {status.duration}
                  </span>
                )}
                {status.hasVideo && status.videoUrl && (
                  <Button
                    onClick={() => window.open(status.videoUrl, '_blank')}
                    size="sm"
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Watch
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Refresh Button */}
      <div className="mt-6 text-center">
        <Button
          onClick={fetchProgress}
          variant="outline"
          className="hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Status
        </Button>
      </div>
    </Card>
  );
} 