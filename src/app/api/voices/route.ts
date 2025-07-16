import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

interface VoiceReference {
  id: string;
  name: string;
  description: string;
  file_path: string;
  type: 'reference';
  preview_url: string | null;
}

interface GeneratedVoice {
  id: string;
  scriptId: string;
  scriptTitle: string;
  audioUrl: string;
  duration: string;
  created_at: string;
  type: 'generated';
}

export async function GET(req: NextRequest) {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Get voice reference files from voices directory
    const voicesDir = path.join(process.cwd(), 'voices');
    let referenceVoices: VoiceReference[] = [];
    
    try {
      const files = await fs.readdir(voicesDir);
      const audioFiles = files.filter(file => 
        file.endsWith('.mp3') || file.endsWith('.wav') || file.endsWith('.m4a') || 
        file.endsWith('.flac') || file.endsWith('.ogg')
      );
      
      referenceVoices = audioFiles.map(file => ({
        id: file,
        name: file.replace(/\.[^/.]+$/, ""), // Remove extension
        description: `Voice reference file: ${file}`,
        file_path: path.join(voicesDir, file),
        type: 'reference',
        preview_url: null
      }));
    } catch (error) {
      console.log('No voices directory found or error reading it');
    }

    // Get generated voices from database
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
      console.error('Error fetching generated voices:', error);
    }

    // Transform generated voices data for the voice selector
    const generatedVoices = data?.map(script => ({
      id: script.id,
      scriptId: script.id,
      scriptTitle: script.title,
      audioUrl: script.audio_url,
      duration: '0:30', // TODO: Calculate actual duration
      created_at: script.created_at,
      type: 'generated'
    })) || [];

    // Get Supabase voices from voice_files table
    const { data: supabaseVoices, error: supabaseError } = await supabase
      .from('voice_files')
      .select('id, name, description, file_type, file_size, duration, created_at');

    if (supabaseError) {
      console.error('Error fetching Supabase voices:', supabaseError);
    }

    // For backward compatibility, return both types
    // If this is a request for voice reference files (automation), return reference voices
    // If this is a request for generated voices (voice selector), return generated voices
    const url = new URL(req.url);
    const type = url.searchParams.get('type');
    
    if (type === 'reference') {
      return NextResponse.json(referenceVoices);
    } else if (type === 'generated') {
      return NextResponse.json({ 
        voices: generatedVoices,
        total: generatedVoices.length
      });
    } else if (type === 'supabase') {
      // Return all voices from Supabase voice_files table
      return NextResponse.json(
        (supabaseVoices || []).map(v => ({
          id: v.id,
          name: v.name,
          description: v.description,
          fileType: v.file_type,
          fileSize: v.file_size,
          duration: v.duration,
          createdAt: v.created_at
        }))
      );
    } else {
      // Default: return both for backward compatibility
      return NextResponse.json({ 
        voices: generatedVoices,
        total: generatedVoices.length,
        referenceVoices: referenceVoices
      });
    }

  } catch (error) {
    console.error('Voices fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 