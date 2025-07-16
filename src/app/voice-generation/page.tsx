'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VoicePicker } from '@/components/ui/voice-picker';
import { VoiceGeneratorService, SystemInfo } from '@/services/voice-generator';

export default function VoiceGenerationPage(): React.ReactElement {
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    gpu_available: false,
    gpu_info: 'Loading...',
    processing_speed: 'slow'
  });
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [testText, setTestText] = useState<string>(
    "This is a test of the voice generation system. The quick brown fox jumps over the lazy dog."
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (): Promise<void> => {
    try {
      const systemData = await VoiceGeneratorService.getSystemInfo();
      setSystemInfo(systemData);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load system information');
    }
  };

  const calculateEstimatedTime = (text: string, speed: 'fast' | 'medium' | 'slow'): number => {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const baseTime = sentences * (speed === 'fast' ? 2 : speed === 'medium' ? 4 : 8);
    return Math.max(baseTime, 10); // Minimum 10 seconds
  };

  const startCountdownTimer = (totalSeconds: number): void => {
    setRemainingTime(totalSeconds);
    const timer = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const generateVoice = async (): Promise<void> => {
    if (!selectedVoice || !testText.trim()) {
      setError('Please select a voice and enter text');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedAudio(null);
    setProgress(0);

    // Calculate estimated time and start countdown
    const estimatedSeconds = calculateEstimatedTime(testText, systemInfo.processing_speed);
    startCountdownTimer(estimatedSeconds);

    try {
      // Progress simulation
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 85) {
            clearInterval(progressInterval);
            return 85;
          }
          return prev + Math.random() * 10 + 5;
        });
      }, Math.max(estimatedSeconds * 100, 2000));

      const result = await VoiceGeneratorService.generateVoice({
        text: testText,
        voice_id: selectedVoice,
        settings: VoiceGeneratorService.getRecommendedSettings(systemInfo)
      });

      clearInterval(progressInterval);
      setProgress(100);
      setRemainingTime(0);

      if (result.success && result.audio_url) {
        setGeneratedAudio(result.audio_url);
      } else {
        setError(result.error || 'Voice generation failed');
      }
    } catch (error) {
      console.error('Error generating voice:', error);
      setError('Voice generation failed');
    } finally {
      setIsGenerating(false);
      setProgress(0);
      setRemainingTime(0);
    }
  };

  // The VoicePicker component handles preview playback internally, so we no longer need a separate preview helper here.

  return (
    <div className="container mx-auto p-6 space-y-6">
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
                Converting your text to high-quality voice audio...
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

      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Voice Generation
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Test the voice generation system using available voice samples
        </p>
      </div>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>Current system capabilities for voice generation</CardDescription>
        </CardHeader>
        <CardContent>
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
                  {systemInfo.processing_speed === 'fast' && 'GPU accelerated (~1-2s per sentence)'}
                  {systemInfo.processing_speed === 'medium' && 'CPU optimized (~3-5s per sentence)'}
                  {systemInfo.processing_speed === 'slow' && 'CPU only (~5-10s per sentence)'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voice Selection with upload & record */}
      <Card>
        <CardHeader>
          <CardTitle>Select / Upload / Record Voice</CardTitle>
          <CardDescription>
            Choose an existing voice or add a new one by uploading a file or recording directly in the browser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VoicePicker
            selectedVoiceId={selectedVoice ?? undefined}
            onSelect={(voiceId) => setSelectedVoice(voiceId)}
            showUpload
            showRecord
          />
        </CardContent>
      </Card>

      {/* Text Input and Generation */}
      <Card>
          <CardHeader>
            <CardTitle>Generate Voice</CardTitle>
            <CardDescription>Enter text to convert to speech using the selected voice</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="test-text" className="block text-sm font-medium mb-2">
                Text to Generate
              </label>
              <textarea
                id="test-text"
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-800"
                rows={4}
                placeholder="Enter the text you want to convert to speech..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Estimated processing time: {VoiceGeneratorService.getProcessingTimeEstimate(systemInfo, testText)}
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                {selectedVoice && (
                  <p className="text-sm text-gray-600">
                    Selected voice ID: {selectedVoice}
                  </p>
                )}
              </div>
              <Button
                onClick={generateVoice}
                disabled={!selectedVoice || !testText.trim() || isGenerating}
                className="min-w-[140px]"
              >
                {isGenerating ? 'Generating...' : 'Generate Voice'}
              </Button>
            </div>

            {generatedAudio && (
              <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h4 className="font-medium mb-3 text-green-800 dark:text-green-200">
                  ✅ Voice Generated Successfully!
                </h4>
                <audio controls className="w-full mb-3">
                  <source src={generatedAudio} type="audio/wav" />
                  Your browser does not support the audio element.
                </audio>
                <Button
                  variant="outline"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = generatedAudio;
                    link.download = 'generated-voice.wav';
                    link.click();
                  }}
                >
                  Download Audio
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
} 