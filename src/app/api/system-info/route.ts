import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';

const execAsync = promisify(exec);

interface SystemInfo {
  gpu_available: boolean;
  gpu_info: string;
  processing_speed: 'fast' | 'medium' | 'slow';
}

async function detectGPU(): Promise<{ available: boolean; info: string }> {
  try {
    // Try nvidia-smi first (NVIDIA GPUs)
    try {
      const { stdout } = await execAsync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits');
      const lines = stdout.trim().split('\n');
      if (lines.length > 0 && lines[0].trim()) {
        const [name, memory] = lines[0].split(',');
        return {
          available: true,
          info: `NVIDIA ${name.trim()} (${memory.trim()}MB VRAM)`
        };
      }
    } catch (nvError) {
      // nvidia-smi not available, try other methods
    }

    // Try lspci for Linux
    if (process.platform === 'linux') {
      try {
        const { stdout } = await execAsync('lspci | grep -i vga');
        if (stdout.includes('NVIDIA') || stdout.includes('AMD') || stdout.includes('Intel')) {
          return {
            available: true,
            info: `GPU detected via lspci: ${stdout.trim().split('\n')[0]}`
          };
        }
      } catch (lspciError) {
        // lspci not available
      }
    }

    // Try system_profiler for macOS
    if (process.platform === 'darwin') {
      try {
        const { stdout } = await execAsync('system_profiler SPDisplaysDataType | grep "Chipset Model"');
        if (stdout.trim()) {
          const chipset = stdout.split(':')[1]?.trim();
          return {
            available: true,
            info: `macOS GPU: ${chipset || 'Unknown'}`
          };
        }
      } catch (macError) {
        // system_profiler not available
      }
    }

    // Try wmic for Windows
    if (process.platform === 'win32') {
      try {
        const { stdout } = await execAsync('wmic path win32_VideoController get name /value');
        const lines = stdout.split('\n').filter(line => line.startsWith('Name='));
        if (lines.length > 0) {
          const gpuName = lines[0].split('=')[1]?.trim();
          if (gpuName) {
            return {
              available: true,
              info: `Windows GPU: ${gpuName}`
            };
          }
        }
      } catch (winError) {
        // wmic not available
      }
    }

    return {
      available: false,
      info: 'No GPU detected or GPU detection failed'
    };
  } catch (error) {
    return {
      available: false,
      info: `GPU detection error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function checkPythonTorch(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('python3 -c "import torch; print(torch.cuda.is_available())" 2>/dev/null || python -c "import torch; print(torch.cuda.is_available())" 2>/dev/null');
    return stdout.trim() === 'True';
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const systemInfo = {
      platform: process.platform,
      nodeVersion: process.version,
      // Check if required directories exist
      directories: {
        tmp: await checkDir('tmp'),
        publicGeneratedAudio: await checkDir('public/generated-audio'),
        brainrotVideos: await checkDir('brainrot-videos'),
        ffmpegBin: await checkDir('ffmpeg-7.1.1-essentials_build/bin'),
      },
      // Check if required executables exist
      executables: {
        ffmpeg: await checkFile('ffmpeg-7.1.1-essentials_build/bin/ffmpeg.exe'),
        ffprobe: await checkFile('ffmpeg-7.1.1-essentials_build/bin/ffprobe.exe'),
      },
      videoGeneration: {
        status: 'enabled',
        reason: 'Active with Whisper subtitles and FFmpeg processing'
      }
    };

    return NextResponse.json(systemInfo);
  } catch (error) {
    console.error('System info error:', error);
    return NextResponse.json({ error: 'Failed to get system info' }, { status: 500 });
  }
}

async function checkDir(relativePath: string): Promise<boolean> {
  try {
    const fullPath = path.join(process.cwd(), relativePath);
    const stats = await fs.stat(fullPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

async function checkFile(relativePath: string): Promise<boolean> {
  try {
    const fullPath = path.join(process.cwd(), relativePath);
    const stats = await fs.stat(fullPath);
    return stats.isFile();
  } catch {
    return false;
  }
} 