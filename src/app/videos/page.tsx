'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Video, Play, Clock, Calendar, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

interface GeneratedVideo {
  id: string;
  videoUrl: string;
  duration: string;
  createdAt: string;
  script: {
    id: string;
    title: string;
    content: string;
  };
}

interface ScriptWithAudio {
  id: string;
  title: string;
  content: string;
  hasAudio: boolean;
  createdAt: string;
  wordCount: number;
}

export default function VideosPage() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<GeneratedVideo[]>([]);
  const [scripts, setScripts] = useState<ScriptWithAudio[]>([]);
  const [selectedScript, setSelectedScript] = useState<string>('');
  const [backgroundVideo, setBackgroundVideo] = useState<string>('subwaySurfer.mp4');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchVideos();
      fetchScripts();
    }
  }, [user]);

  const fetchVideos = async () => {
    try {
      const response = await fetch('/api/videos');
      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }
      const data = await response.json();
      setVideos(data.videos || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
      setError('Failed to load videos');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchScripts = async () => {
    try {
      const response = await fetch('/api/scripts/check');
      if (!response.ok) {
        throw new Error('Failed to fetch scripts');
      }
      const data = await response.json();
      setScripts(data.scripts || []);
    } catch (error) {
      console.error('Error fetching scripts:', error);
    }
  };

  const generateVideo = async () => {
    if (!selectedScript) {
      setError('Please select a script first');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scriptId: selectedScript,
          backgroundVideo: backgroundVideo,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate video');
      }

      const data = await response.json();
      
      // Refresh videos list
      await fetchVideos();
      
      // Reset form
      setSelectedScript('');
      
      // Show success message
      setError(null);
      
    } catch (error) {
      console.error('Error generating video:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate video');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const scriptsWithAudio = scripts.filter(script => script.hasAudio);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              🎬 Video Generation
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Create stunning short videos with AI-generated subtitles
            </p>
          </div>

          {/* Video Generation Form */}
          <Card className="mb-8 shadow-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Generate New Video
              </CardTitle>
              <CardDescription>
                Select a script with audio to generate a video with AI subtitles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Script Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Script
                </label>
                <select
                  value={selectedScript}
                  onChange={(e) => setSelectedScript(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  disabled={isGenerating}
                >
                  <option value="">Choose a script with audio...</option>
                  {scriptsWithAudio.map((script) => (
                    <option key={script.id} value={script.id}>
                      {script.title} ({script.wordCount} words)
                    </option>
                  ))}
                </select>
                {scriptsWithAudio.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    No scripts with audio found. Please generate voice for your scripts first.
                  </p>
                )}
              </div>

              {/* Background Video Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Background Video
                </label>
                <select
                  value={backgroundVideo}
                  onChange={(e) => setBackgroundVideo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  disabled={isGenerating}
                >
                  <option value="subwaySurfer.mp4">Subway Surfer</option>
                  <option value="trackmania.mp4">Trackmania</option>
                </select>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
                </div>
              )}

              {/* Generate Button */}
              <Button
                onClick={generateVideo}
                disabled={isGenerating || !selectedScript || scriptsWithAudio.length === 0}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating Video...
                  </>
                ) : (
                  <>
                    <Video className="h-4 w-4 mr-2" />
                    Generate Video
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Generated Videos */}
          <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Generated Videos ({videos.length})
              </CardTitle>
              <CardDescription>
                Your recently generated videos with AI subtitles
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : videos.length === 0 ? (
                <div className="text-center py-12">
                  <Video className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No videos generated yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Generate your first video using the form above
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {videos.map((video) => (
                    <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-all duration-300">
                      <CardContent className="p-4">
                        <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg mb-4 flex items-center justify-center">
                          <video
                            src={video.videoUrl}
                            controls
                            className="w-full h-full object-cover rounded-lg"
                            preload="metadata"
                          />
                        </div>
                        <h3 className="font-medium text-gray-900 dark:text-white mb-2 line-clamp-2">
                          {video.script.title}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {video.duration}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(video.createdAt)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 