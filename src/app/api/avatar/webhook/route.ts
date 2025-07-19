import { NextRequest, NextResponse } from 'next/server';
import { getAvatarProvider } from '@/services/avatar-providers';
import { supabaseAdmin } from '@/lib/db';
import { AvatarJobStatus } from '@/types/avatar';

// helper to map status string
function mapStatus(s: string): AvatarJobStatus {
  switch (s) {
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    default:
      return 'processing';
  }
}

export async function POST(request: NextRequest) {
  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const provider = getAvatarProvider();

  try {
    if (!provider.handleWebhook) {
      return NextResponse.json({ error: 'Provider does not support webhooks' }, { status: 400 });
    }

    const info = await provider.handleWebhook(payload);

    // Upsert avatar_jobs row
    await supabaseAdmin
      .from('avatar_jobs')
      .update({
        status: info.status as AvatarJobStatus,
        output_url: info.outputUrl ?? null,
        error_message: info.errorMessage ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('provider_job_id', info.jobId);

    // If completed insert into assets table using local job id so placeholder matches
    if (info.status === 'completed' && info.outputUrl) {
      // fetch avatar_jobs row to get internal id
      const { data: jobRow } = await supabaseAdmin
        .from('avatar_jobs')
        .select('id')
        .eq('provider_job_id', info.jobId)
        .single();

      const assetId = jobRow?.id ?? info.jobId;

      await supabaseAdmin
        .from('assets')
        .upsert({
          id: assetId,
          url: info.outputUrl,
          preview_url: null,
          description: 'HeyGen speaking avatar video',
        }, { onConflict: 'id', ignoreDuplicates: true });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Avatar webhook error', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 