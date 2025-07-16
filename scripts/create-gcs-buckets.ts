import 'dotenv/config';
import { Storage, CreateBucketRequest } from '@google-cloud/storage';
import path from 'path';
import fs from 'fs';

async function main() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const clientEmail = process.env.GOOGLE_CLOUD_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.error('Missing GCS env vars');
    process.exit(1);
  }

  const storage = new Storage({
    projectId,
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
  });

  const bucketName = process.env.GCS_ASSETS_BUCKET ?? 'ai-video-assets';
  const region = process.env.GCS_REGION ?? 'us-central1';

  const [buckets] = await storage.getBuckets();
  const exists = buckets.some((b) => b.name === bucketName);

  if (!exists) {
    const config: CreateBucketRequest = {
      location: region,
      storageClass: 'STANDARD',
    };
    console.log(`Creating bucket ${bucketName} in ${region}...`);
    await storage.createBucket(bucketName, config);
    console.log('Bucket created.');
  } else {
    console.log(`Bucket ${bucketName} already exists.`);
  }

  // Reference bucket
  const bucket = storage.bucket(bucketName);

  // 1. Ensure lifecycle rule (delete after 30 days)
  await bucket.setMetadata({
    lifecycle: {
      rule: [
        {
          action: { type: 'Delete' },
          condition: { age: 30 },
        },
      ],
    },
  });
  console.log('Lifecycle rule set (delete after 30 days).');

  // 2. Set CORS configuration to allow browser uploads & public access
  const corsConfiguration = [
    {
      origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://*', // production domains – adjust as needed
      ],
      method: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
      responseHeader: ['Content-Type', 'x-goog-resumable', 'x-goog-meta-preview'],
      maxAgeSeconds: 3600,
    },
  ];

  await bucket.setMetadata({ cors: corsConfiguration });
  console.log('CORS configuration applied.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
}); 