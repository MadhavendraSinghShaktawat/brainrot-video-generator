#!/usr/bin/env tsx

import 'dotenv/config';
import { Storage } from '@google-cloud/storage';

/**
 * delete-from-buckets.ts
 * --------------------------------------------
 * CLI helper to delete one object (by name) from both the timelines bucket
 * and the generated-videos bucket. Ignores missing objects gracefully.
 *
 * Usage:
 *   npx tsx scripts/delete-from-buckets.ts <file-name>
 *
 * Environment variables expected (same as the upload script):
 *   GOOGLE_CLOUD_PROJECT_ID
 *   GOOGLE_CLOUD_CLIENT_EMAIL
 *   GOOGLE_CLOUD_PRIVATE_KEY  (can contain \n — they will be replaced)
 *   GCS_TIMELINES_BUCKET       (optional – default: brainrot-timelines)
 *   GCS_VIDEOS_BUCKET          (optional – default: brainrot-generated-videos)
 */
async function main(): Promise<void> {
  const [, , fileName] = process.argv;

  if (!fileName) {
    console.error('❌ Usage: delete-from-buckets.ts <file-name>');
    process.exit(1);
  }

  const timelinesBucket = process.env.GCS_TIMELINES_BUCKET ?? 'brainrot-timelines';
  const videosBucket = process.env.GCS_VIDEOS_BUCKET ?? 'brainrot-generated-videos';

  const {
    GOOGLE_CLOUD_PROJECT_ID: projectId,
    GOOGLE_CLOUD_CLIENT_EMAIL: clientEmail,
  } = process.env;
  let { GOOGLE_CLOUD_PRIVATE_KEY: privateKey } = process.env;

  if (!projectId || !clientEmail || !privateKey) {
    console.error('❌ Missing required GCS environment variables.');
    process.exit(1);
  }
  privateKey = privateKey.replace(/\\n/g, '\n');

  const storage = new Storage({
    projectId,
    credentials: { client_email: clientEmail, private_key: privateKey },
  });

  const deleteFromBucket = async (bucketName: string) => {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);

    try {
      console.log(`🗑️  Deleting gs://${bucketName}/${fileName} …`);
      await file.delete({ ignoreNotFound: true });
      console.log(`✅ Deleted (or already absent) in ${bucketName}`);
    } catch (err) {
      console.error(`❌ Failed to delete from ${bucketName}:`, err);
    }
  };

  await deleteFromBucket(timelinesBucket);
  await deleteFromBucket(videosBucket);
}

main().catch((err) => {
  console.error('❌ Unhandled error:', err);
  process.exit(1);
}); 