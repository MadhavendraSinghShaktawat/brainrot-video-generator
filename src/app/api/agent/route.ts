import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { openai } from '@/lib/openai';
import { IdeaGeneratorService } from '@/services/idea-generator';
import { ScriptGeneratorService } from '@/services/script-generator';
import { createClient } from '@/lib/supabase-server';
import { 
  listAvatarsTool,
  listVoicesTool,
  saveUserSelectionTool,
  generateAvatarVideoTool,
  checkGenerationStatusTool,
  contextUtils 
} from '@/lib/avatar-voice-tools';

/**
 * Enhanced SSE Agent Route - Handles chat interactions with LangGraph tools
 * 
 * This endpoint integrates with enhanced LangGraph tools for:
 * - Intelligent avatar/voice discovery with UI components
 * - Context-aware video generation
 * - Real-time progress tracking
 * - Multi-step conversation workflows
 */

// Legacy patterns - now using AI-powered intent recognition
// const INTENT_PATTERNS = { ... } // Removed in favor of GPT-4.0 recognition

/**
 * AI-Powered Intent Recognition using GPT-4.0
 */
async function recognizeIntentWithAI(message: string): Promise<{ intent: string; confidence: number; entities?: any }> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Faster and cheaper for intent recognition
      messages: [
        {
          role: "system",
          content: `You are an intent recognition AI for a video creation assistant. Analyze the user's message and return JSON with:

{
  "intent": "one of: createVideo, generateScript, generateIdeas, avatarList, voiceList, selectAvatar, selectVoice, checkStatus, general",
  "confidence": 0.0-1.0,
  "entities": {
    "topic": "extracted topic/subject",
    "platform": "tiktok|instagram|youtube if mentioned",
    "count": number if user wants specific amount,
    "length": "short|medium|long if mentioned",
    "style": "dramatic|funny|casual|viral etc if mentioned",
    "avatarId": "if selecting specific avatar",
    "voiceId": "if selecting specific voice"
  }
}

Intent meanings:
- createVideo: User wants complete video creation workflow about a topic
- generateScript: User wants scripts/content written about a topic
- generateIdeas: User wants story/content ideas about a topic  
- avatarList: User wants to see available avatars
- voiceList: User wants to see available voices
- selectAvatar/selectVoice: User selecting specific avatar/voice
- checkStatus: User asking about video generation progress
- general: Greeting, help request, or unclear intent

Examples:
- "give me building in public script ideas" → generateScript with topic="building in public"
- "create a video about startup tips" → createVideo with topic="startup tips"
- "5 story ideas about workplace drama" → generateIdeas with topic="workplace drama", count=5
- "what avatars are available" → avatarList

Extract entities accurately. Always try to identify the topic even if not explicitly stated.`
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.1,
      max_tokens: 300,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      return { intent: 'general', confidence: 0.1 };
    }

    const result = JSON.parse(response);
    
    console.log('🤖 AI Intent Recognition:', {
      message,
      result
    });

    return result;
  } catch (error) {
    console.error('❌ AI Intent Recognition failed:', error);
    // Fallback to simple pattern matching for critical intents
    return simpleIntentFallback(message);
  }
}

/**
 * Simple fallback for when AI intent recognition fails
 */
function simpleIntentFallback(message: string): { intent: string; confidence: number; entities?: any } {
  const lower = message.toLowerCase();
  const entities: any = {};
  
  // Extract count
  const countMatch = message.match(/(\d+)/);
  if (countMatch) entities.count = parseInt(countMatch[1]);
  
  // Simple keyword detection
  if (lower.includes('avatar')) return { intent: 'avatarList', confidence: 0.7, entities };
  if (lower.includes('voice')) return { intent: 'voiceList', confidence: 0.7, entities };
  if (lower.includes('script')) return { intent: 'generateScript', confidence: 0.7, entities };
  if (lower.includes('idea')) return { intent: 'generateIdeas', confidence: 0.7, entities };
  if (lower.includes('video') || lower.includes('create')) return { intent: 'createVideo', confidence: 0.7, entities };
  
  return { intent: 'general', confidence: 0.3, entities };
}

/**
 * Handle complete video creation workflow
 */
