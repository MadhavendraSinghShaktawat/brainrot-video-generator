# RunPod Serverless Video Rendering Setup

This guide explains how to deploy and use the video rendering system on RunPod serverless infrastructure.

## Overview

The render worker has been updated to work with RunPod serverless by accepting input through environment variables rather than local files. This solves the "ENOENT: no such file or directory" error that occurred when RunPod tried to read a local `timeline.json` file.

## How It Works

### Input Methods

The render worker now accepts timeline data through multiple methods:

1. **Direct JSON String** (`RUNPOD_INPUT_TIMELINE_JSON`)
2. **Base64 Encoded JSON** (`RUNPOD_INPUT_TIMELINE_JSON`)  
3. **HTTP URL** (`RUNPOD_INPUT_TIMELINE_URL`)
4. **Local File Path** (for testing only)

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `RUNPOD_INPUT_TIMELINE_JSON` | Timeline JSON data (direct or base64 encoded) | Yes* | - |
| `RUNPOD_INPUT_TIMELINE_URL` | HTTP URL to download timeline JSON | Yes* | - |
| `RUNPOD_INPUT_OUTPUT_FILENAME` | Output video filename | No | `video.mp4` |
| `RUNPOD_INPUT_COMPOSITION_ID` | Remotion composition ID | No | `JsonDrivenVideo` |

*Either `RUNPOD_INPUT_TIMELINE_JSON` or `RUNPOD_INPUT_TIMELINE_URL` must be provided.

## RunPod Deployment

### 1. Docker Configuration

Create a Dockerfile for your RunPod endpoint:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the project
RUN npm run build

# Set the entrypoint to the render worker
CMD ["npm", "run", "render:worker"]
```

### 2. RunPod Endpoint Setup

1. **Create a new endpoint** in the RunPod console
2. **Set the Docker image** to your built container
3. **Configure environment variables** for Google Cloud Storage:
   - `GOOGLE_CLOUD_PROJECT_ID`
   - `GOOGLE_CLOUD_CLIENT_EMAIL`  
   - `GOOGLE_CLOUD_PRIVATE_KEY`

### 3. API Usage

#### Method 1: Direct JSON Input

```bash
curl -X POST https://api.runpod.ai/v2/{endpoint_id}/run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "input": {
      "RUNPOD_INPUT_TIMELINE_JSON": "{\"scenes\":[{\"id\":\"scene1\",\"type\":\"text\",\"text\":\"Hello World\",\"duration\":3000}]}",
      "RUNPOD_INPUT_OUTPUT_FILENAME": "my-video.mp4",
      "RUNPOD_INPUT_COMPOSITION_ID": "JsonDrivenVideo"
    }
  }'
```

#### Method 2: Base64 Encoded JSON

```bash
# First, encode your timeline JSON to base64
TIMELINE_BASE64=$(echo '{"scenes":[{"id":"scene1","type":"text","text":"Hello World","duration":3000}]}' | base64)

curl -X POST https://api.runpod.ai/v2/{endpoint_id}/run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d "{
    \"input\": {
      \"RUNPOD_INPUT_TIMELINE_JSON\": \"$TIMELINE_BASE64\",
      \"RUNPOD_INPUT_OUTPUT_FILENAME\": \"my-video.mp4\"
    }
  }"
```

#### Method 3: URL Input

```bash
curl -X POST https://api.runpod.ai/v2/{endpoint_id}/run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "input": {
      "RUNPOD_INPUT_TIMELINE_URL": "https://your-storage.com/timeline.json",
      "RUNPOD_INPUT_OUTPUT_FILENAME": "my-video.mp4"
    }
  }'
```

## Response Format

### Success Response

```json
{
  "success": true,
  "video_url": "https://storage.googleapis.com/your-bucket/my-video.mp4",
  "message": "Video render completed successfully"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

## Local Testing

You can test the updated worker locally using the provided test script:

```bash
# Make the test script executable
chmod +x scripts/test-runpod-worker.sh

# Run the test
./scripts/test-runpod-worker.sh
```

Or test manually with environment variables:

```bash
export RUNPOD_INPUT_TIMELINE_JSON='{"scenes":[{"id":"scene1","type":"text","text":"Hello World","duration":3000}]}'
export RUNPOD_INPUT_OUTPUT_FILENAME="test-video.mp4"

npm run render:worker
```

## Troubleshooting

### Common Issues

1. **"No timeline input provided"**
   - Ensure either `RUNPOD_INPUT_TIMELINE_JSON` or `RUNPOD_INPUT_TIMELINE_URL` is set
   - Check that the JSON is valid if using direct input

2. **"Failed to download timeline"**
   - Verify the URL is accessible and returns valid JSON
   - Check network connectivity in the RunPod container

3. **"Composition not found"**
   - Verify the composition ID exists in your Remotion project
   - Check the available compositions in the logs

4. **Google Cloud Storage errors**
   - Verify all GCS environment variables are set correctly
   - Ensure the service account has proper permissions

### Debug Logs

The worker provides detailed logging:

```
🆕 RunPod Serverless Render Worker version 0.5.0
🔒 GCS credential variables:
  • GOOGLE_CLOUD_PROJECT_ID: ✅ set
  • GOOGLE_CLOUD_CLIENT_EMAIL: ✅ set
  • GOOGLE_CLOUD_PRIVATE_KEY: ✅ set
🤖 RunPod input configuration:
  • RUNPOD_INPUT_TIMELINE_JSON: ✅ set
  • RUNPOD_INPUT_TIMELINE_URL: ❌ not set
  • RUNPOD_INPUT_OUTPUT_FILENAME: test-video.mp4
  • RUNPOD_INPUT_COMPOSITION_ID: default: JsonDrivenVideo
```

## Performance Optimization

- Use smaller timeline JSON files when possible
- Consider using `RUNPOD_INPUT_TIMELINE_URL` for large timeline files
- Set appropriate timeout values in RunPod endpoint configuration
- Monitor resource usage and scale accordingly

## Next Steps

1. Test the local worker with your timeline data
2. Build and deploy your Docker container to RunPod
3. Configure the endpoint with proper environment variables
4. Test with actual API calls
5. Integrate with your application 