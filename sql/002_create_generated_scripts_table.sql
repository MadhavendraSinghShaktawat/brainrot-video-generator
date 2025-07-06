-- Create generated_scripts table for storing AI-generated scripts
CREATE TABLE IF NOT EXISTS generated_scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    idea_id UUID REFERENCES generated_ideas(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    script_content TEXT NOT NULL,
    style TEXT DEFAULT 'reddit' CHECK (style IN ('reddit', 'youtube', 'tiktok')),
    length TEXT DEFAULT 'medium' CHECK (length IN ('short', 'medium', 'long')),
    word_count INTEGER DEFAULT 0,
    estimated_duration TEXT DEFAULT '0s',
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_generated_scripts_user_id ON generated_scripts(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_scripts_idea_id ON generated_scripts(idea_id);
CREATE INDEX IF NOT EXISTS idx_generated_scripts_created_at ON generated_scripts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_scripts_is_favorite ON generated_scripts(is_favorite) WHERE is_favorite = TRUE;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_generated_scripts_updated_at
    BEFORE UPDATE ON generated_scripts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE generated_scripts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own scripts" ON generated_scripts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scripts" ON generated_scripts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scripts" ON generated_scripts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scripts" ON generated_scripts
    FOR DELETE USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON generated_scripts TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated; 