-- Add preview_url column to assets table for low-res proxy links
ALTER TABLE assets
ADD COLUMN IF NOT EXISTS preview_url text; 