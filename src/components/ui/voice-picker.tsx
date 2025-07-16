import React, { useState, useRef } from 'react';
import { Button } from './button';
import { Card } from './card';
import { Mic, Upload, Volume2, CheckCircle2, RefreshCw, StopCircle, Trash2 } from 'lucide-react';

interface VoiceFile {
  id: string;
  name: string;
  description: string;
  fileType?: string;
  fileSize?: number;
  duration?: number;
  createdAt?: string;
}

interface VoicePickerProps {
  selectedVoiceId?: string;
  onSelect: (voiceId: string) => void;
  showUpload?: boolean;
  showRecord?: boolean;
}

export const VoicePicker: React.FC<VoicePickerProps> = ({ selectedVoiceId, onSelect, showUpload = true, showRecord = true }) => {
  const [voices, setVoices] = useState<VoiceFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  React.useEffect(() => {
    fetchVoices();
  }, []);

  const fetchVoices = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/voices?type=supabase');
      if (!response.ok) throw new Error('Failed to fetch voices');
      const data = await response.json();
      setVoices(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load voices');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);
      const res = await fetch('/api/voices/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to upload voice');
      const { id } = await res.json();
      await fetchVoices();
      onSelect(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload voice');
    } finally {
      setUploading(false);
    }
  };

  const handleStartRecording = async () => {
    setError(null);
    setRecording(true);
    setAudioChunks([]);
    setRecordedAudio(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new window.MediaRecorder(stream);
      recorder.ondataavailable = (e) => setAudioChunks((prev) => [...prev, e.data]);
      recorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedAudio(url);
      };
      setMediaRecorder(recorder);
      recorder.start();
    } catch (err) {
      setError('Microphone access denied or not available.');
      setRecording(false);
    }
  };

  const handleStopRecording = () => {
    mediaRecorder?.stop();
    setRecording(false);
  };

  const handleUploadRecorded = async () => {
    if (!audioChunks.length) return;
    setUploading(true);
    setError(null);
    try {
      const blob = new Blob(audioChunks, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('file', blob, 'recorded-voice.webm');
      formData.append('name', 'Recorded Voice');
      const res = await fetch('/api/voices/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to upload recorded voice');
      const { id } = await res.json();
      await fetchVoices();
      onSelect(id);
      setRecordedAudio(null);
      setAudioChunks([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload recorded voice');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {loading ? (
        <Card className="p-6 flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading voices...</span>
        </Card>
      ) : error ? (
        <Card className="p-6 text-red-600">{error}</Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {voices.map((voice) => (
            <Card
              key={voice.id}
              className={`p-4 hover:shadow-lg transition-all cursor-pointer ${selectedVoiceId === voice.id ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}`}
              onClick={() => onSelect(voice.id)}
            >
              <div className="flex items-center gap-2 mb-2">
                <Volume2 className="h-5 w-5 text-gray-400" />
                <span className="font-medium text-gray-900 dark:text-white text-sm">{voice.name}</span>
                {selectedVoiceId === voice.id && <CheckCircle2 className="h-5 w-5 text-blue-500" />}
              </div>
              <div className="text-xs text-gray-500 mb-1">{voice.description}</div>
              <div className="text-xs text-gray-400">{voice.createdAt ? new Date(voice.createdAt).toLocaleDateString() : ''}</div>
            </Card>
          ))}
        </div>
      )}

      {showUpload && (
        <div className="flex flex-col gap-2">
          <label className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Upload className="h-4 w-4" /> Upload Voice File
          </label>
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            disabled={uploading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
      )}

      {showRecord && (
        <div className="flex flex-col gap-2">
          <label className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Mic className="h-4 w-4" /> Record Voice
          </label>
          {!recording && !recordedAudio && (
            <Button onClick={handleStartRecording} variant="outline" disabled={uploading}>
              <Mic className="h-4 w-4 mr-2" /> Start Recording
            </Button>
          )}
          {recording && (
            <Button onClick={handleStopRecording} variant="destructive">
              <StopCircle className="h-4 w-4 mr-2" /> Stop Recording
            </Button>
          )}
          {recordedAudio && (
            <div className="flex items-center gap-2 mt-2">
              <audio ref={audioRef} src={recordedAudio} controls className="w-48" />
              <Button onClick={handleUploadRecorded} disabled={uploading}>
                <Upload className="h-4 w-4 mr-2" /> Upload Recording
              </Button>
              <Button onClick={() => { setRecordedAudio(null); setAudioChunks([]); }} variant="ghost">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 