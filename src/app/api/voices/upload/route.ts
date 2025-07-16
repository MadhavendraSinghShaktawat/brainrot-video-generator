import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const name = formData.get('name') as string | null;
    if (!file || !name) {
      return NextResponse.json({ success: false, error: 'File and name are required' }, { status: 400 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const fileType = file.type;
    const fileSize = file.size;
    const id = uuidv4();
    const supabase = await createClient();
    const { error } = await supabase.from('voice_files').insert({
      id,
      name,
      description: 'Uploaded via UI',
      voice_data: base64,
      file_type: fileType,
      file_size: fileSize,
    });
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, id });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
} 