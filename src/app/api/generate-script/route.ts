import { NextRequest, NextResponse } from 'next/server';
import { ScriptGeneratorService, ScriptGenerationRequest } from '@/services/script-generator';
import { authenticateUser } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    const body: ScriptGenerationRequest = await request.json();
    
    // Validate request
    if (!body.ideaId) {
      return NextResponse.json(
        { error: 'Idea ID is required' },
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

    // Get the idea from database
    const { data: idea, error: ideaError } = await supabaseClient
      .from('generated_ideas')
      .select('*')
      .eq('id', body.ideaId)
      .eq('user_id', user.id)
      .single();

    if (ideaError || !idea) {
      return NextResponse.json(
        { error: 'Idea not found or you do not have access to it' },
        { status: 404 }
      );
    }

    // Generate script using OpenAI
    const script = await ScriptGeneratorService.generateScript(idea, body);

    // Save script to database
    const { data: savedScript, error: saveError } = await supabaseClient
      .from('generated_scripts')
      .insert({
        user_id: user.id,
        idea_id: script.idea_id,
        title: script.title,
        script_content: script.script_content,
        style: script.style,
        length: script.length,
        word_count: script.word_count,
        estimated_duration: script.estimated_duration,
      })
      .select('*')
      .single();

    if (saveError) {
      console.error('Error saving script:', saveError);
      // Still return the generated script even if saving fails
      return NextResponse.json({ 
        success: true, 
        script,
        warning: 'Script generated but not saved to database',
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({ 
      success: true, 
      script: savedScript,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in generate-script API:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate script', 
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Script Generation API',
    supportedStyles: ['reddit', 'youtube', 'tiktok'],
    supportedLengths: ['short', 'medium', 'long']
  });
} 