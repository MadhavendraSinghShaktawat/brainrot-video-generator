-- Add audio_url column to store public URL of generated voice file for a script
ALTER TABLE generated_scripts
ADD COLUMN IF NOT EXISTS audio_url TEXT; 