#!/usr/bin/env tsx

import 'dotenv/config';
import { Storage } from '@google-cloud/storage';

/**
 * apply-cors-to-video-bucket.ts
 * Apply CORS configuration to the brainrot-generated-videos bucket
 * to fix "Failed to fetch" errors in Remotion preview
 */
async function main() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const clientEmail = process.env.GOOGLE_CLOUD_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_CLOUD_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.error('❌ Missing required GCS environment variables.');
    process.exit(1);
  }

  // Handle quoted private key
  if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || 
      (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
    privateKey = privateKey.slice(1, -1);
  }
  privateKey = privateKey.replace(/\\n/g, '\n');

  const storage = new Storage({
    projectId,
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
  });

  const bucketName = 'brainrot-generated-videos';
  const bucket = storage.bucket(bucketName);

  // CORS configuration specifically for Remotion media-parser
  const corsConfiguration = [
    {
      origin: ['*'],  // Allow all origins for public videos
      method: ['GET', 'HEAD'],  // Only need GET and HEAD for video playback
      responseHeader: ['Content-Type', 'Range', 'Content-Range', 'Content-Length'],
      maxAgeSeconds: 3600,
    },
  ];

  try {
    console.log(`🔧 Applying CORS configuration to ${bucketName}...`);
    await bucket.setMetadata({ cors: corsConfiguration });
    console.log('✅ CORS configuration applied successfully!');
    console.log('📺 Your Remotion preview should now work without "Failed to fetch" errors.');
  } catch (error) {
    console.error('❌ Failed to apply CORS:', error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
}); 