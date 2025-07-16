#!/bin/bash

# Test script for RunPod Serverless Render Worker
# This demonstrates how RunPod would call the worker with environment variables

echo "🧪 Testing RunPod Serverless Render Worker..."

# Example timeline JSON (you can replace this with actual timeline data)
TIMELINE_JSON='{
  "scenes": [
    {
      "id": "scene1", 
      "type": "text",
      "text": "Hello from RunPod!",
      "duration": 3000,
      "background": "#000000",
      "color": "#ffffff"
    }
  ],
  "totalDuration": 3000
}'

# Test 1: Direct JSON input
echo "📝 Test 1: Direct JSON input"
export RUNPOD_INPUT_TIMELINE_JSON="$TIMELINE_JSON"
export RUNPOD_INPUT_OUTPUT_FILENAME="runpod-test1.mp4"
export RUNPOD_INPUT_COMPOSITION_ID="JsonDrivenVideo"

echo "Environment variables set:"
echo "  RUNPOD_INPUT_TIMELINE_JSON: ${RUNPOD_INPUT_TIMELINE_JSON:0:50}..."
echo "  RUNPOD_INPUT_OUTPUT_FILENAME: $RUNPOD_INPUT_OUTPUT_FILENAME"
echo "  RUNPOD_INPUT_COMPOSITION_ID: $RUNPOD_INPUT_COMPOSITION_ID"

echo "🚀 Running render worker..."
npm run render:worker

echo "✅ Test 1 complete!"
echo ""

# Clean up environment variables
unset RUNPOD_INPUT_TIMELINE_JSON
unset RUNPOD_INPUT_OUTPUT_FILENAME
unset RUNPOD_INPUT_COMPOSITION_ID

# Test 2: Base64 encoded JSON input  
echo "📝 Test 2: Base64 encoded JSON input"
TIMELINE_BASE64=$(echo "$TIMELINE_JSON" | base64)
export RUNPOD_INPUT_TIMELINE_JSON="$TIMELINE_BASE64"
export RUNPOD_INPUT_OUTPUT_FILENAME="runpod-test2.mp4"

echo "Environment variables set:"
echo "  RUNPOD_INPUT_TIMELINE_JSON (base64): ${RUNPOD_INPUT_TIMELINE_JSON:0:50}..."
echo "  RUNPOD_INPUT_OUTPUT_FILENAME: $RUNPOD_INPUT_OUTPUT_FILENAME"

echo "🚀 Running render worker..."
npm run render:worker

echo "✅ Test 2 complete!"
echo ""

# Clean up
unset RUNPOD_INPUT_TIMELINE_JSON
unset RUNPOD_INPUT_OUTPUT_FILENAME

echo "🎉 All tests completed!"
echo "Check the output videos in the out/ directory" 