import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
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

    // Generate signed GET URLs for each object (valid 24h)
    const urls = await Promise.all(
      filtered.map(async (file) => {
        const [url] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 24 * 60 * 60 * 1000 });
        return {
          id: file.name.split('.')[0],
          name: file.metadata.name ?? file.name,
          url,
          type,
        };
      }),
    );

    return NextResponse.json(urls);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Assets list error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
} 