const handleVideoCreationWorkflow = async (userMessage: string, entities: any, userId: string) => {
  const { topic, platform = 'tiktok', length = 'medium', style = 'dramatic' } = entities;
  
  if (!topic) {
    return {
      type: 'text',
      content: '🎯 I\'d love to help you create a video! What topic would you like your video to be about? For example:\n\n"Create a video about startup tips for TikTok"\n"Make a video about productivity hacks for YouTube"\n"Generate a video about relationship advice for Instagram"'
    };
  }

  return [
    {
      type: 'text',
      content: `🎬 Perfect! I'll create a ${platform} video about "${topic}" for you. Let me generate some viral story ideas first...`,
      isThinking: true
    },
    {
      type: 'script_options',
      content: `I'll create 3 script options for your video about "${topic}" optimized for ${platform}. Each will have a different approach to maximize viral potential.`,
      data: {
        topic,
        platform,
        length,
        style,
        workflow_step: 'script_generation'
      }
    }
  ];
};

/**
 * Handle script generation with GPT-4.0
 */
const handleScriptGeneration = async (userMessage: string, entities: any, userId: string) => {
  const { topic, platform = 'tiktok', length = 'medium', style = 'viral', count = 3 } = entities;
  
  if (!topic) {
    return {
      type: 'text',
      content: '📝 I need a topic to generate scripts for you. Please tell me what you want the script to be about. For example:\n\n"Generate a script about morning routines"\n"Create a script about overcoming anxiety"\n"Write a script about passive income ideas"'
    };
  }

  try {
    // Step 1: Generate an idea based on the topic
    const storyIdea = await IdeaGeneratorService.generateSingleIdea(topic);
    
    // Convert StoryIdea to GeneratedIdea format for script generation
    const idea = {
      id: nanoid(),
      title: storyIdea.title,
      hook: storyIdea.hook,
      story: storyIdea.story,
      viral_factors: storyIdea.viralFactors,
      emotional_triggers: storyIdea.emotionalTriggers,
      target_audience: storyIdea.targetAudience,
      estimated_views: storyIdea.estimatedViews,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_favorite: false,
      is_used: false,
      generation_settings: {}
    };
    
    // Step 2: Generate scripts based on the idea
    const scripts = await Promise.all([
      ScriptGeneratorService.generateScript(idea, { 
        ideaId: idea.id, 
        style: platform === 'tiktok' ? 'tiktok' : platform === 'youtube' ? 'youtube' : 'reddit',
        length: length === 'quick' || length === 'brief' ? 'short' : length === 'detailed' ? 'long' : 'medium'
      }),
      ScriptGeneratorService.generateScript(idea, { 
        ideaId: idea.id, 
        style: platform === 'tiktok' ? 'tiktok' : platform === 'youtube' ? 'youtube' : 'reddit',
        length: 'medium'
      }),
      ScriptGeneratorService.generateScript(idea, { 
        ideaId: idea.id, 
        style: platform === 'tiktok' ? 'tiktok' : platform === 'youtube' ? 'youtube' : 'reddit',
        length: length === 'quick' || length === 'brief' ? 'medium' : 'short'
      })
    ]);

    return [
      {
        type: 'text',
        content: `🎯 Generating viral scripts about "${topic}" for ${platform}...`,
        isThinking: true
      },
      {
        type: 'script_options',
        content: `Here are 3 viral script options for "${topic}" optimized for ${platform}:`,
        data: {
          scripts: scripts.map((script, index) => ({
            id: script.idea_id + '-' + index,
            title: `Option ${index + 1}: ${script.title}`,
            content: script.script_content,
            duration: script.estimated_duration,
            word_count: script.word_count,
            style: script.style,
            length: script.length
          })),
          topic,
          platform,
          workflow_step: 'script_selection'
        }
      }
    ];
  } catch (error) {
    console.error('Script generation error:', error);
    return {
      type: 'text',
      content: `❌ Sorry, I encountered an error generating scripts about "${topic}". Please try again or rephrase your request.`
    };
  }
};

/**
 * Handle idea generation with GPT-4.0
 */
