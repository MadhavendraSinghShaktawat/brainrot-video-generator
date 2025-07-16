import { z } from 'zod';

/**
 * Base fields shared by all timeline events.
 */
export interface TimelineEventBase {
  /** Stable unique identifier (uuid). */
  id: string;
  /** Frame on the master timeline where the clip begins. */
  start: number;
  /** Frame on the master timeline where the clip ends (exclusive). */
  end: number;
  /** Z-index style layering; higher renders on top. */
  layer?: number;
  /** Uniform scale (1 = 100%) */
  scale?: number;
  /** Normalized position (−0.5 .. +0.5) where (0,0) is the centre of the canvas. */
  xPct?: number;
  yPct?: number;
}

export interface SourceTimed {
  /** Frame within the source media at which playback should start. */
  trimIn?: number;
  /** Frame within the source media at which playback should stop. */
  trimOut?: number;
}

export interface HasSource {
  /** Public URL or storage path to the asset. */
  src: string;
}

export type VideoEvent = TimelineEventBase &
  HasSource &
  SourceTimed & {
    type: 'video';
  };

export type AudioEvent = TimelineEventBase &
  HasSource &
  SourceTimed & {
    type: 'audio';
    /** Volume multiplier 0-1; can be animated later. */
    volume?: number;
  };

export type ImageEvent = TimelineEventBase &
  HasSource & {
    type: 'image';
    /** Optional duration if still image; default derived from end-start. */
  };

export type CaptionEvent = TimelineEventBase & {
  type: 'caption';
  text: string;
  /** Style overrides */
  style?: Record<string, unknown>;
  /** Animation properties (ignored for now) */
  animation?: any;
};

export type TransitionEvent = TimelineEventBase & {
  type: 'transition';
  style: 'crossfade' | 'slide' | 'wipe';
  duration: number; // in frames
};

// Union type covering all event variants
export type TimelineEvent =
  | VideoEvent
  | AudioEvent
  | ImageEvent
  | CaptionEvent
  | TransitionEvent;

export interface Timeline {
  fps: number;
  width: number;
  height: number;
  background?: string;
  events: TimelineEvent[];
}

/**
 * Zod schema mirroring the Timeline interfaces.
 */
export const timelineSchema = z.object({
  fps: z.number().int().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  background: z.string().optional(),
  events: z.array(
    z.discriminatedUnion('type', [
      z.object({
        type: z.literal('video'),
        id: z.string().uuid(),
        start: z.number().int().nonnegative(),
        end: z.number().int().positive(),
        layer: z.number().int().optional(),
        src: z.string().url(),
        trimIn: z.number().int().nonnegative().optional(),
        trimOut: z.number().int().nonnegative().optional(),
      }),
      z.object({
        type: z.literal('audio'),
        id: z.string().uuid(),
        start: z.number().int().nonnegative(),
        end: z.number().int().positive(),
        layer: z.number().int().optional(),
        src: z.string().url(),
        trimIn: z.number().int().nonnegative().optional(),
        trimOut: z.number().int().nonnegative().optional(),
        volume: z.number().min(0).max(1).optional(),
      }),
      z.object({
        type: z.literal('image'),
        id: z.string().uuid(),
        start: z.number().int().nonnegative(),
        end: z.number().int().positive(),
        layer: z.number().int().optional(),
        src: z.string().url(),
      }),
      z.object({
        type: z.literal('caption'),
        id: z.string().uuid(),
        start: z.number().int().nonnegative(),
        end: z.number().int().positive(),
        layer: z.number().int().optional(),
        text: z.string(),
        style: z.record(z.string(), z.any()).optional(),
      }),
      z.object({
        type: z.literal('transition'),
        id: z.string().uuid(),
        start: z.number().int().nonnegative(),
        end: z.number().int().positive(),
        layer: z.number().int().optional(),
        style: z.enum(['crossfade', 'slide', 'wipe']),
        duration: z.number().int().positive(),
      }),
    ])
  ),
}); 