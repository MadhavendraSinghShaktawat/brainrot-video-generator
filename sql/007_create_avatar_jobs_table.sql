-- Up: create avatar_jobs table
CREATE TABLE IF NOT EXISTS public.avatar_jobs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  provider text NOT NULL,
  provider_job_id text NOT NULL,
  request jsonb NOT NULL,
  status text NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  output_url text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Helpful composite index for fast look-ups
CREATE INDEX IF NOT EXISTS avatar_jobs_user_status_idx ON public.avatar_jobs (user_id, status);

-- Down: drop table
DROP TABLE IF EXISTS public.avatar_jobs; 