import { NextRequest, NextResponse } from 'next/server';
import { getAvatarProvider } from '@/services/avatar-providers';
import { AvatarRequest, AvatarJobStatus } from '@/types/avatar';
import { supabaseAdmin } from '@/lib/db';
import { authenticateUser } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
  // Authenticate user (optional – allow anonymous?)
  const { user, error } = await authenticateUser(request);
  if (error) {
    return NextResponse.json({ error }, { status: 401 });
  }

  let body: Partial<AvatarRequest>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.script || !body.avatarId) {
    return NextResponse.json({ error: 'script and avatarId are required' }, { status: 400 });
  }

  const provider = getAvatarProvider();

  try {
    const { jobId } = await provider.submit(body as AvatarRequest);

    // Insert DB row
    const { data, error: dbError } = await supabaseAdmin
      .from('avatar_jobs')
      .insert({
        user_id: user?.id ?? null,
        provider: (process.env.AVATAR_PROVIDER || 'heygen').toLowerCase(),
        provider_job_id: jobId,
        request: body,
        status: 'processing' as AvatarJobStatus,
      })
      .select()
      .single();

    if (dbError) {
      console.error('avatar_jobs insert failed', dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  } catch (err: any) {
    console.error('Avatar render error', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 