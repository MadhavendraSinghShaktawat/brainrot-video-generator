#!/usr/bin/env tsx

import 'dotenv/config';
import { Storage, CreateBucketRequest } from '@google-cloud/storage';

/**
 * create-timeline-bucket.ts
 * --------------------------------------------
 * Creates a dedicated GCS bucket for storing timeline JSON files
 * used by the Remotion render worker. If the bucket already exists
 * the script is a no-op.
 *
 * Env vars respected:
 *   GOOGLE_CLOUD_PROJECT_ID
 *   GOOGLE_CLOUD_CLIENT_EMAIL
 *   GOOGLE_CLOUD_PRIVATE_KEY  (with \n escaped)
 *   GCS_TIMELINES_BUCKET      (default "brainrot-timelines")
 *   GCS_REGION                (default "us-central1")
 *
 * Usage:
 *   npx tsx scripts/create-timeline-bucket.ts
 */
async function main(): Promise<void> {
  const { GOOGLE_CLOUD_PROJECT_ID: projectId, GOOGLE_CLOUD_CLIENT_EMAIL: clientEmail } = process.env;
  let { GOOGLE_CLOUD_PRIVATE_KEY: privateKey } = process.env;

  if (!projectId || !clientEmail || !privateKey) {
    console.error('❌ Missing required GCS environment variables.');
    process.exit(1);
  }

  // Fix escaped newlines if loaded from .env
  privateKey = privateKey.replace(/\\n/g, '\n');

  const storage = new Storage({
    projectId,
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
  });

  const bucketName = process.env.GCS_TIMELINES_BUCKET ?? 'brainrot-timelines';
  const region = process.env.GCS_REGION ?? 'us-central1';

  const bucket = storage.bucket(bucketName);
  const [exists] = await bucket.exists();

  if (exists) {
    console.log(`⚠️  Bucket '${bucketName}' already exists. Nothing to do.`);
    return;
  }

  const config: CreateBucketRequest = {
    location: region,
    storageClass: 'STANDARD',
  };

  console.log(`🪣 Creating bucket '${bucketName}' in region '${region}'…`);
  await storage.createBucket(bucketName, config);
  console.log('✅ Bucket created.');

  // Make objects world-readable so the render worker can fetch timelines without auth
  await bucket.iam.setPolicy({
    bindings: [
      {
        role: 'roles/storage.objectViewer',
        members: ['allUsers'],
      },
    ],
  });
  console.log('🌍 Public read access granted (roles/storage.objectViewer for allUsers).');

  // Basic CORS to allow browser uploads if desired
  await bucket.setMetadata({
    cors: [
      {
        origin: ['*'],
        method: ['GET', 'HEAD', 'PUT', 'POST', 'OPTIONS'],
        responseHeader: ['Content-Type'],
        maxAgeSeconds: 3600,
      },
    ],
  });
  console.log('🔧 CORS configuration applied.');
}

main().catch((err) => {
  console.error('❌ Failed to create timeline bucket:', err);
  process.exit(1);
}); 