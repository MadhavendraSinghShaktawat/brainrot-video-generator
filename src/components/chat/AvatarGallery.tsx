'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AvatarData } from '@/types/chat';
import { Check, User, Sparkles, Loader } from 'lucide-react';

interface AvatarGalleryData {
  totalCount: number;
  initialBatch: AvatarData[];
  allAvatars: AvatarData[];
}

interface AvatarGalleryProps {
  data: AvatarGalleryData | AvatarData[]; // Support both old and new format
  onAvatarSelect?: (avatar: AvatarData) => void;
  selectedAvatarId?: string;
  isLoading?: boolean;
}

/**
 * AvatarGallery - Scrollable interactive grid component for avatar selection with lazy loading
 * Features:
 * - Scrollable container for space efficiency
 * - Lazy loading with chunks as user scrolls
 * - Responsive grid layout with hover effects
 * - Selection state management
 * - Skeleton loading states
 * - Accessibility support
 */
const AvatarGallery: React.FC<AvatarGalleryProps> = ({
  data,
  onAvatarSelect,
  selectedAvatarId,
  isLoading = false
}) => {
  const [displayedAvatars, setDisplayedAvatars] = useState<AvatarData[]>([]);
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadedFromAllAvatars, setLoadedFromAllAvatars] = useState(0); // Track how many we've loaded from allAvatars
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const CHUNK_SIZE = 12;

  // Parse data based on format (old array or new object)
  const avatarsData = React.useMemo(() => {
    if (Array.isArray(data)) {
      // Old format - convert to new format (excluding initial batch from allAvatars to prevent duplicates)
      return {
        totalCount: data.length,
        initialBatch: data.slice(0, CHUNK_SIZE),
        allAvatars: data.slice(CHUNK_SIZE)
      };
    }
    return data;
  }, [data]);

  // Initialize displayed avatars
  useEffect(() => {
    if (avatarsData) {
      setDisplayedAvatars(avatarsData.initialBatch);
      
      // allAvatars now contains only remaining avatars (excluding initial batch)
      setHasMore(avatarsData.allAvatars.length > 0);
      
      // Reset loading state and tracking
      setIsLoadingMore(false);
      setLoadedFromAllAvatars(0);
    }
  }, [avatarsData]);

  // Load more avatars
  const loadMoreAvatars = useCallback(() => {
    if (!avatarsData || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    
    // Simulate network delay for better UX
    setTimeout(() => {
      // Use tracking variable to get next chunk (prevents duplicates)
      const nextChunk = avatarsData.allAvatars.slice(loadedFromAllAvatars, loadedFromAllAvatars + CHUNK_SIZE);
      
      if (nextChunk.length > 0) {
        // Filter out duplicates before adding
        setDisplayedAvatars(prev => {
          const prevIds = prev.map(a => a.id);
          const uniqueNewAvatars = nextChunk.filter(avatar => !prevIds.includes(avatar.id));
          return [...prev, ...uniqueNewAvatars];
        });
        
        // Update tracking and check if there are more avatars to load
        const newLoadedCount = loadedFromAllAvatars + nextChunk.length;
        setLoadedFromAllAvatars(newLoadedCount);
        setHasMore(newLoadedCount < avatarsData.allAvatars.length);
      } else {
        setHasMore(false);
      }
      
      setIsLoadingMore(false);
    }, 300);
  }, [avatarsData, loadedFromAllAvatars, hasMore, isLoadingMore]);

  // Scroll event handler for lazy loading
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || !hasMore || isLoadingMore) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    // Load more when user scrolls to 80% of the container
    if (scrollPercentage > 0.8) {
      loadMoreAvatars();
    }
  }, [hasMore, isLoadingMore, loadMoreAvatars]);

  // Attach scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const handleAvatarClick = (avatar: AvatarData) => {
    onAvatarSelect?.(avatar);
  };

  const handleImageLoad = (avatarId: string) => {
    setLoadingImages(prev => {
      const next = new Set(prev);
      next.delete(avatarId);
      return next;
    });
  };

  const handleImageError = (avatarId: string) => {
    setLoadingImages(prev => {
      const next = new Set(prev);
      next.delete(avatarId);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl">
        <div className="h-80 bg-white/5 rounded-xl border border-white/10 p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square bg-white/10 rounded-xl animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!avatarsData || displayedAvatars.length === 0) {
    return (
      <div className="w-full max-w-4xl">
        <div className="h-80 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center">
          <div className="text-center">
            <User className="w-12 h-12 text-white/40 mx-auto mb-4" />
            <p className="text-white/60 text-sm">No avatars available at the moment.</p>
            <p className="text-white/40 text-xs mt-2">Please check your configuration or try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl">
      {/* Header */}
      <div className="flex items-center space-x-2 mb-4">
        <Sparkles className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-semibold text-white">Choose Your Avatar</h3>
        <span className="text-sm text-white/60">
          ({displayedAvatars.length} of {avatarsData.initialBatch.length + avatarsData.allAvatars.length} loaded)
        </span>
      </div>

      {/* Scrollable Avatar Container */}
      <div 
        ref={scrollContainerRef}
        className="h-80 bg-white/5 rounded-xl border border-white/10 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
      >
        {/* Avatar Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {displayedAvatars.map((avatar, index) => {
            const isSelected = selectedAvatarId === avatar.id;
            const isImageLoading = loadingImages.has(avatar.id);

            return (
              <button
                key={avatar.id}
                onClick={() => handleAvatarClick(avatar)}
                className={`
                  group relative aspect-square rounded-lg overflow-hidden border-2 transition-all duration-300
                  ${isSelected 
                    ? 'border-purple-400 bg-purple-500/20 scale-105' 
                    : 'border-white/10 hover:border-white/30 hover:scale-102'
                  }
                  focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-slate-900
                `}
                aria-label={`Select ${avatar.name} avatar`}
              >
                {/* Avatar Image */}
                <div className="relative w-full h-full bg-gradient-to-br from-slate-800 to-slate-900">
                  {avatar.preview_image_url || avatar.thumbnail_url ? (
                    <>
                      <img
                        src={avatar.preview_image_url || avatar.thumbnail_url}
                        alt={avatar.name}
                        className={`
                          w-full h-full object-cover transition-opacity duration-300
                          ${isImageLoading ? 'opacity-0' : 'opacity-100'}
                        `}
                        onLoad={() => handleImageLoad(avatar.id)}
                        onError={() => handleImageError(avatar.id)}
                      />
                      {isImageLoading && (
                        <div className="absolute inset-0 bg-white/5 animate-pulse" />
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-6 h-6 text-white/40" />
                    </div>
                  )}

                  {/* Overlay */}
                  <div className={`
                    absolute inset-0 bg-black/20 transition-opacity duration-300
                    ${isSelected ? 'opacity-30' : 'opacity-0 group-hover:opacity-20'}
                  `} />

                  {/* Selection Check */}
                  {isSelected && (
                    <div className="absolute top-1 right-1">
                      <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Hover Effect */}
                  <div className={`
                    absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent 
                    transition-opacity duration-300
                    ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                  `} />
                </div>

                {/* Avatar Info */}
                <div className={`
                  absolute bottom-0 left-0 right-0 p-2 text-left transition-transform duration-300
                  ${isSelected ? 'translate-y-0' : 'translate-y-2 group-hover:translate-y-0'}
                `}>
                  <h4 className="font-medium text-white text-xs truncate">
                    {avatar.name}
                  </h4>
                </div>
              </button>
            );
          })}
        </div>

        {/* Loading More Indicator */}
        {isLoadingMore && hasMore && (
          <div className="flex items-center justify-center py-6">
            <Loader className="w-5 h-5 animate-spin text-purple-400 mr-2" />
            <span className="text-sm text-white/60">Loading more avatars...</span>
          </div>
        )}

        {/* End of Results */}
        {!hasMore && displayedAvatars.length > CHUNK_SIZE && (
          <div className="text-center py-4">
            <p className="text-xs text-white/40">
              You've seen all {avatarsData.initialBatch.length + avatarsData.allAvatars.length} available avatars! 
              {(avatarsData.initialBatch.length + avatarsData.allAvatars.length) < avatarsData.totalCount && (
                <span className="block mt-1">({avatarsData.totalCount - (avatarsData.initialBatch.length + avatarsData.allAvatars.length)} more available via search)</span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Scroll Hint */}
      {hasMore && displayedAvatars.length <= CHUNK_SIZE && (
        <div className="mt-2 text-center">
          <p className="text-xs text-white/50">
            💡 Scroll down to load more avatars
          </p>
        </div>
      )}

      {/* Footer */}
      {selectedAvatarId && (
        <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/10">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-green-400" />
            <span className="text-sm text-white/90">
              Avatar selected: {displayedAvatars.find(a => a.id === selectedAvatarId)?.name}
            </span>
          </div>
          <p className="text-xs text-white/60 mt-1">
            You can now choose a voice or continue with script generation.
          </p>
        </div>
      )}
    </div>
  );
};

export default AvatarGallery; 