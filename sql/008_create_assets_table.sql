-- Up
CREATE TABLE IF NOT EXISTS public.assets (
  id text PRIMARY KEY,
  preview_url text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Down
DROP TABLE IF EXISTS public.assets; 