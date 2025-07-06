import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth-helpers';
import { inngest } from '@/lib/inngest';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { scriptId, backgroundVideo = 'subwaySurfer.mp4' } = await request.json();
    
    // Validate request
    if (!scriptId) {
      return NextResponse.json(
        { error: 'Script ID is required' },
        { status: 400 }
      );
    }

    // Authenticate user
    const { user, error: authError } = await authenticateUser(request);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || 'Authentication failed' },
        { status: 401 }
      );
    }

    // Get script details
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: script, error: scriptError } = await supabase
      .from('generated_scripts')
      .select('*')
      .eq('id', scriptId)
      .eq('user_id', user.id)
      .single();

    if (scriptError || !script) {
      return NextResponse.json(
        { error: 'Script not found' },
        { status: 404 }
      );
    }

    if (!script.audio_url) {
      return NextResponse.json(
        { error: 'No audio found for this script. Please generate voice first.' },
        { status: 400 }
      );
    }

    // Send event to Inngest to start video generation workflow
    await inngest.send({
      name: 'video.generation.requested',
      data: {
        scriptId,
        audioUrl: script.audio_url,
        backgroundVideo,
        scriptContent: script.script_content,
        userId: user.id
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Video generation started. You will be notified when it\'s complete.',
      status: 'processing',
      scriptId
    });

  } catch (error) {
    console.error('Error starting video generation:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to start video generation', 
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({ 
    message: 'Video generation endpoint is disabled',
    status: 'under_maintenance'
  }, { status: 503 });
} 