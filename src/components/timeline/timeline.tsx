'use client';

import React, { useMemo } from 'react';
import { Timeline as TimelineType, TimelineEvent } from '@/types/timeline';
import { Video, Music, Image, MessageSquare, Scissors } from 'lucide-react';
import { useTimelineStore } from '@/store/timeline-store';

interface TimelineProps {
  timeline?: TimelineType;
  className?: string;
  zoom?: number;
  style?: React.CSSProperties;
}

interface Track {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'image' | 'caption' | 'transition';
  layer: number;
  events: TimelineEvent[];
  color: string;
  icon: React.ReactNode;
}

const BASE_PIXELS_PER_SECOND = 60; // Base scale factor for timeline visualization
const TRACK_HEIGHT = 40;
const RULER_HEIGHT = 30;

const getEventColor = (type: TimelineEvent['type']): string => {
  switch (type) {
    case 'video':
      return 'bg-blue-500';
    case 'audio':
      return 'bg-green-500';
    case 'image':
      return 'bg-purple-500';
    case 'caption':
      return 'bg-yellow-500';
    case 'transition':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
};

const getEventIcon = (type: TimelineEvent['type']): React.ReactNode => {
  switch (type) {
    case 'video':
      return <Video className="h-3 w-3" />;
    case 'audio':
      return <Music className="h-3 w-3" />;
    case 'image':
      return <Image className="h-3 w-3" />;
    case 'caption':
      return <MessageSquare className="h-3 w-3" />;
    case 'transition':
      return <Scissors className="h-3 w-3" />;
    default:
      return null;
  }
};

// === Playhead (current cursor) ===
const Playhead: React.FC<{
  fps: number;
  currentFrame: number;
  zoom: number;
}> = ({ fps, currentFrame, zoom }) => {
  const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoom;
  const left = (currentFrame / fps) * pixelsPerSecond;

  return (
    <div
      className="absolute top-0 bottom-0 w-px bg-white pointer-events-none select-none"
      style={{ left }}
    >
      {/* Triangle/handle */}
      <div
        className="absolute -top-2 -left-2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-white"
      />
    </div>
  );
};

// Utility to convert pixel position to frame number
const pixelToFrame = (
  pixelX: number,
  fps: number,
  zoom: number
): number => {
  const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoom;
  const seconds = pixelX / pixelsPerSecond;
  return Math.round(seconds * fps);
};

const TimeRuler: React.FC<{ fps: number; maxFrames: number; zoom: number }> = ({ fps, maxFrames, zoom }) => {
  const maxSeconds = Math.ceil(maxFrames / fps);
  const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoom;
  const tickMarks = useMemo(() => {
    const marks = [];
    for (let sec = 0; sec <= maxSeconds; sec++) {
      marks.push(sec);
    }
    return marks;
  }, [maxSeconds]);

  return (
    <div className="relative" style={{ height: RULER_HEIGHT }}>
      <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600">
        <div className="relative h-full">
          {tickMarks.map((sec) => (
            <div
              key={sec}
              className="absolute top-0 h-full border-l border-gray-300 dark:border-gray-600"
              style={{ left: sec * pixelsPerSecond }}
            >
              <div className="absolute top-1 left-1 text-xs text-gray-600 dark:text-gray-400">
                {sec}s
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Shared drag state across all TrackHeader instances
const trackDragState: {
  dragging: boolean;
  fromLayer: number;
} = {
  dragging: false,
  fromLayer: 0,
};

const TrackHeader: React.FC<{ track: Track }> = ({ track }) => {
  const { reorderLayers } = useTimelineStore();

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Start drag
    trackDragState.dragging = true;
    trackDragState.fromLayer = track.layer;

    // Add global listener to end drag
    const handlePointerUp = () => {
      trackDragState.dragging = false;
      window.removeEventListener('pointerup', handlePointerUp);
    };
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handlePointerEnter = () => {
    if (!trackDragState.dragging) return;
    const { fromLayer } = trackDragState;
    const toLayer = track.layer;
    if (fromLayer !== toLayer) {
      reorderLayers(fromLayer, toLayer);
      // Update reference so subsequent enters shift correctly
      trackDragState.fromLayer = toLayer;

      // Debug helpers
      if (typeof window !== 'undefined') {
        (window as any).__lastLayerSwapAttempt = { from: fromLayer, to: toLayer, ts: Date.now() };
      }
    }
  };

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 cursor-move select-none"
      style={{ height: TRACK_HEIGHT }}
      onPointerDown={handlePointerDown}
      onPointerEnter={handlePointerEnter}
    >
      <div className="text-gray-600 dark:text-gray-400">
        {track.icon}
      </div>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
        {track.name}
      </span>
    </div>
  );
};

const TimelineClip: React.FC<{ 
  event: TimelineEvent; 
  fps: number; 
  trackType: string;
  zoom: number;
}> = ({ event, fps, trackType, zoom }) => {
  const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoom;
  const startPixel = (event.start / fps) * pixelsPerSecond;
  const width = ((event.end - event.start) / fps) * pixelsPerSecond;
  const colorClass = getEventColor(event.type);
  
  const getClipLabel = () => {
    switch (event.type) {
      case 'video':
      case 'audio':
      case 'image':
        return (event as any).src?.split('/').pop()?.split('.')[0] || 'Asset';
      case 'caption':
        return (event as any).text || 'Caption';
      case 'transition':
        return (event as any).style || 'Transition';
      default:
        return 'Event';
    }
  };

  const { moveEvent } = useTimelineStore();
  const { resizeEvent } = useTimelineStore();

  // Selection helpers
  const { selectEvent, selectEvents, selectedEventIds } = useTimelineStore();
  const isSelected = selectedEventIds.includes(event.id);

  // Total duration of the underlying asset in FRAMES.
  // We fall back to (trimIn + trimOut + visibleDuration) so that the true length
  // survives a page refresh even when `maxDuration` was not persisted.
  const sourceDuration = (event as any).maxDuration ?? (((event as any).trimIn ?? 0) + ((event as any).trimOut ?? 0) + (event.end - event.start));

  const MIN_DURATION_FRAMES = 1;
  const HANDLE_WIDTH = 6;

  // === Drag entire clip & selection ===
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();

    // Handle selection (click selects; Shift+click multi-select)
    if (e.shiftKey) {
      const next = isSelected
        ? selectedEventIds.filter((id) => id !== event.id)
        : [...selectedEventIds, event.id];
      selectEvents(next);
    } else {
      selectEvent(event.id);
    }
    const startClientX = e.clientX;
    const originalStart = event.start;
    const duration = event.end - event.start;

    const onMouseMove = (moveEvt: MouseEvent) => {
      const deltaX = moveEvt.clientX - startClientX;
      const deltaFrames = Math.round((deltaX / pixelsPerSecond) * fps);
      const newStart = Math.max(0, originalStart + deltaFrames);
      moveEvent(event.id, newStart, newStart + duration);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      useTimelineStore.getState().pushToHistory();
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // === Resize left edge ===
  const handleLeftResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const startClientX = e.clientX;
    const originalStart = event.start;
    const originalEnd = event.end;

    const onMouseMove = (moveEvt: MouseEvent) => {
      const deltaX = moveEvt.clientX - startClientX;
      const deltaFrames = Math.round((deltaX / pixelsPerSecond) * fps);
      // Limit so that we never extend beyond the beginning of the source
      const existingTrimOut = (event as any).trimOut ?? 0;
      const earliestStart = originalEnd - (sourceDuration - existingTrimOut);
      let newStart = Math.min(originalStart + deltaFrames, originalEnd - MIN_DURATION_FRAMES);
      newStart = Math.max(earliestStart, newStart);
      newStart = Math.max(0, newStart);

      // Update trimIn based on how many frames we trimmed from the left
      const existingTrimIn = (event as any).trimIn ?? 0;
      const newTrimIn = Math.max(0, existingTrimIn + (newStart - originalStart));

      resizeEvent(event.id, newStart, originalEnd);
      const { updateEvent } = useTimelineStore.getState();
      updateEvent(event.id, { trimIn: newTrimIn }, false);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      useTimelineStore.getState().pushToHistory();
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // === Resize right edge ===
  const handleRightResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const startClientX = e.clientX;
    const originalStart = event.start;
    const originalEnd = event.end;

    const onMouseMove = (moveEvt: MouseEvent) => {
      const deltaX = moveEvt.clientX - startClientX;
      const deltaFrames = Math.round((deltaX / pixelsPerSecond) * fps);

      const existingTrimInCurrent = (event as any).trimIn ?? 0;
      const latestEnd = originalStart + (sourceDuration - existingTrimInCurrent);
      let newEnd = Math.max(originalEnd + deltaFrames, originalStart + MIN_DURATION_FRAMES);
      newEnd = Math.min(latestEnd, newEnd);
       
      // Update trimOut to record how much was trimmed from the right
      const existingTrimOut2 = (event as any).trimOut ?? 0;
      const newTrimOut = Math.max(0, existingTrimOut2 + (originalEnd - newEnd));
       
      resizeEvent(event.id, originalStart, newEnd);
      const { updateEvent } = useTimelineStore.getState();
      updateEvent(event.id, { trimOut: newTrimOut }, false);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      useTimelineStore.getState().pushToHistory();
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div
      className={`timeline-clip absolute top-1 bottom-1 ${colorClass} rounded-sm border border-white/20 shadow-sm cursor-move hover:opacity-80 transition-opacity select-none flex ${isSelected ? 'ring-2 ring-cyan-400' : ''}`}
      style={{
        left: startPixel,
        width: Math.max(width, 20), // Minimum width for visibility
      }}
      title={`${event.type}: ${getClipLabel()}`}
      onMouseDown={handleMouseDown}
    >
      {/* Left resize handle */}
      <div
        className="absolute left-0 top-0 bottom-0 bg-white/70 cursor-ew-resize"
        style={{ width: HANDLE_WIDTH }}
        onMouseDown={handleLeftResizeMouseDown}
      />

      <div className="flex items-center gap-1 px-2 py-1 h-full pointer-events-none flex-1">
        <div className="text-white">
          {getEventIcon(event.type)}
        </div>
        <span className="text-xs text-white font-medium truncate">
          {getClipLabel()}
        </span>
      </div>

      {/* Right resize handle */}
      <div
        className="absolute right-0 top-0 bottom-0 bg-white/70 cursor-ew-resize"
        style={{ width: HANDLE_WIDTH }}
        onMouseDown={handleRightResizeMouseDown}
      />
    </div>
  );
};

const TrackLane: React.FC<{ 
  track: Track; 
  fps: number; 
  maxFrames: number;
  zoom: number;
}> = ({ track, fps, maxFrames, zoom }) => {
  const maxSeconds = Math.ceil(maxFrames / fps);
  const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoom;
  const laneWidth = maxSeconds * pixelsPerSecond;

  return (
    <div className="relative border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900">
      <div 
        className="relative"
        style={{ 
          height: TRACK_HEIGHT,
          width: laneWidth,
        }}
      >
        {/* Timeline grid */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: maxSeconds + 1 }, (_, i) => (
            <div
              key={i}
              className="absolute top-0 h-full border-l border-gray-200 dark:border-gray-700"
              style={{ left: i * pixelsPerSecond }}
            />
          ))}
        </div>
        
        {/* Timeline clips */}
        {track.events.map((event) => (
          <TimelineClip
            key={event.id}
            event={event}
            fps={fps}
            trackType={track.type}
            zoom={zoom}
          />
        ))}
      </div>
    </div>
  );
};

export const Timeline: React.FC<TimelineProps> = ({ timeline, className = '', zoom = 1 }) => {
  // Always call store hooks first to keep order consistent across renders
  const { currentFrame, setCurrentFrame } = useTimelineStore();

  // Ref to inner scroll container to compute click offsets — must be before any conditional return
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const tracks = useMemo(() => {
    if (!timeline?.events) return [];

    // Group events by type to create tracks
    const trackMap = new Map<string, Track>();
    
    timeline.events.forEach((event) => {
      const layer = event.layer ?? 1;
      const trackId = `layer-${layer}`;
      if (!trackMap.has(trackId)) {
        trackMap.set(trackId, {
          id: trackId,
          name: `Layer ${layer}`,
          type: event.type,
          layer: layer,
          events: [],
          color: getEventColor(event.type),
          icon: getEventIcon(event.type),
        });
      }
      trackMap.get(trackId)!.events.push(event);
    });

    return Array.from(trackMap.values()).sort((a, b) => a.layer - b.layer);
  }, [timeline]);

  const maxFrames = useMemo(() => {
    if (!timeline?.events.length) return 300; // Default 10 seconds at 30fps
    return Math.max(...timeline.events.map(e => e.end));
  }, [timeline]);

  if (!timeline) {
    return (
      <div className={`${className} flex items-center justify-center h-48 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400`}>
        <div className="text-center">
          <div className="text-sm">No timeline loaded</div>
          <div className="text-xs mt-1">Import or create a timeline to get started</div>
        </div>
      </div>
    );
  }

  // Handler for mouse interactions to move playhead
  const handlePointerDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timeline) return;
    if ((e.target as HTMLElement).closest('.timeline-clip')) {
      return; // Ignore interactions that started on a clip
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const scrollLeft = (e.currentTarget as HTMLDivElement).scrollLeft || 0;
    const offsetX = e.clientX - rect.left + scrollLeft;
    const newFrame = pixelToFrame(offsetX, timeline.fps, zoom);
    setCurrentFrame(newFrame);

    const onMove = (moveEvt: MouseEvent) => {
      const container = scrollRef.current;
      const sl = container ? container.scrollLeft : 0;
      const moveOffsetX = moveEvt.clientX - rect.left + sl;
      const newF = pixelToFrame(moveOffsetX, timeline.fps, zoom);
      setCurrentFrame(newF);
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <div className={`${className} bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden`}>
      <div className="flex">
        {/* Track headers */}
        <div className="w-32 flex-shrink-0 bg-gray-100 dark:bg-gray-800">
          {/* Header for ruler */}
          <div 
            className="border-b border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-700 flex items-center justify-center"
            style={{ height: RULER_HEIGHT }}
          >
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Tracks
            </span>
          </div>
          
          {/* Track headers */}
          {tracks.map((track) => (
            <TrackHeader key={track.id} track={track} />
          ))}
        </div>

        {/* Timeline content */}
        <div
          className="flex-1 overflow-x-auto relative"
          ref={scrollRef}
          onMouseDown={handlePointerDown}
        >
          {/* Time ruler */}
          <TimeRuler fps={timeline.fps} maxFrames={maxFrames} zoom={zoom} />
          
          {/* Timeline tracks */}
          {tracks.map((track) => (
            <TrackLane
              key={track.id}
              track={track}
              fps={timeline.fps}
              maxFrames={maxFrames}
              zoom={zoom}
            />
          ))}

          {/* Playhead overlay */}
          <Playhead fps={timeline.fps} currentFrame={currentFrame} zoom={zoom} />
        </div>
      </div>
    </div>
  );
}; 