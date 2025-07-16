# Test script for RunPod Serverless Render Worker (Windows PowerShell)
# This demonstrates how RunPod would call the worker with environment variables

Write-Host "🧪 Testing RunPod Serverless Render Worker..." -ForegroundColor Green

# Real timeline JSON from timeline2.json
$TIMELINE_JSON = @'
{
  "timeline": {
    "fps": 30,
    "width": 1920,
    "height": 1080,
    "background": "#000000",
    "events": [
      {
        "id": "video1",
        "type": "video",
        "src": "https://storage.googleapis.com/brainrot-generated-videos/3dae8d9a-bfa9-415e-b637-9e92b0f075ef.mp4",
        "start": 0,      
        "end": 20,
        "layer": 0
      },
      {
        "id": "caption1",
        "type": "caption",
        "text": "hii",
        "start": 0,
        "end": 20,
        "layer": 1,       
        "style": {
          "fontSize": 80,
          "color": "#FF0000",
          "fontWeight": "bold",
          "textAlign": "center",
          "textShadow": "0 0 20px #00ff88"
        },
        "animation": {
          "in": {
            "type": "slideInBounce",
            "duration": 1.5,
            "keyframes": [
              { 
                "time": 0, 
                "opacity": 0, 
                "translateY": -200, 
                "scale": 0.3,
                "rotate": -45
              },
              { 
                "time": 0.6, 
                "opacity": 1, 
                "translateY": 20, 
                "scale": 1.2,
                "rotate": 5
              },
              { 
                "time": 0.8, 
                "opacity": 1, 
                "translateY": -10, 
                "scale": 0.95,
                "rotate": -2
              },
              { 
                "time": 1.0, 
                "opacity": 1, 
                "translateY": 5, 
                "scale": 1.05,
                "rotate": 1
              },
              { 
                "time": 1.5, 
                "opacity": 1, 
                "translateY": 0, 
                "scale": 1.0,
                "rotate": 0
              }
            ]
          },
          "loop": {
            "type": "glow",
            "duration": 2.0,
            "keyframes": [
              { "time": 0, "textShadow": "0 0 20px #00ff88" },
              { "time": 1.0, "textShadow": "0 0 40px #00ff88, 0 0 60px #00ff88" },
              { "time": 2.0, "textShadow": "0 0 20px #00ff88" }
            ]
          }
        }
      },
      {
        "id": "video2",
        "type": "video",
        "src": "https://storage.googleapis.com/brainrot-generated-videos/d72cabb8-1d10-41ec-b5b8-7d0a2f2a384f.mp4",
        "start": 20,
        "end": 40,
        "layer": 0,
        "trimIn": 450,
        "trimOut": 1050
      },
      {
        "id": "caption2",
        "type": "caption",
        "text": "how are you",
        "start": 20,
        "end": 40,
        "layer": 1,
        "style": {
          "fontSize": 80,
          "color": "#FFC0CB",
          "fontWeight": "bold",
          "textAlign": "center",
          "textShadow": "0 0 15px #ff1493"
        },
        "animation": {
          "in": {
            "type": "typewriter",
            "duration": 2.0,
            "keyframes": [
              { 
                "time": 0, 
                "opacity": 1, 
                "scale": 1.0,
                "textReveal": 0
              },
              { 
                "time": 0.3, 
                "opacity": 1, 
                "scale": 1.1,
                "textReveal": 0.25
              },
              { 
                "time": 0.8, 
                "opacity": 1, 
                "scale": 1.05,
                "textReveal": 0.6
              },
              { 
                "time": 1.5, 
                "opacity": 1, 
                "scale": 1.0,
                "textReveal": 1.0
              },
              { 
                "time": 2.0, 
                "opacity": 1, 
                "scale": 1.0,
                "textReveal": 1.0
              }
            ]
          },
          "loop": {
            "type": "colorShift",
            "duration": 3.0,
            "keyframes": [
              { "time": 0, "color": "#FFC0CB" },
              { "time": 1.0, "color": "#ff69b4" },
              { "time": 2.0, "color": "#ff1493" },
              { "time": 3.0, "color": "#FFC0CB" }
            ]
          }
        }
      },
      {
        "id": "caption3",
        "type": "caption",
        "text": "do you like this video?",
        "start": 40,
        "end": 60,
        "layer": 1,
        "style": {
          "fontSize": 80,
          "color": "#ffffff",
          "fontWeight": "bold",
          "textAlign": "center",
          "textShadow": "0 0 25px #ffd700"
        },
        "animation": {
          "in": {
            "type": "explodeIn",
            "duration": 2.5,
            "keyframes": [
              { 
                "time": 0, 
                "opacity": 0, 
                "scale": 0.1,
                "rotate": 360,
                "translateX": 0,
                "translateY": 0
              },
              { 
                "time": 0.5, 
                "opacity": 0.7, 
                "scale": 1.8,
                "rotate": 180,
                "translateX": 50,
                "translateY": -30
              },
              { 
                "time": 1.0, 
                "opacity": 1, 
                "scale": 0.8,
                "rotate": 90,
                "translateX": -20,
                "translateY": 20
              },
              { 
                "time": 1.5, 
                "opacity": 1, 
                "scale": 1.3,
                "rotate": 45,
                "translateX": 10,
                "translateY": -10
              },
              { 
                "time": 2.0, 
                "opacity": 1, 
                "scale": 0.95,
                "rotate": 10,
                "translateX": -5,
                "translateY": 5
              },
              { 
                "time": 2.5, 
                "opacity": 1, 
                "scale": 1.0,
                "rotate": 0,
                "translateX": 0,
                "translateY": 0
              }
            ]
          },
          "loop": {
            "type": "pulse",
            "duration": 1.5,
            "keyframes": [
              { 
                "time": 0, 
                "scale": 1.0,
                "textShadow": "0 0 25px #ffd700"
              },
              { 
                "time": 0.75, 
                "scale": 1.1,
                "textShadow": "0 0 50px #ffd700, 0 0 75px #ffff00"
              },
              { 
                "time": 1.5, 
                "scale": 1.0,
                "textShadow": "0 0 25px #ffd700"
              }
            ]
          }
        }
      },
      {
        "id": "caption4",
        "type": "caption",
        "text": "SMASH THAT LIKE!",
        "start": 60,
        "end": 70,
        "layer": 1,
        "style": {
          "fontSize": 90,
          "color": "#00FFFF",
          "fontWeight": "bold",
          "textAlign": "center",
          "textShadow": "0 0 30px #0080FF"
        },
        "animation": {
          "in": {
            "type": "matrix",
            "duration": 1.8,
            "keyframes": [
              { 
                "time": 0, 
                "opacity": 0, 
                "scale": 0.5,
                "translateY": 100,
                "skewX": 45,
                "blur": 10
              },
              { 
                "time": 0.4, 
                "opacity": 0.8, 
                "scale": 1.5,
                "translateY": -20,
                "skewX": 15,
                "blur": 5
              },
              { 
                "time": 0.8, 
                "opacity": 1, 
                "scale": 0.9,
                "translateY": 10,
                "skewX": -5,
                "blur": 2
              },
              { 
                "time": 1.2, 
                "opacity": 1, 
                "scale": 1.2,
                "translateY": -5,
                "skewX": 2,
                "blur": 0
              },
              { 
                "time": 1.8, 
                "opacity": 1, 
                "scale": 1.0,
                "translateY": 0,
                "skewX": 0,
                "blur": 0
              }
            ]
          },
          "loop": {
            "type": "shake",
            "duration": 0.8,
            "keyframes": [
              { "time": 0, "translateX": 0, "scale": 1.0 },
              { "time": 0.1, "translateX": -8, "scale": 1.05 },
              { "time": 0.2, "translateX": 8, "scale": 0.98 },
              { "time": 0.3, "translateX": -6, "scale": 1.03 },
              { "time": 0.4, "translateX": 6, "scale": 0.99 },
              { "time": 0.5, "translateX": -4, "scale": 1.02 },
              { "time": 0.6, "translateX": 4, "scale": 1.0 },
              { "time": 0.7, "translateX": -2, "scale": 1.01 },
              { "time": 0.8, "translateX": 0, "scale": 1.0 }
            ]
          }
        }
      },
      {
        "id": "caption5",
        "type": "caption",
        "text": "Subscribe for more epic content! 🔥",
        "start": 70,
        "end": 80,
        "layer": 1,
        "style": {
          "fontSize": 75,
          "color": "#FFD700",
          "fontWeight": "bold",
          "textAlign": "center",
          "textShadow": "0 0 20px #FF6B35"
        },
        "animation": {
          "in": {
            "type": "wavyEntry",
            "duration": 2.2,
            "keyframes": [
              { 
                "time": 0, 
                "opacity": 0, 
                "translateY": 150,
                "rotate": -15,
                "scale": 0.6
              },
              { 
                "time": 0.3, 
                "opacity": 0.6, 
                "translateY": 80,
                "rotate": 8,
                "scale": 0.8
              },
              { 
                "time": 0.6, 
                "opacity": 0.9, 
                "translateY": 40,
                "rotate": -4,
                "scale": 1.1
              },
              { 
                "time": 1.0, 
                "opacity": 1, 
                "translateY": 20,
                "rotate": 2,
                "scale": 0.95
              },
              { 
                "time": 1.4, 
                "opacity": 1, 
                "translateY": 10,
                "rotate": -1,
                "scale": 1.05
              },
              { 
                "time": 1.8, 
                "opacity": 1, 
                "translateY": 5,
                "rotate": 0.5,
                "scale": 0.98
              },
              { 
                "time": 2.2, 
                "opacity": 1, 
                "translateY": 0,
                "rotate": 0,
                "scale": 1.0
              }
            ]
          },
          "loop": {
            "type": "rainbow",
            "duration": 4.0,
            "keyframes": [
              { "time": 0, "color": "#FFD700", "textShadow": "0 0 20px #FF6B35" },
              { "time": 1.0, "color": "#FF69B4", "textShadow": "0 0 25px #FF1493" },
              { "time": 2.0, "color": "#00FFFF", "textShadow": "0 0 30px #0080FF" },
              { "time": 3.0, "color": "#32CD32", "textShadow": "0 0 25px #228B22" },
              { "time": 4.0, "color": "#FFD700", "textShadow": "0 0 20px #FF6B35" }
            ]
          }
        }
      }
    ]
  }
}
'@

