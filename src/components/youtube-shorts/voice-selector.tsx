'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Mic, 
  Play, 
  Pause, 
  CheckCircle2, 
  Search,
  Calendar,
  RefreshCw,
  Volume2
} from 'lucide-react';

interface VoiceFile {
  id: string;
  name: string;
  description: string;
  fileType?: string;
  fileSize?: number;
  duration?: number;
  createdAt?: string;
}

interface VoiceSelectorProps {
  onSelect: (voiceId: string) => void;
  selectedVoiceId?: string;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({ onSelect, selectedVoiceId }) => {
  const [voices, setVoices] = useState<VoiceFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    fetchVoices();
  }, []);

  const fetchVoices = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/voices?type=supabase');
      if (!response.ok) {
        throw new Error('Failed to fetch voices');
      }
      const data = await response.json();
      setVoices(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load voices');
    } finally {
      setLoading(false);
    }
  };

  const filteredVoices = voices.filter(voice =>
    voice.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading voices...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <p className="text-red-600">Error loading voices: {error}</p>
          <Button onClick={fetchVoices} variant="outline">
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search voices..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {filteredVoices.length === 0 ? (
        <Card className="p-6">
          <div className="text-center space-y-4">
            <Mic className="h-12 w-12 text-gray-400 mx-auto" />
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No voices found</h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm 
                  ? 'Try adjusting your search criteria'
                  : 'Generate some voice scripts first to use this feature'
                }
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredVoices.map((voice) => (
            <Card 
              key={voice.id}
              className={`p-4 hover:shadow-lg transition-all cursor-pointer ${
                selectedVoiceId === voice.id ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
              onClick={() => onSelect(voice.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-5 w-5 text-gray-400" />
                  <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                    {voice.name}
                  </h3>
                </div>
                {selectedVoiceId === voice.id && (
                  <CheckCircle2 className="h-5 w-5 text-blue-500" />
                )}
              </div>

              <div className="flex items-center justify-between mb-3">
                {/* No audio preview for Supabase voices */}
                <span className="text-sm text-gray-500">{voice.duration ? `${voice.duration}s` : ''}</span>
              </div>

              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="h-3 w-3" />
                {formatDate(voice.createdAt)}
              </div>
            </Card>
          ))}
        </div>
      )}

      {selectedVoiceId && (
        <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-medium">Voice selected</span>
          </div>
          <p className="text-sm text-green-600 dark:text-green-400 mt-1">
            Your selected voice will be used for video generation
          </p>
        </Card>
      )}
    </div>
  );
}; 