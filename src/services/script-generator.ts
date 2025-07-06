import { openai } from '@/lib/openai';
import { GeneratedIdea } from '@/types/database';

export interface ScriptGenerationRequest {
  ideaId: string;
  style?: 'reddit' | 'youtube' | 'tiktok';
  length?: 'short' | 'medium' | 'long';
}

export interface GeneratedScriptData {
  idea_id: string;
  title: string;
  script_content: string;
  style: string;
  length: string;
  word_count: number;
  estimated_duration: string;
}

export class ScriptGeneratorService {
  private static readonly VIRAL_SCRIPT_TEMPLATE = `
You are a viral Reddit storyteller for a YouTube channel. Based on the provided story idea, write a complete, engaging script that follows proven viral patterns.

CRITICAL TTS REQUIREMENTS:
- NO stage directions like [pause], [emphasize], [sigh], etc.
- NO engagement metrics (likes, views, comments)
- Write ONLY what should be spoken aloud
- Use natural speech patterns and timing
- Let emotion come through word choice, not directions

VIRAL SCRIPT REQUIREMENTS:
1. **Hook (First 10 seconds)**: Start with an attention-grabbing question or shocking statement
2. **Personal Narrative**: Use first-person perspective throughout
3. **Conversational Tone**: Natural, slightly imperfect language that feels authentic
4. **Emotional Build-up**: Gradually reveal details to build suspense and emotion
5. **Vivid Details**: Include specific details about people, places, and feelings
6. **Moral Complexity**: Show the narrator's thoughts, doubts, and justifications
7. **Satisfying Resolution**: End with a twist, justice served, or strong emotional punch
8. **Engagement Elements**: Include moments that trigger comments and shares

SCRIPT STRUCTURE:
- **Opening Hook** (0-10 seconds): Grab attention immediately
- **Setup** (10-30 seconds): Establish context and characters
- **Rising Action** (30-80% of script): Build tension and reveal details
- **Climax** (80-90%): The main dramatic moment or revelation
- **Resolution** (90-100%): Consequences, justice, or emotional payoff

LANGUAGE STYLE:
- Use contractions and casual language
- Include emotional expressions naturally in the words
- Use natural speech rhythms and sentence breaks
- Include rhetorical questions to engage viewers
- Use specific details that make the story feel real
- Express emotions through word choice, not stage directions

LENGTH GUIDELINES:
- Short (30-60 seconds): 80-120 words
- Medium (1-2 minutes): 150-200 words  
- Long (2-3 minutes): 180-200 words

IMPORTANT: The script should be ready for Text-to-Speech conversion. Write only spoken words, no stage directions, no formatting, no engagement metrics.
`;

  static async generateScript(
    idea: GeneratedIdea, 
    request: ScriptGenerationRequest
  ): Promise<GeneratedScriptData> {
    try {
      const { style = 'reddit', length = 'medium' } = request;
      
      const lengthGuideline = this.getLengthGuideline(length);
      const styleGuideline = this.getStyleGuideline(style);
      
      const prompt = `
${this.VIRAL_SCRIPT_TEMPLATE}

STORY IDEA TO ADAPT:
Title: ${idea.title}
Hook: ${idea.hook}
Story Summary: ${idea.story}
Viral Factors: ${idea.viral_factors.join(', ')}
Emotional Triggers: ${idea.emotional_triggers.join(', ')}
Target Audience: ${idea.target_audience}

SCRIPT REQUIREMENTS:
- Style: ${styleGuideline}
- Length: ${lengthGuideline}
- MAXIMUM: 200 words (strictly enforce this limit)
- TTS-Ready: NO stage directions, NO metrics, ONLY spoken words

Write a complete script that transforms this idea into a viral story. Make it feel authentic, emotional, and shareable. The script should be ready for Text-to-Speech conversion.

CRITICAL: 
1. NEVER exceed 200 words total
2. Return ONLY the spoken words - no [pause], [emphasize], no engagement metrics, no stage directions
3. Write exactly what should be spoken aloud
4. Count your words and stay under 200
`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert viral content creator who specializes in writing Reddit-style stories that go viral on YouTube. You understand pacing, emotional hooks, and what makes content shareable."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const scriptContent = completion.choices[0]?.message?.content;
      if (!scriptContent) {
        throw new Error('No script generated');
      }

      const wordCount = this.countWords(scriptContent);
      const estimatedDuration = this.estimateDuration(wordCount);

      return {
        idea_id: idea.id,
        title: idea.title,
        script_content: scriptContent.trim(),
        style,
        length,
        word_count: wordCount,
        estimated_duration: estimatedDuration,
      };
    } catch (error) {
      console.error('Error generating script:', error);
      throw new Error('Failed to generate script. Please try again.');
    }
  }

  private static getLengthGuideline(length: string): string {
    switch (length) {
      case 'short':
        return 'Short format (30-60 seconds, 80-120 words) - Focus on the most dramatic moment';
      case 'long':
        return 'Long format (2-3 minutes, 180-200 words) - Include full backstory and detailed resolution';
      default:
        return 'Medium format (1-2 minutes, 150-200 words) - Balanced storytelling with key details';
    }
  }

  private static getStyleGuideline(style: string): string {
    switch (style) {
      case 'youtube':
        return 'YouTube optimized - Include engagement hooks and call-to-actions';
      case 'tiktok':
        return 'TikTok style - Fast-paced, punchy, with visual cues';
      default:
        return 'Reddit style - Authentic, conversational, first-person narrative';
    }
  }

  private static countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }

  private static estimateDuration(wordCount: number): string {
    // Average reading speed: 150-160 words per minute for conversational content
    const wordsPerMinute = 155;
    const minutes = wordCount / wordsPerMinute;
    
    if (minutes < 1) {
      const seconds = Math.round(minutes * 60);
      return `${seconds} seconds`;
    } else {
      const mins = Math.floor(minutes);
      const secs = Math.round((minutes - mins) * 60);
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
  }

  static cleanScriptForTTS(scriptContent: string): string {
    // Remove stage directions and formatting for TTS
    return scriptContent
      // Remove stage directions in brackets
      .replace(/\[.*?\]/g, '')
      // Remove engagement metrics (likes, views, etc.)
      .replace(/Likes:.*?lakhs.*?Views:.*?lakhs.*?$/gim, '')
      .replace(/\d+\.\d+\s*lakhs?\s*(likes?|views?)/gi, '')
      // Remove multiple spaces and line breaks
      .replace(/\s+/g, ' ')
      // Remove leading/trailing whitespace
      .trim();
  }

  static async generateMultipleScripts(
    ideas: GeneratedIdea[],
    baseRequest: Omit<ScriptGenerationRequest, 'ideaId'>
  ): Promise<GeneratedScriptData[]> {
    const scripts: GeneratedScriptData[] = [];
    
    for (const idea of ideas) {
      try {
        const script = await this.generateScript(idea, {
          ...baseRequest,
          ideaId: idea.id,
        });
        scripts.push(script);
      } catch (error) {
        console.error(`Failed to generate script for idea ${idea.id}:`, error);
        // Continue with other scripts even if one fails
      }
    }
    
    return scripts;
  }
} 