const handleIdeaGeneration = async (userMessage: string, entities: any, userId: string) => {
  const { topic, count = 5, style = 'dramatic', length = 'medium' } = entities;
  
  try {
    console.log('🔥 Starting idea generation:', { topic, count, style, length });
    
    const ideas = await IdeaGeneratorService.generateIdeas({
      count: Math.min(count, 10), // Limit to prevent overload
      tone: style,
      length,
      themes: topic ? [topic] : undefined
    });

    console.log('✅ Generated ideas:', ideas.length);

    return [
      {
        type: 'text',
        content: topic 
          ? `💡 Generating ${count} viral story ideas about "${topic}"...`
          : `💡 Generating ${count} viral story ideas...`,
        isThinking: true
      },
      {
        type: 'script_options',
        content: `Here are ${ideas.length} viral story ideas${topic ? ` about "${topic}"` : ''}:`,
        data: {
          ideas: ideas.map((idea, index) => ({
            id: `idea-${index}-${idea.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`,
            title: idea.title,
            hook: idea.hook,
            story: idea.story,
            viral_factors: idea.viralFactors || [],
            estimated_views: idea.estimatedViews || 'Unknown',
            emotional_triggers: idea.emotionalTriggers || [],
            target_audience: idea.targetAudience || 'General'
          })),
          topic,
          workflow_step: 'idea_selection'
        }
      }
    ];
  } catch (error) {
    console.error('❌ Idea generation error:', error);
    
    // Provide a fallback with sample ideas if API fails
    const fallbackIdeas = [
      {
        id: 'fallback-1',
        title: 'The Day I Exposed My Boss\'s Fraud',
        hook: 'I thought I was just doing my job until I discovered my boss was stealing from employees',
        story: 'A dedicated employee discovers their manager has been skimming from payroll for months. When confronted, the boss tries to frame the employee, leading to a dramatic workplace showdown.',
        viral_factors: ['workplace drama', 'justice served', 'fraud exposure'],
        estimated_views: '2.5M views',
        emotional_triggers: ['anger', 'satisfaction'],
        target_audience: 'Working professionals 25-45'
      }
    ];

    return [
      {
        type: 'text',
        content: `⚠️ I'm having trouble generating ideas right now, but here's a sample idea about "${topic || 'workplace drama'}":`,
        isThinking: false
      },
      {
        type: 'script_options',
        content: `Sample viral story idea${topic ? ` about "${topic}"` : ''}:`,
        data: {
          ideas: fallbackIdeas,
          topic,
          workflow_step: 'idea_selection',
          is_fallback: true
        }
      }
    ];
  }
};

/**
 * Enhanced response generation with tool integration and context awareness
 */
