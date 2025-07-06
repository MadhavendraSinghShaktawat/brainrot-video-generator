import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth-helpers';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { user, error: authError } = await authenticateUser(request);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || 'Authentication failed' },
        { status: 401 }
      );
    }

    // Get user's videos
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: videos, error } = await supabase
      .from('generated_videos')
      .select(`
        id,
        video_url,
        duration,
        created_at,
        generated_scripts!inner (
          id,
          title,
          script_content
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching videos:', error);
      return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
    }

    // Transform data
    const formattedVideos = videos?.map(video => ({
      id: video.id,
      videoUrl: video.video_url,
      duration: video.duration,
      createdAt: video.created_at,
      script: {
        id: (video.generated_scripts as any).id,
        title: (video.generated_scripts as any).title,
        content: (video.generated_scripts as any).script_content
      }
    })) || [];

    return NextResponse.json({ 
      videos: formattedVideos,
      total: formattedVideos.length
    });

  } catch (error) {
    console.error('Videos fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 