# Test 1: Direct JSON input with real timeline
Write-Host "📝 Test 1: Direct JSON input with real timeline" -ForegroundColor Cyan
$env:RUNPOD_INPUT_TIMELINE_JSON = $TIMELINE_JSON
$env:RUNPOD_INPUT_OUTPUT_FILENAME = "timeline2-test1.mp4"
$env:RUNPOD_INPUT_COMPOSITION_ID = "JsonDrivenVideo"

Write-Host "Environment variables set:" -ForegroundColor Yellow
Write-Host "  RUNPOD_INPUT_TIMELINE_JSON: Real timeline with videos and animations..."
Write-Host "  RUNPOD_INPUT_OUTPUT_FILENAME: $env:RUNPOD_INPUT_OUTPUT_FILENAME"
Write-Host "  RUNPOD_INPUT_COMPOSITION_ID: $env:RUNPOD_INPUT_COMPOSITION_ID"

Write-Host "🚀 Running render worker..." -ForegroundColor Green
npm run render:worker

Write-Host "✅ Test 1 complete!" -ForegroundColor Green
Write-Host ""

# Clean up environment variables
Remove-Item Env:RUNPOD_INPUT_TIMELINE_JSON -ErrorAction SilentlyContinue
Remove-Item Env:RUNPOD_INPUT_OUTPUT_FILENAME -ErrorAction SilentlyContinue
Remove-Item Env:RUNPOD_INPUT_COMPOSITION_ID -ErrorAction SilentlyContinue