const generateEnhancedResponse = async (userMessage: string, userId: string = 'default') => {
  const { intent, entities } = await recognizeIntentWithAI(userMessage);
  
  // Debug logging to see what's happening
  console.log('🔍 AI Intent Recognition Result:', {
    userMessage,
    detectedIntent: intent,
    extractedEntities: entities
  });
  
  // Get user context for personalized responses
  const context = contextUtils.getContext(userId) || {};
  
  // Enhanced context tracking with Supabase integration
  const saveContextToConversation = async (workflowStep: string, workflowState: any) => {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Find or create current conversation
        let { data: conversations } = await supabase
          .from('conversations')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1);
          
        if (conversations && conversations.length > 0) {
          // Update existing conversation
          await supabase
            .from('conversations')
            .update({
              workflow_step: workflowStep,
              workflow_state: workflowState,
              updated_at: new Date().toISOString()
            })
            .eq('id', conversations[0].id);
        }
      }
    } catch (error) {
      console.error('Error saving context to conversation:', error);
    }
  };
  
  try {
    switch (intent) {
      case 'createVideo':
        // Full video creation workflow with GPT-4.0
        return await handleVideoCreationWorkflow(userMessage, entities, userId);
        
      case 'generateScript':
        // Generate scripts with GPT-4.0
        return await handleScriptGeneration(userMessage, entities, userId);
        
      case 'generateIdeas':
        // Generate story ideas with GPT-4.0
        return await handleIdeaGeneration(userMessage, entities, userId);
        
      case 'avatarList':
        // Use enhanced avatar list tool
        const avatarResult = await listAvatarsTool.func({ 
          userId, 
          limit: entities?.language ? 50 : 100 
        });
        return [
          {
            type: 'text',
            content: '🤔 Let me check what avatars are available for you...',
            isThinking: true
          },
          avatarResult
        ];
        
      case 'voiceList':
        // Use enhanced voice list tool
        const voiceResult = await listVoicesTool.func({ 
          userId,
          language: entities?.language,
          limit: 50
        });
        return [
          {
            type: 'text',
            content: '🎤 Checking available voices for you...',
            isThinking: true
          },
          voiceResult
        ];
        
      case 'generateVideo':
      case 'createVideo':
        // Check if this is a complete video request or just video generation
        if (entities?.topic) {
          return await handleVideoCreationWorkflow(userMessage, entities, userId);
        }
        
        // Use enhanced video generation tool with context for direct script
        const script = entities?.script || userMessage.replace(/generate|create|make|video|avatar/gi, '').trim();
        
        if (!script || script.length < 10) {
          return {
            type: 'text',
            content: '📝 I need a script to generate your video. Please provide the text you want the avatar to say. For example: "Create a video with script: Hello, welcome to our service!"'
          };
        }
        
        const generateResult = await generateAvatarVideoTool.func({
          script,
          avatarId: entities?.avatarId,
          voiceId: entities?.voiceId,
          userId
        });
        return generateResult;
        
      case 'checkStatus':
        // Use enhanced status check tool
        const statusResult = await checkGenerationStatusTool.func({ userId });
        return statusResult;
        
      case 'selectAvatar':
        // Save avatar selection to context
        if (entities?.avatarId) {
          const saveAvatarResult = await saveUserSelectionTool.func({
            userId,
            avatarId: entities.avatarId
          });
          return saveAvatarResult;
        } else {
          return {
            type: 'text',
            content: '🎭 Please specify which avatar you\'d like to select. You can say "select avatar: [avatar_id]" or first browse available avatars with "show me avatars".'
          };
        }
        
      case 'selectVoice':
        // Save voice selection to context
        if (entities?.voiceId) {
          const saveVoiceResult = await saveUserSelectionTool.func({
            userId,
            voiceId: entities.voiceId
          });
          return saveVoiceResult;
        } else {
          return {
            type: 'text',
            content: '🎤 Please specify which voice you\'d like to select. You can say "select voice: [voice_id]" or first browse available voices with "show me voices".'
          };
        }
        
      default:
        // Default/general conversation with helpful guidance
        let response;
        
        // If user provided a topic but AI couldn't classify intent, try to help
        if (entities?.topic) {
          response = `🤔 I understand you want something about "${entities.topic}", but I'm not sure exactly what. Let me help:\n\n`;
          response += `🎬 **Create Video**: "Create a video about ${entities.topic} for TikTok"\n`;
          response += `📝 **Generate Scripts**: "Generate a script about ${entities.topic}"\n`;
          response += `💡 **Get Ideas**: "Give me 5 ideas about ${entities.topic}"\n\n`;
          response += `Just let me know which one you'd prefer!`;
        } else {
          // Generic help message
          response = `👋 Hi! I'm your AI video creation assistant. I can help you with:\n\n`;
          response += `🎬 **Complete Videos** - "Create a video about [topic] for TikTok"\n`;
          response += `📝 **Viral Scripts** - "Generate a script about [topic]"\n`;
          response += `💡 **Story Ideas** - "Give me 5 ideas about [topic]"\n`;
          response += `🎭 **Browse Avatars** - "What avatars are available?"\n`;
          response += `🎤 **Explore Voices** - "Show me available voices"\n\n`;
          
          // Add context-aware suggestions
          if (context.selectedAvatarId && context.selectedVoiceId) {
            response += `✅ **Ready to Create!** You have an avatar and voice selected - just tell me what video to make!\n\n`;
          }
          
          response += `💡 **Examples**:\n`;
          response += `• "Generate building in public script ideas"\n`;
          response += `• "Create a morning routine video for TikTok"\n`;
          response += `• "Give me 5 startup story ideas"`;
        }
        
        return {
          type: 'text',
          content: response
        };
    }
  } catch (error) {
    console.error('Enhanced response generation error:', error);
    return {
      type: 'text',
      content: 'Sorry, I encountered an error while processing your request. Please try again or rephrase your message.',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
  
  // Fallback response
  return {
    type: 'text',
    content: 'I\'m not sure how to help with that. Try asking about avatars, voices, or video generation!'
  };
};

export async function POST(request: NextRequest) {
  try {
    const { message, userId } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Set up SSE headers
    const headers = new Headers({
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Generate enhanced response with intent recognition
          const enhancedResponse = await generateEnhancedResponse(message.trim(), userId || 'default');
          const responses = Array.isArray(enhancedResponse) ? enhancedResponse : [enhancedResponse];

          // Send responses sequentially with proper timing
          for (let index = 0; index < responses.length; index++) {
            const response = responses[index];
            
            const responseMessage = {
              id: nanoid(),
              role: 'assistant',
              type: response.type,
              content: response.content,
              data: (response as any).data,
              isThinking: (response as any).isThinking,
              success: (response as any).success,
              metadata: (response as any).metadata,
              createdAt: Date.now()
            };

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(responseMessage)}\n\n`)
            );

            // Short delay only for thinking messages
            if ((response as any).isThinking && index < responses.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 800));
            }
          }

          // Close stream
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
          
        } catch (error) {
          console.error('Enhanced agent stream error:', error);
          
          // Send error message
          const errorMessage = {
            id: nanoid(),
            role: 'assistant',
            type: 'text',
            content: 'Sorry, I encountered an error while processing your request. Please try again.',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            createdAt: Date.now()
          };
          
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`)
          );
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        }
      },
    });

    return new NextResponse(stream, { headers });
  } catch (error) {
    console.error('Enhanced agent route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 