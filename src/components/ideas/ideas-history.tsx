'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { GeneratedIdea, GeneratedScript } from '@/types/database';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { ScriptViewer } from '@/components/scripts/script-viewer';
import {
  Search,
  Filter,
  Star,
  Calendar,
  Eye,
  Users,
  Trash2,
  Copy,
  Download,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ArrowUpDown,
  Heart,
  MoreVertical,
  FileText,
  Play,
  Loader,
  Film
} from 'lucide-react';

interface IdeasHistoryState {
  ideas: GeneratedIdea[];
  total: number;
  loading: boolean;
  searchTerm: string;
  favoriteOnly: boolean;
  sortBy: 'created_at' | 'title';
  sortOrder: 'asc' | 'desc';
  currentPage: number;
  itemsPerPage: number;
  scripts: Record<string, GeneratedScript | null>;
  scriptLoading: Record<string, boolean>;
  viewingScript: GeneratedScript | null;
  videoGenerating: Record<string, boolean>;
  videos: Record<string, any[]>;
  videoLoading: Record<string, boolean>;
}

export const IdeasHistory: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<IdeasHistoryState>({
    ideas: [],
    total: 0,
    loading: true,
    searchTerm: '',
    favoriteOnly: false,
    sortBy: 'created_at',
    sortOrder: 'desc',
    currentPage: 1,
    itemsPerPage: 20,
    scripts: {},
    scriptLoading: {},
    viewingScript: null,
    videoGenerating: {},
    videos: {},
    videoLoading: {},
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
  }, [user, router]);

  // Fetch ideas
  const fetchIdeas = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      const params = new URLSearchParams({
        limit: state.itemsPerPage.toString(),
        offset: ((state.currentPage - 1) * state.itemsPerPage).toString(),
        favoriteOnly: state.favoriteOnly.toString(),
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
        ...(state.searchTerm && { search: state.searchTerm }),
      });

      const response = await fetch(`/api/ideas?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Ideas fetched successfully:', data); // Debug log
        setState(prev => ({
          ...prev,
          ideas: data.ideas,
          total: data.total,
          loading: false,
        }));
      } else {
        console.error('Failed to fetch ideas, status:', response.status);
        setState(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('Error fetching ideas:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [
    state.itemsPerPage,
    state.currentPage,
    state.favoriteOnly,
    state.sortBy,
    state.sortOrder,
    state.searchTerm,
  ]);

  // Effect to fetch ideas when filters change
  useEffect(() => {
    if (user) {
      fetchIdeas();
    }
  }, [user, fetchIdeas]);

  // Toggle favorite
  const toggleFavorite = async (ideaId: string): Promise<void> => {
    try {
      const idea = state.ideas.find(i => i.id === ideaId);
      if (!idea) return;

      const response = await fetch(`/api/ideas/${ideaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: !idea.is_favorite }),
      });

      if (response.ok) {
        const { idea: updatedIdea } = await response.json();
        setState(prev => ({
          ...prev,
          ideas: prev.ideas.map(i => i.id === ideaId ? updatedIdea : i),
        }));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // Delete idea
  const deleteIdea = async (ideaId: string): Promise<void> => {
    if (!confirm('Are you sure you want to delete this idea?')) return;
    
    try {
      const response = await fetch(`/api/ideas/${ideaId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setState(prev => ({
          ...prev,
          ideas: prev.ideas.filter(i => i.id !== ideaId),
          total: prev.total - 1,
        }));
      }
    } catch (error) {
      console.error('Error deleting idea:', error);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string): void => {
    navigator.clipboard.writeText(text);
  };

  // Export ideas
  const exportIdeas = (): void => {
    const dataStr = JSON.stringify(state.ideas, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `viral-ideas-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Handle search
  const handleSearch = (term: string): void => {
    setState(prev => ({
      ...prev,
      searchTerm: term,
      currentPage: 1,
    }));
  };

  // Handle pagination
  const goToPage = (page: number): void => {
    setState(prev => ({ ...prev, currentPage: page }));
  };

  // Check scripts for current ideas
  const checkScripts = useCallback(async (): Promise<void> => {
    if (state.ideas.length === 0) return;
    
    try {
      const ideaIds = state.ideas.map(idea => idea.id);
      const response = await fetch('/api/scripts/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaIds }),
      });

      if (response.ok) {
        const { scripts } = await response.json();
        console.log('Scripts checked:', scripts); // Debug log
        setState(prev => ({
          ...prev,
          scripts: { ...prev.scripts, ...scripts },
        }));
        
        // Also fetch videos for scripts that exist
        Object.values(scripts).forEach((script: any) => {
          if (script) {
            fetchVideosForScript(script.id);
          }
        });
      } else {
        console.error('Failed to check scripts, status:', response.status);
      }
    } catch (error) {
      console.error('Error checking scripts:', error);
    }
  }, [state.ideas]);

  // Generate script for an idea
  const generateScript = async (ideaId: string): Promise<void> => {
    setState(prev => ({
      ...prev,
      scriptLoading: { ...prev.scriptLoading, [ideaId]: true },
    }));

    try {
      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ideaId,
          style: 'reddit',
          length: 'medium',
          includeMetrics: true,
        }),
      });

      if (response.ok) {
        const { script } = await response.json();
        setState(prev => ({
          ...prev,
          scripts: { ...prev.scripts, [ideaId]: script },
          scriptLoading: { ...prev.scriptLoading, [ideaId]: false },
        }));
      } else {
        console.error('Failed to generate script');
        setState(prev => ({
          ...prev,
          scriptLoading: { ...prev.scriptLoading, [ideaId]: false },
        }));
      }
    } catch (error) {
      console.error('Error generating script:', error);
      setState(prev => ({
        ...prev,
        scriptLoading: { ...prev.scriptLoading, [ideaId]: false },
      }));
    }
  };

  // View script
  const viewScript = (script: GeneratedScript): void => {
    setState(prev => ({ ...prev, viewingScript: script }));
  };

  // Close script viewer
  const closeScriptViewer = (): void => {
    setState(prev => ({ ...prev, viewingScript: null }));
  };

  // Check scripts when ideas change
  useEffect(() => {
    if (state.ideas.length > 0) {
      checkScripts();
    }
  }, [state.ideas, checkScripts]);

  // Fetch videos for a script
  const fetchVideosForScript = async (scriptId: string): Promise<void> => {
    setState(prev => ({ ...prev, videoLoading: { ...prev.videoLoading, [scriptId]: true }} as any));

    try {
      const response = await fetch(`/api/videos?script_id=${scriptId}`);
      if (response.ok) {
        const data = await response.json();
        setState(prev => ({ 
          ...prev, 
          videos: { ...prev.videos, [scriptId]: data.videos },
          videoLoading: { ...prev.videoLoading, [scriptId]: false }
        } as any));
      }
    } catch (err) {
      console.error('Error fetching videos:', err);
      setState(prev => ({ ...prev, videoLoading: { ...prev.videoLoading, [scriptId]: false }} as any));
    }
  };

  // Generate video for an idea
  const generateVideoForIdea = async (ideaId: string): Promise<void> => {
    const script = state.scripts[ideaId];
    if (!script || !(script as any).audio_url) return;
    setState(prev => ({ ...prev, videoGenerating: { ...prev.videoGenerating, [ideaId]: true }} as any));

    try {
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script_id: script.id,
          video_name: 'subwaySurfer.mp4',
          start_sec: 0
        })
      });
      if (response.ok) {
        alert('Video generated successfully!');
        // Fetch updated videos for this script
        await fetchVideosForScript(script.id);
      } else {
        const data = await response.json();
        alert('Video generation failed: '+data.error);
      }
    } catch(err) {
      console.error(err);
      alert('Video generation error');
    } finally {
      setState(prev => ({ ...prev, videoGenerating: { ...prev.videoGenerating, [ideaId]: false }} as any));
    }
  };

  const totalPages = Math.ceil(state.total / state.itemsPerPage);

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Ideas History
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your saved viral story ideas with search, filtering, and organization tools.
        </p>
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search ideas by title, hook, or story..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={state.searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <Button
                variant={state.favoriteOnly ? "default" : "outline"}
                onClick={() => setState(prev => ({
                  ...prev,
                  favoriteOnly: !prev.favoriteOnly,
                  currentPage: 1,
                }))}
              >
                <Star className={`h-4 w-4 mr-2 ${state.favoriteOnly ? 'fill-current' : ''}`} />
                Favorites
              </Button>

              <Button
                variant="outline"
                onClick={() => setState(prev => ({
                  ...prev,
                  sortOrder: prev.sortOrder === 'desc' ? 'asc' : 'desc',
                }))}
              >
                <ArrowUpDown className="h-4 w-4 mr-2" />
                {state.sortOrder === 'desc' ? 'Newest' : 'Oldest'}
              </Button>

              <Button
                variant="outline"
                onClick={fetchIdeas}
                disabled={state.loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${state.loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>

              <Button
                variant="outline"
                onClick={exportIdeas}
                disabled={state.ideas.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Ideas</p>
                <p className="text-2xl font-bold">{state.total}</p>
              </div>
              <Heart className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Favorites</p>
                <p className="text-2xl font-bold">
                  {state.ideas.filter(i => i.is_favorite).length}
                </p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">This Page</p>
                <p className="text-2xl font-bold">{state.ideas.length}</p>
              </div>
              <Eye className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ideas List */}
      {state.loading ? (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-500" />
          <p className="text-gray-600 dark:text-gray-400">Loading your ideas...</p>
        </div>
      ) : state.ideas.length === 0 ? (
        <div className="text-center py-12">
          <div className="mb-4">
            <Search className="h-16 w-16 mx-auto text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No ideas found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {state.searchTerm || state.favoriteOnly
              ? 'Try adjusting your search or filters.'
              : 'Generate your first viral story ideas to get started.'}
          </p>
          <Button onClick={() => router.push('/generate-ideas')}>
            Generate Ideas
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {state.ideas.map((idea) => (
            <Card key={idea.id} className="overflow-hidden border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg text-gray-900 dark:text-white mb-2">
                      {idea.title}
                    </CardTitle>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(idea.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Eye className="h-4 w-4" />
                        <span>{idea.estimated_views}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>{idea.target_audience}</span>
                      </div>
                      {idea.is_favorite && (
                        <div className="flex items-center space-x-1 text-yellow-600">
                          <Star className="h-4 w-4 fill-current" />
                          <span>Favorite</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* Script Button */}
                    {state.scripts[idea.id] ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewScript(state.scripts[idea.id]!)}
                        className="text-green-600 border-green-600 hover:bg-green-50"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        View Script
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateScript(idea.id)}
                        disabled={state.scriptLoading[idea.id]}
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      >
                        {state.scriptLoading[idea.id] ? (
                          <>
                            <Loader className="h-4 w-4 mr-1 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-1" />
                            Generate Script
                          </>
                        )}
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFavorite(idea.id)}
                      className={idea.is_favorite ? 'text-yellow-500' : 'text-gray-400'}
                    >
                      <Star className={`h-4 w-4 ${idea.is_favorite ? 'fill-current' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(idea.title)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteIdea(idea.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {state.scripts[idea.id]?.audio_url && (
                      <Button variant="outline" size="sm" onClick={() => generateVideoForIdea(idea.id)} disabled={state.videoGenerating?.[idea.id]} className="text-purple-600 border-purple-600 hover:bg-purple-50">
                        {state.videoGenerating?.[idea.id] ? (
                          <><Loader className="h-4 w-4 mr-1 animate-spin"/>Generating...</>
                        ) : (
                          <><Film className="h-4 w-4 mr-1"/>Generate Video</>
                        )}
                      </Button>
                    )}
                    {state.scripts[idea.id] && !state.videos[state.scripts[idea.id]?.id || ''] && !state.videoLoading?.[state.scripts[idea.id]?.id || ''] && (
                      <Button variant="outline" size="sm" onClick={() => fetchVideosForScript(state.scripts[idea.id]?.id || '')} className="text-blue-600 border-blue-600 hover:bg-blue-50">
                        <RefreshCw className="h-4 w-4 mr-1"/>
                        Check Videos
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Hook */}
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      Opening Hook
                    </h4>
                    <p className="text-gray-700 dark:text-gray-300 italic">
                      "{idea.hook}"
                    </p>
                  </div>

                  <Separator />

                  {/* Story */}
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      Story Summary
                    </h4>
                    <p className="text-gray-700 dark:text-gray-300">
                      {idea.story}
                    </p>
                  </div>

                  {/* Generated Voice (if available) */}
                  {state.scripts[idea.id]?.audio_url && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                        🔊 Voice Preview
                      </h4>
                      <audio controls className="w-full">
                        <source src={(state.scripts[idea.id] as any).audio_url} type="audio/wav" />
                      </audio>
                    </div>
                  )}

                  {/* Generated Videos (if available) */}
                  {state.scripts[idea.id] && state.videos[state.scripts[idea.id]?.id || ''] && state.videos[state.scripts[idea.id]?.id || ''].length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                        <Film className="h-4 w-4 mr-2"/>
                        🎬 Generated Videos ({state.videos[state.scripts[idea.id]?.id || ''].length})
                      </h4>
                      <div className="space-y-2">
                        {state.videos[state.scripts[idea.id]?.id || ''].map((video: any, index: number) => (
                          <div key={video.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                                <Play className="h-6 w-6 text-white"/>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">Video {index + 1}</p>
                                <p className="text-xs text-gray-500">
                                  Created {new Date(video.created_at).toLocaleDateString()}
                                  {video.duration && ` • ${video.duration}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => window.open(video.video_url, '_blank')}
                                className="text-blue-600 border-blue-600 hover:bg-blue-50"
                              >
                                <Eye className="h-4 w-4 mr-1"/>
                                Watch
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => {
                                  const a = document.createElement('a');
                                  a.href = video.video_url;
                                  a.download = `video-${index + 1}.mp4`;
                                  a.click();
                                }}
                                className="text-green-600"
                              >
                                <Download className="h-4 w-4"/>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Viral Factors */}
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                      🚀 Viral Factors
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {idea.viral_factors.map((factor: string, i: number) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full"
                        >
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Emotional Triggers */}
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                      💭 Emotional Triggers
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {idea.emotional_triggers.map((trigger: string, i: number) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs rounded-full"
                        >
                          {trigger}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-8">
          <Button
            variant="outline"
            disabled={state.currentPage === 1}
            onClick={() => goToPage(state.currentPage - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <div className="flex space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <Button
                  key={page}
                  variant={state.currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => goToPage(page)}
                >
                  {page}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            disabled={state.currentPage === totalPages}
            onClick={() => goToPage(state.currentPage + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Script Viewer Modal */}
      {state.viewingScript && (
        <ScriptViewer
          script={state.viewingScript}
          onClose={closeScriptViewer}
          onCopy={copyToClipboard}
        />
      )}
    </div>
  );
}; 