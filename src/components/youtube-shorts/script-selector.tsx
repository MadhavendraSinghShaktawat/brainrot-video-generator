'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  Search,
  Filter,
  Calendar,
  RefreshCw
} from 'lucide-react';

interface Script {
  id: string;
  title: string;
  content: string;
  created_at: string;
  audio_url?: string;
  hasAudio: boolean;
  duration?: string;
  wordCount: number;
}

interface ScriptSelectorProps {
  onSelect: (scriptId: string) => void;
  selectedScriptId?: string;
}

export const ScriptSelector: React.FC<ScriptSelectorProps> = ({ onSelect, selectedScriptId }) => {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAudio, setFilterAudio] = useState<'all' | 'with-audio' | 'without-audio'>('all');

  useEffect(() => {
    fetchScripts();
  }, []);

  const fetchScripts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/scripts/check');
      if (!response.ok) {
        throw new Error('Failed to fetch scripts');
      }
      const data = await response.json();
      setScripts(data.scripts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scripts');
    } finally {
      setLoading(false);
    }
  };

  const filteredScripts = scripts.filter(script => {
    const matchesSearch = script.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         script.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterAudio === 'all' || 
                         (filterAudio === 'with-audio' && script.hasAudio) ||
                         (filterAudio === 'without-audio' && !script.hasAudio);
    
    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading scripts...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <p className="text-red-600">Error loading scripts: {error}</p>
          <Button onClick={fetchScripts} variant="outline">
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search scripts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={filterAudio}
            onChange={(e) => setFilterAudio(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Scripts</option>
            <option value="with-audio">With Audio</option>
            <option value="without-audio">Without Audio</option>
          </select>
        </div>
      </div>

      {filteredScripts.length === 0 ? (
        <Card className="p-6">
          <div className="text-center space-y-4">
            <FileText className="h-12 w-12 text-gray-400 mx-auto" />
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No scripts found</h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm || filterAudio !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Create some scripts first to use this feature'
                }
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredScripts.map((script) => (
            <Card 
              key={script.id}
              className={`p-4 hover:shadow-lg transition-all cursor-pointer ${
                selectedScriptId === script.id ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
              onClick={() => onSelect(script.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                    {script.title}
                  </h3>
                </div>
                {selectedScriptId === script.id && (
                  <CheckCircle2 className="h-5 w-5 text-blue-500" />
                )}
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {truncateContent(script.content)}
              </p>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(script.created_at)}
                </div>
                <div className="flex items-center gap-2">
                  <span>{script.wordCount} words</span>
                  {script.hasAudio && (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                      Has Audio
                    </span>
                  )}
                </div>
              </div>

              {script.hasAudio && script.duration && (
                <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  {script.duration}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {selectedScriptId && (
        <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-medium">Script selected</span>
          </div>
          <p className="text-sm text-green-600 dark:text-green-400 mt-1">
            Your selected script will be used for video generation
          </p>
        </Card>
      )}
    </div>
  );
}; 