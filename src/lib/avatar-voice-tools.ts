import { tool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * Enhanced LangGraph Tools for Avatar & Voice Integration
 * 
 * These tools provide intelligent avatar and voice capabilities with:
 * - Structured data responses for chat UI components
 * - Direct provider integration (no internal API calls)
 * - Context persistence for conversation state
 * - Rate limiting to prevent API abuse
 * - Improved error handling and validation
 */

// Conversation context interface
interface ConversationContext {
  selectedAvatarId?: string;
  selectedVoiceId?: string;
  lastGeneratedJobId?: string;
  userPreferences?: {
    preferredLanguage?: string;
    preferredGender?: string;
  };
}

// Rate limiting interface
interface RateLimitEntry {
  count: number;
  windowStart: number;
}

// Global conversation context (in production, this would be in a proper state store)
const conversationContexts = new Map<string, ConversationContext>();

// Rate limiting storage (in production, use Redis or similar)
const rateLimitStorage = new Map<string, RateLimitEntry>();

// Rate limiting configuration
const RATE_LIMITS = {
  // API calls per user per time window
  avatarList: { maxRequests: 10, windowMs: 60000 }, // 10 requests per minute
  voiceList: { maxRequests: 10, windowMs: 60000 }, // 10 requests per minute
  generateVideo: { maxRequests: 5, windowMs: 300000 }, // 5 videos per 5 minutes
  checkStatus: { maxRequests: 30, windowMs: 60000 }, // 30 status checks per minute
  default: { maxRequests: 20, windowMs: 60000 } // 20 requests per minute default
};

/**
 * Rate limiting function using sliding window approach
 */
function checkRateLimit(userId: string, operation: string): { allowed: boolean; resetTime?: number; remaining?: number } {
  const now = Date.now();
  const config = RATE_LIMITS[operation as keyof typeof RATE_LIMITS] || RATE_LIMITS.default;
  const key = `${userId}:${operation}`;
  
  let entry = rateLimitStorage.get(key);
  
  // Initialize or reset window if expired
  if (!entry || (now - entry.windowStart) >= config.windowMs) {
    entry = { count: 0, windowStart: now };
  }
  
  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    const resetTime = entry.windowStart + config.windowMs;
    return { 
      allowed: false, 
      resetTime,
      remaining: 0
    };
  }
  
  // Increment counter and update storage
  entry.count++;
  rateLimitStorage.set(key, entry);
  
  return { 
    allowed: true, 
    remaining: config.maxRequests - entry.count
  };
}

/**
 * Enhanced tool to list available avatars with structured response and rate limiting
 */
