import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export { openai };

export interface StoryIdea {
  title: string;
  hook: string;
  story: string;
  viralFactors: string[];
  estimatedViews: string;
  emotionalTriggers: string[];
  targetAudience: string;
}

export interface IdeaGenerationRequest {
  count: number;
  themes?: string[];
  tone?: 'dramatic' | 'shocking' | 'emotional' | 'controversial' | 'inspiring';
  length?: 'short' | 'medium' | 'long';
} 