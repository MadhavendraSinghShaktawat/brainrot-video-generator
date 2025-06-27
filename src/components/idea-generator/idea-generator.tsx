'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { StoryIdea, IdeaGenerationRequest } from '@/lib/openai';
import { GeneratedIdea, GeneratedScript } from '@/types/database';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  Eye,
  Heart,
  Users,
  Zap,
  Copy,
  Download,
  Settings,
  Star,
  Trash2,
  Calendar,
} from 'lucide-react';

export const IdeaGenerator: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [ideas, setIdeas] = useState<GeneratedIdea[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTone, setSelectedTone] = useState<'dramatic' | 'shocking' | 'emotional' | 'controversial' | 'inspiring'>('dramatic');
  const [selectedLength, setSelectedLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [selectedCount, setSelectedCount] = useState(10);

  const toneOptions = [
    { value: 'dramatic', label: 'Dramatic', icon: '🎭', description: 'High-stakes emotional stories' },
    { value: 'shocking', label: 'Shocking', icon: '⚡', description: 'Unexpected plot twists' },
    { value: 'emotional', label: 'Emotional', icon: '❤️', description: 'Heart-touching narratives' },
    { value: 'controversial', label: 'Controversial', icon: '🔥', description: 'Debate-sparking content' },
    { value: 'inspiring', label: 'Inspiring', icon: '✨', description: 'Uplifting triumph stories' },
  ] as const;

  const lengthOptions = [
    { value: 'short', label: 'Short', description: '30-60 seconds' },
    { value: 'medium', label: 'Medium', description: '1-3 minutes' },
    { value: 'long', label: 'Long', description: '3-5 minutes' },
  ] as const;

  const countOptions = [5, 10, 15, 20];

  const generateIdeas = async (): Promise<void> => {
    if (!user) {
      alert('Please log in to generate ideas.');
      return;
    }

    setLoading(true);
    try {
      const request: IdeaGenerationRequest = {
        count: selectedCount,
        tone: selectedTone,
        length: selectedLength,
      };

      const response = await fetch('/api/generate-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to generate ideas');
      }

      setIdeas(data.ideas);
    } catch (error) {
      console.error('Error generating ideas:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to generate ideas: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string): void => {
    navigator.clipboard.writeText(text);
  };

  const toggleFavorite = async (ideaId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/ideas/${ideaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: !ideas.find(i => i.id === ideaId)?.is_favorite }),
      });

      if (response.ok) {
        const { idea } = await response.json();
        setIdeas(prev => prev.map(i => i.id === ideaId ? idea : i));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const deleteIdea = async (ideaId: string): Promise<void> => {
    if (!confirm('Are you sure you want to delete this idea?')) return;
    
    try {
      const response = await fetch(`/api/ideas/${ideaId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setIdeas(prev => prev.filter(i => i.id !== ideaId));
      }
    } catch (error) {
      console.error('Error deleting idea:', error);
    }
  };

  const exportIdeas = (): void => {
    const exportData = {
      timestamp: new Date().toISOString(),
      settings: { tone: selectedTone, length: selectedLength, count: selectedCount },
      ideas: ideas,
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `viral-story-ideas-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateScript = async (ideaId: string): Promise<void> => {
    try {
      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ideaId,
          style: 'reddit',
          length: selectedLength,
          includeMetrics: true
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to generate script');
      }

      // Show the generated script in a modal or new page
      showScriptModal(data.script);
    } catch (error) {
      console.error('Error generating script:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to generate script: ${errorMessage}`);
    }
  };

  const showScriptModal = (script: GeneratedScript): void => {
    // Create a simple modal to display the script
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div class="p-6 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold text-gray-900 dark:text-white">Generated Script</h2>
            <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <div class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            ${script.word_count} words • ${script.estimated_duration} • ${script.style} style
          </div>
        </div>
        <div class="p-6 overflow-y-auto max-h-[60vh]">
          <div class="prose dark:prose-invert max-w-none">
            <h3 class="text-lg font-semibold mb-4">${script.title}</h3>
            <div class="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">
              ${script.script_content}
            </div>
          </div>
        </div>
        <div class="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <button onclick="navigator.clipboard.writeText(\`${script.script_content.replace(/`/g, '\\`')}\`); alert('Script copied to clipboard!')" 
                  class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Copy Script
          </button>
          <button onclick="this.closest('.fixed').remove()" 
                  class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
            Close
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Viral Story Idea Generator
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Generate highly engaging Reddit-style story ideas that are scientifically designed to go viral. 
          Our AI analyzes millions of successful stories to create content that resonates.
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Generation Settings</span>
          </CardTitle>
          <CardDescription>
            Customize your story ideas based on tone, length, and quantity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tone Selection */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">
              Story Tone
            </label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {toneOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={selectedTone === option.value ? 'default' : 'outline'}
                  onClick={() => setSelectedTone(option.value)}
                  className="flex flex-col items-center p-4 h-auto space-y-2"
                >
                  <span className="text-lg">{option.icon}</span>
                  <span className="text-sm font-medium">{option.label}</span>
                  <span className="text-xs text-gray-500 text-center">{option.description}</span>
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Length and Count */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">
                Story Length
              </label>
              <div className="grid grid-cols-3 gap-2">
                {lengthOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={selectedLength === option.value ? 'default' : 'outline'}
                    onClick={() => setSelectedLength(option.value)}
                    className="flex flex-col items-center p-3 h-auto space-y-1"
                  >
                    <span className="text-sm font-medium">{option.label}</span>
                    <span className="text-xs text-gray-500">{option.description}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">
                Number of Ideas
              </label>
              <div className="grid grid-cols-4 gap-2">
                {countOptions.map((count) => (
                  <Button
                    key={count}
                    variant={selectedCount === count ? 'default' : 'outline'}
                    onClick={() => setSelectedCount(count)}
                    className="p-3"
                  >
                    {count}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Generate Button */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {ideas.length > 0 && `${ideas.length} ideas generated`}
            </div>
            <div className="flex space-x-3">
              {ideas.length > 0 && (
                <Button variant="outline" onClick={exportIdeas}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Ideas
                </Button>
              )}
              <Button
                onClick={generateIdeas}
                disabled={loading || authLoading || !user}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : !user ? (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Login to Generate Ideas
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Generate Viral Ideas
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {ideas.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Generated Ideas
            </h2>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Sorted by viral potential
            </div>
          </div>

          <div className="grid gap-6">
            {ideas.map((idea, index) => (
              <Card key={idea.id || index} className="overflow-hidden border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg text-gray-900 dark:text-white mb-2">
                        {idea.title}
                      </CardTitle>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Eye className="h-4 w-4" />
                          <span>{idea.estimated_views}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users className="h-4 w-4" />
                          <span>{idea.target_audience}</span>
                        </div>
                        {idea.created_at && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(idea.created_at).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {idea.id && (
                        <>
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
                            onClick={() => deleteIdea(idea.id)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(idea.title)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Hook</h4>
                    <p className="text-gray-700 dark:text-gray-300 italic">"{idea.hook}"</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Story Summary</h4>
                    <p className="text-gray-700 dark:text-gray-300">{idea.story}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        Viral Factors
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

                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                        <Heart className="h-4 w-4 mr-1" />
                        Emotional Triggers
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

                  <div className="flex justify-end space-x-2 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => generateScript(idea.id)}
                      disabled={!user}
                    >
                      Generate Script
                    </Button>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                      Create Video
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {ideas.length === 0 && !loading && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Ready to Generate Viral Ideas?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Click the generate button to create story ideas that are designed to go viral based on successful patterns.
            </p>
            <Button
              onClick={generateIdeas}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            >
              <Zap className="h-4 w-4 mr-2" />
              Generate Your First Ideas
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 