export const listAvatarsTool = tool(
  async (input: { userId?: string; limit?: number }): Promise<any> => {
    try {
      const { userId = 'default', limit = 100 } = input;
      
      // Rate limiting check
      const rateCheck = checkRateLimit(userId, 'avatarList');
      if (!rateCheck.allowed) {
        const resetIn = Math.ceil((rateCheck.resetTime! - Date.now()) / 1000);
        return {
          type: 'text',
          content: `⚠️ Rate limit exceeded. You can request avatars again in ${resetIn} seconds. This helps us manage API costs.`,
          success: false,
          rateLimited: true,
          resetTime: rateCheck.resetTime
        };
      }
      
      // Import avatar provider directly
      const { getAvatarProvider } = await import('@/services/avatar-providers');
      const provider = getAvatarProvider();

      if (!provider.listAvatars) {
        throw new Error('Avatar provider does not support listing avatars');
      }

      const avatars = await provider.listAvatars();

      if (avatars.length === 0) {
        return {
          type: 'text',
          content: 'No avatars are currently available. Please check your HeyGen configuration.',
          success: false
        };
      }

      // Remove duplicates by ID if any exist
      const processedAvatars = avatars.filter((avatar, index, self) => 
        index === self.findIndex(a => a.id === avatar.id)
      );
      
      // Limit results to prevent payload issues
      const limitedAvatars = processedAvatars.slice(0, limit);

      // Split data correctly to prevent overlap
      const initialBatchSize = 12;
      const initialBatch = limitedAvatars.slice(0, initialBatchSize).map((avatar: any) => ({
        id: avatar.id,
        name: avatar.name,
        preview_image_url: avatar.thumbnailUrl,
        thumbnail_url: avatar.thumbnailUrl,
        description: `AI Avatar: ${avatar.name}`
      }));
      
      const allAvatars = limitedAvatars.slice(initialBatchSize).map((avatar: any) => ({
        id: avatar.id,
        name: avatar.name,
        preview_image_url: avatar.thumbnailUrl,
        thumbnail_url: avatar.thumbnailUrl,
        description: `AI Avatar: ${avatar.name}`
      }));

      return {
        type: 'avatar_gallery',
        content: `I found ${avatars.length} avatars available! ${limit < avatars.length ? `Showing the first ${limit} ` : ''}Scroll through to explore different styles and personalities.`,
        data: {
          totalCount: avatars.length,
          initialBatch,
          allAvatars
        },
        success: true,
        rateLimit: {
          remaining: rateCheck.remaining,
          resetTime: rateLimitStorage.get(`${userId}:avatarList`)?.windowStart! + RATE_LIMITS.avatarList.windowMs
        },
        metadata: {
          userId,
          timestamp: Date.now(),
          totalAvailable: avatars.length,
          displayed: limitedAvatars.length
        }
      };
    } catch (error) {
      console.error('Enhanced avatar list tool error:', error);
      return {
        type: 'text',
        content: 'Unable to fetch avatars at the moment. Please try again later.',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
  {
    name: 'list_avatars_enhanced',
    description: 'Get a structured list of available AI avatars with thumbnails for the chat UI. Returns avatar gallery component data.',
    schema: z.object({
      userId: z.string().optional().describe('User ID for context persistence and rate limiting'),
      limit: z.number().optional().describe('Maximum number of avatars to return (default: 100)'),
    }),
  }
);

/**
 * Enhanced tool to list available voices with structured response and rate limiting
 */
export const listVoicesTool = tool(
  async (input: { userId?: string; language?: string; limit?: number }): Promise<any> => {
    try {
      const { userId = 'default', language, limit = 50 } = input;
      
      // Rate limiting check
      const rateCheck = checkRateLimit(userId, 'voiceList');
      if (!rateCheck.allowed) {
        const resetIn = Math.ceil((rateCheck.resetTime! - Date.now()) / 1000);
        return {
          type: 'text',
          content: `⚠️ Rate limit exceeded. You can request voices again in ${resetIn} seconds. This helps us manage API costs.`,
          success: false,
          rateLimited: true,
          resetTime: rateCheck.resetTime
        };
      }
      
      // Import avatar provider directly
      const { getAvatarProvider } = await import('@/services/avatar-providers');
      const provider = getAvatarProvider();

      if (!provider.listVoices) {
        throw new Error('Avatar provider does not support listing voices');
      }

      const voices = await provider.listVoices();

      if (voices.length === 0) {
        return {
          type: 'text',
          content: 'No voices are currently available. Please check your HeyGen configuration.',
          success: false
        };
      }

      // Remove duplicates by ID if any exist
      const processedVoices = voices.filter((voice, index, self) => 
        index === self.findIndex(v => v.id === voice.id)
      );

      // Filter by language if specified
      let filteredVoices = processedVoices;
      if (language) {
        filteredVoices = processedVoices.filter((voice: any) => 
          voice.language?.toLowerCase().includes(language.toLowerCase())
        );
      }

      // Limit results to prevent payload issues
      const limitedVoices = filteredVoices.slice(0, limit);

      // Split voice data correctly to prevent overlap
      const voiceInitialBatchSize = 8;
      const voiceInitialBatch = limitedVoices.slice(0, voiceInitialBatchSize).map((voice: any) => ({
        id: voice.id,
        name: voice.name,
        language: voice.language || 'English',
        gender: voice.gender,
        age: undefined, // Not provided by HeyGen
        accent: undefined, // Not provided by HeyGen
        preview_audio_url: voice.previewUrl,
        sample_text: `Sample from ${voice.name} voice`
      }));
      
      const voiceAllVoices = limitedVoices.slice(voiceInitialBatchSize).map((voice: any) => ({
        id: voice.id,
        name: voice.name,
        language: voice.language || 'English',
        gender: voice.gender,
        age: undefined,
        accent: undefined,
        preview_audio_url: voice.previewUrl,
        sample_text: `Sample from ${voice.name} voice`
      }));

      return {
        type: 'voice_selector',
        content: `I found ${filteredVoices.length} voices${language ? ` in ${language}` : ''} available! ${limit < filteredVoices.length ? `Showing the first ${limit} ` : ''}Scroll through to explore different voices and accents.`,
        data: {
          totalCount: filteredVoices.length,
          initialBatch: voiceInitialBatch,
          allVoices: voiceAllVoices
        },
        success: true,
        rateLimit: {
          remaining: rateCheck.remaining,
          resetTime: rateLimitStorage.get(`${userId}:voiceList`)?.windowStart! + RATE_LIMITS.voiceList.windowMs
        },
        metadata: {
          userId,
          timestamp: Date.now(),
          totalAvailable: voices.length,
          displayed: limitedVoices.length,
          language: language || 'all'
        }
      };
    } catch (error) {
      console.error('Enhanced voice list tool error:', error);
      return {
        type: 'text',
        content: 'Unable to fetch voices at the moment. Please try again later.',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
  {
    name: 'list_voices_enhanced',
    description: 'Get a structured list of available AI voices with audio previews for the chat UI. Returns voice selector component data.',
    schema: z.object({
      userId: z.string().optional().describe('User ID for context persistence and rate limiting'),
      language: z.string().optional().describe('Filter voices by language'),
      limit: z.number().optional().describe('Maximum number of voices to return (default: 50)'),
    }),
  }
);

/**
 * Tool to save user selections for context persistence (no rate limiting needed)
 */
export const saveUserSelectionTool = tool(
  async (input: { userId: string; avatarId?: string; voiceId?: string; preferences?: any }): Promise<any> => {
    try {
      const { userId, avatarId, voiceId, preferences } = input;
      
      // Get or create context
      let context = conversationContexts.get(userId) || {};
      
      // Update context
      if (avatarId) context.selectedAvatarId = avatarId;
      if (voiceId) context.selectedVoiceId = voiceId;
      if (preferences) context.userPreferences = { ...context.userPreferences, ...preferences };
      
      // Save context
      conversationContexts.set(userId, context);
      
      let response = 'Selection saved! ';
      if (avatarId && voiceId) {
        response += 'You have selected both an avatar and voice. Ready to generate your video!';
      } else if (avatarId) {
        response += 'Avatar selected. Would you like to choose a voice as well?';
      } else if (voiceId) {
        response += 'Voice selected. Would you like to choose an avatar?';
      }

      return {
        type: 'text',
        content: response,
        success: true,
        metadata: {
          userId,
          context: context,
          timestamp: Date.now()
        }
      };
    } catch (error) {
      console.error('Save user selection tool error:', error);
      return {
        type: 'text',
        content: 'Unable to save your selection. Please try again.',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
  {
    name: 'save_user_selection',
    description: 'Save user avatar/voice selections and preferences for context persistence across the conversation.',
    schema: z.object({
      userId: z.string().describe('User ID for context persistence'),
      avatarId: z.string().optional().describe('Selected avatar ID'),
      voiceId: z.string().optional().describe('Selected voice ID'),
      preferences: z.any().optional().describe('User preferences (language, gender, etc.)'),
    }),
  }
);

/**
 * Tool to get user context and selections (no rate limiting needed)
 */
export const getUserContextTool = tool(
  async (input: { userId: string }): Promise<any> => {
    try {
      const { userId } = input;
      const context = conversationContexts.get(userId) || {};
      
      return {
        type: 'context',
        content: 'Retrieved user context successfully.',
        data: context,
        success: true,
        metadata: {
          userId,
          timestamp: Date.now(),
          hasSelections: !!(context.selectedAvatarId || context.selectedVoiceId)
        }
      };
    } catch (error) {
      console.error('Get user context tool error:', error);
      return {
        type: 'text',
        content: 'Unable to retrieve user context.',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
  {
    name: 'get_user_context',
    description: 'Retrieve user context including selected avatars, voices, and preferences.',
    schema: z.object({
      userId: z.string().describe('User ID to get context for'),
    }),
  }
);

/**
 * Enhanced tool to generate avatar video with context awareness and rate limiting
 */
export const generateAvatarVideoTool = tool(
  async (input: { script: string; avatarId?: string; voiceId?: string; userId?: string }): Promise<any> => {
    try {
      const { script, userId = 'default' } = input;
      let { avatarId, voiceId } = input;

      // Rate limiting check - most important for video generation
      const rateCheck = checkRateLimit(userId, 'generateVideo');
      if (!rateCheck.allowed) {
        const resetIn = Math.ceil((rateCheck.resetTime! - Date.now()) / 1000);
        return {
          type: 'text',
          content: `⚠️ Video generation rate limit exceeded. You can generate another video in ${resetIn} seconds. This helps us manage API costs and server load.`,
          success: false,
          rateLimited: true,
          resetTime: rateCheck.resetTime
        };
      }

      if (!script?.trim()) {
        return {
          type: 'text',
          content: 'Error: Script text is required for video generation.',
          success: false
        };
      }

      // Use context selections if not provided
      const context = conversationContexts.get(userId) || {};
      if (!avatarId && context.selectedAvatarId) {
        avatarId = context.selectedAvatarId;
      }
      if (!voiceId && context.selectedVoiceId) {
        voiceId = context.selectedVoiceId;
      }

      if (!avatarId?.trim()) {
        return {
          type: 'text',
          content: 'Error: Avatar ID is required. Please select an avatar first using "show me avatars".',
          success: false
        };
      }

      // Import avatar provider directly
      const { getAvatarProvider } = await import('@/services/avatar-providers');
      const provider = getAvatarProvider();

        if (!provider.submit) {
         throw new Error('Avatar provider does not support video generation');
       }

        const jobResult = await provider.submit({
         script: script.trim(),
         avatarId,
         voiceId,
         width: 1280,
         height: 720,
         format: 'mp4'
       });

        const jobId = jobResult.jobId;

      if (!jobId) {
        return {
          type: 'text',
          content: 'Error: Failed to start video generation. No job ID received.',
          success: false
        };
      }

      // Save job ID to context
      context.lastGeneratedJobId = jobId;
      conversationContexts.set(userId, context);

      return {
        type: 'generation_progress',
        content: '🎬 Video generation started successfully! This typically takes 1-3 minutes.',
        data: {
          jobId,
          status: 'processing',
          avatarId,
          voiceId,
          script: script.trim(),
          startTime: Date.now(),
          estimatedDuration: 180000 // 3 minutes estimate
        },
        success: true,
        rateLimit: {
          remaining: rateCheck.remaining,
          resetTime: rateLimitStorage.get(`${userId}:generateVideo`)?.windowStart! + RATE_LIMITS.generateVideo.windowMs
        },
        metadata: {
          userId,
          timestamp: Date.now(),
          context: context
        }
      };
    } catch (error) {
      console.error('Enhanced avatar generation tool error:', error);
      return {
        type: 'text',
        content: 'Unable to start video generation at the moment. Please try again later.',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
  {
    name: 'generate_avatar_video_enhanced',
    description: 'Generate an AI avatar video with context awareness and rate limiting. Uses previously selected avatar/voice if not provided.',
    schema: z.object({
      script: z.string().describe('The text script for the avatar to speak'),
      avatarId: z.string().optional().describe('The ID of the avatar to use (uses context if not provided)'),
      voiceId: z.string().optional().describe('The ID of the voice to use (uses context if not provided)'),
      userId: z.string().optional().describe('User ID for context persistence and rate limiting'),
    }),
  }
);

/**
 * Enhanced tool to check generation status with structured response and rate limiting
 */
export const checkGenerationStatusTool = tool(
  async (input: { jobId?: string; userId?: string }): Promise<any> => {
    try {
      const { userId = 'default' } = input;
      let { jobId } = input;

      // Rate limiting check
      const rateCheck = checkRateLimit(userId, 'checkStatus');
      if (!rateCheck.allowed) {
        const resetIn = Math.ceil((rateCheck.resetTime! - Date.now()) / 1000);
        return {
          type: 'text',
          content: `⚠️ Status check rate limit exceeded. You can check status again in ${resetIn} seconds.`,
          success: false,
          rateLimited: true,
          resetTime: rateCheck.resetTime
        };
      }

      // Use context job ID if not provided
      if (!jobId) {
        const context = conversationContexts.get(userId) || {};
        jobId = context.lastGeneratedJobId;
      }

      if (!jobId?.trim()) {
        return {
          type: 'text',
          content: 'Error: Job ID is required to check generation status. Please provide a job ID or start a new generation.',
          success: false
        };
      }

      // Import avatar provider directly
      const { getAvatarProvider } = await import('@/services/avatar-providers');
      const provider = getAvatarProvider();

        if (!provider.fetchStatus) {
         throw new Error('Avatar provider does not support status checking');
       }

        const statusResult = await provider.fetchStatus(jobId);
        const { status, outputUrl, errorMessage } = statusResult;

       const baseData = {
         jobId,
         status,
         outputUrl,
         errorMessage,
         timestamp: Date.now()
       };

      switch (status) {
        case 'processing':
          return {
            type: 'generation_progress',
            content: '🔄 Video generation in progress... Please wait while I create your avatar video.',
            data: { ...baseData, progress: 50 },
            success: true,
            rateLimit: {
              remaining: rateCheck.remaining,
              resetTime: rateLimitStorage.get(`${userId}:checkStatus`)?.windowStart! + RATE_LIMITS.checkStatus.windowMs
            }
          };
        
        case 'completed':
          if (outputUrl) {
            return {
              type: 'avatar_video_result',
              content: '🎉 Video generation completed successfully! Your avatar video is ready.',
              data: {
                ...baseData,
                url: outputUrl,
                title: 'Generated Avatar Video',
                duration: undefined // Could be extracted from video metadata
              },
              success: true,
              rateLimit: {
                remaining: rateCheck.remaining,
                resetTime: rateLimitStorage.get(`${userId}:checkStatus`)?.windowStart! + RATE_LIMITS.checkStatus.windowMs
              }
            };
          } else {
            return {
              type: 'text',
              content: '✅ Video generation completed but output URL is not available yet. Please try checking again in a moment.',
              success: false
            };
          }
        
        case 'failed':
           const errorMsg = errorMessage ? `Error: ${errorMessage}` : 'Generation failed for unknown reason.';
           return {
             type: 'text',
             content: `❌ Video generation failed. ${errorMsg} Please try generating the video again.`,
             success: false,
             data: baseData
           };
        
        case 'queued':
          return {
            type: 'generation_progress',
            content: '⏳ Video generation is queued. Your request will start processing shortly.',
            data: { ...baseData, progress: 10 },
            success: true,
            rateLimit: {
              remaining: rateCheck.remaining,
              resetTime: rateLimitStorage.get(`${userId}:checkStatus`)?.windowStart! + RATE_LIMITS.checkStatus.windowMs
            }
          };
        
        default:
          return {
            type: 'generation_progress',
            content: `📊 Video generation status: ${status}. I'll continue monitoring the progress.`,
            data: { ...baseData, progress: 25 },
            success: true,
            rateLimit: {
              remaining: rateCheck.remaining,
              resetTime: rateLimitStorage.get(`${userId}:checkStatus`)?.windowStart! + RATE_LIMITS.checkStatus.windowMs
            }
          };
      }
    } catch (error) {
      console.error('Enhanced status check tool error:', error);
      return {
        type: 'text',
        content: 'Unable to check generation status at the moment. Please try again later.',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
  {
    name: 'check_generation_status_enhanced',
    description: 'Check the status of avatar video generation with structured response and rate limiting. Uses context job ID if not provided.',
    schema: z.object({
      jobId: z.string().optional().describe('The job ID to check status for (uses context if not provided)'),
      userId: z.string().optional().describe('User ID for context persistence and rate limiting'),
    }),
  }
);

// Export enhanced tools
export const enhancedAvatarVoiceTools = [
  listAvatarsTool,
  listVoicesTool,
  saveUserSelectionTool,
  getUserContextTool,
  generateAvatarVideoTool,
  checkGenerationStatusTool,
];

// Export context management utilities
export const contextUtils = {
  getContext: (userId: string) => conversationContexts.get(userId),
  setContext: (userId: string, context: ConversationContext) => conversationContexts.set(userId, context),
  clearContext: (userId: string) => conversationContexts.delete(userId),
  getAllContexts: () => conversationContexts,
};

// Export rate limiting utilities
export const rateLimitUtils = {
  checkLimit: checkRateLimit,
  getRateLimits: () => RATE_LIMITS,
  clearUserLimits: (userId: string) => {
    for (const [key] of rateLimitStorage) {
      if (key.startsWith(`${userId}:`)) {
        rateLimitStorage.delete(key);
      }
    }
  },
  getAllLimits: () => rateLimitStorage,
}; 