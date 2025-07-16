'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/context/auth-context';

interface RenderJob {
  success: boolean;
  error?: string;
  job_id?: string;
  inngest_id?: string;
  video_url?: string;
}

export default function TestRenderPage() {
  const { user, session } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<RenderJob | null>(null);
  const [jobStatus, setJobStatus] = useState<string>('');
  const [selectedTimeline, setSelectedTimeline] = useState<string>('test1');

  // Multiple test timelines for different scenarios
  const testTimelines = {
    test1: {
      name: "Basic Caption Test",
      description: "Simple captions without animations (animations not yet supported)",
      timeline: {
        fps: 30,
        width: 1920,
        height: 1080,
        background: "#000000",
        events: [
          {
            id: "caption1",
            type: "caption",
            text: "🚀 RunPod Test #1",
            start: 0,
            end: 150, // 5 seconds at 30fps
            layer: 1,
            style: {
              fontSize: 90,
              color: "#00FFFF",
              fontWeight: "bold",
              textAlign: "center",
              textShadow: "0 0 30px #0080FF"
            }
          },
          {
            id: "caption2",
            type: "caption",
            text: "Testing new timeline system!",
            start: 150, // 5 seconds at 30fps
            end: 300,   // 10 seconds at 30fps
            layer: 1,
            style: {
              fontSize: 70,
              color: "#FFD700",
              fontWeight: "bold",
              textAlign: "center",
              textShadow: "0 0 25px #FF6B35"
            }
          }
        ]
      }
    },
    test2: {
      name: "Multiple Caption Test",
      description: "Multiple captions with different colors and timing",
      timeline: {
        fps: 30,
        width: 1920,
        height: 1080,
        background: "#000000",
        events: [
          {
            id: "caption1",
            type: "caption",
            text: "🎬 MULTIPLE CAPTIONS",
            start: 0,
            end: 240, // 8 seconds at 30fps
            layer: 1,
            style: {
              fontSize: 95,
              color: "#FF69B4",
              fontWeight: "bold",
              textAlign: "center",
              textShadow: "0 0 40px #FF1493"
            }
          },
          {
            id: "caption2",
            type: "caption",
            text: "Multiple layers working together",
            start: 240, // 8 seconds at 30fps
            end: 450,   // 15 seconds at 30fps
            layer: 1,
            style: {
              fontSize: 75,
              color: "#32CD32",
              fontWeight: "bold",
              textAlign: "center",
              textShadow: "0 0 25px #228B22"
            }
          },
          {
            id: "caption3",
            type: "caption",
            text: "🔥 EPIC FINALE 🔥",
            start: 450, // 15 seconds at 30fps
            end: 600,   // 20 seconds at 30fps
            layer: 1,
            style: {
              fontSize: 100,
              color: "#FF4500",
              fontWeight: "bold",
              textAlign: "center",
              textShadow: "0 0 50px #FF6600"
            }
          }
        ]
      }
    },
    test3: {
      name: "Mixed Content Test",
      description: "Videos + captions with overlapping timing",
      timeline: {
        fps: 30,
        width: 1920,
        height: 1080,
        background: "#000000",
        events: [
          {
            id: "video1",
            type: "video",
            src: "https://storage.googleapis.com/brainrot-generated-videos/3dae8d9a-bfa9-415e-b637-9e92b0f075ef.mp4",
            start: 0,
            end: 450, // 15 seconds at 30fps
            layer: 0
          },
          {
            id: "caption1",
            type: "caption",
            text: "🎥 Video + Caption Test",
            start: 60, // 2 seconds at 30fps
            end: 240, // 8 seconds at 30fps
            layer: 1,
            style: {
              fontSize: 80,
              color: "#FFFFFF",
              fontWeight: "bold",
              textAlign: "center",
              textShadow: "0 0 20px #000000"
            }
          },
          {
            id: "caption2",
            type: "caption",
            text: "Overlapping content works! ✨",
            start: 300, // 10 seconds at 30fps
            end: 450, // 15 seconds at 30fps
            layer: 1,
            style: {
              fontSize: 70,
              color: "#FFD700",
              fontWeight: "bold",
              textAlign: "center",
              textShadow: "0 0 30px #FF6B35"
            }
          }
        ]
      }
    }
  };

  const handleSubmitRender = async () => {
    if (!session?.access_token) {
      alert('Please log in to test rendering');
      return;
    }

    setIsSubmitting(true);
    setResult(null);
    setJobStatus('');

    try {
      const currentTimeline = testTimelines[selectedTimeline as keyof typeof testTimelines];
      const response = await fetch('/api/render', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          timeline_json: currentTimeline.timeline,
          title: `RunPod Test - ${currentTimeline.name}`
        })
      });

      const data: RenderJob = await response.json();
      setResult(data);

      // If successful, start polling for job status
      if (data.success && data.job_id) {
        pollJobStatus(data.job_id);
      }
    } catch (error) {
      console.error('Render submission error:', error);
      setResult({
        success: false,
        error: 'Failed to submit render request'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    let attempts = 0;
    const maxAttempts = 60; // 10 minutes max (10 seconds * 60)
    
    const pollInterval = setInterval(async () => {
      attempts++;
      
      try {
        setJobStatus(`Checking job status... (${attempts}/${maxAttempts})`);
        
        const response = await fetch(`/api/render?job_id=${jobId}`, {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`Status check failed: ${response.status}`);
        }
        
        const statusData = await response.json();
        
        if (statusData.success && statusData.job) {
          const { status, result_url, error_message } = statusData.job;
          
          setJobStatus(`Job status: ${status}`);
          
          if (status === 'completed' && result_url) {
            setJobStatus(`✅ Render completed! Video: ${result_url}`);
            setResult(prev => prev ? { ...prev, video_url: result_url } : null);
            clearInterval(pollInterval);
            return;
          }
          
          if (status === 'failed') {
            setJobStatus(`❌ Render failed: ${error_message || 'Unknown error'}`);
            clearInterval(pollInterval);
            return;
          }
          
          if (status === 'processing') {
            setJobStatus('🎬 Video is being rendered on RunPod...');
          }
          
          // Continue polling for pending/processing status
        } else {
          throw new Error('Invalid response format');
        }
        
        // Stop polling after max attempts
        if (attempts >= maxAttempts) {
          setJobStatus('⏰ Polling timeout - check database for final status');
          clearInterval(pollInterval);
        }
        
      } catch (error) {
        console.error('Status polling error:', error);
        setJobStatus(`❌ Status check error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        clearInterval(pollInterval);
      }
    }, 10000); // Poll every 10 seconds
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto p-6">
          <h1 className="text-2xl font-bold mb-4">🧪 RunPod Render Test</h1>
          <p className="text-gray-600">Please log in to test the render API.</p>
          <Button 
            onClick={() => window.location.href = '/login'}
            className="mt-4"
          >
            Go to Login
          </Button>
        </Card>
      </div>
    );
  }

  const currentTimeline = testTimelines[selectedTimeline as keyof typeof testTimelines];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🧪 RunPod Render Test</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Test Controls */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>User:</strong> {user.email}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  <strong>Token:</strong> {session?.access_token ? '✅ Valid' : '❌ Missing'}
                </p>
              </div>

              {/* Timeline Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Select Test Timeline:</label>
                <select 
                  value={selectedTimeline} 
                  onChange={(e) => setSelectedTimeline(e.target.value)}
                  className="w-full p-2 border rounded-md bg-white"
                >
                  {Object.entries(testTimelines).map(([key, timeline]) => (
                    <option key={key} value={key}>
                      {timeline.name}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-600 mt-1">
                  {currentTimeline.description}
                </p>
              </div>

              <Button 
                onClick={handleSubmitRender}
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? 'Submitting...' : '🚀 Submit Test Render'}
              </Button>

              <div className="text-sm text-gray-600">
                <p><strong>Timeline Info:</strong></p>
                <p>• Duration: {currentTimeline.timeline.events.length > 0 ? 
                  Math.max(...currentTimeline.timeline.events.map(e => e.end)) : 0} seconds</p>
                <p>• Events: {currentTimeline.timeline.events.length}</p>
                <p>• Resolution: {currentTimeline.timeline.width}x{currentTimeline.timeline.height}</p>
              </div>
            </div>
          </Card>

          {/* Results */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Results</h2>
            
            {result && (
              <div className="space-y-3">
                <div className={`p-3 rounded-lg ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
                  <p className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                    {result.success ? '✅ Success' : '❌ Error'}
                  </p>
                  {result.error && (
                    <p className="text-red-600 text-sm mt-1">{result.error}</p>
                  )}
                  {result.job_id && (
                    <p className="text-green-600 text-sm mt-1">
                      Job ID: {result.job_id}
                    </p>
                  )}
                  {result.inngest_id && (
                    <p className="text-green-600 text-sm mt-1">
                      Inngest ID: {result.inngest_id}
                    </p>
                  )}
                  {result.video_url && (
                    <div className="mt-2">
                      <p className="text-green-600 text-sm font-medium">Video URL:</p>
                      <a 
                        href={result.video_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm break-all underline"
                      >
                        {result.video_url}
                      </a>
                    </div>
                  )}
                </div>

                {jobStatus && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-blue-800 text-sm">{jobStatus}</p>
                  </div>
                )}
              </div>
            )}

            {!result && (
              <p className="text-gray-500 italic">
                No results yet. Submit a render to see the response.
              </p>
            )}
          </Card>
        </div>

        <Separator className="my-8" />

        {/* Timeline Preview */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Selected Timeline Preview</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <pre className="text-sm text-gray-600 overflow-x-auto max-h-96">
              {JSON.stringify(currentTimeline.timeline, null, 2)}
            </pre>
          </div>
        </Card>

        {/* Instructions */}
        <Card className="p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">🔍 How to Monitor</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>1. Database:</strong> Check `render_jobs` table in Supabase</p>
            <p><strong>2. RunPod Logs:</strong> Monitor your RunPod endpoint logs</p>
            <p><strong>3. Inngest:</strong> Check Inngest dashboard for function execution</p>
            <p><strong>4. Look for:</strong> Job completion without infinite restart loop</p>
          </div>
          
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
            <p className="text-yellow-800 text-sm">
              <strong>💡 Tip:</strong> Try different test timelines to verify various animation types and content mixing work properly in RunPod.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
} 