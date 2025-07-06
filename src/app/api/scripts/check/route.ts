import { NextRequest, NextResponse } from 'next/server';
import { ScriptsStorageService } from '@/services/scripts-storage';
import { authenticateUser } from '@/lib/auth-helpers';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('generated_scripts')
      .select(`
        id,
        title,
        script_content,
        created_at,
        audio_url
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching scripts:', error);
      return NextResponse.json({ error: 'Failed to fetch scripts' }, { status: 500 });
    }

    // Transform data for the script selector
    const scripts = data?.map(script => ({
      id: script.id,
      title: script.title,
      content: script.script_content,
      created_at: script.created_at,
      audio_url: script.audio_url,
      hasAudio: !!script.audio_url,
      duration: script.audio_url ? '0:30' : undefined, // TODO: Calculate actual duration
      wordCount: script.script_content.split(/\s+/).length
    })) || [];

    return NextResponse.json({ 
      scripts,
      total: scripts.length
    });

  } catch (error) {
    console.error('Scripts fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { ideaIds }: { ideaIds: string[] } = await request.json();
    
    // Validate request
    if (!Array.isArray(ideaIds) || ideaIds.length === 0) {
      return NextResponse.json(
        { error: 'Idea IDs array is required' },
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

    // Check scripts for each idea
    const scriptsMap: Record<string, any> = {};
    
    const storageBucket = 'generated-audio';

    for (const ideaId of ideaIds) {
      const script = await ScriptsStorageService.getScriptByIdeaId(
        ideaId,
        user.id,
        supabaseClient
      );

      if (script) {
        // If script already contains audio_url use it, otherwise attempt to construct one
        let audio_url = (script as any).audio_url as string | null;
        if (!audio_url) {
          const { data } = supabaseClient.storage.from(storageBucket).getPublicUrl(`${script.id}.wav`);
          audio_url = data.publicUrl;
        }
        scriptsMap[ideaId] = { ...script, audio_url };
      } else {
        scriptsMap[ideaId] = null;
      }
    }

    return NextResponse.json({ 
      success: true, 
      scripts: scriptsMap,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error checking scripts:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to check scripts', 
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 