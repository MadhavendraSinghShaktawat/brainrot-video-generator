import { Storage } from '@google-cloud/storage';

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  // Prioritize environment variable credentials over JSON file
  ...(process.env.GOOGLE_CLOUD_PRIVATE_KEY && process.env.GOOGLE_CLOUD_CLIENT_EMAIL ? {
    credentials: {
      client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
      private_key: (() => {
        let key = process.env.GOOGLE_CLOUD_PRIVATE_KEY as string;
        // Remove surrounding quotes if present
        if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
          key = key.slice(1, -1);
        }
        return key.replace(/\\n/g, '\n');
      })(),
    }
  } : process.env.GOOGLE_CLOUD_KEY_FILE ? {
    keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE
  } : {})
});

// Bucket configurations
const BUCKETS = {
  videos: process.env.GCS_VIDEOS_BUCKET || 'brainrot-generated-videos',
  audio: process.env.GCS_AUDIO_BUCKET || 'brainrot-generated-audio'
} as const;

export class GoogleCloudStorageService {
  
  /**
   * Upload a file to Google Cloud Storage
   */
  static async uploadFile(
    buffer: Buffer,
    fileName: string,
    bucketType: keyof typeof BUCKETS,
    contentType: string
  ): Promise<{ publicUrl: string; fileName: string }> {
      const bucketName = BUCKETS[bucketType];
      const bucket = storage.bucket(bucketName);
      const file = bucket.file(fileName);

    // Retry configuration for large file uploads
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📤 Uploading ${fileName} (${buffer.length} bytes) to ${bucketName}... (Attempt ${attempt}/${maxRetries})`);
        
      const useResumable = buffer.length > 10 * 1024 * 1024;

      const saveOptions: Parameters<typeof file.save>[1] = {
        metadata: { contentType },
        validation: false, // disable MD5/CRC; known stream bug otherwise
        timeout: 600_000,
        resumable: useResumable,
      };

      if (useResumable) {
        // Only relevant for resumable uploads
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore – property exists when resumable true
        saveOptions.chunkSize = 2 * 1024 * 1024;
      }

      await file.save(buffer, saveOptions);

        console.log(`✅ Upload successful: ${fileName}`);

      // Note: Files are automatically public since bucket has public IAM policy
      // Generate public URL
      const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

      return { publicUrl, fileName };

    } catch (error) {
        lastError = error;
        console.error(`❌ Upload attempt ${attempt} failed:`, error);
        
        // Check if it's a timeout error that might succeed on retry
        const isRetryableError = error instanceof Error && (
          error.message.includes('ETIMEDOUT') ||
          error.message.includes('timeout') ||
          error.message.includes('ECONNRESET') ||
          error.message.includes('socket hang up')
        );

        if (attempt < maxRetries && isRetryableError) {
          const delayMs = attempt * 5000; // 5s, 10s, 15s delays
          console.log(`⏳ Retrying upload in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }

        // If this was the last attempt or non-retryable error, break
        break;
      }
    }

    // If we get here, all attempts failed
    console.error('GCS upload error (all attempts failed):', lastError);
    console.error('Error type:', typeof lastError);
    console.error('Error details:', JSON.stringify(lastError, null, 2));
      
      let errorMessage = 'Unknown error';
    if (lastError instanceof Error) {
      errorMessage = lastError.message;
    } else if (typeof lastError === 'object' && lastError !== null) {
      errorMessage = JSON.stringify(lastError);
      } else {
      errorMessage = String(lastError);
      }
      
    throw new Error(`Failed to upload to Google Cloud Storage after ${maxRetries} attempts: ${errorMessage}`);
  }

  /**
   * Upload video file
   */
  static async uploadVideo(
    buffer: Buffer,
    fileName: string
  ): Promise<{ publicUrl: string; fileName: string }> {
    return this.uploadFile(buffer, fileName, 'videos', 'video/mp4');
  }

  /**
   * Upload audio file
   */
  static async uploadAudio(
    buffer: Buffer,
    fileName: string
  ): Promise<{ publicUrl: string; fileName: string }> {
    return this.uploadFile(buffer, fileName, 'audio', 'audio/wav');
  }

  /**
   * Upload timeline JSON file to Google Cloud Storage
   */
  static async uploadTimeline(
    buffer: Buffer,
    fileName: string
  ): Promise<{ publicUrl: string; fileName: string }> {
    return this.uploadFile(buffer, fileName, 'videos', 'application/json');
  }

  /**
   * Get public URL for a file
   */
  static getPublicUrl(fileName: string, bucketType: keyof typeof BUCKETS): string {
    const bucketName = BUCKETS[bucketType];
    return `https://storage.googleapis.com/${bucketName}/${fileName}`;
  }

  /**
   * Delete a file from storage
   */
  static async deleteFile(fileName: string, bucketType: keyof typeof BUCKETS): Promise<void> {
    try {
      const bucketName = BUCKETS[bucketType];
      const bucket = storage.bucket(bucketName);
      await bucket.file(fileName).delete();
    } catch (error) {
      console.warn(`Failed to delete file ${fileName}:`, error);
      // Don't throw error for cleanup operations
    }
  }

  /**
   * Check if buckets exist and create them if needed
   */
  static async ensureBucketsExist(): Promise<void> {
    try {
      for (const [type, bucketName] of Object.entries(BUCKETS)) {
        const bucket = storage.bucket(bucketName);
        const [exists] = await bucket.exists();
        
        if (!exists) {
          console.log(`Creating bucket: ${bucketName}`);
          await storage.createBucket(bucketName, {
            location: 'US', // or your preferred location
            storageClass: 'STANDARD',
            iamConfiguration: {
              uniformBucketLevelAccess: {
                enabled: true
              }
            }
          });

          // Make bucket public for direct access
          await bucket.iam.setPolicy({
            bindings: [{
              role: 'roles/storage.objectViewer',
              members: ['allUsers']
            }]
          });

          console.log(`✅ Created and configured bucket: ${bucketName}`);
        }
      }
    } catch (error) {
      console.error('Error ensuring buckets exist:', error);
      throw error;
    }
  }

  /**
   * Get storage usage statistics
   */
  static async getStorageStats(): Promise<{
    videosCount: number;
    audioCount: number;
    totalSize: number;
  }> {
    try {
      let videosCount = 0;
      let audioCount = 0;
      let totalSize = 0;

      // Get video files stats
      const [videoFiles] = await storage.bucket(BUCKETS.videos).getFiles();
      videosCount = videoFiles.length;
      for (const file of videoFiles) {
        const [metadata] = await file.getMetadata();
        totalSize += parseInt(String(metadata.size || '0'));
      }

      // Get audio files stats
      const [audioFiles] = await storage.bucket(BUCKETS.audio).getFiles();
      audioCount = audioFiles.length;
      for (const file of audioFiles) {
        const [metadata] = await file.getMetadata();
        totalSize += parseInt(String(metadata.size || '0'));
      }

      return {
        videosCount,
        audioCount,
        totalSize
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return { videosCount: 0, audioCount: 0, totalSize: 0 };
    }
  }
} 