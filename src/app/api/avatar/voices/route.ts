import { NextRequest, NextResponse } from 'next/server';
import { getAvatarProvider } from '@/services/avatar-providers';

export async function GET(_req: NextRequest) {
  const provider = getAvatarProvider();
  if (!provider.listVoices) {
    return NextResponse.json({ error: 'Provider does not support voices' }, { status: 400 });
  }
  try {
    const voices = await provider.listVoices();
    return NextResponse.json({ voices });
  } catch (err: any) {
    console.error('List voices error', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 