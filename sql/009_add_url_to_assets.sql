-- Up
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS url text;
 
-- Down
ALTER TABLE public.assets DROP COLUMN IF EXISTS url; 