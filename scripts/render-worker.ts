#!/usr/bin/env tsx

import 'dotenv/config';
import {bundleProject} from './bundle.js';
import {getCompositions, renderMedia, RenderMediaOptions} from '@remotion/renderer';
import fs from 'fs/promises';
import path from 'path';
import { GoogleCloudStorageService } from "../src/lib/google-cloud-storage";
import fetch from "node-fetch";

const VERSION = '0.8.0';

console.log(`🎬 Remotion Render Worker v${VERSION}`);

/**
 * Load timeline JSON from various input sources
 */
async function loadTimelineJson(jobInput: any): Promise<any> {
  // Try timeline_json first (direct JSON string or base64)
  if (jobInput.timeline_json) {
    try {
      return JSON.parse(jobInput.timeline_json);
    } catch (error) {
      console.log('📄 Timeline JSON might be base64 encoded, trying to decode...');
      try {
        const decoded = Buffer.from(jobInput.timeline_json, 'base64').toString('utf8');
        return JSON.parse(decoded);
      } catch (decodeError) {
        throw new Error(`Failed to parse timeline_json: ${error}`);
      }
    }
  }

  // Try timeline_url (HTTP download)
  if (jobInput.timeline_url) {
    console.log(`🌐 Downloading timeline from: ${jobInput.timeline_url}`);
    const response = await fetch(jobInput.timeline_url);
    if (!response.ok) {
      throw new Error(`Failed to download timeline: ${response.status} ${response.statusText}`);
    }
    const timelineText = await response.text();
    return JSON.parse(timelineText);
  }

  // Fallback to local file (for testing)
  const timelineFile = jobInput.timeline_file || 'timeline2.json';
  if (await fs.access(timelineFile).then(() => true).catch(() => false)) {
    console.log(`📂 Reading local timeline file: ${timelineFile}`);
    const timelineText = await fs.readFile(timelineFile, 'utf8');
    return JSON.parse(timelineText);
  }

  throw new Error('No timeline input provided. Specify timeline_json, timeline_url, or ensure timeline2.json exists.');
}

/**
 * Main render function
 */
async function main(jobInput: any): Promise<any> {
  const startTime = Date.now();
  
  const outputFilename = jobInput.output_filename || 'video.mp4';
  const compositionId = jobInput.composition_id || 'JsonDrivenVideo';
  
  console.log(`🎯 Starting render:`);
  console.log(`   • Output: ${outputFilename}`);
  console.log(`   • Composition: ${compositionId}`);

  // Load timeline data
  console.log('📊 Loading timeline...');
  const timelineData = await loadTimelineJson(jobInput);
  
  // Extract timeline object - handle both formats:
  // Format 1: { timeline: { fps: 30, events: [...] } }
  // Format 2: { fps: 30, events: [...] }
  const timeline = timelineData.timeline || timelineData;
  
  if (!timeline.fps || !timeline.events) {
    throw new Error('Invalid timeline: missing fps or events');
  }
  
  console.log(`✅ Timeline loaded: ${timeline.events.length} events, ${timeline.fps} fps`);

  // Bundle the project
  console.log('📦 Bundling project...');
  const bundleLocation = await bundleProject();

  // Get compositions
  const compositions = await getCompositions(bundleLocation, {
    inputProps: { timeline }
  });
  
  const composition = compositions.find((comp) => comp.id === compositionId);
  if (!composition) {
    throw new Error(`Composition "${compositionId}" not found. Available: ${compositions.map(c => c.id).join(', ')}`);
  }

  console.log(`🎬 Composition: ${composition.id} (${composition.width}x${composition.height})`);

  // Prepare output
  const outputPath = path.join(process.cwd(), 'out', outputFilename);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  // Render the video
  console.log('🎥 Starting render...');
  const renderStart = Date.now();
  
  const renderOptions: RenderMediaOptions = {
    composition,
    serveUrl: bundleLocation,
    outputLocation: outputPath,
    inputProps: { timeline }, // JsonDrivenVideo expects: { timeline: Timeline }
    codec: 'h264',
    imageFormat: 'jpeg',
    jpegQuality: 90,
    scale: 1,
    concurrency: 1,
    verbose: false,
  };

  await renderMedia(renderOptions);
  
  const renderTime = Date.now() - renderStart;
  console.log(`✅ Rendered in ${renderTime}ms`);

  // Upload to Google Cloud Storage
  console.log('☁️ Uploading...');
  const uploadStart = Date.now();
  
  const videoBuffer = await fs.readFile(outputPath);
  const { publicUrl } = await GoogleCloudStorageService.uploadVideo(videoBuffer, outputFilename);
  
  const uploadTime = Date.now() - uploadStart;
  console.log(`✅ Uploaded: ${publicUrl}`);

  // Cleanup
  try {
    await fs.unlink(outputPath);
  } catch (error) {
    console.warn('⚠️ Failed to cleanup:', error);
  }

  const totalTime = Date.now() - startTime;
  console.log(`🎉 Total time: ${totalTime}ms`);

  return {
    success: true,
    video_url: publicUrl,
    output_filename: outputFilename,
    composition_id: compositionId,
    processing_time_ms: totalTime,
    render_time_ms: renderTime,
    upload_time_ms: uploadTime
  };
}

/**
 * Entry point - handle different input methods
 */
async function start() {
  try {
    let jobInput: any = {};

    // Method 1: Environment variables (for local testing)
    if (process.env.RUNPOD_INPUT_JSON) {
      const inputJson = JSON.parse(process.env.RUNPOD_INPUT_JSON);
      jobInput = inputJson.input || inputJson;
    }
    // Method 2: Command line arguments (legacy)
    else if (process.argv.length > 2) {
      const timelineArg = process.argv[2];
      const outputArg = process.argv[3] || 'video.mp4';
      
      if (timelineArg.startsWith('http')) {
        jobInput = { timeline_url: timelineArg, output_filename: outputArg };
      } else {
        jobInput = { timeline_file: timelineArg, output_filename: outputArg };
      }
    }
    // Method 3: Default test with timeline2.json
    else {
      console.log('📝 No input provided, using timeline2.json for testing');
      jobInput = { timeline_file: 'timeline2.json', output_filename: 'test-render.mp4' };
    }

    const result = await main(jobInput);
    console.log('\n🎊 Render completed successfully!');
    
    return result;
  } catch (error) {
    console.error('❌ Render failed:', error);
    throw error;
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  start().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
} 