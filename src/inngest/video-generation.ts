import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import { inngest } from '@/lib/inngest';

// Inngest function for video generation workflow
export const generateVideoWorkflow = inngest.createFunction(
  { 
    id: 'generate-video-workflow',
    name: 'Generate Video Workflow',
    retries: 3,
  },
  { event: 'video.generation.requested' },
  async ({ event, step }) => {
    const { scriptId, audioUrl, backgroundVideo, scriptContent, userId } = event.data;
    const jobId = `${scriptId}_${Date.now()}`;
    
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
      // Step 1: Ensure directories exist
      await step.run('ensure-directories', async () => {
        const tempDir = path.join(process.cwd(), 'tmp');
        const outputDir = path.join(process.cwd(), 'public', 'generated-videos');
        
        await fs.mkdir(tempDir, { recursive: true });
        await fs.mkdir(outputDir, { recursive: true });
        
        await inngest.send({
          name: 'video.generation.progress',
          data: {
            scriptId,
            step: 'directories-created',
            progress: 10,
            message: 'Created working directories'
          }
        });
      });

      // Step 2: Download audio file
      const audioPath = await step.run('download-audio', async () => {
        const audioPath = path.join(process.cwd(), 'tmp', `${jobId}_audio.wav`);
        const audioResponse = await fetch(audioUrl);
        
        if (!audioResponse.ok) {
          throw new Error(`Failed to download audio: ${audioResponse.statusText}`);
        }
        
        const audioBuffer = await audioResponse.arrayBuffer();
        await fs.writeFile(audioPath, Buffer.from(audioBuffer));
        
        await inngest.send({
          name: 'video.generation.progress',
          data: {
            scriptId,
            step: 'audio-downloaded',
            progress: 20,
            message: 'Audio file downloaded'
          }
        });
        
        return audioPath;
      });

      // Step 3: Get audio duration
      const audioDuration = await step.run('get-audio-duration', async () => {
        const ffprobePath = path.join(process.cwd(), 'ffmpeg-7.1.1-essentials_build', 'bin', 'ffprobe.exe');
        
        return new Promise<number>((resolve, reject) => {
          const ffprobe = spawn(ffprobePath, [
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            audioPath
          ]);

          let output = '';
          ffprobe.stdout.on('data', (data) => {
            output += data.toString();
          });

          ffprobe.on('close', (code) => {
            if (code !== 0) {
              reject(new Error(`ffprobe failed with code ${code}`));
              return;
            }

            try {
              const info = JSON.parse(output);
              const duration = parseFloat(info.format.duration);
              resolve(duration);
            } catch (error) {
              reject(new Error(`Failed to parse ffprobe output: ${error}`));
            }
          });
        });
      });

      // Step 4: Skip subtitle generation for now
      await step.run('skip-subtitles', async () => {
        await inngest.send({
          name: 'video.generation.progress',
          data: {
            scriptId,
            step: 'subtitles-skipped',
            progress: 50,
            message: 'Skipping subtitle generation'
          }
        });
      });

      // Step 5: Trim background video
      const trimmedVideoPath = await step.run('trim-video', async () => {
        const ffmpegPath = path.join(process.cwd(), 'ffmpeg-7.1.1-essentials_build', 'bin', 'ffmpeg.exe');
        const backgroundVideoPath = path.join(process.cwd(), 'brainrot-videos', backgroundVideo);
        const outputPath = path.join(process.cwd(), 'tmp', `${jobId}_trimmed.mp4`);
        
        return new Promise<string>((resolve, reject) => {
          const ffmpeg = spawn(ffmpegPath, [
            '-i', backgroundVideoPath,
            '-t', audioDuration.toString(),
            '-c:v', 'libx264',
            '-c:a', 'aac',
            '-y',
            outputPath
          ]);

          ffmpeg.on('close', (code) => {
            if (code !== 0) {
              reject(new Error(`Video trimming failed with code ${code}`));
              return;
            }
            resolve(outputPath);
          });
        });
      });

      // Step 6: Skip subtitle file generation
      await step.run('skip-subtitle-file', async () => {
        await inngest.send({
          name: 'video.generation.progress',
          data: {
            scriptId,
            step: 'subtitle-file-skipped',
            progress: 70,
            message: 'Skipping subtitle file generation'
          }
        });
      });

      // Step 7: Combine audio and video (no subtitles)
      const finalVideoPath = await step.run('combine-audio-video', async () => {
        const ffmpegPath = path.join(process.cwd(), 'ffmpeg-7.1.1-essentials_build', 'bin', 'ffmpeg.exe');
        const outputPath = path.join(process.cwd(), 'tmp', `${jobId}_final.mp4`);
        
        console.log('Combining video and audio without subtitles...');
        
        return new Promise<string>((resolve, reject) => {
          const ffmpeg = spawn(ffmpegPath, [
            '-i', trimmedVideoPath,
            '-i', audioPath,
            '-c:v', 'libx264',
            '-c:a', 'aac',
            '-map', '0:v:0',
            '-map', '1:a:0',
            '-shortest',
            '-y',
            outputPath
          ]);

          let errorOutput = '';
          ffmpeg.stderr.on('data', (data) => {
            errorOutput += data.toString();
          });

          ffmpeg.on('close', (code) => {
            if (code !== 0) {
              console.error('FFmpeg error output:', errorOutput);
              reject(new Error(`Video combination failed with code ${code}. Error: ${errorOutput}`));
              return;
            }
            console.log('Video combined successfully without subtitles!');
            resolve(outputPath);
          });
        });
      });

      // Step 8: Upload to Google Cloud Storage
      const publicVideoPath = await step.run('upload-to-gcs', async () => {
        const fileName = `${scriptId}.mp4`;
        const videoBuffer = await fs.readFile(finalVideoPath);
        
        const { GoogleCloudStorageService } = await import('@/lib/google-cloud-storage');
        const { publicUrl } = await GoogleCloudStorageService.uploadVideo(videoBuffer, fileName);
        
        await inngest.send({
          name: 'video.generation.progress',
          data: {
            scriptId,
            step: 'video-uploaded',
            progress: 90,
            message: 'Video uploaded to Google Cloud Storage'
          }
        });
        
        return publicUrl;
      });

      // Step 9: Update database
      await step.run('update-database', async () => {
        // Check if scriptId is a valid UUID (for real scripts) or test ID
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(scriptId);
        
        if (!isValidUUID) {
          console.log(`Skipping database update for test script ID: ${scriptId}`);
          return { id: scriptId, message: 'Test script - database update skipped' };
        }

        const { data: videoRecord, error: videoError } = await supabase
          .from('generated_videos')
          .insert({
            script_id: scriptId,
            video_url: publicVideoPath,
            duration: formatDuration(audioDuration),
            user_id: userId
          })
          .select()
          .single();

        if (videoError) {
          console.error('Error storing video record:', videoError);
          throw new Error(`Database update failed: ${videoError.message}`);
        }

        return videoRecord;
      });

      // Step 10: Cleanup temporary files
      await step.run('cleanup', async () => {
        const filesToCleanup = [audioPath, trimmedVideoPath, finalVideoPath];
        
        for (const filePath of filesToCleanup) {
          try {
            await fs.unlink(filePath);
          } catch (error) {
            console.warn(`Failed to cleanup file ${filePath}:`, error);
          }
        }
      });

      // Send completion event
      await inngest.send({
        name: 'video.generation.completed',
        data: {
          scriptId,
          videoUrl: publicVideoPath,
          duration: formatDuration(audioDuration)
        }
      });

      return {
        success: true,
        videoUrl: publicVideoPath,
        duration: formatDuration(audioDuration)
      };

    } catch (error) {
      // Send failure event
      await inngest.send({
        name: 'video.generation.failed',
        data: {
          scriptId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      throw error;
    }
  }
);

// Helper functions
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
} 