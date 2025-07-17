import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import clsx from 'clsx';
import { useTimelineStore } from '@/store/timeline-store';
import { Timeline as TimelineType } from '@/types/timeline';
import { getTimelineDuration } from '@/lib/timeline-utils';
import { Button } from '@/components/ui/button';
import { Play, Pause, SkipBack, SkipForward, ZoomIn, ZoomOut } from 'lucide-react';

// Lightweight video wrapper that only seeks when out-of-sync and uses native playback
const VideoElement: React.FC<{ src: string; relTime: number; isPlaying: boolean }> = React.memo(({ src, relTime, isPlaying }) => {
  const vidRef = React.useRef<HTMLVideoElement | null>(null);

  // Sync play / pause
  useEffect(() => {
    const el = vidRef.current;
    if (!el) return;
    if (isPlaying) {
      // small tolerance seek once every update
      if (Math.abs(el.currentTime - relTime) > 0.1) {
        el.currentTime = relTime;
      }
      el.play().catch(() => {});
    } else {
      el.pause();
      el.currentTime = relTime;
    }
  }, [relTime, isPlaying]);

  return (
    <video
      ref={vidRef}
      src={src}
      muted
      preload="auto"
      playsInline
      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
    />
  );
});

interface PreviewPlayerProps {
  timeline: TimelineType | null;
}

