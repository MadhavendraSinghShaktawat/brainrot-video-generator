@echo off
echo 🧪 Testing RunPod Serverless Render Worker...

rem Example timeline JSON (you can replace this with actual timeline data)
set "TIMELINE_JSON={\"scenes\":[{\"id\":\"scene1\",\"type\":\"text\",\"text\":\"Hello from RunPod!\",\"duration\":3000,\"background\":\"#000000\",\"color\":\"#ffffff\"}],\"totalDuration\":3000}"

rem Test 1: Direct JSON input
echo 📝 Test 1: Direct JSON input
set "RUNPOD_INPUT_TIMELINE_JSON=%TIMELINE_JSON%"
set "RUNPOD_INPUT_OUTPUT_FILENAME=runpod-test1.mp4"
set "RUNPOD_INPUT_COMPOSITION_ID=JsonDrivenVideo"

echo Environment variables set:
echo   RUNPOD_INPUT_OUTPUT_FILENAME: %RUNPOD_INPUT_OUTPUT_FILENAME%
echo   RUNPOD_INPUT_COMPOSITION_ID: %RUNPOD_INPUT_COMPOSITION_ID%

echo 🚀 Running render worker...
npm run render:worker

echo ✅ Test 1 complete!
echo.

rem Clean up environment variables
set "RUNPOD_INPUT_TIMELINE_JSON="
set "RUNPOD_INPUT_OUTPUT_FILENAME="
set "RUNPOD_INPUT_COMPOSITION_ID="

echo 🎉 Test completed!
echo Check the output videos in the out/ directory
pause 