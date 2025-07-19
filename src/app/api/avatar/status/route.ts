import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';
import { getAvatarProvider } from '@/services/avatar-providers';
import { AvatarJobStatus } from '@/types/avatar';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id param' }, { status: 400 });

  // Fetch row
  const { data, error } = await supabaseAdmin
    .from('avatar_jobs')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Not found' }, { status: 404 });
  }

  // If finished, short-circuit
  if (['completed', 'failed'].includes(data.status)) {
    return NextResponse.json({ status: data.status, outputUrl: data.output_url, error: data.error_message });
  }

  // Otherwise poll provider
  try {
    const provider = getAvatarProvider();
    const result = await provider.fetchStatus(data.provider_job_id);

    const statusChanged = result.status !== data.status || result.outputUrl !== data.output_url;

    if (statusChanged) {
      // Update avatar_jobs row
      await supabaseAdmin
        .from('avatar_jobs')
        .update({ status: result.status as AvatarJobStatus, output_url: result.outputUrl ?? null, error_message: result.errorMessage ?? null, updated_at: new Date().toISOString() })
        .eq('id', id);

      // If job just completed ensure we have a matching assets record (placeholder will swap)
      if (result.status === 'completed' && result.outputUrl) {
        await supabaseAdmin
          .from('assets')
          .upsert({
            id,
            url: result.outputUrl,
            preview_url: null,
            description: 'HeyGen speaking avatar video',
          }, { onConflict: 'id', ignoreDuplicates: true });
      }
    }

    return NextResponse.json({ status: result.status, outputUrl: result.outputUrl, error: result.errorMessage });
  } catch (err: any) {
    console.error('Avatar status error', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 