const PreviewPlayer: React.FC<PreviewPlayerProps> = ({ timeline }) => {
  const {
    currentFrame,
    setCurrentFrame,
    isPlaying,
    setIsPlaying,
    selectedEventId,
    selectEvent,
    updateEvent,
    zoom,
    setZoom,
  } = useTimelineStore();

  // --- Preview scale (zoom) ---
  const [scaleMode, setScaleMode] = useState<'fit' | '1' | '0.75' | '0.5' | '0.25'>('fit');
  const [autoScale, setAutoScale] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // (Old computeFitScale and effects removed in favour of quality-aware version below)

  const previewScale = scaleMode === 'fit' ? autoScale : parseFloat(scaleMode);

  // --- Preview quality (down-sample resolution) ---
  const [quality, setQuality] = useState<'low' | 'medium' | 'high' | 'original'>('high');

  // Detect low-power devices and lower default quality/FPS
  useEffect(() => {
    const cores = (navigator as any).hardwareConcurrency ?? 2;
    if (cores <= 4) {
      // medium res & 15fps give good perf on dual-core machines
      setQuality('medium');
      setPreviewFps(15);
    }
  }, []);

  // --- Preview framerate (UI + transform updates) ---
  const [previewFps, setPreviewFps] = useState<number>(30); // 15 / 24 / 30

  const qualityScale = React.useMemo(() => {
    switch (quality) {
      case 'low':
        return 0.25; // 25% of original → ~480p for 1080p source
      case 'medium':
        return 0.5; // 720p for 1080p source
      case 'high':
        return 0.75; // 810p
      case 'original':
      default:
        return 1;
    }
  }, [quality]);

  // Scaled composition dimensions (actual pixel resolution that videos/images are rendered at)
  const scaledWidth = timeline ? timeline.width * qualityScale : 0;
  const scaledHeight = timeline ? timeline.height * qualityScale : 0;

  // Re-compute fit scale based on scaled dimensions
  const computeFitScale = () => {
    if (!containerRef.current || !timeline) return 1;
    const { clientWidth, clientHeight } = containerRef.current;
    return Math.min(clientWidth / scaledWidth, clientHeight / scaledHeight);
  };

  // Use effect remains but depends on qualityScale too
  useLayoutEffect(() => {
    if (scaleMode !== 'fit') return;
    setAutoScale(computeFitScale());
  }, [scaleMode, timeline, scaledWidth, scaledHeight]);

  // Listen to window resize so "Fit" stays correct
  useEffect(() => {
    if (scaleMode !== 'fit') return;
    const onResize = () => {
      if (scaleMode !== 'fit') return;
      setAutoScale(computeFitScale());
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [scaleMode, timeline, scaledWidth, scaledHeight]);

  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const frameRef = useRef<number>(currentFrame);
  const nextUiUpdateRef = useRef<number>(0);
  const elementsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  // keep ref in sync
  useEffect(() => {
    frameRef.current = currentFrame;
  }, [currentFrame]);

  // --- Playback loop ---
  useEffect(() => {
    if (!timeline) return;

    const fps = timeline.fps;
    const maxFrame = getTimelineDuration(timeline);

    const tick = (now: number) => {
      if (!isPlaying) return;

      if (!lastTimeRef.current) lastTimeRef.current = now;
      const deltaSec = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      // advance internal frame counter
      frameRef.current += deltaSec * fps;

      // Clamp / stop at end
      if (frameRef.current >= maxFrame) {
        frameRef.current = maxFrame;
        setIsPlaying(false);
      }

      // Throttle UI & transform updates to `previewFps`
      const interval = 1000 / previewFps;
      if (now >= nextUiUpdateRef.current) {
        nextUiUpdateRef.current = now + interval;
        setCurrentFrame(frameRef.current);
        updateTransforms();
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    if (isPlaying) {
      rafRef.current = requestAnimationFrame(tick);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTimeRef.current = 0;
    };
  }, [isPlaying, timeline, setCurrentFrame, setIsPlaying]);

  // --- Determine which events are visible at the current frame ---
  const visibleEvents = React.useMemo(() => {
    if (!timeline) return [] as TimelineType['events'];
    return timeline.events.filter(
      (e) => currentFrame >= e.start && currentFrame < e.end
    );
  }, [timeline, currentFrame]);

  // Sort by layer so higher layer appears on top
  const sortedVisible = React.useMemo(() => {
    // Higher layer number should appear on top, so sort descending
    return [...visibleEvents].sort((a, b) => (b.layer ?? 1) - (a.layer ?? 1));
  }, [visibleEvents]);

  // Imperatively update transforms every animation frame to avoid React churn
  const updateTransforms = React.useCallback(() => {
    if (!timeline) return;
    const compW = scaledWidth;
    const compH = scaledHeight;
    // Update only visible events to cut JS work on mobile
    visibleEvents.forEach((event) => {
      // Only update if element is mounted (visible)
      const el = elementsRef.current.get(event.id);
      if (!el) return;
      const offsetX = (event.xPct ?? 0) * compW;
      const offsetY = (event.yPct ?? 0) * compH;
      el.style.transform = `translate(-50%,-50%) translate(${offsetX}px, ${offsetY}px) scale(${event.scale ?? 1})`;
    });
  }, [timeline, visibleEvents, scaledWidth, scaledHeight]);

  if (!timeline) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black rounded-lg text-gray-400">
        No timeline loaded
      </div>
    );
  }

  const fps = timeline.fps;
  const durationSeconds = getTimelineDuration(timeline) / fps;
  const currentSeconds = currentFrame / fps;

  const renderEvent = (event: any) => {
    const isSelected = selectedEventId === event.id;
    const relTime = ((event.trimIn ?? 0) + (frameRef.current - event.start)) / fps;

    // Handle drag to move (update x,y)
    const handleDragStart = (e: React.PointerEvent) => {
      e.stopPropagation();
      selectEvent(event.id);
      const startX = e.clientX;
      const startY = e.clientY;
      let liveXPct = event.xPct ?? 0;
      let liveYPct = event.yPct ?? 0;

      const onMove = (mv: PointerEvent) => {
        const deltaX = (mv.clientX - startX) / previewScale;
        const deltaY = (mv.clientY - startY) / previewScale;
        const compW = scaledWidth;
        const compH = scaledHeight;
        const dxPct = deltaX / compW;
        const dyPct = deltaY / compH;
        liveXPct = Math.max(-0.5, Math.min(0.5, (event.xPct ?? 0) + dxPct));
        liveYPct = Math.max(-0.5, Math.min(0.5, (event.yPct ?? 0) + dyPct));
        // Live update transform directly for smoothness
        const el = elementsRef.current.get(event.id);
        if (el) {
          el.style.transform = `translate(-50%,-50%) translate(${liveXPct * (timeline?.width ?? 1920)}px, ${liveYPct * (timeline?.height ?? 1080)}px) scale(${event.scale ?? 1})`;
        }
      };

      const onUp = () => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        // Commit single state update and history entry
        updateEvent(event.id, { xPct: liveXPct, yPct: liveYPct });
      };

      document.addEventListener('pointermove', onMove, { passive: false });
      document.addEventListener('pointerup', onUp, { passive: false });
    };

    const offsetX = (event.xPct ?? 0) * scaledWidth;
    const offsetY = (event.yPct ?? 0) * scaledHeight;

    const wrapperStyle: React.CSSProperties = {
      position: 'absolute',
      top: '50%',
      left: '50%',
      // initial transform; will be updated imperatively each tick
      transform: `translate(-50%,-50%) translate(${offsetX}px, ${offsetY}px) scale(${event.scale ?? 1})`,
      cursor: 'move',
      maxWidth: '100%',
      maxHeight: '100%',
      border: isSelected ? '1px dashed #00ffff' : 'none',
      willChange: 'transform',
      contain: 'layout paint',
    };

    let media: React.ReactNode;
    if (event.type === 'video') {
      media = (
        <VideoElement
          src={event.src}
          relTime={relTime}
          isPlaying={isPlaying}
        />
      );
    } else if (event.type === 'image') {
      media = (
        <img
          src={event.src}
          alt="frame"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      );
    } else if (event.type === 'caption') {
      media = (
        <div
          style={{
            color: 'white',
            fontSize: '48px',
            fontWeight: 'bold',
            textShadow: '2px 2px 4px rgba(0,0,0,0.75)',
            pointerEvents: 'none',
            whiteSpace: 'pre-line',
          }}
        >
          {event.text}
        </div>
      );
    } else {
      // Unsupported or audio-only event – render nothing.
      media = null;
    }

    return (
      <div
        ref={(el) => {
          if (el) {
            elementsRef.current.set(event.id, el);
          } else {
            elementsRef.current.delete(event.id);
          }
        }}
        key={event.id}
        onPointerDown={handleDragStart}
        style={wrapperStyle}
        className={clsx(isSelected && 'select-none')}
      >
        {media}
        {/* Resize handle */}
        {isSelected && (
          <div
            onPointerDown={(e) => {
              e.stopPropagation();
              const startX = e.clientX;
              let liveScale = event.scale ?? 1;
              const onMove = (mv: PointerEvent) => {
                const delta = (mv.clientX - startX) / previewScale;
                liveScale = Math.max(0.1, (event.scale ?? 1) + delta / 200);
                const el = elementsRef.current.get(event.id);
                if (el) {
                  const compW = scaledWidth;
                  const compH = scaledHeight;
                  const offsetX = (event.xPct ?? 0) * compW;
                  const offsetY = (event.yPct ?? 0) * compH;
                  el.style.transform = `translate(-50%,-50%) translate(${offsetX}px, ${offsetY}px) scale(${liveScale})`;
                }
              };
              const onUp = () => {
                document.removeEventListener('pointermove', onMove);
                document.removeEventListener('pointerup', onUp);
                updateEvent(event.id, { scale: liveScale });
              };
              document.addEventListener('pointermove', onMove, { passive: false });
              document.addEventListener('pointerup', onUp, { passive: false });
            }}
            className="absolute right-0 bottom-0 w-3 h-3 bg-blue-500 cursor-se-resize"
          />
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col bg-black rounded-lg">
      {/* Preview Canvas */}
      <div
        ref={containerRef}
        className="flex-1 bg-black flex items-center justify-center overflow-hidden"
      >
        {timeline && (
          <div
            style={{
              width: scaledWidth,
              height: scaledHeight,
              position: 'relative',
              transform: `scale(${previewScale})`,
              transformOrigin: 'center center',
              border: '2px dashed rgba(255,255,255,0.4)',
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
          >
            {sortedVisible.map(renderEvent)}
          </div>
        )}
      </div>

      {/* Transport */}
      <div className="p-3 bg-gray-900 flex items-center gap-3">
        {/* Skip Back */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentFrame(Math.max(0, currentFrame - fps))}
          className="p-2"
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-2"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        {/* Skip Forward */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentFrame(Math.min(getTimelineDuration(timeline), currentFrame + fps))}
          className="p-2"
        >
          <SkipForward className="h-4 w-4" />
        </Button>

        {/* Preview scale selector */}
        <select
          value={scaleMode}
          onChange={(e) => setScaleMode(e.target.value as any)}
          className="bg-gray-800 text-gray-200 text-xs rounded px-2 py-1 focus:outline-none"
        >
          <option value="fit">Fit</option>
          <option value="1">100%</option>
          <option value="0.75">75%</option>
          <option value="0.5">50%</option>
          <option value="0.25">25%</option>
        </select>

        {/* Quality selector */}
        <select
          value={quality}
          onChange={(e) => setQuality(e.target.value as any)}
          className="bg-gray-800 text-gray-200 text-xs rounded px-2 py-1 focus:outline-none"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="original">Original</option>
        </select>

        {/* FPS selector */}
        <select
          value={previewFps}
          onChange={(e) => setPreviewFps(parseInt(e.target.value, 10))}
          className="bg-gray-800 text-gray-200 text-xs rounded px-2 py-1 focus:outline-none"
        >
          <option value={15}>15 fps</option>
          <option value={24}>24 fps</option>
          <option value={30}>30 fps</option>
        </select>

        {/* Zoom Out */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
          className="p-2"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>

        {/* Zoom In */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setZoom(Math.min(4, zoom + 0.25))}
          className="p-2"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>

        {/* Simple progress */}
        <div className="flex-1 mx-4 h-1 bg-gray-700 rounded-full relative">
          <div
            className="absolute top-0 left-0 h-1 bg-blue-500 rounded-full"
            style={{ width: `${(currentFrame / getTimelineDuration(timeline)) * 100}%` }}
          />
        </div>

        <span className="text-xs text-gray-400">
          {currentSeconds.toFixed(2)} / {durationSeconds.toFixed(2)}s
        </span>
      </div>
    </div>
  );
};

export default PreviewPlayer; 