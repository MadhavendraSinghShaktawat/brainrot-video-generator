-- Migration: Create generated_ideas table and related objects
-- Project: here2order
-- Date: 2024-01-20

-- Create the generated_ideas table
CREATE TABLE IF NOT EXISTS generated_ideas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  hook TEXT NOT NULL,
  story TEXT NOT NULL,
  viral_factors TEXT[] NOT NULL DEFAULT '{}',
  estimated_views TEXT NOT NULL,
  emotional_triggers TEXT[] NOT NULL DEFAULT '{}',
  target_audience TEXT NOT NULL,
  generation_settings JSONB NOT NULL DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT FALSE,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_generated_ideas_user_id ON generated_ideas(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_ideas_created_at ON generated_ideas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_ideas_is_favorite ON generated_ideas(is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_generated_ideas_is_used ON generated_ideas(is_used);

-- Enable Row Level Security (RLS)
ALTER TABLE generated_ideas ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "Users can view their own ideas" ON generated_ideas
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ideas" ON generated_ideas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ideas" ON generated_ideas
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ideas" ON generated_ideas
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_generated_ideas_updated_at
  BEFORE UPDATE ON generated_ideas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create a view for idea statistics
CREATE OR REPLACE VIEW user_idea_stats AS
SELECT 
  user_id,
  COUNT(*) as total_ideas,
  COUNT(*) FILTER (WHERE is_favorite = true) as favorite_ideas,
  COUNT(*) FILTER (WHERE is_used = true) as used_ideas,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as ideas_this_week,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as ideas_this_month,
  MAX(created_at) as last_generated
FROM generated_ideas
GROUP BY user_id; 