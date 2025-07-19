'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { VoiceData } from '@/types/chat';
import { Play, Pause, Volume2, Check, Globe, User, Loader } from 'lucide-react';

interface VoiceSelectorData {
  totalCount: number;
  initialBatch: VoiceData[];
  allVoices: VoiceData[];
}

interface VoiceSelectorProps {
  data: VoiceSelectorData | VoiceData[]; // Support both old and new format
  onVoiceSelect?: (voice: VoiceData) => void;
  selectedVoiceId?: string;
  isLoading?: boolean;
}

/**
 * VoiceSelector - Scrollable interactive list component for voice selection with lazy loading
 * Features:
 * - Scrollable container for space efficiency
 * - Lazy loading with chunks as user scrolls
 * - Audio preview with play/pause controls
 * - Language grouping and filtering
 * - Selection state management
 * - Accessibility support
 */
const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  data,
  onVoiceSelect,
  selectedVoiceId,
  isLoading = false
}) => {
  const [displayedVoices, setDisplayedVoices] = useState<VoiceData[]>([]);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadedFromAllVoices, setLoadedFromAllVoices] = useState(0); // Track how many we've loaded from allVoices
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const CHUNK_SIZE = 8;

  // Parse data based on format (old array or new object)
  const voicesData = React.useMemo(() => {
    if (Array.isArray(data)) {
      // Old format - convert to new format (excluding initial batch from allVoices to prevent duplicates)
      return {
        totalCount: data.length,
        initialBatch: data.slice(0, CHUNK_SIZE),
        allVoices: data.slice(CHUNK_SIZE)
      };
    }
    return data;
  }, [data]);

  // Initialize displayed voices
  useEffect(() => {
    if (voicesData) {
      setDisplayedVoices(voicesData.initialBatch);
      
      // allVoices now contains only remaining voices (excluding initial batch)
      setHasMore(voicesData.allVoices.length > 0);
      
      // Reset loading state and tracking
      setIsLoadingMore(false);
      setLoadedFromAllVoices(0);
    }
  }, [voicesData]);

  // Load more voices
  const loadMoreVoices = useCallback(() => {
    if (!voicesData || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    
    // Simulate network delay for better UX
    setTimeout(() => {
      // Use tracking variable to get next chunk (prevents duplicates)
      const nextChunk = voicesData.allVoices.slice(loadedFromAllVoices, loadedFromAllVoices + CHUNK_SIZE);
      
      if (nextChunk.length > 0) {
        // Filter out duplicates before adding
        setDisplayedVoices(prev => {
          const prevIds = prev.map(v => v.id);
          const uniqueNewVoices = nextChunk.filter(voice => !prevIds.includes(voice.id));
          return [...prev, ...uniqueNewVoices];
        });
        
        // Update tracking and check if there are more voices to load
        const newLoadedCount = loadedFromAllVoices + nextChunk.length;
        setLoadedFromAllVoices(newLoadedCount);
        setHasMore(newLoadedCount < voicesData.allVoices.length);
      } else {
        setHasMore(false);
      }
      
      setIsLoadingMore(false);
    }, 300);
  }, [voicesData, loadedFromAllVoices, hasMore, isLoadingMore]);

  // Scroll event handler for lazy loading
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || !hasMore || isLoadingMore) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    // Load more when user scrolls to 80% of the container
    if (scrollPercentage > 0.8) {
      loadMoreVoices();
    }
  }, [hasMore, isLoadingMore, loadMoreVoices]);

  // Attach scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Group voices by language
  const voicesByLanguage = displayedVoices.reduce((acc, voice) => {
    const lang = voice.language || 'Unknown';
    if (!acc[lang]) acc[lang] = [];
    acc[lang].push(voice);
    return acc;
  }, {} as Record<string, VoiceData[]>);

  const languages = Object.keys(voicesByLanguage).sort();
  const filteredVoices = selectedLanguage === 'all' 
    ? displayedVoices 
    : voicesByLanguage[selectedLanguage] || [];

  const handleVoiceSelect = (voice: VoiceData) => {
    onVoiceSelect?.(voice);
  };

  const handlePlayPreview = async (voice: VoiceData) => {
    if (!voice.preview_audio_url) {
      console.warn('No preview audio URL available for voice:', voice.name);
      return;
    }

    // Stop current audio if playing
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    if (playingVoiceId === voice.id) {
      setPlayingVoiceId(null);
      setCurrentAudio(null);
      return;
    }

    try {
      const audio = new Audio();
      
      // Better CORS and loading handling
      audio.crossOrigin = 'anonymous';
      audio.preload = 'none'; // Don't preload to avoid CORS issues
      
      audioRef.current = audio;
      setCurrentAudio(audio);
      setPlayingVoiceId(voice.id);

      // Set up event listeners before setting src
      audio.addEventListener('ended', () => {
        setPlayingVoiceId(null);
        setCurrentAudio(null);
      });

      audio.addEventListener('error', (e) => {
        console.error('Error playing audio for voice:', voice.name, e);
        
        // Try without CORS as fallback
        if (audio.crossOrigin && voice.preview_audio_url) {
          console.log('Retrying without CORS for:', voice.name);
          audio.crossOrigin = null;
          audio.src = voice.preview_audio_url;
          return;
        }
        
        setPlayingVoiceId(null);
        setCurrentAudio(null);
        
        // Show user-friendly error
        alert(`Unable to play preview for ${voice.name}. This voice might not have a working preview.`);
      });

      audio.addEventListener('canplay', () => {
        console.log('Audio ready to play for:', voice.name);
      });

      audio.addEventListener('loadstart', () => {
        console.log('Started loading audio for:', voice.name);
      });

      // Validate URL format
      if (!voice.preview_audio_url) {
        throw new Error('No preview URL available');
      }
      
      const url = new URL(voice.preview_audio_url);
      if (!url.protocol.startsWith('http')) {
        throw new Error('Invalid audio URL');
      }

      // Set source and play
      audio.src = voice.preview_audio_url;
      
      // Add a timeout for loading
      const playTimeout = setTimeout(() => {
        console.warn('Audio loading timeout for:', voice.name);
        setPlayingVoiceId(null);
        setCurrentAudio(null);
      }, 10000); // 10 second timeout

      audio.addEventListener('loadeddata', () => {
        clearTimeout(playTimeout);
      });

      await audio.play();
      
    } catch (error: any) {
      console.error('Error playing voice preview:', error);
      setPlayingVoiceId(null);
      setCurrentAudio(null);
      
      // More specific error messages
      if (error?.name === 'NotAllowedError') {
        alert('Audio playback blocked. Please enable audio autoplay in your browser.');
      } else if (error?.name === 'NotSupportedError') {
        alert(`Audio format not supported for ${voice.name}.`);
      } else {
        alert(`Unable to play preview for ${voice.name}. Please try another voice.`);
      }
    }
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl">
        <div className="h-80 bg-white/5 rounded-xl border border-white/10 p-4">
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-16 bg-white/10 rounded-xl animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!voicesData || displayedVoices.length === 0) {
    return (
      <div className="w-full max-w-4xl">
        <div className="h-80 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center">
          <div className="text-center">
            <Volume2 className="w-12 h-12 text-white/40 mx-auto mb-4" />
            <p className="text-white/60 text-sm">No voices available at the moment.</p>
            <p className="text-white/40 text-xs mt-2">Please check your configuration or try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Volume2 className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Choose Your Voice</h3>
          <span className="text-sm text-white/60">
            ({filteredVoices.length} of {voicesData.initialBatch.length + voicesData.allVoices.length} loaded)
          </span>
        </div>

        {/* Language Filter */}
        {languages.length > 1 && (
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4 text-white/60" />
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="all">All Languages</option>
              {languages.map((lang) => (
                <option key={lang} value={lang} className="bg-slate-800">
                  {lang} ({voicesByLanguage[lang].length})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Scrollable Voice Container */}
      <div 
        ref={scrollContainerRef}
        className="h-80 bg-white/5 rounded-xl border border-white/10 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
      >
        {/* Voice List */}
        <div className="space-y-3">
          {filteredVoices.map((voice, index) => {
            const isSelected = selectedVoiceId === voice.id;
            const isPlaying = playingVoiceId === voice.id;

            return (
              <div
                key={voice.id}
                className={`
                  group relative p-3 rounded-lg border-2 transition-all duration-300
                  ${isSelected 
                    ? 'border-purple-400 bg-purple-500/20' 
                    : 'border-white/10 hover:border-white/30 bg-white/5 hover:bg-white/10'
                  }
                `}
              >
                <div className="flex items-center space-x-3">
                  {/* Play Button */}
                  <button
                    onClick={() => handlePlayPreview(voice)}
                    disabled={!voice.preview_audio_url}
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                      ${voice.preview_audio_url 
                        ? 'bg-purple-500 hover:bg-purple-600 text-white hover:scale-110' 
                        : 'bg-white/10 text-white/40 cursor-not-allowed'
                      }
                      ${isPlaying ? 'animate-pulse' : ''}
                      focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-slate-900
                    `}
                    aria-label={`Preview ${voice.name} voice`}
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4 ml-0.5" />
                    )}
                  </button>

                  {/* Voice Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-white text-sm">
                        {voice.name}
                      </h4>
                      {voice.gender && (
                        <span className="text-xs px-2 py-0.5 bg-white/10 rounded-full text-white/70">
                          {voice.gender}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-3 text-xs text-white/60">
                      <span className="flex items-center space-x-1">
                        <Globe className="w-3 h-3" />
                        <span>{voice.language}</span>
                      </span>
                      {voice.accent && (
                        <span>Accent: {voice.accent}</span>
                      )}
                    </div>

                    {voice.sample_text && (
                      <p className="text-xs text-white/50 mt-1 italic line-clamp-1">
                        "{voice.sample_text}"
                      </p>
                    )}
                  </div>

                  {/* Select Button */}
                  <button
                    onClick={() => handleVoiceSelect(voice)}
                    className={`
                      px-3 py-1.5 rounded-lg font-medium text-sm transition-all duration-300
                      ${isSelected
                        ? 'bg-green-500 text-white'
                        : 'bg-purple-500 hover:bg-purple-600 text-white hover:scale-105'
                      }
                      focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-slate-900
                    `}
                    aria-label={`Select ${voice.name} voice`}
                  >
                    {isSelected ? (
                      <div className="flex items-center space-x-1">
                        <Check className="w-3 h-3" />
                        <span>Selected</span>
                      </div>
                    ) : (
                      'Select'
                    )}
                  </button>
                </div>

                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute top-1 right-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Loading More Indicator */}
        {isLoadingMore && hasMore && (
          <div className="flex items-center justify-center py-6">
            <Loader className="w-5 h-5 animate-spin text-purple-400 mr-2" />
            <span className="text-sm text-white/60">Loading more voices...</span>
          </div>
        )}

        {/* End of Results */}
        {!hasMore && displayedVoices.length > CHUNK_SIZE && (
          <div className="text-center py-4">
            <p className="text-xs text-white/40">
              You've seen all {voicesData.initialBatch.length + voicesData.allVoices.length} available voices!
              {(voicesData.initialBatch.length + voicesData.allVoices.length) < voicesData.totalCount && (
                <span className="block mt-1">({voicesData.totalCount - (voicesData.initialBatch.length + voicesData.allVoices.length)} more available via search)</span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Scroll Hint */}
      {hasMore && displayedVoices.length <= CHUNK_SIZE && (
        <div className="mt-2 text-center">
          <p className="text-xs text-white/50">
            💡 Scroll down to load more voices
          </p>
        </div>
      )}

      {/* Footer */}
      {selectedVoiceId && (
        <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/10">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-green-400" />
            <span className="text-sm text-white/90">
              Voice selected: {displayedVoices.find(v => v.id === selectedVoiceId)?.name}
            </span>
          </div>
          <p className="text-xs text-white/60 mt-1">
            You can now continue with script generation or start creating your video.
          </p>
        </div>
      )}

      {/* Language Summary */}
      {selectedLanguage === 'all' && languages.length > 1 && (
        <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/10">
          <h4 className="text-sm font-medium text-white mb-2">Available Languages:</h4>
          <div className="flex flex-wrap gap-2">
            {languages.map((lang) => (
              <button
                key={lang}
                onClick={() => setSelectedLanguage(lang)}
                className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded-full text-white/70 hover:text-white transition-colors"
              >
                {lang} ({voicesByLanguage[lang].length})
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceSelector; 