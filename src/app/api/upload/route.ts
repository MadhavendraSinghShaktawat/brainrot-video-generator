import { NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import 'dotenv/config';
import { supabaseAdmin } from '@/lib/supabase-admin';

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
const clientEmail = process.env.GOOGLE_CLOUD_CLIENT_EMAIL;
const privateKey = process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n');
const bucketName = process.env.GCS_ASSETS_BUCKET ?? 'brainrot-assets-ubkxluzh';

if (!projectId || !clientEmail || !privateKey) {
  // Fail fast during edge / lambda init
  throw new Error('Missing Google Cloud credentials env vars');
}

const storage = new Storage({
  projectId,
  credentials: {
    client_email: clientEmail,
    private_key: privateKey,
  },
});

export async function POST(req: Request) {
  try {
    const { filename, contentType } = await req.json();
    if (!filename || typeof filename !== 'string') {
      return NextResponse.json({ error: 'filename required' }, { status: 400 });
    }

    const expires = Date.now() + 15 * 60 * 1000; // 15 minutes
    const [url] = await storage
      .bucket(bucketName)
      .file(filename)
      .getSignedUrl({
        action: 'write',
        expires,
        contentType: contentType ?? 'application/octet-stream',
      });

    // Insert stub asset row (proxy will be null for now)
    const mapExt = (fname: string) => {
      const lower = fname.toLowerCase();
      if (/[.](mp4|mov|webm|mkv)$/.test(lower)) return 'video';
      if (/[.](jpg|jpeg|png|gif|webp)$/.test(lower)) return 'photo';
      if (/[.](mp3|wav|aac|ogg)$/.test(lower)) return 'audio';
      return 'video';
    };

    const { error } = await supabaseAdmin.from('assets').insert({
      id: filename.split('.')[0],
      name: filename,
      url: `gs://${bucketName}/${filename}`,
      type: mapExt(filename),
    });
    if (error) console.warn('supabase insert asset error', error.message);

    return NextResponse.json({ url, expires });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Signed URL error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
} 