import { NextRequest, NextResponse } from 'next/server';
import { GoogleCloudStorageService } from '@/lib/google-cloud-storage';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ filename: string }> }
): Promise<NextResponse> {
  const params = await context.params;
  const { filename: filenameParam } = params;
  
  try {
    const filename = decodeURIComponent(filenameParam);
    
    // Get the public URL from Google Cloud Storage
    const publicUrl = GoogleCloudStorageService.getPublicUrl(filename, 'audio');

    // Redirect to the Google Cloud Storage URL
    return NextResponse.redirect(publicUrl);
    
  } catch (error) {
    console.error('Error serving voice preview:', error);
    return NextResponse.json(
      { error: 'Failed to serve audio file' },
      { status: 500 }
    );
  }
} 