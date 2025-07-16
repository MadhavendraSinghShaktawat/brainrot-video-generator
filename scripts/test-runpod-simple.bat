@echo off
echo Testing RunPod Handler Function...

echo Using test_input.json file to avoid quote issues...
echo.

echo Running render worker with test_input.json...
npx tsx scripts/render-worker.ts

echo.
echo Alternative: Test with environment variables...
set "RUNPOD_INPUT_TIMELINE_JSON={"timeline":{"fps":30,"width":1920,"height":1080,"background":"#000000","events":[{"id":"caption1","type":"caption","text":"Hello World","start":0,"end":3000,"layer":1}]}}"
set "RUNPOD_INPUT_OUTPUT_FILENAME=env-test.mp4"
set "RUNPOD_INPUT_COMPOSITION_ID=JsonDrivenVideo"

echo Running render worker with environment variables...
npx tsx scripts/render-worker.ts

echo.
echo Test completed! Check the out/ directory for generated videos.
echo Expected output files:
echo   - test-output.mp4 (from JSON file)
echo   - env-test.mp4 (from environment variables)
pause 