#!/usr/bin/env tsx

import 'dotenv/config';
import { Storage } from '@google-cloud/storage';
import fs from 'fs/promises';
import path from 'path';

/**
 * upload-timeline.ts
 * --------------------------------------------
 * CLI helper to upload a local timeline JSON file to the GCS timeline bucket
 * and return the public URL.
 *
 * Usage:
 *   npx tsx scripts/upload-timeline.ts ./timeline.json [dest-name.json]
 */
async function main(): Promise<void> {
  const [, , srcPath = 'timeline.json', destNameArg] = process.argv;

  // Validate local file exists
  const absSrc = path.resolve(srcPath);
  try {
    await fs.access(absSrc);
  } catch {
    console.error(`❌ File not found: ${absSrc}`);
    process.exit(1);
  }

  const destName = destNameArg ?? path.basename(srcPath);
  const bucketName = process.env.GCS_TIMELINES_BUCKET ?? 'brainrot-timelines';

  const { GOOGLE_CLOUD_PROJECT_ID: projectId, GOOGLE_CLOUD_CLIENT_EMAIL: clientEmail } = process.env;
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

  const bucket = storage.bucket(bucketName);

  console.log(`⬆️  Uploading ${absSrc} → gs://${bucketName}/${destName}`);
  await bucket.upload(absSrc, { destination: destName, contentType: 'application/json' });

  // Ensure object is public
  await bucket.file(destName).acl.add({ entity: 'allUsers', role: storage.acl.READER_ROLE });

  const publicUrl = `https://storage.googleapis.com/${bucketName}/${destName}`;
  console.log('✅ Upload complete! Public URL:', publicUrl);
}

main().catch((err) => {
  console.error('❌ Upload failed:', err);
  process.exit(1);
}); 