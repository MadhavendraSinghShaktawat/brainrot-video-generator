import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ScriptGeneratorService } from '@/services/script-generator';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Helper function to execute spawn with promise and streaming output handling
function executeWithSpawn(command: string, args: string[], options: any = {}): Promise<{stdout: string, stderr: string, exitCode: number}> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      windowsHide: options.windowsHide || true,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let isTimedOut = false;

    // Set up timeout
    const timeoutId = options.timeout ? setTimeout(() => {
      isTimedOut = true;
      child.kill('SIGTERM');
      reject(new Error(`Process timed out after ${options.timeout}ms`));
    }, options.timeout) : null;

    // Handle stdout data streaming
    child.stdout?.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;
      console.log('Python stdout:', chunk); // Real-time logging
    });

    // Handle stderr data streaming
    child.stderr?.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      console.log('Python stderr:', chunk); // Real-time logging
    });

    // Handle process exit
    child.on('close', (code) => {
      if (timeoutId) clearTimeout(timeoutId);
      if (!isTimedOut) {
        resolve({
          stdout,
          stderr,
          exitCode: code || 0
        });
      }
    });

    // Handle process errors
    child.on('error', (error) => {
      if (timeoutId) clearTimeout(timeoutId);
      if (!isTimedOut) {
        reject(error);
      }
    });

    // Handle spawn errors
    child.on('spawn', () => {
      console.log('Python process spawned successfully');
    });
  });
}

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

    // Get the voice file path
    const voicesResponse = await fetch(`${request.nextUrl.origin}/api/voices`);
    const voices = await voicesResponse.json();
    const selectedVoice = voices.find((v: any) => v.id === voice_id);
    
    if (!selectedVoice) {
      return NextResponse.json(
        { success: false, error: 'Voice not found' },
        { status: 404 }
      );
    }

    // Generate unique output filename
    const outputId = uuidv4();
    const outputDir = path.join(process.cwd(), 'public', 'generated-audio');
    const outputFile = path.join(outputDir, `${outputId}.wav`);
    
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Prepare the Python script execution
    const chatterboxDir = path.join(process.cwd(), 'ai-models', 'chatterbox');
    const scriptContent = generatePythonScript(
      cleanText,
      selectedVoice.file_path,
      outputFile,
      settings
    );
    
    // Write temporary Python script
    const tempScriptPath = path.join(chatterboxDir, `temp_tts_${outputId}.py`);
    await fs.writeFile(tempScriptPath, scriptContent);
    console.log('Python script written to:', tempScriptPath);
    console.log('Script content length:', scriptContent.length);
    console.log('Text to generate (first 200 chars):', JSON.stringify(text.substring(0, 200)));

    try {
      // Execute the TTS generation using spawn for better process control
      const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
      console.log('Executing TTS generation with command:', `${pythonCommand} "${tempScriptPath}"`);
      
      const { stdout, stderr, exitCode } = await executeWithSpawn(pythonCommand, [tempScriptPath], {
        cwd: chatterboxDir,
        timeout: 1200000, // 20 minutes timeout (10x increase)
        windowsHide: true
      });

      console.log('TTS Output:', stdout);
      if (stderr) {
        console.warn('TTS Warnings:', stderr);
      }
      
      // Check exit code first
      if (exitCode !== 0) {
        throw new Error(`Python script exited with code ${exitCode}. Output: ${stdout.slice(-500)}`);
      }
      
      // Check for failure indicators in the output
      if (stdout.includes('Error occurred:') || stdout.includes('sys.exit(1)') || stdout.includes('Traceback')) {
        throw new Error(`Python script execution failed: ${stdout.slice(-500)}`); // Last 500 chars
      }

      // Check if output file was created
      try {
        const stats = await fs.stat(outputFile);
        console.log(`Generated audio file size: ${stats.size} bytes`);
        
        if (stats.size === 0) {
          throw new Error('Generated audio file is empty');
        }
      } catch (fileError) {
        console.error('Output file check failed:', fileError);
        
        // Check if the file exists at all
        try {
          await fs.access(outputFile);
          throw new Error('Audio file was generated but appears to be corrupt');
        } catch {
          throw new Error('Audio file was not generated successfully');
        }
      }

      // Upload the generated audio file to Google Cloud Storage
      const fileName = `${outputId}.wav`;
      const fileBuffer = await fs.readFile(outputFile);
      
      const { GoogleCloudStorageService } = await import('@/lib/google-cloud-storage');
      const { publicUrl: audioUrl } = await GoogleCloudStorageService.uploadAudio(fileBuffer, fileName);

      // Update the generated_scripts row with the audio URL if script_id provided
      if (body.script_id) {
        const supabaseAdmin = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        
        const { error: updateError } = await supabaseAdmin
          .from('generated_scripts')
          .update({ audio_url: audioUrl })
          .eq('id', body.script_id);

        if (updateError) {
          console.error('Failed to update script with audio URL:', updateError);
        }
      }

      // Clean up temporary script and local audio file
      await fs.unlink(tempScriptPath).catch(() => {});
      await fs.unlink(outputFile).catch(() => {});

      const processingTime = Date.now() - startTime;

      console.log(`Voice generation completed successfully in ${processingTime}ms`);

      const response: VoiceGenerationResponse = {
        success: true,
        audio_url: audioUrl,
        processing_time: processingTime
      };

      return NextResponse.json(response);

    } catch (execError) {
      console.error('Execution error details:', execError);
      
      // Keep temporary script for debugging (remove this later)
      console.log('Temporary script preserved at:', tempScriptPath);
      // await fs.unlink(tempScriptPath).catch(() => {});
      
      // Provide more detailed error information
      if (execError instanceof Error) {
        if (execError.message.includes('timeout')) {
          throw new Error('Voice generation timed out. This usually happens with very long texts or slow systems. Try reducing the text length.');
        } else if (execError.message.includes('ENOENT')) {
          throw new Error('Python executable not found. Please ensure Python is installed and accessible.');
        } else {
          throw new Error(`Voice generation failed: ${execError.message}`);
        }
      } else {
        throw execError;
      }
    }

  } catch (error) {
    console.error('Voice generation error:', error);
    
    const processingTime = Date.now() - startTime;
    const response: VoiceGenerationResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Voice generation failed',
      processing_time: processingTime
    };

    return NextResponse.json(response, { status: 500 });
  }
}

