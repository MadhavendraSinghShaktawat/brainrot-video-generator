import { NextRequest, NextResponse } from 'next/server';
import { getAvatarProvider } from '@/services/avatar-providers';

export async function GET(_req: NextRequest) {
  const provider = getAvatarProvider();
  if (!provider.listAvatars) {
    return NextResponse.json({ error: 'Provider does not support listing avatars' }, { status: 400 });
  }
  try {
    const avatars = await provider.listAvatars();
    return NextResponse.json({ avatars });
  } catch (err: any) {
    console.error('List avatars error', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 