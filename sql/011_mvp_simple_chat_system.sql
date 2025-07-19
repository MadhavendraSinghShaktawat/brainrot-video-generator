-- MVP Simple Chat System for Intelligent Video Agent
-- Created: 2025-01-19
-- Focus: Essential features only for MVP

-- =============================================
-- 1. CONVERSATIONS TABLE (Simple)
-- =============================================
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic metadata
    title VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    
    -- Video creation workflow state (essential for MVP)
    workflow_step VARCHAR(100) DEFAULT 'initial' CHECK (workflow_step IN (
        'initial', 'script_generation', 'script_iteration', 'avatar_selection', 
        'voice_selection', 'video_generation', 'completed'
    )),
    
    -- Current selections (denormalized for simplicity)
    selected_avatar_id VARCHAR(255),
    selected_voice_id VARCHAR(255),
    selected_platform VARCHAR(20) CHECK (selected_platform IN ('instagram', 'tiktok', 'youtube')),
    
    -- Simple context storage
    context JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Basic indexes
CREATE INDEX idx_conversations_user_id ON conversations(user_id, created_at DESC);
CREATE INDEX idx_conversations_workflow ON conversations(workflow_step) WHERE status = 'active';

-- =============================================
-- 2. MESSAGES TABLE (Simple)
-- =============================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    
    -- Message basics
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('user', 'ai')),
    message_type VARCHAR(50) NOT NULL DEFAULT 'text' CHECK (message_type IN (
        'text', 'avatar_gallery', 'voice_selector', 'script_options', 'video_preview', 'generation_progress'
    )),
    
    -- Content
    content TEXT,
    data JSONB, -- For structured data (avatar options, etc.)
    
    -- Simple ordering
    sequence_number BIGINT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Basic indexes
CREATE INDEX idx_messages_conversation ON messages(conversation_id, sequence_number DESC);

-- =============================================
-- 3. SIMPLE TRIGGER FOR SEQUENCE NUMBERS
-- =============================================
CREATE OR REPLACE FUNCTION set_message_sequence()
RETURNS TRIGGER AS $$
BEGIN
    NEW.sequence_number = (
        SELECT COALESCE(MAX(sequence_number), 0) + 1 
        FROM messages 
        WHERE conversation_id = NEW.conversation_id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_message_sequence
    BEFORE INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION set_message_sequence();

-- =============================================
-- 4. SIMPLE RLS POLICIES
-- =============================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can only access their own conversations
CREATE POLICY "Users own conversations" ON conversations
    FOR ALL USING (user_id = auth.uid());

-- Users can only access messages in their conversations
CREATE POLICY "Users own messages" ON messages
    FOR ALL USING (
        conversation_id IN (
            SELECT id FROM conversations WHERE user_id = auth.uid()
        )
    );

-- =============================================
-- 5. SIMPLE VIEW FOR RECENT CONVERSATIONS
-- =============================================
CREATE VIEW recent_conversations AS
SELECT 
    c.*,
    m.content as last_message_content,
    m.message_type as last_message_type,
    m.created_at as last_message_at
FROM conversations c
LEFT JOIN LATERAL (
    SELECT content, message_type, created_at
    FROM messages 
    WHERE conversation_id = c.id 
    ORDER BY sequence_number DESC 
    LIMIT 1
) m ON true
ORDER BY COALESCE(m.created_at, c.created_at) DESC; 