function generatePythonScript(
  text: string, 
  voicePath: string, 
  outputPath: string,
  settings: any
): string {
  const {
    exaggeration = 0.5,
    cfg_weight = 0.5,
    temperature = 0.8,
    min_p = 0.05,
    top_p = 1.0,
    repetition_penalty = 1.2
  } = settings;

  return `
import os
import sys
import torch
import torchaudio as ta
from pathlib import Path
import traceback

print("=== Chatterbox TTS Generation Script ===")
print(f"Python version: {sys.version}")
print(f"PyTorch version: {torch.__version__}")

# Add the chatterbox source to Python path
chatterbox_src = str(Path(__file__).parent / "src")
sys.path.insert(0, chatterbox_src)
print(f"Added to Python path: {chatterbox_src}")

try:
    print("Importing ChatterboxTTS...")
    from chatterbox.tts import ChatterboxTTS
    print("Successfully imported ChatterboxTTS")
    
    # Set CUDA memory management environment variables (if supported)
    import os
    import platform
    
    # Only set expandable_segments on Linux (not supported on Windows)
    if platform.system() == "Linux":
        os.environ['PYTORCH_CUDA_ALLOC_CONF'] = 'expandable_segments:True'
    
    # Set conservative memory management for Windows
    if platform.system() == "Windows":
        os.environ['PYTORCH_CUDA_MEMORY_FRACTION'] = '0.7'  # Use only 70% of GPU memory
        os.environ['CUDA_LAUNCH_BLOCKING'] = '1'  # Synchronous CUDA calls for better error reporting
    
    # Automatically detect the best available device with memory check
    print("Detecting available devices...")
    device = "cpu"  # Default fallback
    
    if torch.cuda.is_available():
        try:
            # Check GPU memory
            gpu_memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)  # GB
            gpu_allocated = torch.cuda.memory_allocated(0) / (1024**3)  # GB
            gpu_reserved = torch.cuda.memory_reserved(0) / (1024**3)  # GB
            gpu_free = gpu_memory - gpu_allocated
            
            print(f"GPU Memory Status:")
            print(f"  Total: {gpu_memory:.1f}GB")
            print(f"  Allocated: {gpu_allocated:.1f}GB") 
            print(f"  Reserved: {gpu_reserved:.1f}GB")
            print(f"  Free: {gpu_free:.1f}GB")
            
            # Use GPU with careful memory management for RTX 3060
            if gpu_free < 3.0:
                print(f"[WARNING] Insufficient GPU memory ({gpu_free:.1f}GB free, need ~3GB for safe operation)")
                print("Defaulting to CPU to avoid memory issues")
                device = "cpu"
            else:
                print(f"[INFO] GPU memory looks sufficient ({gpu_free:.1f}GB free), using CUDA...")
                device = "cuda"
                
                # Clear GPU cache before loading
                torch.cuda.empty_cache()
            

            
        except Exception as cuda_error:
            print(f"CUDA initialization failed: {cuda_error}")
            device = "cpu"
    
    if device == "cuda":
        print(f"[OK] Using CUDA device: {torch.cuda.get_device_name()}")
        print(f"  CUDA version: {torch.version.cuda}")
    elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
        device = "mps"
        print("[OK] Using MPS device (Apple Silicon)")
    else:
        device = "cpu"
        print("[OK] Using CPU device")
    
    print(f"Loading TTS model on device: {device}")
    
    try:
        model = ChatterboxTTS.from_pretrained(device=device)
        print("[OK] Model loaded successfully")
        
        # Test GPU memory with a small operation if using CUDA
        if device == "cuda":
            test_tensor = torch.randn(100, 100, device=device)
            del test_tensor
            torch.cuda.empty_cache()
            print("[OK] GPU memory test passed")
            
    except (torch.cuda.OutOfMemoryError, RuntimeError) as error:
        if device == "cuda":
            print(f"[WARNING] GPU error during model loading: {error}")
            print("Forcing CPU mode...")
            torch.cuda.empty_cache()  # Clear GPU memory
            device = "cpu"
            model = ChatterboxTTS.from_pretrained(device=device)
            print("[OK] Model loaded successfully on CPU")
        else:
            raise error
    
    text = """${text.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"""
    voice_path = r"${voicePath.replace(/\\/g, '\\\\')}"
    output_path = r"${outputPath.replace(/\\/g, '\\\\')}"
    
    # Check text length and implement chunking for stability
    text_length = len(text)
    word_count = len(text.split())
    
    print(f"\\nGeneration parameters:")
    print(f"  Text length: {text_length} characters ({word_count} words)")
    
    # For API context, be conservative with text length for GPU memory
    MAX_SAFE_LENGTH = 150  # Conservative limit for RTX 3060 stability
    
    if text_length > MAX_SAFE_LENGTH:
        print(f"  [INFO] Text is long ({text_length} chars), splitting into chunks for stability")
        
        # Split text into sentences and group into chunks with word boundaries
        import re
        
        # First try to split by sentences, but if sentences are too long, split by words
        sentences = re.split(r'(?<=[.!?])\\s+', text)
        chunks = []
        
        for sentence in sentences:
            if len(sentence) <= MAX_SAFE_LENGTH:
                # Sentence fits, try to combine with previous
                if chunks and len(chunks[-1] + " " + sentence) <= MAX_SAFE_LENGTH:
                    chunks[-1] += " " + sentence
                else:
                    chunks.append(sentence)
            else:
                # Sentence is too long, split by words
                words = sentence.split()
                current_chunk = ""
                
                for word in words:
                    test_chunk = current_chunk + (" " if current_chunk else "") + word
                    if len(test_chunk) <= MAX_SAFE_LENGTH:
                        current_chunk = test_chunk
                    else:
                        if current_chunk:
                            chunks.append(current_chunk.strip())
                        current_chunk = word
                
                if current_chunk:
                    chunks.append(current_chunk.strip())
        
        print(f"  Split into {len(chunks)} chunks")
        
        # Generate each chunk separately and concatenate
        all_wavs = []
        for i, chunk in enumerate(chunks):
            print(f"  \\nProcessing chunk {i+1}/{len(chunks)} ({len(chunk)} chars)...")
            print(f"  Chunk preview: {chunk[:100]}{'...' if len(chunk) > 100 else ''}")
            
            try:
                # Use faster settings for chunked generation
                chunk_wav = model.generate(
                    chunk,
                    audio_prompt_path=voice_path,
                    exaggeration=${exaggeration},
                    cfg_weight=${cfg_weight},
                    temperature=${temperature},
                    min_p=${min_p},
                    top_p=${top_p},
                    repetition_penalty=${repetition_penalty}
                )
                all_wavs.append(chunk_wav)
                print(f"  [OK] Chunk {i+1} completed successfully")
                
                # Add a small pause between chunks
                pause_samples = int(0.2 * 24000)  # 0.2 second pause (reduced)
                pause = torch.zeros(pause_samples)
                all_wavs.append(pause)
                
            except Exception as chunk_error:
                print(f"  [ERROR] Chunk {i+1} failed: {chunk_error}")
                raise chunk_error
        
        # Concatenate all chunks with proper tensor handling
        if all_wavs:
            # Ensure all tensors have the same number of dimensions
            processed_wavs = []
            for i, chunk_wav in enumerate(all_wavs):
                # Convert to 1D if needed (squeeze extra dimensions)
                if chunk_wav.dim() > 1:
                    chunk_wav = chunk_wav.squeeze()
                # Ensure it's 1D
                if chunk_wav.dim() == 0:
                    chunk_wav = chunk_wav.unsqueeze(0)
                processed_wavs.append(chunk_wav)
            
            wav = torch.cat(processed_wavs)
            print(f"  [OK] All chunks concatenated successfully")
        else:
            raise Exception("No audio chunks were generated")
    else:
        print(f"  Text length is safe ({text_length} chars), processing as single chunk")
    
    print(f"  Text preview: {text[:100]}{'...' if len(text) > 100 else ''}")
    print(f"  Voice reference: {voice_path}")
    print(f"  Output path: {output_path}")
    print(f"  Exaggeration: ${exaggeration}")
    print(f"  CFG Weight: ${cfg_weight}")
    print(f"  Temperature: ${temperature}")
    
    # Check if voice reference file exists
    if not os.path.exists(voice_path):
        raise FileNotFoundError(f"Voice reference file not found: {voice_path}")
    
    # Check voice file size
    voice_size = os.path.getsize(voice_path)
    print(f"  Voice file size: {voice_size} bytes")
    
    print("\\nStarting audio generation...")
    
    # Generate the audio with memory management
    try:
        if text_length <= MAX_SAFE_LENGTH:
            # Single chunk generation with faster settings for API
            wav = model.generate(
                text,
                audio_prompt_path=voice_path,
                exaggeration=${exaggeration},
                cfg_weight=${cfg_weight},
                temperature=${temperature},
                min_p=${min_p},
                top_p=${top_p},
                repetition_penalty=${repetition_penalty}
            )
        # For chunked generation, wav is already set above
    except (torch.cuda.OutOfMemoryError, RuntimeError) as oom_error:
        if device == "cuda":
            print(f"[WARNING] GPU out of memory during generation: {oom_error}")
            print("Switching to CPU mode and reloading model...")
            
            # Clear GPU memory and reload model on CPU
            del model
            torch.cuda.empty_cache()
            device = "cpu"
            
            print("Loading model on CPU...")
            model = ChatterboxTTS.from_pretrained(device=device)
            print("[OK] Model reloaded on CPU")
            
            # Generate with CPU
            print("Generating with CPU...")
            wav = model.generate(
                text,
                audio_prompt_path=voice_path,
                exaggeration=${exaggeration},
                cfg_weight=${cfg_weight},
                temperature=${temperature},
                min_p=${min_p},
                top_p=${top_p},
                repetition_penalty=${repetition_penalty}
            )
            print("[OK] Generation completed on CPU")
        else:
            raise oom_error
    
    print("[OK] Audio generation completed")
    print(f"Generated audio shape: {wav.shape}")
    print(f"Sample rate: {model.sr}")
    
    # Create output directory if it doesn't exist
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Convert 1D tensor to 2D format that torchaudio expects (add channel dimension)
    if wav.dim() == 1:
        wav = wav.unsqueeze(0)  # Shape: [samples] -> [1, samples]
    
    print(f"Audio tensor shape for saving: {wav.shape}")
    
    # Save the generated audio
    print(f"Saving audio to: {output_path}")
    ta.save(output_path, wav, model.sr)
    
    # Verify the saved file
    if os.path.exists(output_path):
        saved_size = os.path.getsize(output_path)
        print(f"[OK] Successfully saved audio file")
        print(f"  Output file size: {saved_size} bytes")
        print(f"  Audio duration: {wav.shape[-1] / model.sr:.2f} seconds")  # Use last dimension for samples
    else:
        raise RuntimeError("Failed to save audio file")
    
    # Clean up GPU memory if using CUDA
    if device == "cuda":
        torch.cuda.empty_cache()
        print("  GPU memory cleared")
    
    print("=== Generation completed successfully ===")
    
except ImportError as e:
    print(f"[ERROR] Import error: {e}")
    print("Make sure the chatterbox package is properly installed")
    print("Available packages in current environment:")
    import pkg_resources
    installed_packages = [d.project_name for d in pkg_resources.working_set]
    for package in sorted(installed_packages):
        if 'torch' in package.lower() or 'audio' in package.lower():
            print(f"  - {package}")
    traceback.print_exc()
    sys.exit(1)
except FileNotFoundError as e:
    print(f"[ERROR] File not found: {e}")
    sys.exit(1)
except RuntimeError as e:
    print(f"[ERROR] Runtime error: {e}")
    traceback.print_exc()
    sys.exit(1)
except Exception as e:
    print(f"[ERROR] Unexpected error: {e}")
    print(f"Error type: {type(e).__name__}")
    traceback.print_exc()
    
    # Clean up GPU memory if using CUDA
    if 'device' in locals() and device == "cuda":
        torch.cuda.empty_cache()
        print("GPU memory cleared after error")
    
    sys.exit(1)
`;
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