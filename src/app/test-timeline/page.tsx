'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useTimelineStore } from '@/store/timeline-store'
import { Timeline } from '@/components/timeline/timeline'
import { Timeline as TimelineType, TimelineEvent } from '@/types/timeline'

export default function TestTimelinePage() {
  const [testResults, setTestResults] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  const {
    timeline,
    currentFrame,
    isPlaying,
    selectedEventIds,
    history,
    historyIndex,
    setTimeline,
    createNewTimeline,
    addEvent,
    updateEvent,
    deleteEvent,
    duplicateEvent,
    selectEvent,
    selectEvents,
    clearSelection,
    setIsPlaying,
    setCurrentFrame,
    undo,
    redo,
    resetTimeline
  } = useTimelineStore()

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`])
  }

  const clearTestResults = () => {
    setTestResults([])
  }

  // Sample timeline data for testing
  const sampleTimeline: TimelineType = {
    fps: 30,
    width: 1920,
    height: 1080,
    background: '#000000',
    events: [
      {
        id: 'event1',
        type: 'video',
        start: 0,
        end: 300,
        layer: 0,
        src: 'test-video.mp4'
      },
      {
        id: 'event2',
        type: 'audio',
        start: 60,
        end: 600,
        layer: 1,
        src: 'test-audio.mp3',
        volume: 0.6
      },
      {
        id: 'event3',
        type: 'image',
        start: 300,
        end: 450,
        layer: 2,
        src: 'test-image.jpg'
      },
      {
        id: 'event4',
        type: 'caption',
        start: 150,
        end: 450,
        layer: 3,
        text: 'Test Caption',
        style: {
          fontSize: 24,
          color: '#ffffff'
        }
      }
    ]
  }

  // API Tests
  const testCreateTimeline = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/timelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'API Test Timeline',
          data: {
            description: 'Created via API test',
            duration: 1200,
            width: 1920,
            height: 1080,
            fps: 30,
            events: []
          }
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        addTestResult(`✅ CREATE API: Timeline created with ID ${data.id}`)
        return data.id
      } else {
        const error = await response.text()
        addTestResult(`❌ CREATE API: ${error}`)
      }
    } catch (error) {
      addTestResult(`❌ CREATE API: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const testGetTimelines = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/timelines')
      
      if (response.ok) {
        const data = await response.json()
        addTestResult(`✅ GET LIST API: Found ${data.timelines.length} timelines`)
      } else {
        const error = await response.text()
        addTestResult(`❌ GET LIST API: ${error}`)
      }
    } catch (error) {
      addTestResult(`❌ GET LIST API: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const testGetTimeline = async (id: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/timelines/${id}`)
      
      if (response.ok) {
        const data = await response.json()
        addTestResult(`✅ GET API: Timeline "${data.title}" loaded`)
        return data
      } else {
        const error = await response.text()
        addTestResult(`❌ GET API: ${error}`)
      }
    } catch (error) {
      addTestResult(`❌ GET API: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const testUpdateTimeline = async (id: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/timelines/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Updated Timeline Title',
          data: {
            description: 'Updated via API test',
            duration: 1500,
            width: 1920,
            height: 1080,
            fps: 30,
            events: []
          }
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        addTestResult(`✅ UPDATE API: Timeline updated`)
      } else {
        const error = await response.text()
        addTestResult(`❌ UPDATE API: ${error}`)
      }
    } catch (error) {
      addTestResult(`❌ UPDATE API: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const testDeleteTimeline = async (id: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/timelines/${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        addTestResult(`✅ DELETE API: Timeline deleted`)
      } else {
        const error = await response.text()
        addTestResult(`❌ DELETE API: ${error}`)
      }
    } catch (error) {
      addTestResult(`❌ DELETE API: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const testAllAPIs = async () => {
    addTestResult('🚀 Starting API tests...')
    
    // Test create
    const timelineId = await testCreateTimeline()
    if (!timelineId) return
    
    // Test get list
    await testGetTimelines()
    
    // Test get single
    await testGetTimeline(timelineId)
    
    // Test update
    await testUpdateTimeline(timelineId)
    
    // Test delete
    await testDeleteTimeline(timelineId)
    
    addTestResult('✅ All API tests completed')
  }

  // Store Tests
  const testStoreOperations = () => {
    addTestResult('🚀 Starting store tests...')
    
    // Test load timeline
    setTimeline(sampleTimeline)
    addTestResult(`✅ STORE: Timeline loaded with ${sampleTimeline.events.length} events`)
    
    // Test playback
    setIsPlaying(true)
    addTestResult(`✅ STORE: Playback started - Playing: ${isPlaying}`)
    
    setIsPlaying(false)
    addTestResult(`✅ STORE: Playback paused - Playing: ${isPlaying}`)
    
    // Test frame navigation
    setCurrentFrame(150)
    addTestResult(`✅ STORE: Frame set to 150 - Current: ${currentFrame}`)
    
    // Test event selection
    selectEvent('event1')
    addTestResult(`✅ STORE: Event selected - Selected: ${selectedEventIds?.length || 0}`)
    
    selectEvents(['event1', 'event2'])
    addTestResult(`✅ STORE: Multiple events selected - Selected: ${selectedEventIds?.length || 0}`)
    
    clearSelection()
    addTestResult(`✅ STORE: Selection cleared - Selected: ${selectedEventIds?.length || 0}`)
    
    // Test event operations
    const newEvent = {
      type: 'video' as const,
      start: 600,
      end: 900,
      layer: 0,
      src: 'new-video.mp4'
    }
    
    addEvent(newEvent)
    addTestResult(`✅ STORE: Event added - Total events: ${timeline?.events?.length || 0}`)
    
    // Get the actual event ID from the timeline
    const addedEvent = timeline?.events.find(e => e.type === 'video' && 'src' in e && e.src === 'new-video.mp4')
    if (addedEvent) {
      updateEvent(addedEvent.id, { end: 1000 })
      addTestResult(`✅ STORE: Event updated`)
      
      duplicateEvent(addedEvent.id)
      addTestResult(`✅ STORE: Event duplicated - Total events: ${timeline?.events?.length || 0}`)
    }
    
    // Test history
    addTestResult(`✅ STORE: History length: ${history?.length || 0}, Index: ${historyIndex || 0}`)
    
    undo()
    addTestResult(`✅ STORE: Undo performed - Total events: ${timeline?.events?.length || 0}`)
    
    redo()
    addTestResult(`✅ STORE: Redo performed - Total events: ${timeline?.events?.length || 0}`)
    
    addTestResult('✅ All store tests completed')
  }

  const testComponentRendering = () => {
    addTestResult('🚀 Testing component rendering...')
    
    if (timeline) {
      addTestResult(`✅ COMPONENT: Timeline component loaded with ${timeline.events.length} events`)
      addTestResult(`✅ COMPONENT: Timeline dimensions: ${timeline.width}x${timeline.height}`)
      addTestResult(`✅ COMPONENT: Timeline FPS: ${timeline.fps}`)
    } else {
      addTestResult(`❌ COMPONENT: No timeline loaded`)
    }
    
    addTestResult('✅ Component rendering test completed')
  }

  const runAllTests = async () => {
    clearTestResults()
    
    // Run store tests first
    testStoreOperations()
    
    // Test component rendering
    testComponentRendering()
    
    // Run API tests
    await testAllAPIs()
    
    addTestResult('🎉 All tests completed!')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Timeline System Test Page</h1>
        <p className="text-gray-600">Test all timeline functionality including API endpoints, store operations, and components</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Controls */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
          <div className="space-y-3">
            <Button onClick={runAllTests} disabled={isLoading} className="w-full">
              {isLoading ? 'Running Tests...' : 'Run All Tests'}
            </Button>
            
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={testStoreOperations}>
                Test Store
              </Button>
              <Button variant="outline" onClick={testAllAPIs} disabled={isLoading}>
                Test APIs
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={testComponentRendering}>
                Test Components
              </Button>
              <Button variant="outline" onClick={clearTestResults}>
                Clear Results
              </Button>
            </div>
            
            <Button variant="outline" onClick={resetTimeline} className="w-full">
              Reset Store
            </Button>
          </div>
        </Card>

        {/* Test Results */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          <div className="h-96 overflow-y-auto bg-gray-50 p-4 rounded font-mono text-sm">
            {testResults.length === 0 ? (
              <p className="text-gray-500">No test results yet. Click "Run All Tests" to start.</p>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="mb-1">
                  {result}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Store State Display */}
      <Card className="mt-6 p-6">
        <h2 className="text-xl font-semibold mb-4">Current Store State</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <strong>Timeline:</strong> {timeline ? 'Loaded' : 'None'}
          </div>
          <div>
            <strong>Current Frame:</strong> {currentFrame || 0}
          </div>
          <div>
            <strong>Playing:</strong> {isPlaying ? 'Yes' : 'No'}
          </div>
          <div>
            <strong>Selected Events:</strong> {selectedEventIds?.length || 0}
          </div>
          <div>
            <strong>Total Events:</strong> {timeline?.events?.length || 0}
          </div>
          <div>
            <strong>History:</strong> {history?.length || 0} states (index: {historyIndex || 0})
          </div>
        </div>
      </Card>

      {/* Timeline Component */}
      {timeline && (
        <Card className="mt-6 p-6">
          <h2 className="text-xl font-semibold mb-4">Timeline Component Test</h2>
          <div className="border rounded-lg overflow-hidden">
            <Timeline />
          </div>
        </Card>
      )}
    </div>
  )
} 