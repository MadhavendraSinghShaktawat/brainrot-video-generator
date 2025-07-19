'use client';

import React, { useEffect, useRef } from 'react';
import { TimelineEvent } from '@/types/timeline';

const BASE_PIXELS_PER_SECOND = 60;
const HEADER_WIDTH = 100;
const RULER_HEIGHT = 30;
const TRACK_HEIGHT = 40;
const TRACK_Y_PAD = 0;

interface WebGLCompositorProps {
  events: TimelineEvent[];
  fps: number;
  zoom: number;
  scrollLeft: number;
  containerWidth: number;
  containerHeight: number;
  trackRowMap: Record<number, number>;
  selectedIds: string[];
}

const colorForType = (type: TimelineEvent['type']): [number, number, number] => {
  switch (type) {
    case 'video':
      return [0.13, 0.44, 0.91]; // blue-ish
    case 'audio':
      return [0.15, 0.78, 0.35]; // green-ish
    case 'image':
      return [0.6, 0.4, 0.9]; // purple-ish
    case 'caption':
      return [0.92, 0.8, 0.25]; // yellow-ish
    case 'transition':
      return [0.97, 0.33, 0.33]; // red-ish
    default:
      return [0.5, 0.5, 0.5];
  }
};

function initShaderProgram(gl: WebGLRenderingContext, vsSource: string, fsSource: string): WebGLProgram | null {
  const loadShader = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };

  const vertexShader = loadShader(gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl.FRAGMENT_SHADER, fsSource);
  if (!vertexShader || !fragmentShader) return null;

  const shaderProgram = gl.createProgram();
  if (!shaderProgram) return null;

  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.error('Unable to initialise shader program:', gl.getProgramInfoLog(shaderProgram));
    return null;
  }
  return shaderProgram;
}

const WebGLCompositor: React.FC<WebGLCompositorProps> = ({
  events,
  fps,
  zoom,
  scrollLeft,
  containerWidth,
  containerHeight,
  trackRowMap,
  selectedIds,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const programInfoRef = useRef<{
    program: WebGLProgram;
    attribLocations: { position: number };
    uniformLocations: { color: WebGLUniformLocation | null };
  } | null>(null);

  // Initial setup – only once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl');
    if (!gl) return;

    const vsSource = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fsSource = `
      precision mediump float;
      uniform vec3 u_color;
      void main() {
        gl_FragColor = vec4(u_color, 1.0);
      }
    `;

    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    if (!shaderProgram) return;

    programInfoRef.current = {
      program: shaderProgram,
      attribLocations: {
        position: gl.getAttribLocation(shaderProgram, 'a_position'),
      },
      uniformLocations: {
        color: gl.getUniformLocation(shaderProgram, 'u_color'),
      },
    };
  }, []);

  // Resize canvas when container changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = containerWidth;
    canvas.height = containerHeight + RULER_HEIGHT + 10; // include ruler & extra buffer similar to CanvasOverlay
  }, [containerWidth, containerHeight]);

  // Draw on every relevant change
  useEffect(() => {
    const canvas = canvasRef.current;
    const programInfo = programInfoRef.current;
    if (!canvas || !programInfo) return;
    const gl = canvas.getContext('webgl');
    if (!gl) return;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(programInfo.program);

    const positionBuffer = gl.createBuffer();
    if (!positionBuffer) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(programInfo.attribLocations.position);
    gl.vertexAttribPointer(programInfo.attribLocations.position, 2, gl.FLOAT, false, 0, 0);

    const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoom;

    events.forEach((event) => {
      const rowIdx = trackRowMap[event.layer ?? 1] ?? 0;
      const y = RULER_HEIGHT + rowIdx * TRACK_HEIGHT + TRACK_Y_PAD;
      const trackHeight = TRACK_HEIGHT - TRACK_Y_PAD * 2;
      // +0.5 to line up with crisp grid lines drawn at 0.5
      const x = HEADER_WIDTH + (event.start / fps) * pixelsPerSecond - scrollLeft + 0.5;
      const width = ((event.end - event.start) / fps) * pixelsPerSecond - 1;

      // Convert pixel coords to clip space [-1,1]
      const x1 = (x / canvas.width) * 2 - 1;
      const x2 = ((x + width) / canvas.width) * 2 - 1;
      const y1 = 1 - (y / canvas.height) * 2;
      const y2 = 1 - ((y + trackHeight) / canvas.height) * 2;

      const vertices = new Float32Array([
        x1, y1,
        x1, y2,
        x2, y2,
        x1, y1,
        x2, y2,
        x2, y1,
      ]);

      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

      let color = colorForType(event.type);
      if (selectedIds.includes(event.id)) {
        color = color.map((c) => Math.min(1, c + 0.6)) as [number, number, number];
      }
      gl.uniform3fv(programInfo.uniformLocations.color, color);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      if (selectedIds.includes(event.id)) {
        // Draw left & right handle bars (fixed 6px)
        const handlePx = 6;
        const handleWidthNorm = (handlePx / canvas.width) * 2;

        // Left bar
        const lx2 = x1 + handleWidthNorm;
        const handleVertsLeft = new Float32Array([
          x1, y1,
          x1, y2,
          lx2, y2,
          x1, y1,
          lx2, y2,
          lx2, y1,
        ]);
        gl.bufferData(gl.ARRAY_BUFFER, handleVertsLeft, gl.STATIC_DRAW);
        gl.uniform3fv(programInfo.uniformLocations.color, [1, 1, 1]);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // Right bar
        const rx1 = x2 - handleWidthNorm;
        const handleVertsRight = new Float32Array([
          rx1, y1,
          rx1, y2,
          x2, y2,
          rx1, y1,
          x2, y2,
          x2, y1,
        ]);
        gl.bufferData(gl.ARRAY_BUFFER, handleVertsRight, gl.STATIC_DRAW);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
    });

    gl.deleteBuffer(positionBuffer);
  }, [events, fps, zoom, scrollLeft, containerWidth, containerHeight, trackRowMap, selectedIds]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: containerWidth,
        height: containerHeight + RULER_HEIGHT + 10,
        pointerEvents: 'none',
        zIndex: 10,
      }}
    />
  );
};

export default WebGLCompositor; 