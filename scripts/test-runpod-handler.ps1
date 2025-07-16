# Test script for RunPod Handler Function (Windows PowerShell)
# This tests the new RunPod handler format with job.input

Write-Host "🧪 Testing RunPod Handler Function..." -ForegroundColor Green

# Test timeline JSON matching the format expected by RunPod
$TEST_JOB = @"
{
  "id": "test-job-123",
  "input": {
    "timeline_url": "https://storage.googleapis.com/brainrot-timeline-bucket/timeline-test.json",
    "output_filename": "runpod-handler-test.mp4",
    "composition_id": "JsonDrivenVideo"
  }
}
"@

# Alternative test with direct JSON
$TEST_JOB_DIRECT = @"
{
  "id": "test-job-456", 
  "input": {
    "timeline_json": "{\"timeline\":{\"fps\":30,\"width\":1920,\"height\":1080,\"background\":\"#000000\",\"events\":[{\"id\":\"caption1\",\"type\":\"caption\",\"text\":\"Testing RunPod Handler!\",\"start\":0,\"end\":3,\"layer\":1,\"style\":{\"fontSize\":72,\"color\":\"#ffffff\",\"fontFamily\":\"Arial Black\",\"textAlign\":\"center\",\"fontWeight\":\"bold\"},\"position\":{\"x\":960,\"y\":540},\"animation\":{\"type\":\"slideInBounce\",\"duration\":0.5}}]}}",
    "output_filename": "runpod-handler-direct.mp4",
    "composition_id": "JsonDrivenVideo"
  }
}
"@

Write-Host "📝 Test 1: Timeline URL Input" -ForegroundColor Cyan
Write-Host "Job Input:" -ForegroundColor Yellow
Write-Host $TEST_JOB

Write-Host "`n🚀 Running render worker with URL input..." -ForegroundColor Green
try {
    npm run render:worker -- --test_input=$TEST_JOB
    Write-Host "✅ URL test completed successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ URL test failed: $_" -ForegroundColor Red
}

Write-Host "`n" + "="*50

Write-Host "📝 Test 2: Direct JSON Input" -ForegroundColor Cyan  
Write-Host "Job Input:" -ForegroundColor Yellow
Write-Host $TEST_JOB_DIRECT

Write-Host "`n🚀 Running render worker with direct JSON input..." -ForegroundColor Green
try {
    npm run render:worker -- --test_input=$TEST_JOB_DIRECT
    Write-Host "✅ Direct JSON test completed successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Direct JSON test failed: $_" -ForegroundColor Red
}

Write-Host "`n🎉 RunPod Handler testing completed!" -ForegroundColor Green
Write-Host "Check the out/ directory for generated videos" -ForegroundColor Yellow

Write-Host "`n📊 Summary:" -ForegroundColor Cyan
Write-Host "• Test 1: Timeline URL input format" -ForegroundColor White
Write-Host "• Test 2: Direct JSON input format" -ForegroundColor White
Write-Host "• Both tests simulate how RunPod sends job data" -ForegroundColor White 