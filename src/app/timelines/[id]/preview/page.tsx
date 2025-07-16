'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Timeline } from '@/types/timeline';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Edit, Download, Play, Pause, Volume2, VolumeX, AlertCircle } from 'lucide-react';

export default function TimelinePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const timelineId = params.id as string;
  
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [timelineTitle, setTimelineTitle] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  // Load timeline data
  useEffect(() => {
    const loadTimeline = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/timelines/${timelineId}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load timeline');
        }
        
        if (!data.timeline) {
          throw new Error('Timeline data not found');
        }
        
        setTimeline(data.timeline.data);
        setTimelineTitle(data.timeline.title);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load timeline');
        console.error('Error loading timeline:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (timelineId) {
      loadTimeline();
    }
  }, [timelineId]);

  // Calculate timeline duration
  const getDurationInSeconds = () => {
    if (!timeline) return 0;
    const maxFrame = Math.max(...timeline.events.map(e => e.end), 0);
    return Math.round(maxFrame / timeline.fps);
  };

  // Format time display
  const formatTime = (frame: number) => {
    if (!timeline) return '00:00';
    const seconds = Math.round(frame / timeline.fps);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get timeline statistics
  const getTimelineStats = () => {
    if (!timeline) return { videos: 0, audios: 0, images: 0, captions: 0 };
    
    const stats = { videos: 0, audios: 0, images: 0, captions: 0 };
    timeline.events.forEach(event => {
      switch (event.type) {
        case 'video':
          stats.videos++;
          break;
        case 'audio':
          stats.audios++;
          break;
        case 'image':
          stats.images++;
          break;
        case 'caption':
          stats.captions++;
          break;
      }
    });
    return stats;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading timeline...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Failed to Load Timeline
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <div className="flex justify-center space-x-3">
            <Button variant="outline" onClick={() => router.back()}>
              Go Back
            </Button>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const stats = getTimelineStats();
  const duration = getDurationInSeconds();
  const maxFrame = timeline ? Math.max(...timeline.events.map(e => e.end), 0) : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {timelineTitle || 'Timeline Preview'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                ID: {timelineId}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/timelines/${timelineId}/edit-json`)}
              className="flex items-center space-x-2"
            >
              <Edit className="h-4 w-4" />
              <span>Edit JSON</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
              onClick={() => {
                // TODO: Implement download functionality
                console.log('Download timeline');
              }}
            >
              <Download className="h-4 w-4" />
              <span>Download</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Preview Area */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Timeline Preview
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Note: Full video preview with Remotion Player will be implemented in task 5.4
                </p>
              </div>

              {/* Placeholder for video preview */}
              <div 
                className="bg-black rounded-lg flex items-center justify-center text-white mb-4"
                style={{
                  aspectRatio: timeline ? `${timeline.width}/${timeline.height}` : '16/9',
                  minHeight: '300px'
                }}
              >
                <div className="text-center">
                  <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Video Preview</p>
                  <p className="text-sm opacity-75">
                    {timeline?.width}x{timeline?.height} • {timeline?.fps}fps
                  </p>
                </div>
              </div>

              {/* Playback Controls */}
              <div className="space-y-4">
                {/* Progress Bar */}
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400 w-12">
                    {formatTime(currentFrame)}
                  </span>
                  <div className="flex-1 relative">
                    <input
                      type="range"
                      min="0"
                      max={maxFrame}
                      value={currentFrame}
                      onChange={(e) => setCurrentFrame(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400 w-12">
                    {formatTime(maxFrame)}
                  </span>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-center space-x-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="flex items-center space-x-2"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="h-4 w-4" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        <span>Play</span>
                      </>
                    )}
                  </Button>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsMuted(!isMuted)}
                      className="p-2"
                    >
                      {isMuted ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </Button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => {
                        const newVolume = parseFloat(e.target.value);
                        setVolume(newVolume);
                        setIsMuted(newVolume === 0);
                      }}
                      className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Timeline Info */}
          <div className="space-y-6">
            {/* Timeline Stats */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Timeline Stats
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Duration</span>
                  <span className="font-medium">{duration}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Resolution</span>
                  <span className="font-medium">{timeline?.width}x{timeline?.height}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Frame Rate</span>
                  <span className="font-medium">{timeline?.fps} FPS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Events</span>
                  <span className="font-medium">{timeline?.events.length || 0}</span>
                </div>
              </div>
            </Card>

            {/* Asset Breakdown */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Asset Breakdown
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Videos</span>
                  <span className="font-medium">{stats.videos}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Audio</span>
                  <span className="font-medium">{stats.audios}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Images</span>
                  <span className="font-medium">{stats.images}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Captions</span>
                  <span className="font-medium">{stats.captions}</span>
                </div>
              </div>
            </Card>

            {/* Timeline Events */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Timeline Events
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {timeline?.events.map((event, index) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        event.type === 'video' ? 'bg-blue-500' :
                        event.type === 'audio' ? 'bg-green-500' :
                        event.type === 'image' ? 'bg-purple-500' :
                        event.type === 'caption' ? 'bg-yellow-500' : 'bg-gray-500'
                      }`} />
                      <span className="text-sm font-medium">{event.type}</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTime(event.start)} - {formatTime(event.end)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 