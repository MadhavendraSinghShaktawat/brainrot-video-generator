import { NextRequest, NextResponse } from 'next/server';
import { IdeaGeneratorService } from '@/services/idea-generator';
import { IdeasStorageService } from '@/services/ideas-storage';
import { IdeaGenerationRequest } from '@/lib/openai';
import { authenticateUser } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    const body: IdeaGenerationRequest = await request.json();
    
    // Validate request
    if (!body.count || body.count < 1 || body.count > 20) {
      return NextResponse.json(
        { error: 'Count must be between 1 and 20' },
        { status: 400 }
      );
    }

    // Authenticate user
    const { user, error: authError, supabase: supabaseClient } = await authenticateUser(request);
    
    if (authError || !user || !supabaseClient) {
      return NextResponse.json(
        { error: authError || 'Authentication failed' },
        { status: 401 }
      );
    }

    // Generate ideas using OpenAI
    const ideas = await IdeaGeneratorService.generateIdeas(body);

    // Save ideas to Supabase with authenticated client
    const savedIdeas = await IdeasStorageService.saveIdeas(ideas, user.id, body, supabaseClient);

    return NextResponse.json({ 
      success: true, 
      ideas: savedIdeas,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in generate-ideas API:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate ideas', 
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Idea Generation API',
    availableThemes: IdeaGeneratorService.getPopularThemes(),
    supportedTones: ['dramatic', 'shocking', 'emotional', 'controversial', 'inspiring'],
    supportedLengths: ['short', 'medium', 'long']
  });
} 