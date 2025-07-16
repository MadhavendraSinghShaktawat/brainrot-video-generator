import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { ScriptGeneratorService } from '@/services/script-generator';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';

interface VoiceGenerationRequest {
  script_id?: string;
  text: string;
  voice_id: string;
  settings?: {
    exaggeration?: number;
    cfg_weight?: number;
    temperature?: number;
    min_p?: number;
    top_p?: number;
    repetition_penalty?: number;
  };
}

interface VoiceGenerationResponse {
  success: boolean;
  audio_url?: string;
  error?: string;
  processing_time?: number;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    const body: VoiceGenerationRequest = await request.json();
    const { text, voice_id, settings = {} } = body;

    if (!text || !voice_id) {
      return NextResponse.json(
        { success: false, error: 'Text and voice_id are required' },
        { status: 400 }
      );
    }

    // Clean the text for TTS (remove stage directions, metrics, etc.)
    const cleanText = ScriptGeneratorService.cleanScriptForTTS(text);

    // Fetch voice file (base64) from Supabase voice_files table
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    console.log('[generate-voice] Fetching voice from Supabase:', voice_id);
    const { data: voiceRow, error: voiceError } = await supabase
      .from('voice_files')
      .select('voice_data, name, description')
      .eq('id', voice_id)
      .single();

    if (voiceError || !voiceRow || !voiceRow.voice_data) {
      console.error('[generate-voice] Voice not found in Supabase:', voiceError, voiceRow);
      return NextResponse.json(
        { success: false, error: 'Voice not found in Supabase' },
        { status: 404 }
      );
    }

    // Call RunPod serverless endpoint
    const runpodEndpoint = process.env.RUNPOD_ENDPOINT;
    const runpodApiKey = process.env.RUNPOD_API_KEY;
    if (!runpodEndpoint || !runpodApiKey) {
      console.error('[generate-voice] RunPod endpoint or API key not configured');
      return NextResponse.json(
        { success: false, error: 'RunPod endpoint or API key not configured' },
        { status: 500 }
      );
    }

    console.log('[generate-voice] Calling RunPod:', runpodEndpoint, {
      text: cleanText,
      voice_id,
      settings,
      voice_data_length: voiceRow.voice_data.length
    });
    const runpodRes = await fetch(runpodEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${runpodApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          text: cleanText,
          voice_file: voiceRow.voice_data,
          settings,
        },
      }),
    });

    let runpodResult = await runpodRes.json();
    console.log('[generate-voice] RunPod response:', runpodResult);

    let audioBase64: string | null = null;
    if (runpodResult.status === 'IN_QUEUE' && runpodResult.id) {
      // ------------------------------------------------------------------
      // Poll the /status endpoint until the job finishes.
      // These values can be tuned via environment variables so we don’t have
      // to re-deploy for every tweak.
      // ------------------------------------------------------------------
      const statusEndpoint = runpodEndpoint.replace(/\/run$/, '/status');
      const pollIntervalMs = Number(process.env.RUNPOD_POLL_INTERVAL_MS || 6000); // default 6 s
      const maxPolls       = Number(process.env.RUNPOD_MAX_POLLS || 90);        // default 9 min

      let status = runpodResult.status;
      let output = null;
      for (let attempt = 1; attempt <= maxPolls && status !== 'COMPLETED'; attempt++) {
        // Back-off / wait
        await new Promise(res => setTimeout(res, pollIntervalMs));

        try {
          const statusRes = await fetch(`${statusEndpoint}/${runpodResult.id}`, {
            headers: { 'Authorization': `Bearer ${runpodApiKey}` }
          });

          // If fetch failed (non-2xx) we’ll throw in the next line.
          const statusJson = await statusRes.json();
          status  = statusJson.status;
          output  = statusJson.output;

          console.log(`[generate-voice] Poll attempt ${attempt}: status=${status}`);

          if (status === 'COMPLETED' && output?.audio_base64) {
            audioBase64 = output.audio_base64;
            break;
          }

          // Fast-fail if RunPod reports an error status.
          if (status === 'FAILED' || status === 'CANCELLED') {
            console.error('[generate-voice] RunPod reported failure status:', statusJson);
            return NextResponse.json(
              { success: false, error: `RunPod job ${status.toLowerCase()}` },
              { status: 500 }
            );
          }
        } catch (pollErr) {
          // Network hiccup – log and continue; we’ll try again on next loop.
          console.warn('[generate-voice] Polling fetch failed (will retry):', pollErr);
        }
      }

      if (!audioBase64) {
        console.error('[generate-voice] RunPod polling timed out without completion');
        return NextResponse.json(
          { success: false, error: 'RunPod voice generation timed out before completion' },
          { status: 500 }
        );
      }
    } else if (runpodResult.output && runpodResult.output.audio_base64) {
      audioBase64 = runpodResult.output.audio_base64;
    } else {
      console.error('[generate-voice] RunPod voice generation failed:', runpodResult);
      return NextResponse.json(
        { success: false, error: runpodResult.error || 'RunPod voice generation failed' },
        { status: 500 }
      );
    }

    if (!audioBase64) {
      throw new Error('audioBase64 is null after polling, this should not happen');
    }
    const audioBuffer = Buffer.from(audioBase64, 'base64');

    // Decode audio and save/upload as before
    const outputId = uuidv4();
    const outputDir = path.join(process.cwd(), 'public', 'generated-audio');
    const outputFile = path.join(outputDir, `${outputId}.wav`);
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(outputFile, audioBuffer);
    console.log('[generate-voice] Audio buffer length:', audioBuffer.length, 'Output file:', outputFile);

      // Upload the generated audio file to Google Cloud Storage
      const fileName = `${outputId}.wav`;
      const { GoogleCloudStorageService } = await import('@/lib/google-cloud-storage');
    const { publicUrl: audioUrl } = await GoogleCloudStorageService.uploadAudio(audioBuffer, fileName);
    console.log('[generate-voice] Uploaded to GCS. Public URL:', audioUrl);

    // Optionally: update generated_scripts row with audioUrl if script_id provided (existing logic)
    if (body.script_id) {
      try {
        const { error: updateError } = await supabase
          .from('generated_scripts')
          .update({ audio_url: audioUrl })
          .eq('id', body.script_id);
        if (updateError) {
          console.error('[generate-voice] Failed to update generated_scripts.audio_url:', updateError);
        } else {
          console.log('[generate-voice] Updated generated_scripts.audio_url for script_id:', body.script_id);
        }
      } catch (err) {
        console.error('[generate-voice] Exception updating generated_scripts.audio_url:', err);
      }
    }

    const processingTime = (Date.now() - startTime) / 1000;
    return NextResponse.json({
        success: true,
        audio_url: audioUrl,
      processing_time: processingTime,
    });
  } catch (error) {
    console.error('[generate-voice] Voice generation error:', error, error instanceof Error ? error.stack : '');
    return NextResponse.json(
      { success: false, error: error instanceof Error ? (error.stack || error.message) : JSON.stringify(error) },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    message: 'Voice Generation API',
    endpoints: {
      POST: 'Generate voice from text',
    },
    required_fields: ['text', 'voice_id'],
    optional_settings: [
      'exaggeration (0.25-2.0, default: 0.5)',
      'cfg_weight (0.0-1.0, default: 0.5)', 
      'temperature (0.05-5.0, default: 0.8)',
      'min_p (0.0-1.0, default: 0.05)',
      'top_p (0.0-1.0, default: 1.0)',
      'repetition_penalty (1.0-2.0, default: 1.2)'
    ]
  });
} 