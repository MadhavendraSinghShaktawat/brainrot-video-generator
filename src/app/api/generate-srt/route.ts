import {NextResponse} from 'next/server';
import {openai} from '@/lib/openai';
import {openAiWhisperApiToCaptions} from '@remotion/openai-whisper';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import os from 'os';

export const runtime = 'nodejs';

export async function POST(req: Request): Promise<Response> {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({error: 'No audio file provided'}, {status: 400});
    }

    // Save the uploaded file to a temporary location because OpenAI expects a readable stream.
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    // Ensure cross-platform temp directory
    const tmpDir = os.tmpdir();
    await fsPromises.mkdir(tmpDir, {recursive: true});
    // Derive a safe temp filename independent of user input
    const guessedExt = (() => {
      const mime = file.type || '';
      const match = /audio\/(.+)/.exec(mime);
      if (match && match[1]) return match[1].replace(/[^a-zA-Z0-9]/g, '');
      return 'audio';
    })();
    const tempPath = path.join(tmpDir, `whisper-${Date.now()}.${guessedExt}`);
    await fsPromises.writeFile(tempPath, buffer);

    // Call OpenAI Whisper API.
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath) as any, // Typed as any to satisfy TS
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['word'],
    });

    // Convert OpenAI response to Caption[] using Remotion helper.
    const {captions} = openAiWhisperApiToCaptions({transcription});

    // Cleanup temp file.
    await fsPromises.unlink(tempPath).catch(() => {});

    return NextResponse.json({captions});
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Transcription error', err);
    return NextResponse.json({error: 'Transcription failed'}, {status: 500});
  }
} 