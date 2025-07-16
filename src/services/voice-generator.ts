import { GeneratedScript } from '@/types/database';

export interface Voice {
  id: string;
  name: string;
  description: string;
  preview_url?: string;
  file_path: string;
}

export interface SystemInfo {
  gpu_available: boolean;
  gpu_info: string;
  processing_speed: 'fast' | 'medium' | 'slow';
}

export interface VoiceGenerationRequest {
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

export interface VoiceGenerationResponse {
  success: boolean;
  audio_url?: string;
  error?: string;
  processing_time?: number;
}

export interface TextMemoryEstimate {
  isLong: boolean;
  estimatedMemoryGB: number;
  recommendChunking: boolean;
  chunkSize: number;
  chunks: string[];
  warning?: string;
}

export function analyzeTextForMemory(text: string, systemInfo: SystemInfo): TextMemoryEstimate {
  const textLength = text.length;
  const wordCount = text.split(/\s+/).length;
  
  // Rough estimation: 1000 characters = ~0.5GB GPU memory
  const estimatedMemoryGB = (textLength / 1000) * 0.5;
  
  const isLong = textLength > 1000;
  const recommendChunking = systemInfo.gpu_available && estimatedMemoryGB > 2.0;
  
  let chunkSize = 800; // Conservative chunk size
  if (!systemInfo.gpu_available) {
    chunkSize = 500; // Smaller chunks for CPU
  }
  
  const chunks = isLong ? chunkTextIntelligently(text, chunkSize) : [text];
  
  let warning;
  if (recommendChunking) {
    warning = `Long text (${textLength} chars) may exceed GPU memory. Consider breaking into ${chunks.length} chunks.`;
  } else if (isLong && !systemInfo.gpu_available) {
    warning = `Long text will be processed on CPU. This may take significantly longer.`;
  }
  
  return {
    isLong,
    estimatedMemoryGB,
    recommendChunking,
    chunkSize,
    chunks,
    warning
  };
}

function chunkTextIntelligently(text: string, maxChunkSize: number): string[] {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;
    
    const sentenceWithPunctuation = trimmedSentence + '.';
    
    // If adding this sentence would exceed chunk size
    if (currentChunk.length + sentenceWithPunctuation.length > maxChunkSize) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentenceWithPunctuation;
      } else {
        // Single sentence is too long, split it by words
        const words = trimmedSentence.split(/\s+/);
        let wordChunk = '';
        
        for (const word of words) {
          if (wordChunk.length + word.length + 1 > maxChunkSize) {
            if (wordChunk.length > 0) {
              chunks.push(wordChunk.trim() + '.');
              wordChunk = word;
            } else {
              // Single word is too long, just add it
              chunks.push(word + '.');
            }
          } else {
            wordChunk += (wordChunk ? ' ' : '') + word;
          }
        }
        
        if (wordChunk.length > 0) {
          currentChunk = wordChunk + '.';
        }
      }
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentenceWithPunctuation;
    }
  }
  
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.length > 0 ? chunks : [text];
}

export class VoiceGeneratorService {
  static async getAvailableVoices(): Promise<Voice[]> {
    try {
      const response = await fetch('/api/voices?type=reference');
      if (!response.ok) {
        throw new Error('Failed to load voices');
      }
      return await response.json();
    } catch (error) {
      console.error('Error loading voices:', error);
      return [];
    }
  }

  static async getSystemInfo(): Promise<SystemInfo> {
    try {
      const response = await fetch('/api/system-info');
      if (!response.ok) {
        throw new Error('Failed to get system info');
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting system info:', error);
      return {
        gpu_available: false,
        gpu_info: 'Unable to detect GPU',
        processing_speed: 'slow'
      };
    }
  }

  static async generateVoice(request: VoiceGenerationRequest): Promise<VoiceGenerationResponse> {
    try {
      const response = await fetch('/api/generate-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Voice generation failed');
      }

      return result;
    } catch (error) {
      console.error('Error generating voice:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Voice generation failed'
      };
    }
  }

  static async generateVoiceFromScript(
    script: GeneratedScript,
    voiceId: string,
    settings?: VoiceGenerationRequest['settings']
  ): Promise<VoiceGenerationResponse> {
    return this.generateVoice({
      script_id: script.id,
      text: script.script_content,
      voice_id: voiceId,
      settings
    });
  }

  static getProcessingTimeEstimate(systemInfo: SystemInfo, text: string): string {
    const wordsCount = text.split(' ').length;
    
    let baseTimePerWord = 0.5; // seconds per word (slow)
    
    switch (systemInfo.processing_speed) {
      case 'fast':
        baseTimePerWord = 0.1; // GPU accelerated
        break;
      case 'medium':
        baseTimePerWord = 0.3; // CPU optimized
        break;
      case 'slow':
        baseTimePerWord = 0.5; // CPU only
        break;
    }

    const estimatedSeconds = wordsCount * baseTimePerWord;
    
    if (estimatedSeconds < 60) {
      return `~${Math.round(estimatedSeconds)} seconds`;
    } else {
      const minutes = Math.floor(estimatedSeconds / 60);
      const seconds = Math.round(estimatedSeconds % 60);
      return `~${minutes}m ${seconds}s`;
    }
  }

  static validateVoiceSettings(settings: VoiceGenerationRequest['settings']): string[] {
    const errors: string[] = [];
    
    if (!settings) return errors;

    if (settings.exaggeration !== undefined) {
      if (settings.exaggeration < 0.25 || settings.exaggeration > 2.0) {
        errors.push('Exaggeration must be between 0.25 and 2.0');
      }
    }

    if (settings.cfg_weight !== undefined) {
      if (settings.cfg_weight < 0.0 || settings.cfg_weight > 1.0) {
        errors.push('CFG weight must be between 0.0 and 1.0');
      }
    }

    if (settings.temperature !== undefined) {
      if (settings.temperature < 0.05 || settings.temperature > 5.0) {
        errors.push('Temperature must be between 0.05 and 5.0');
      }
    }

    if (settings.min_p !== undefined) {
      if (settings.min_p < 0.0 || settings.min_p > 1.0) {
        errors.push('Min P must be between 0.0 and 1.0');
      }
    }

    if (settings.top_p !== undefined) {
      if (settings.top_p < 0.0 || settings.top_p > 1.0) {
        errors.push('Top P must be between 0.0 and 1.0');
      }
    }

    if (settings.repetition_penalty !== undefined) {
      if (settings.repetition_penalty < 1.0 || settings.repetition_penalty > 2.0) {
        errors.push('Repetition penalty must be between 1.0 and 2.0');
      }
    }

    return errors;
  }

  static getRecommendedSettings(systemInfo: SystemInfo): VoiceGenerationRequest['settings'] {
    // Adjust settings based on system capabilities
    if (systemInfo.processing_speed === 'fast') {
      // GPU accelerated - can handle more complex settings
      return {
        exaggeration: 0.7,
        cfg_weight: 0.5,
        temperature: 0.8,
        min_p: 0.05,
        top_p: 1.0,
        repetition_penalty: 1.2
      };
    } else if (systemInfo.processing_speed === 'medium') {
      // CPU optimized - balanced settings
      return {
        exaggeration: 0.5,
        cfg_weight: 0.4,
        temperature: 0.7,
        min_p: 0.08,
        top_p: 0.9,
        repetition_penalty: 1.1
      };
    } else {
      // CPU only - conservative settings for faster processing
      return {
        exaggeration: 0.4,
        cfg_weight: 0.3,
        temperature: 0.6,
        min_p: 0.1,
        top_p: 0.8,
        repetition_penalty: 1.0
      };
    }
  }
} 