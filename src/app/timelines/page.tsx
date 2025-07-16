'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Plus, 
  Edit, 
  Play, 
  Trash2, 
  Search, 
  Calendar,
  Video,
  Music,
  Image,
  MessageSquare,
  FileText,
  MoreHorizontal,
  AlertCircle
} from 'lucide-react';
import { Timeline } from '@/types/timeline';

interface TimelineWithMeta {
  id: string;
  title: string;
  data: Timeline;
  created_at: string;
  updated_at: string;
}

interface TimelineStats {
  videosCount: number;
  audiosCount: number;
  imagesCount: number;
  captionsCount: number;
  duration: number; // in seconds
}

export default function TimelinesPage() {
  const router = useRouter();
  const [timelines, setTimelines] = useState<TimelineWithMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Load timelines
  useEffect(() => {
    loadTimelines();
  }, []);

  const loadTimelines = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/timelines');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load timelines');
      }

      setTimelines(data.timelines || []);
    } catch (err) {
      console.error('Error loading timelines:', err);
      setError(err instanceof Error ? err.message : 'Failed to load timelines');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete timeline
  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsDeleting(id);
      
      const response = await fetch(`/api/timelines/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete timeline');
      }

      // Remove from local state
      setTimelines(prev => prev.filter(t => t.id !== id));
      
    } catch (err) {
      console.error('Error deleting timeline:', err);
      alert('Failed to delete timeline. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  // Calculate timeline stats
  const getTimelineStats = (timeline: Timeline): TimelineStats => {
    const stats = {
      videosCount: 0,
      audiosCount: 0,
      imagesCount: 0,
      captionsCount: 0,
      duration: 0,
    };

    timeline.events.forEach(event => {
      switch (event.type) {
        case 'video':
          stats.videosCount++;
          break;
        case 'audio':
          stats.audiosCount++;
          break;
        case 'image':
          stats.imagesCount++;
          break;
        case 'caption':
          stats.captionsCount++;
          break;
      }
    });

    // Calculate duration (max end frame / fps)
    const maxFrame = Math.max(...timeline.events.map(e => e.end), 0);
    stats.duration = Math.round(maxFrame / timeline.fps);

    return stats;
  };

  // Filter timelines based on search
  const filteredTimelines = timelines.filter(timeline =>
    timeline.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading timelines...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Timelines
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your video timelines and projects
            </p>
          </div>
          
          <Button
            onClick={() => router.push('/editor')}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>New Timeline</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search timelines..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <p className="text-red-700 dark:text-red-300">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={loadTimelines}
                className="ml-auto"
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredTimelines.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchTerm ? 'No matching timelines' : 'No timelines yet'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchTerm 
                ? `No timelines found matching "${searchTerm}"`
                : 'Get started by creating your first timeline project'
              }
            </p>
            {!searchTerm && (
              <Button
                onClick={() => router.push('/editor')}
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Create Timeline</span>
              </Button>
            )}
          </div>
        )}

        {/* Timeline Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTimelines.map((timeline) => {
            const stats = getTimelineStats(timeline.data);
            const formattedDate = new Date(timeline.updated_at).toLocaleDateString();
            
            return (
              <Card key={timeline.id} className="p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 truncate">
                      {timeline.title}
                    </h3>
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>{formattedDate}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/editor?id=${timeline.id}`)}
                      className="p-2"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/timelines/${timeline.id}/preview`)}
                      className="p-2"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(timeline.id, timeline.title)}
                      disabled={isDeleting === timeline.id}
                      className="p-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Timeline Stats */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Duration</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {stats.duration}s
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Resolution</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {timeline.data.width}x{timeline.data.height}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">FPS</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {timeline.data.fps}
                    </span>
                  </div>

                  {/* Asset counts */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-4 text-sm">
                      {stats.videosCount > 0 && (
                        <div className="flex items-center space-x-1">
                          <Video className="h-4 w-4 text-blue-500" />
                          <span>{stats.videosCount}</span>
                        </div>
                      )}
                      {stats.audiosCount > 0 && (
                        <div className="flex items-center space-x-1">
                          <Music className="h-4 w-4 text-green-500" />
                          <span>{stats.audiosCount}</span>
                        </div>
                      )}
                      {stats.imagesCount > 0 && (
                        <div className="flex items-center space-x-1">
                          <Image className="h-4 w-4 text-purple-500" />
                          <span>{stats.imagesCount}</span>
                        </div>
                      )}
                      {stats.captionsCount > 0 && (
                        <div className="flex items-center space-x-1">
                          <MessageSquare className="h-4 w-4 text-yellow-500" />
                          <span>{stats.captionsCount}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
} 