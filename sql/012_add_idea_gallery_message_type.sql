-- Add 'idea_gallery' message type to the messages table constraint
-- This allows the GPT-4.0 agent to save idea gallery messages

-- Drop the existing constraint
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_message_type_check;

-- Add the new constraint with 'idea_gallery' included
ALTER TABLE messages ADD CONSTRAINT messages_message_type_check 
CHECK (message_type IN (
    'text', 
    'avatar_gallery', 
    'voice_selector', 
    'script_options', 
    'idea_gallery',
    'video_preview', 
    'generation_progress'
)); 