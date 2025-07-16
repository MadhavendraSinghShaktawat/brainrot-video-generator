#!/usr/bin/env ts-node

import 'dotenv/config';
import { Storage } from '@google-cloud/storage';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import mime from 'mime-types';

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
const clientEmail = process.env.GOOGLE_CLOUD_CLIENT_EMAIL;
const privateKey = process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\n/g, '\n');
const bucketName = process.env.GCS_ASSETS_BUCKET ?? 'brainrot-assets-ubkxluzh';

if (!projectId || !clientEmail || !privateKey) {
  console.error('Missing Google Cloud credentials env vars');
  process.exit(1);
}

const storage = new Storage({
  projectId,
  credentials: { client_email: clientEmail, private_key: privateKey },
});

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const res = path.resolve(dir, entry.name);
      return entry.isDirectory() ? walk(res) : res;
    }),
  );
  return files.flat();
}

async function main() {
  const importDir = process.argv[2];
  if (!importDir) {
    console.error('Usage: ts-node scripts/ingest-assets.ts <directory>');
    process.exit(1);
  }

  const absDir = path.resolve(importDir);
  console.log(`Scanning ${absDir}...`);

  const allFiles = await walk(absDir);
  if (allFiles.length === 0) {
    console.log('No files found.');
    return;
  }

  const bucket = storage.bucket(bucketName);

  for (const filePath of allFiles) {
    const fileName = path.basename(filePath);
    const destName = `${Date.now()}-${fileName}`; // avoid collisions
    const contentType = mime.lookup(fileName) || undefined;

    process.stdout.write(`Uploading ${fileName} -> gs://${bucketName}/${destName} ... `);

    await new Promise<void>((resolve, reject) => {
      const writeStream = bucket.file(destName).createWriteStream({ resumable: true, contentType });
      createReadStream(filePath)
        .pipe(writeStream)
        .on('error', (err) => reject(err))
        .on('finish', () => resolve());
    });

    console.log('done');
  }

  console.log('All files uploaded.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
}); 