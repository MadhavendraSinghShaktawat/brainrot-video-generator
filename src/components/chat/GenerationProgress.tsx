'use client';

import React, { useState, useEffect } from 'react';
import { GenerationProgressData } from '@/types/chat';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Play, 
  Download,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface GenerationProgressProps {
  data: GenerationProgressData;
  onRetry?: () => void;
  onCancel?: () => void;
  onComplete?: (videoUrl: string) => void;
}

/**
 * GenerationProgress - Real-time progress component for avatar video generation
 * Features:
 * - Animated progress bar with status updates
 * - Estimated time remaining
 * - Status-specific UI states and actions
 * - Auto-refresh and completion handling
 */
const GenerationProgress: React.FC<GenerationProgressProps> = ({
  data,
  onRetry,
  onCancel,
  onComplete
}) => {
  const [localProgress, setLocalProgress] = useState(data.progress || 0);
  const [timeElapsed, setTimeElapsed] = useState(0);

  const { jobId, status, progress, message, estimatedTimeRemaining, outputUrl } = data;

  // Auto-increment progress for visual effect when processing
  useEffect(() => {
    if (status === 'processing' && progress !== undefined) {
      const interval = setInterval(() => {
        setLocalProgress(prev => {
          const target = progress || 0;
          const diff = target - prev;
          if (Math.abs(diff) < 1) return target;
          return prev + (diff * 0.1); // Smooth animation towards target
        });
      }, 100);

      return () => clearInterval(interval);
    } else {
      setLocalProgress(progress || 0);
    }
  }, [progress, status]);

  // Track elapsed time
  useEffect(() => {
    if (status === 'processing' || status === 'queued') {
      const interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [status]);

  // Handle completion
  useEffect(() => {
    if (status === 'completed' && outputUrl) {
      onComplete?.(outputUrl);
    }
  }, [status, outputUrl, onComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'queued':
        return {
          icon: Clock,
          iconColor: 'text-yellow-400',
          bgColor: 'bg-yellow-500/20',
          borderColor: 'border-yellow-400/30',
          title: 'Queued',
          description: 'Your video is in the generation queue...',
          showProgress: false,
        };
      
      case 'processing':
        return {
          icon: Loader2,
          iconColor: 'text-purple-400',
          bgColor: 'bg-purple-500/20',
          borderColor: 'border-purple-400/30',
          title: 'Generating Video',
          description: 'AI is creating your avatar video...',
          showProgress: true,
        };
      
      case 'completed':
        return {
          icon: CheckCircle,
          iconColor: 'text-green-400',
          bgColor: 'bg-green-500/20',
          borderColor: 'border-green-400/30',
          title: 'Video Ready!',
          description: 'Your avatar video has been generated successfully.',
          showProgress: false,
        };
      
      case 'failed':
        return {
          icon: XCircle,
          iconColor: 'text-red-400',
          bgColor: 'bg-red-500/20',
          borderColor: 'border-red-400/30',
          title: 'Generation Failed',
          description: 'Something went wrong during video generation.',
          showProgress: false,
        };
      
      default:
        return {
          icon: AlertCircle,
          iconColor: 'text-gray-400',
          bgColor: 'bg-gray-500/20',
          borderColor: 'border-gray-400/30',
          title: 'Unknown Status',
          description: 'Status update pending...',
          showProgress: false,
        };
    }
  };

  const statusConfig = getStatusConfig();
  const IconComponent = statusConfig.icon;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className={`
        relative p-6 rounded-xl border-2 transition-all duration-300
        ${statusConfig.bgColor} ${statusConfig.borderColor}
      `}>
        {/* Header */}
        <div className="flex items-center space-x-4 mb-4">
          <div className={`
            w-12 h-12 rounded-full flex items-center justify-center
            ${statusConfig.bgColor}
          `}>
            <IconComponent 
              className={`w-6 h-6 ${statusConfig.iconColor} ${
                status === 'processing' ? 'animate-spin' : ''
              }`} 
            />
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">
              {statusConfig.title}
            </h3>
            <p className="text-sm text-white/70">
              {message || statusConfig.description}
            </p>
          </div>

          {/* Job ID */}
          <div className="text-right">
            <p className="text-xs text-white/50">Job ID</p>
            <p className="text-xs font-mono text-white/70">
              {jobId.slice(-8)}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        {statusConfig.showProgress && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-white/70">Progress</span>
              <span className="text-sm font-medium text-white">
                {Math.round(localProgress)}%
              </span>
            </div>
            
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300 ease-out"
                style={{ width: `${localProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Time Information */}
        <div className="flex justify-between items-center text-sm text-white/60 mb-4">
          <div className="flex items-center space-x-4">
            <span>Elapsed: {formatTime(timeElapsed)}</span>
            {estimatedTimeRemaining && status === 'processing' && (
              <span>ETA: {formatTime(estimatedTimeRemaining)}</span>
            )}
          </div>
          
          {status === 'processing' && (
            <div className="flex items-center space-x-1">
              <div className="w-1 h-1 bg-purple-400 rounded-full animate-ping" />
              <span className="text-xs">Live</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          {status === 'failed' && onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
          )}
          
          {status === 'completed' && outputUrl && (
            <div className="flex space-x-2">
              <button
                onClick={() => window.open(outputUrl, '_blank')}
                className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                <Play className="w-4 h-4" />
                <span>Play</span>
              </button>
              
              <button
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = outputUrl;
                  a.download = `avatar-video-${jobId}.mp4`;
                  a.click();
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
            </div>
          )}
          
          {(status === 'queued' || status === 'processing') && onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white/70 hover:text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Status Pulse Animation */}
        {status === 'processing' && (
          <div className="absolute -top-1 -left-1 -right-1 -bottom-1 rounded-xl border-2 border-purple-400/30 animate-pulse pointer-events-none" />
        )}
      </div>

      {/* Additional Info */}
      {status === 'failed' && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-400/20 rounded-lg">
          <h4 className="text-sm font-medium text-red-300 mb-2">Troubleshooting</h4>
          <ul className="text-xs text-red-200/70 space-y-1">
            <li>• Check if your script content is appropriate</li>
            <li>• Verify avatar and voice selections are valid</li>
            <li>• Try with a shorter script if the current one is very long</li>
            <li>• Contact support if the issue persists</li>
          </ul>
        </div>
      )}
      
      {status === 'completed' && (
        <div className="mt-4 p-4 bg-green-500/10 border border-green-400/20 rounded-lg">
          <h4 className="text-sm font-medium text-green-300 mb-2">What's Next?</h4>
          <p className="text-xs text-green-200/70">
            Your video is ready! You can play it, download it for offline use, or create another video with different settings.
          </p>
        </div>
      )}
    </div>
  );
};

export default GenerationProgress; 