# Test 2: Base64 encoded JSON input with real timeline
Write-Host "📝 Test 2: Base64 encoded JSON input with real timeline" -ForegroundColor Cyan
$TIMELINE_BASE64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($TIMELINE_JSON))
$env:RUNPOD_INPUT_TIMELINE_JSON = $TIMELINE_BASE64
$env:RUNPOD_INPUT_OUTPUT_FILENAME = "timeline2-test2.mp4"

Write-Host "Environment variables set:" -ForegroundColor Yellow
Write-Host "  RUNPOD_INPUT_TIMELINE_JSON (base64): $($env:RUNPOD_INPUT_TIMELINE_JSON.Substring(0, [Math]::Min(50, $env:RUNPOD_INPUT_TIMELINE_JSON.Length)))..."
Write-Host "  RUNPOD_INPUT_OUTPUT_FILENAME: $env:RUNPOD_INPUT_OUTPUT_FILENAME"

Write-Host "🚀 Running render worker..." -ForegroundColor Green
npm run render:worker

Write-Host "✅ Test 2 complete!" -ForegroundColor Green
Write-Host ""

# Clean up
Remove-Item Env:RUNPOD_INPUT_TIMELINE_JSON -ErrorAction SilentlyContinue
Remove-Item Env:RUNPOD_INPUT_OUTPUT_FILENAME -ErrorAction SilentlyContinue

Write-Host "🎉 All tests completed!" -ForegroundColor Green
Write-Host "Check the output videos in the out/ directory:" -ForegroundColor Yellow
Write-Host "  - timeline2-test1.mp4 (direct JSON)" -ForegroundColor Yellow
Write-Host "  - timeline2-test2.mp4 (base64 encoded)" -ForegroundColor Yellow 