import React, { useCallback } from 'react';
import { TimelineEvent } from '@/types/timeline';
import { useTimelineStore } from '@/store/timeline-store';

const BASE_PIXELS_PER_SECOND = 60;
const HEADER_WIDTH = 100;
const RULER_HEIGHT = 30;
const TRACK_HEIGHT = 40;
const TRACK_Y_PAD = 0;

interface InteractionLayerProps {
  events: TimelineEvent[];
  fps: number;
  zoom: number;
  scrollLeft: number;
  containerHeight: number;
  containerWidth: number;
  trackRowMap: Record<number, number>;
}

const InteractionLayer: React.FC<InteractionLayerProps> = ({
  events,
  fps,
  zoom,
  scrollLeft,
  containerHeight,
  containerWidth,
  trackRowMap,
}) => {
  const { selectEvent, selectedEventIds, selectEvents } = useTimelineStore();
  const { moveEvent, resizeEvent } = useTimelineStore();

  // Cursor feedback on hover
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const x = e.clientX - rect.left + scrollLeft;
      const y = e.clientY - rect.top;

      const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoom;
      const HANDLE_PX = 6;

      const overHandle = events.some((ev) => {
        const rowIdx = trackRowMap[ev.layer ?? 1] ?? 0;
        const evX = HEADER_WIDTH + (ev.start / fps) * pixelsPerSecond;
        const evWidth = ((ev.end - ev.start) / fps) * pixelsPerSecond;
        const evY = RULER_HEIGHT + rowIdx * TRACK_HEIGHT + TRACK_Y_PAD;
        const evHeight = TRACK_HEIGHT - TRACK_Y_PAD * 2;

        const left = x >= evX && x <= evX + HANDLE_PX;
        const right = x >= evX + evWidth - HANDLE_PX && x <= evX + evWidth;
        return (left || right) && y >= evY && y <= evY + evHeight;
      });

      (e.currentTarget as HTMLDivElement).style.cursor = overHandle ? 'ew-resize' : 'default';
    },
    [events, fps, zoom, scrollLeft, trackRowMap]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return; // left only
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const x = e.clientX - rect.left + scrollLeft;
      const y = e.clientY - rect.top;

      const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoom;

      // Find event whose bounding box contains the point (iterate in reverse for topmost)
      const found = [...events].reverse().find((ev) => {
        const rowIdx = trackRowMap[ev.layer ?? 1] ?? 0;
        const evX = HEADER_WIDTH + (ev.start / fps) * pixelsPerSecond;
        const evWidth = ((ev.end - ev.start) / fps) * pixelsPerSecond;
        const evY = RULER_HEIGHT + rowIdx * TRACK_HEIGHT + TRACK_Y_PAD;
        const evHeight = TRACK_HEIGHT - TRACK_Y_PAD * 2;
        return x >= evX && x <= evX + evWidth && y >= evY && y <= evY + evHeight;
      });

      if (found) {
        if (e.shiftKey) {
          // Toggle selection in multi-select
          const next = selectedEventIds.includes(found.id)
            ? selectedEventIds.filter((id) => id !== found.id)
            : [...selectedEventIds, found.id];
          selectEvents(next);
        } else {
          if (!selectedEventIds.includes(found.id)) {
            selectEvent(found.id);
          }
        }

        // Start drag move
        const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoom;

        const HANDLE_PX = 6;

        const clipX = HEADER_WIDTH + (found.start / fps) * pixelsPerSecond - scrollLeft;
        const clipW = ((found.end - found.start) / fps) * pixelsPerSecond;

        const isLeftHandle = x - clipX <= HANDLE_PX;
        const isRightHandle = clipX + clipW - x <= HANDLE_PX;

        // ================== RESIZE ==================
        if (isLeftHandle || isRightHandle) {
          const startClientX = e.clientX;

          const originalStart = found.start;
          const originalEnd = found.end;

          // Determine neighbours on same layer
          const sameLayerEvents = events
            .filter((ev) => (ev.layer ?? 1) === (found.layer ?? 1) && ev.id !== found.id)
            .sort((a, b) => a.start - b.start);

          const prevEvent = [...sameLayerEvents].reverse().find((ev) => ev.end <= originalStart);
          const nextEvent = sameLayerEvents.find((ev) => ev.start >= originalEnd);

          const onMove = (mv: PointerEvent) => {
            const dx = mv.clientX - startClientX;
            const deltaFrames = Math.round((dx / pixelsPerSecond) * fps);

            if (isLeftHandle) {
              let newStart = originalStart + deltaFrames;
              // Cannot pass right handle (min length 1 frame)
              newStart = Math.min(newStart, originalEnd - 1);
              // Cannot overlap previous clip
              if (prevEvent) newStart = Math.max(newStart, prevEvent.end);
              // Clamp to >=0
              newStart = Math.max(0, newStart);
              resizeEvent(found.id, newStart, originalEnd, false);
            } else if (isRightHandle) {
              let newEnd = originalEnd + deltaFrames;
              // Cannot pass left handle
              newEnd = Math.max(newEnd, originalStart + 1);
              // Cannot overlap next clip
              if (nextEvent) newEnd = Math.min(newEnd, nextEvent.start);
              // Max source duration if provided
              const maxDur = (found as any).maxDuration;
              if (typeof maxDur === 'number' && !isNaN(maxDur)) {
                newEnd = Math.min(newEnd, originalStart + maxDur);
              }
              resizeEvent(found.id, originalStart, newEnd, false);
            }
          };

          const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            // Commit final resize with history record
            const ev = events.find((ev) => ev.id === found.id);
            if (ev) {
              resizeEvent(found.id, ev.start, ev.end, true);
            }
          };

          window.addEventListener('pointermove', onMove);
          window.addEventListener('pointerup', onUp);
          return;
        }

        // ================== DRAG MOVE ==================
        // Prepare drag data for all selected clips (or just the found one if not part of selection)
        const dragIds = selectedEventIds.includes(found.id) ? selectedEventIds : [found.id];
        const originals = dragIds.map((id) => {
          const ev = events.find((e) => e.id === id)!;
          return { id, start: ev.start, end: ev.end };
        });

        const startClientX = e.clientX;

        const onPointerMove = (moveEvt: PointerEvent) => {
          const dxPixels = moveEvt.clientX - startClientX;
          const deltaFrames = Math.round((dxPixels / pixelsPerSecond) * fps);

          originals.forEach(({ id, start, end }) => {
            const newStart = Math.max(0, start + deltaFrames);
            const duration = end - start;
            moveEvent(id, newStart, newStart + duration, false);
          });
        };

        const onPointerUp = () => {
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', onPointerUp);
          // nothing else for now
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
      } else {
        // Clicked empty space – clear selection
        selectEvent(null);
      }
    },
    [events, fps, zoom, scrollLeft, trackRowMap, selectEvent, selectedEventIds, moveEvent, selectEvents, resizeEvent]
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: containerWidth,
        height: containerHeight + RULER_HEIGHT,
        cursor: 'default',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
    />
  );
};

export default InteractionLayer; 