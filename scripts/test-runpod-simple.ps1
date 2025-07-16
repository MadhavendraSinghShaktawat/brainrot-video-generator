# Simple RunPod Handler Test Script
Write-Host "Testing RunPod Handler Function..." -ForegroundColor Green

Write-Host "Using test_input.json file to avoid PowerShell quote issues..." -ForegroundColor Cyan

# Method 1: Test with the JSON file (recommended)
Write-Host "Running render worker with test_input.json..." -ForegroundColor Yellow
npx tsx scripts/render-worker.ts

Write-Host "`nAlternative: Test with environment variables..." -ForegroundColor Cyan
$env:RUNPOD_INPUT_TIMELINE_JSON = '{"timeline":{"fps":30,"width":1920,"height":1080,"background":"#000000","events":[{"id":"caption1","type":"caption","text":"Hello World","start":0,"end":3000,"layer":1}]}}'
$env:RUNPOD_INPUT_OUTPUT_FILENAME = "env-test.mp4"
$env:RUNPOD_INPUT_COMPOSITION_ID = "JsonDrivenVideo"

Write-Host "Running render worker with environment variables..." -ForegroundColor Yellow
npx tsx scripts/render-worker.ts

Write-Host "`nTest completed! Check the out/ directory for generated videos." -ForegroundColor Green
Write-Host "Expected output files:" -ForegroundColor Yellow
Write-Host "  - test-output.mp4 (from JSON file)" -ForegroundColor White
Write-Host "  - env-test.mp4 (from environment variables)" -ForegroundColor White 