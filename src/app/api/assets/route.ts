import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { supabaseAdmin } from '@/lib/supabase-admin';
import 'dotenv/config';

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
const clientEmail = process.env.GOOGLE_CLOUD_CLIENT_EMAIL;
const privateKey = process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\n/g, '\n');
const bucketName = process.env.GCS_ASSETS_BUCKET ?? 'brainrot-assets-ubkxluzh';

if (!projectId || !clientEmail || !privateKey) {
  throw new Error('Missing Google Cloud credentials env vars');
}

const storage = new Storage({
  projectId,
  credentials: { client_email: clientEmail, private_key: privateKey },
});

const EXTENSIONS: Record<string, string[]> = {
  video: ['.mp4', '.mov', '.webm', '.mkv'],
  photo: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  audio: ['.mp3', '.wav', '.aac', '.ogg'],
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = (searchParams.get('type') ?? 'video').toLowerCase();
    const allowedExt = EXTENSIONS[type] ?? EXTENSIONS.video;

    const [files] = await storage.bucket(bucketName).getFiles({});

    const filtered = files.filter((file) =>
      allowedExt.some((ext) => file.name.toLowerCase().endsWith(ext)),
    );

    // --------- 1) Optional metadata from assets table (preview thumbnails etc.) ---------
    const { data: assetRows } = await supabaseAdmin
      .from('assets')
      .select('id,preview_url,url,description');

    const previewMap = new Map<string, string>();
    const legacyRemoteAssets: any[] = [];

    assetRows?.forEach((r) => {
      if (r.preview_url) previewMap.set(r.id, r.preview_url);
      if (r.url) {
        legacyRemoteAssets.push({
          id: r.id,
          name: r.description ?? r.id,
          url: r.url,
          previewUrl: r.preview_url ?? null,
          type,
        });
      }
    });

    // --------- 2) Completed avatar_jobs records ---------
    const { data: jobRows } = await supabaseAdmin
      .from('avatar_jobs')
      .select('id,output_url,request')
      .eq('status', 'completed')
      .not('output_url', 'is', null);

    const jobAssets = (jobRows ?? []).map((j) => ({
      id: j.id,
      name: (j.request as any)?.script?.slice?.(0, 50) ?? 'Avatar video',
      url: j.output_url,
      previewUrl: previewMap.get(j.id) ?? null,
      type,
    }));

    // Generate signed GET URLs for each object (valid 24h)
    const localUrls = await Promise.all(
      filtered.map(async (file) => {
        const [url] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 24 * 60 * 60 * 1000 });
        const id = file.name.split('.')[0];
        return {
          id,
          name: file.metadata.name ?? file.name,
          url,
          previewUrl: previewMap.get(id) ?? null,
          type,
        };
      }),
    );

    return NextResponse.json([...legacyRemoteAssets, ...jobAssets, ...localUrls]);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Assets list error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
} 