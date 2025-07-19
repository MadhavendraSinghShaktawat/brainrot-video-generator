import React, { useEffect, useRef } from 'react';

interface CanvasOverlayProps {
  fps: number;
  maxFrames: number;
  zoom: number;
  scrollLeft: number;
  containerHeight: number;
  containerWidth: number;
  currentFrame: number;
}

const BASE_PIXELS_PER_SECOND = 60;
const RULER_HEIGHT = 30;
const HEADER_WIDTH = 100; // approximate width of layer header column
const EXTRA = 10; // extra pixels to extend canvas below tracks

const CanvasOverlay: React.FC<CanvasOverlayProps> = ({
  fps,
  maxFrames,
  zoom,
  scrollLeft,
  containerHeight,
  containerWidth,
  currentFrame,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Resize canvas buffer when container resizes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = containerWidth;
    canvas.height = containerHeight + RULER_HEIGHT + EXTRA;
  }, [containerWidth, containerHeight]);

  // Draw grid & playhead on every relevant change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Translate for horizontal scroll
    ctx.save();
    ctx.translate(-scrollLeft, 0);

    const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoom;
    // Ensure we draw grid at least through the visible viewport
    const visibleEndSec = Math.ceil((scrollLeft + canvas.width) / pixelsPerSecond) + 5; // buffer

    // Grid lines (start after ruler) – contrast depends on theme
    const isDark = document.documentElement.classList.contains('dark');
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.13)';
    ctx.lineWidth = 1;
    for (let sec = 0; sec <= Math.max(visibleEndSec, Math.ceil(maxFrames / fps)); sec++) {
      // start after the fixed header column
      const x = HEADER_WIDTH + sec * pixelsPerSecond;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, RULER_HEIGHT); // +0.5 to align to pixel
      ctx.lineTo(x + 0.5, containerHeight);
      ctx.stroke();
    }

    ctx.restore();

    // Playhead (vertical white line) spans entire canvas including ruler
    const playheadX = (currentFrame / fps) * pixelsPerSecond - scrollLeft + HEADER_WIDTH;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(playheadX + 0.5, 0);
    ctx.lineTo(playheadX + 0.5, containerHeight + RULER_HEIGHT + EXTRA);
    ctx.stroke();
  }, [fps, maxFrames, zoom, scrollLeft, containerHeight, containerWidth, currentFrame]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: -RULER_HEIGHT,
        left: 0,
        width: containerWidth,
        height: containerHeight + RULER_HEIGHT + EXTRA,
        pointerEvents: 'none',
        zIndex: 30,
      }}
    />
  );
};

export default CanvasOverlay; 