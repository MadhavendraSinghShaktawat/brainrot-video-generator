import { z } from 'zod';

/**
 * One trim operation → shortens a clip by setting new start / end times.
 * Layer is 1-based (what the UI shows) and is converted to 0-based when applied.
 */
export const trimSchema = z.object({
  type: z.literal('trim'),
  layer: z.number().int().positive(),
  fromSec: z.number().nonnegative(),
  toSec: z.number().positive()
});

/**
 * Add any asset (video / image / audio) that already exists in the asset list
 * or can be resolved by keyword.
 */
export const addAssetSchema = z.object({
  type: z.literal('addAsset'),
  assetKind: z.enum(['video', 'image', 'audio']),
  query: z.string().min(1),
  layer: z.number().int().nonnegative(),
  atSec: z.number().nonnegative()
});

/** Move an existing event to a different start time */
export const moveSchema = z.object({
  type: z.literal('move'),
  id: z.string(),
  toSec: z.number().nonnegative()
});

/** Change a clip’s layer (z-order) */
export const layerSchema = z.object({
  type: z.literal('layer'),
  id: z.string(),
  layer: z.number().int().nonnegative()
});

/** Update position / scale */
export const transformSchema = z.object({
  type: z.literal('transform'),
  id: z.string(),
  xPct: z.number().optional(),
  yPct: z.number().optional(),
  scale: z.number().optional()
});

/** Caption helper */
export const captionSchema = z.object({
  type: z.literal('addCaption'),
  text: z.string(),
  atSec: z.number().nonnegative(),
  duration: z.number().positive(),
  layer: z.number().int().nonnegative()
});

// Auto-caption: derive captions from audio on a given layer
export const autoCaptionSchema = z.object({
  type: z.literal('autoCaption'),
  layer: z.number().int().nonnegative(),
});

export const timelineActionSchema = z.discriminatedUnion('type', [
  trimSchema,
  addAssetSchema,
  moveSchema,
  layerSchema,
  transformSchema,
  captionSchema,
  autoCaptionSchema
]);

export type TimelineAction = z.infer<typeof timelineActionSchema>; 