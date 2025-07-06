import { NextRequest, NextResponse } from 'next/server';
import { GoogleCloudStorageService } from '@/lib/google-cloud-storage';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing Google Cloud Storage connectivity...');
    
    // Debug: Check environment variables
    console.log('Environment variables check:');
    console.log('- GOOGLE_CLOUD_PROJECT_ID:', process.env.GOOGLE_CLOUD_PROJECT_ID ? 'SET' : 'MISSING');
    console.log('- GOOGLE_CLOUD_CLIENT_EMAIL:', process.env.GOOGLE_CLOUD_CLIENT_EMAIL ? 'SET' : 'MISSING');
    console.log('- GOOGLE_CLOUD_PRIVATE_KEY:', process.env.GOOGLE_CLOUD_PRIVATE_KEY ? 'SET (length: ' + process.env.GOOGLE_CLOUD_PRIVATE_KEY.length + ')' : 'MISSING');
    console.log('- GOOGLE_CLOUD_KEY_FILE:', process.env.GOOGLE_CLOUD_KEY_FILE ? 'SET' : 'MISSING');
    
    // Test 1: Check if we can create/access buckets
    console.log('🔍 Step 1: Testing bucket creation/access...');
    await GoogleCloudStorageService.ensureBucketsExist();
    console.log('✅ Buckets exist or created successfully');
    
    // Test 2: Upload a small test file
    console.log('🔍 Step 2: Testing file upload...');
    const testContent = Buffer.from('Hello from Brainrot Video Generator! 🎥', 'utf8');
    const testFileName = `test-${Date.now()}.txt`;
    
    const { publicUrl } = await GoogleCloudStorageService.uploadFile(
      testContent,
      testFileName,
      'videos', // Use videos bucket for test
      'text/plain'
    );
    console.log('✅ Test file uploaded successfully');
    
    // Test 3: Get storage statistics
    console.log('🔍 Step 3: Testing storage stats...');
    const stats = await GoogleCloudStorageService.getStorageStats();
    console.log('✅ Storage stats retrieved successfully');
    
    // Test 4: Clean up test file
    console.log('🔍 Step 4: Cleaning up test file...');
    await GoogleCloudStorageService.deleteFile(testFileName, 'videos');
    console.log('✅ Test file cleaned up successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Google Cloud Storage is working perfectly! 🎉',
      testResults: {
        bucketsCreated: true,
        fileUpload: true,
        publicUrlGenerated: true,
        storageStats: stats,
        testFileUrl: publicUrl
      },
      buckets: {
        videos: process.env.GCS_VIDEOS_BUCKET || 'brainrot-generated-videos',
        audio: process.env.GCS_AUDIO_BUCKET || 'brainrot-generated-audio'
      }
    });
    
  } catch (error) {
    console.error('❌ Google Cloud Storage test failed:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Provide helpful error messages based on common issues
    let errorMessage = 'Google Cloud Storage test failed';
    let suggestions: string[] = [];
    
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      
      if (msg.includes('project') || msg.includes('project_id')) {
        errorMessage = 'Invalid or missing Google Cloud Project ID';
        suggestions = [
          'Verify GOOGLE_CLOUD_PROJECT_ID in your .env.local file',
          'Make sure the project exists in Google Cloud Console',
          'Check that the project ID is spelled correctly'
        ];
      } else if (msg.includes('permission') || msg.includes('credentials') || msg.includes('unauthorized')) {
        errorMessage = 'Authentication or permission error';
        suggestions = [
          'Check that service account credentials are correct',
          'Verify service account has Storage Admin role',
          'Ensure Cloud Storage API is enabled for your project',
          'Make sure private key format is correct (contains \\n for line breaks)'
        ];
      } else if (msg.includes('api') || msg.includes('disabled')) {
        errorMessage = 'Cloud Storage API not enabled';
        suggestions = [
          'Enable Cloud Storage API in Google Cloud Console',
          'Go to APIs & Services > Library > Search "Cloud Storage"'
        ];
      } else if (msg.includes('bucket')) {
        errorMessage = 'Bucket creation or access failed';
        suggestions = [
          'Check service account permissions',
          'Verify bucket names are valid (lowercase, no spaces)',
          'Ensure uniform bucket-level access is enabled'
        ];
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: error instanceof Error ? error.message : 'Unknown error',
      fullError: error instanceof Error ? error.toString() : String(error),
      suggestions,
      environmentVariables: {
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID ? '✅ Set' : '❌ Missing',
        clientEmail: process.env.GOOGLE_CLOUD_CLIENT_EMAIL ? '✅ Set' : '❌ Missing',
        privateKey: process.env.GOOGLE_CLOUD_PRIVATE_KEY ? '✅ Set' : '❌ Missing',
        keyFile: process.env.GOOGLE_CLOUD_KEY_FILE ? '✅ Set' : '❌ Missing',
        videosBucket: process.env.GCS_VIDEOS_BUCKET || 'Using default: brainrot-generated-videos',
        audioBucket: process.env.GCS_AUDIO_BUCKET || 'Using default: brainrot-generated-audio'
      }
    }, { status: 500 });
  }
} 