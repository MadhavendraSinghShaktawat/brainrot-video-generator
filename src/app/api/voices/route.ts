import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { data, error } = await supabase
      .from('generated_scripts')
      .select(`
        id,
        title,
        audio_url,
        created_at
      `)
      .not('audio_url', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching voices:', error);
      return NextResponse.json({ error: 'Failed to fetch voices' }, { status: 500 });
    }

    // Transform data for the voice selector
    const voices = data?.map(script => ({
      id: script.id,
      scriptId: script.id,
      scriptTitle: script.title,
      audioUrl: script.audio_url,
      duration: '0:30', // TODO: Calculate actual duration
      created_at: script.created_at
    })) || [];

    return NextResponse.json({ 
      voices,
      total: voices.length
    });

  } catch (error) {
    console.error('Voices fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 