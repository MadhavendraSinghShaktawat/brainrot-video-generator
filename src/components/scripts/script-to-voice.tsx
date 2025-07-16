'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { GeneratedScript } from '@/types/database';
import { analyzeTextForMemory, TextMemoryEstimate } from '@/services/voice-generator';

interface Voice {
  id: string;
  name: string;
  description: string;
  fileType?: string;
  fileSize?: number;
  duration?: number;
  createdAt?: string;
}

interface SystemInfo {
  gpu_available: boolean;
  gpu_info: string;
  processing_speed: 'fast' | 'medium' | 'slow';
}

interface ScriptToVoiceProps {
  script: GeneratedScript | null;
  onClose: () => void;
}

export const ScriptToVoice: React.FC<ScriptToVoiceProps> = ({ script, onClose }) => {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    gpu_available: false,
    gpu_info: 'Checking...',
    processing_speed: 'slow'
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState<number>(0);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [memoryAnalysis, setMemoryAnalysis] = useState<TextMemoryEstimate | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadVoices();
    checkSystemCapabilities();
  }, []);

  useEffect(() => {
    if (script && systemInfo) {
      const analysis = analyzeTextForMemory(script.script_content, systemInfo);
      setMemoryAnalysis(analysis);
    }
  }, [script, systemInfo]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const loadVoices = async (): Promise<void> => {
    try {
      const response = await fetch('/api/voices?type=supabase');
      if (response.ok) {
        const voiceData = await response.json();
        setVoices(voiceData);
      } else {
        setVoices([]);
      }
    } catch (error) {
      console.error('Error loading voices:', error);
      setVoices([]);
    }
  };

  const checkSystemCapabilities = async (): Promise<void> => {
    try {
      const response = await fetch('/api/system-info');
      if (response.ok) {
        const info = await response.json();
        setSystemInfo(info);
      }
    } catch (error) {
      console.error('Error checking system capabilities:', error);
      setSystemInfo({
        gpu_available: false,
        gpu_info: 'Unable to detect GPU',
        processing_speed: 'slow'
      });
    }
  };

  const calculateEstimatedTime = (text: string, speed: 'fast' | 'medium' | 'slow'): number => {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const baseTime = sentences * (speed === 'fast' ? 2 : speed === 'medium' ? 4 : 8);
    return Math.max(baseTime, 10); // Minimum 10 seconds
  };

  const startCountdownTimer = (totalSeconds: number): void => {
    setRemainingTime(totalSeconds);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const generateVoice = async (): Promise<void> => {
    if (!script || !selectedVoice) return;

    setIsGenerating(true);
    setProgress(0);
    setGeneratedAudio(null);
    setError(null);

    // Calculate estimated time and start countdown
    const estimatedSeconds = calculateEstimatedTime(script.script_content, systemInfo.processing_speed);
    setEstimatedTime(estimatedSeconds);
    startCountdownTimer(estimatedSeconds);

    try {
      // More realistic progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 85) {
            clearInterval(progressInterval);
            return 85;
          }
          return prev + Math.random() * 10 + 5; // Random progress between 5-15%
        });
      }, Math.max(estimatedSeconds * 100, 2000)); // Update based on estimated time

      const response = await fetch('/api/generate-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script_id: script.id,
          text: script.script_content,
          voice_id: selectedVoice,
          settings: {
            exaggeration: 0.5,
            cfg_weight: 0.5,
            temperature: 0.8,
          }
        }),
      });

      clearInterval(progressInterval);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setProgress(100);
      setRemainingTime(0);

      if (response.ok) {
        const result = await response.json();
        setGeneratedAudio(result.audio_url);
      } else {
        throw new Error('Failed to generate voice');
      }
    } catch (error) {
      console.error('Error generating voice:', error);
      
      let errorMessage = 'Failed to generate voice. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = 'Voice generation timed out. Try using shorter text or check your system performance.';
        } else if (error.message.includes('Voice not found')) {
          errorMessage = 'Selected voice file not found. Please check your voices directory.';
        } else if (error.message.includes('Python')) {
          errorMessage = 'Python or required dependencies not found. Please check your installation.';
        } else {
          errorMessage = `Generation failed: ${error.message}`;
        }
      }
      
      setError(errorMessage);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    } finally {
      setIsGenerating(false);
      setProgress(0);
      setRemainingTime(0);
    }
  };

  const downloadAudio = (): void => {
    if (generatedAudio) {
      const link = document.createElement('a');
      link.href = generatedAudio;
      link.download = `${script?.title || 'script'}_voice.wav`;
      link.click();
    }
  };

  // Supabase voices do not have preview URLs. If preview is needed, implement separately.
  // const playPreview = (voice: Voice): void => {
  //   // No preview_url for Supabase voices
  // };

  if (!script) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Script to Voice</CardTitle>
              <CardDescription>
                Convert your script to high-quality voice audio
              </CardDescription>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Loading Screen */}
          {isGenerating && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4">
                <div className="text-center">
                  {/* Loading Animation */}
                  <div className="mb-6">
                    <div className="relative w-24 h-24 mx-auto">
                      <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                      <div className="absolute inset-4 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Status Text */}
                  <h3 className="text-xl font-semibold mb-2">Generating Voice</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Converting your script to high-quality voice audio...
                  </p>

                  {/* Timer */}
                  <div className="mb-4">
                    <div className="text-2xl font-mono font-bold text-blue-600 mb-1">
                      {Math.floor(remainingTime / 60)}:{(remainingTime % 60).toString().padStart(2, '0')}
                    </div>
                    <p className="text-sm text-gray-500">
                      Estimated time remaining
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {progress.toFixed(0)}% complete
                    </p>
                  </div>

                  {/* Processing Info */}
                  <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-700 rounded p-3">
                    <p>Using {systemInfo.gpu_available ? 'GPU acceleration' : 'CPU processing'}</p>
                    <p>Processing speed: {systemInfo.processing_speed}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* System Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">System Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${systemInfo.gpu_available ? 'bg-green-500' : 'bg-red-500'}`} />
                <div>
                  <p className="font-medium">
                    GPU: {systemInfo.gpu_available ? 'Available' : 'Not Available'}
                  </p>
                  <p className="text-sm text-gray-600">{systemInfo.gpu_info}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  systemInfo.processing_speed === 'fast' ? 'bg-green-500' : 
                  systemInfo.processing_speed === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <div>
                  <p className="font-medium">Processing Speed: {systemInfo.processing_speed}</p>
                  <p className="text-sm text-gray-600">
                    {systemInfo.processing_speed === 'fast' && 'GPU accelerated'}
                    {systemInfo.processing_speed === 'medium' && 'CPU optimized'}
                    {systemInfo.processing_speed === 'slow' && 'CPU only'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Memory Analysis Warning */}
          {memoryAnalysis && memoryAnalysis.warning && (
            <div className={`mb-6 p-4 rounded-lg border ${
              memoryAnalysis.recommendChunking 
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
            }`}>
              <div className="flex items-start space-x-3">
                <div className={`w-5 h-5 mt-0.5 ${
                  memoryAnalysis.recommendChunking ? 'text-yellow-600' : 'text-blue-600'
                }`}>
                  {memoryAnalysis.recommendChunking ? (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  ) : (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className={`font-medium text-sm ${
                    memoryAnalysis.recommendChunking ? 'text-yellow-800 dark:text-yellow-200' : 'text-blue-800 dark:text-blue-200'
                  }`}>
                    {memoryAnalysis.recommendChunking ? 'Memory Warning' : 'Processing Notice'}
                  </h4>
                  <p className={`text-sm mt-1 ${
                    memoryAnalysis.recommendChunking ? 'text-yellow-700 dark:text-yellow-300' : 'text-blue-700 dark:text-blue-300'
                  }`}>
                    {memoryAnalysis.warning}
                  </p>
                  {memoryAnalysis.recommendChunking && (
                    <div className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
                      <p>Estimated memory usage: {memoryAnalysis.estimatedMemoryGB.toFixed(1)}GB</p>
                      <p>Available chunks: {memoryAnalysis.chunks.length} (≤{memoryAnalysis.chunkSize} chars each)</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <Separator className="my-6" />

          {/* Script Preview */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Script Preview</h3>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium mb-2">{script.title}</h4>
              <p className="text-sm text-gray-600 mb-3">
                {script.word_count} words • {script.estimated_duration} • {script.style} style
              </p>
              <div className="max-h-32 overflow-y-auto text-sm">
                {script.script_content.substring(0, 300)}
                {script.script_content.length > 300 && '...'}
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Voice Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Select Voice</h3>
            {voices.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500 mb-4">
                  <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <h4 className="text-lg font-medium mb-2">No Voices Available</h4>
                <p className="text-gray-600 mb-4">
                  Add voice reference files to the <code className="bg-gray-200 px-1 rounded">voices/</code> directory to get started.
                </p>
                <p className="text-sm text-gray-500">
                  Supported formats: WAV, MP3 (recommended: 16kHz, mono, 10-30 seconds)
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {voices.map((voice) => (
                  <div
                    key={voice.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedVoice === voice.id 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedVoice(voice.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{voice.name}</h4>
                    </div>
                    <p className="text-sm text-gray-600">{voice.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

                        {/* Error Display */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-red-600 dark:text-red-400 text-sm font-medium">Generation Error</p>
                  </div>
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="mt-2 text-xs text-red-500 hover:text-red-700 underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Generation Controls */}
              {voices.length > 0 && (
                <>
                  <Separator className="my-6" />
                  
                  <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Generate Voice</h3>
                  <p className="text-sm text-gray-600">
                    {systemInfo.processing_speed === 'fast' && 'GPU acceleration will make this fast!'}
                    {systemInfo.processing_speed === 'medium' && 'This may take a few minutes.'}
                    {systemInfo.processing_speed === 'slow' && 'This may take several minutes without GPU.'}
                  </p>
                </div>
                
                <div className="space-x-3">
                  {generatedAudio && (
                    <Button variant="outline" onClick={downloadAudio}>
                      Download Audio
                    </Button>
                  )}
                  <Button
                    onClick={generateVoice}
                    disabled={!selectedVoice || isGenerating}
                    className="min-w-[120px]"
                  >
                    {isGenerating ? `Generating... ${progress}%` : 'Generate Voice'}
                  </Button>
                </div>
              </div>

              {/* Progress Bar */}
              {isGenerating && (
                <div className="mt-4">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Generated Audio */}
              {generatedAudio && (
                <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h4 className="font-medium mb-3 text-green-800 dark:text-green-200">
                    ✅ Voice Generated Successfully!
                  </h4>
                  <audio controls className="w-full">
                    <source src={generatedAudio} type="audio/wav" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Hidden audio element for voice previews */}
      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
}; 