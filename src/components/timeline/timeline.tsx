'use client';

import React, { useMemo } from 'react';
import { Timeline as TimelineType, TimelineEvent } from '@/types/timeline';
import { Video, Music, Image, MessageSquare, Scissors } from 'lucide-react';
import { useTimelineStore } from '@/store/timeline-store';
import { FixedSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { clsx } from 'clsx';
import * as Comlink from 'comlink';
import type { TimelineWorkerApi } from '@/workers/timeline-worker';
import CanvasOverlay from './canvas-overlay';
import WebGLCompositor from './webgl-compositor';
import InteractionLayer from './interaction-layer';

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
const HEADER_WIDTH = 100;

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

// DOM clip nodes have been fully replaced by WebGL compositing – always true now
const WEBGL_ONLY = true;

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

const TimeRuler: React.FC<{ fps: number; maxFrames: number; zoom: number; scrollLeft?: number; headerOffset?: number; viewportWidth?: number }> = ({ fps, maxFrames, zoom, scrollLeft = 0, headerOffset = 0, viewportWidth = 0 }) => {
  const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoom;
  // Ensure ruler always covers the visible viewport + a small buffer
  const visibleEndSec = Math.ceil((scrollLeft + viewportWidth) / pixelsPerSecond) + 5; // 5-sec buffer
  const tickMarks = useMemo(() => {
    const marks = [];
    for (let sec = 0; sec <= Math.max(visibleEndSec, Math.ceil(maxFrames / fps)); sec++) {
      marks.push(sec);
    }
    return marks;
  }, [visibleEndSec, maxFrames, fps]);

  return (
    <div className="relative" style={{ height: RULER_HEIGHT }}>
      <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600">
        <div className="relative h-full">
          {tickMarks.map((sec) => (
            <div
              key={sec}
              className="absolute top-0 h-full border-l border-gray-300 dark:border-gray-600"
              style={{ left: headerOffset + sec * pixelsPerSecond - scrollLeft }}
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

  const borderClass = WEBGL_ONLY ? '' : 'border-b border-gray-300 dark:border-gray-600';

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 ${borderClass} bg-gray-50 dark:bg-gray-800 cursor-move select-none`}
      style={{ height: TRACK_HEIGHT, position: 'sticky', left: 0, zIndex: 20 }}
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

  const borderClass = WEBGL_ONLY ? '' : 'border-b border-gray-300 dark:border-gray-600';
  const bgClass = WEBGL_ONLY ? 'bg-transparent' : 'bg-gray-50 dark:bg-gray-900';
  return (
    <div className={`relative ${borderClass} ${bgClass}`}>
      <div
        className="relative"
        style={{ height: TRACK_HEIGHT, width: laneWidth }}
      >
        {/* Grid removed – drawn by CanvasOverlay */}
        
        {/* Timeline clips – render only when WEBGL_ONLY disabled */}
        {!WEBGL_ONLY && track.events.map((event) => (
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
  const { currentFrame, setCurrentFrame, setZoom } = useTimelineStore();
  const { selectedEventIds } = useTimelineStore();

  // Ref to inner scroll container to compute click offsets — must be before any conditional return
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Scroll position must be declared before any conditional early return to keep Hook order stable
  const [scrollLeft, setScrollLeft] = React.useState(0);

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

  // ---- Visible events via Web Worker (async) ----
  const [visibleEvents, setVisibleEvents] = React.useState<TimelineType['events']>([]);

  const workerInstance = React.useRef<Comlink.Remote<TimelineWorkerApi> | null>(null);

  React.useEffect(() => {
    const worker = new Worker(new URL('@/workers/timeline-worker.ts', import.meta.url), { type: 'module' });
    workerInstance.current = Comlink.wrap<TimelineWorkerApi>(worker);
    return () => worker.terminate();
  }, []);

  React.useEffect(() => {
    if (!timeline || !workerInstance.current) return;
    workerInstance.current
      .getVisible({ events: timeline.events, currentFrame })
      .then(setVisibleEvents)
      .catch(() => {});
  }, [timeline, currentFrame]);

  const maxFrames = useMemo(() => {
    if (!timeline?.events.length) return 300; // Default 10 seconds at 30fps
    const lastFrame = Math.max(...timeline.events.map(e => e.end));
    // Add generous 30-second buffer so ruler & grid always exist past end
    return lastFrame + timeline.fps * 30;
  }, [timeline]);

  const visible = visibleEvents; // alias to keep var name shorter

  // Map of layer -> row index for positioning in WebGLCompositor
  const trackRowMap = React.useMemo(() => {
    const map: Record<number, number> = {};
    tracks.forEach((t, idx) => {
      map[t.layer] = idx;
    });
    return map;
  }, [tracks]);

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
    const offsetX = e.clientX - rect.left + scrollLeft - HEADER_WIDTH;
    const newFrame = pixelToFrame(offsetX, timeline.fps, zoom);
    setCurrentFrame(newFrame);

    const onMove = (moveEvt: MouseEvent) => {
      const container = scrollRef.current;
      const sl = container ? container.scrollLeft : 0;
      const moveOffsetX = moveEvt.clientX - rect.left + sl - HEADER_WIDTH;
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

  type RowProps = { index: number; style: React.CSSProperties };
  const Row: React.FC<RowProps> = React.memo(({ index, style }) => {
    const track = tracks[index];
    return (
      <div style={style} className="flex">
        <TrackHeader track={track} />
        <TrackLane track={track} fps={timeline.fps} maxFrames={maxFrames} zoom={zoom} />
      </div>
    );
  });

  // Calculate total timeline width to allow horizontal scrolling
  const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoom;
  const maxSeconds = Math.ceil(maxFrames / timeline.fps);
  const laneWidth = maxSeconds * pixelsPerSecond;

  // Keep viewport width handy for ruler to decide how many ticks are needed
  const viewportWidth = scrollRef.current?.clientWidth ?? 0;

  // Max scroll based on content width minus viewport
  const maxScroll = laneWidth - (scrollRef.current?.clientWidth ?? 0);

  // Handle wheel for kinetic-like scroll
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey) return; // zoom already handled elsewhere
    e.preventDefault();
    const delta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
    setScrollLeft((prev) => Math.max(0, Math.min(maxScroll, prev + delta)));
  };

  return (
    <div
      className={clsx('relative select-none flex flex-col', className)}
      onPointerDown={handlePointerDown}
      onWheel={(e) => {
        if (e.ctrlKey) {
          e.preventDefault();
          const delta = e.deltaY > 0 ? -0.25 : 0.25;
          setZoom(Math.min(4, Math.max(0.25, zoom + delta)));
        }
      }}
    >
      {/* RULER */}
      <TimeRuler
        fps={timeline.fps}
        maxFrames={maxFrames}
        zoom={zoom}
        headerOffset={HEADER_WIDTH}
        scrollLeft={scrollLeft}
        viewportWidth={viewportWidth}
      />

      {/* TRACKS container (single horizontal scrollbar) */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-hidden relative timeline-scroll"
        style={{ height: `calc(100% - ${RULER_HEIGHT}px)` }}
        onWheel={handleWheel}
      >
         <div
           style={{
             width: laneWidth + HEADER_WIDTH,
             height: '100%',
             position: 'relative',
             transform: `translateX(-${scrollLeft}px)`,
             transition: 'transform 0.05s linear',
           }}
         >
           <AutoSizer disableWidth>
             {({ height }: { height: number }) => (
               <FixedSizeList
                 height={height}
                 width={laneWidth + HEADER_WIDTH}
                 itemCount={tracks.length}
                 itemSize={TRACK_HEIGHT}
                 overscanCount={4}
                 outerElementType={React.forwardRef<HTMLDivElement, any>((props, ref) => (
                   <div ref={ref} {...props} style={{ ...props.style, overflowX: 'hidden', overflowY: 'auto' }} />
                 ))}
               >
                 {Row as any}
               </FixedSizeList>
             )}
           </AutoSizer>

           {/* Canvas overlay positioned absolutely inside timeline area */}
           <CanvasOverlay
             fps={timeline.fps}
             maxFrames={maxFrames}
             zoom={zoom}
             scrollLeft={scrollLeft}
             containerHeight={scrollRef.current?.offsetHeight || 300}
             containerWidth={laneWidth + HEADER_WIDTH}
             currentFrame={currentFrame}
           />

           {/* WebGL prototype compositor for visible clips */}
           <WebGLCompositor
             events={timeline.events}
             fps={timeline.fps}
             zoom={zoom}
             scrollLeft={scrollLeft}
             containerHeight={scrollRef.current?.offsetHeight || 300}
             containerWidth={laneWidth + HEADER_WIDTH}
             trackRowMap={trackRowMap}
             selectedIds={selectedEventIds}
           />

           {/* Interaction layer for hit-testing when WEBGL_ONLY mode */}
           {WEBGL_ONLY && (
             <InteractionLayer
               events={timeline.events}
               fps={timeline.fps}
               zoom={zoom}
               scrollLeft={scrollLeft}
               containerHeight={scrollRef.current?.offsetHeight || 300}
               containerWidth={laneWidth + HEADER_WIDTH}
               trackRowMap={trackRowMap}
             />
           )}
         </div>
       </div>

      {/* Playhead component deprecated in canvas overlay */}
    </div>
  );
}; 