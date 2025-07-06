-- Create table to store rendered gameplay videos with subtitles
create table if not exists generated_videos (
  id uuid primary key default gen_random_uuid(),
  script_id uuid references generated_scripts(id) on delete set null,
  video_url text not null,
  duration text,
  created_at timestamp with time zone default now(),
  user_id uuid references auth.users(id) on delete set null
);

-- basic index for user listing
create index if not exists generated_videos_user_idx on generated_videos(user_id); 