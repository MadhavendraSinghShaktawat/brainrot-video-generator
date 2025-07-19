export interface Conversation {
  id: string
  user_id: string
  title: string | null
  status: 'active' | 'completed' | 'archived'
  workflow_step: 'initial' | 'script_generation' | 'script_iteration' | 'avatar_selection' | 'voice_selection' | 'video_generation' | 'completed'
  selected_avatar_id: string | null
  selected_voice_id: string | null
  selected_platform: 'instagram' | 'tiktok' | 'youtube' | null
  context: Record<string, any>
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_type: 'user' | 'ai'
  message_type: 'text' | 'avatar_gallery' | 'voice_selector' | 'script_options' | 'video_preview' | 'generation_progress'
  content: string | null
  data: Record<string, any> | null
  sequence_number: number
  created_at: string
}

export interface RecentConversation extends Conversation {
  last_message_content: string | null
  last_message_type: string | null
  last_message_at: string | null
}

// Message data structures for different message types
export interface ScriptOptionsData {
  scripts: Array<{
    id: string
    title: string
    content: string
    word_count: number
    platform_optimized: string
  }>
}

export interface IdeaGalleryData {
  ideas: Array<{
    id: string
    title: string
    hook: string
    story: string
    viral_factors: string[]
    estimated_views: string
    emotional_triggers: string[]
    target_audience: string
  }>
  topic?: string
  workflow_step: string
}

export interface AvatarGalleryData {
  avatars: Array<{
    id: string
    name: string
    image_url: string
    gender: string
    style: string
  }>
  recommended_ids: string[]
}

export interface VoiceSelectorData {
  voices: Array<{
    id: string
    name: string
    gender: string
    age_range: string
    accent: string
    preview_url: string
  }>
  recommended_ids: string[]
}

export interface VideoPreviewData {
  video_url: string
  thumbnail_url: string
  duration: string
  platform: string
  render_job_id: string
}

export interface GenerationProgressData {
  jobId: string
  step: string
  progress: number
  message: string
  estimated_time_remaining?: number
  status?: 'queued' | 'processing' | 'completed' | 'failed'
  outputUrl?: string
}

// Legacy interfaces for backwards compatibility with MessageRenderer
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  type: string
  content?: string
  data?: any
  createdAt: number
  isTyping?: boolean
}

export interface AvatarData {
  id: string
  name: string
  preview_image_url?: string
  thumbnail_url?: string
  description?: string
  gender?: string
  style?: string
}

export interface VoiceData {
  id: string
  name: string
  language: string
  gender?: string
  age?: string
  accent?: string
  preview_audio_url?: string
  sample_text?: string
} 