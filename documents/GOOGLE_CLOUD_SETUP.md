# Google Cloud Storage Setup Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Create Project" 
3. Choose a project name (e.g., "brainrot-video-generator")
4. Note your **Project ID** (e.g., `brainrot-video-123456`)

### Step 2: Enable Cloud Storage API
1. In your project, go to "APIs & Services" > "Library"
2. Search for "Cloud Storage API"
3. Click "Enable"

### Step 3: Create Service Account
1. Go to "IAM & Admin" > "Service Accounts"
2. Click "Create Service Account"
3. Name: `storage-uploader`
4. Role: `Storage Admin`
5. Click "Done"

### Step 4: Generate Service Account Key
1. Click on your service account
2. Go to "Keys" tab
3. Click "Add Key" > "Create new key"
4. Choose "JSON" format
5. Download the JSON file
6. Save it as `google-cloud-key.json` in your project root

### Step 5: Add Environment Variables
Add these to your `.env.local` file:

```env
# Google Cloud Storage Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_KEY_FILE=./google-cloud-key.json

# Alternative: Use these if you prefer base64 encoded key
# GOOGLE_CLOUD_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
# GOOGLE_CLOUD_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nPrivate\nKey\nHere\n-----END PRIVATE KEY-----\n"

# Bucket names (will be auto-created)
GCS_VIDEOS_BUCKET=brainrot-generated-videos
GCS_AUDIO_BUCKET=brainrot-generated-audio
```

### Step 6: Secure Your Key File
Add to your `.gitignore`:
```
google-cloud-key.json
```

## 📊 Storage Benefits

- **Free Tier**: 5GB/month forever
- **File Size**: Up to 5TB per file (vs Supabase 50MB)
- **Speed**: Global CDN with edge locations
- **Cost**: ~$0.02/GB after free tier
- **Reliability**: 99.999999999% durability

## 🔧 Testing Setup

After setup, your app will automatically:
1. Create storage buckets on first use
2. Upload videos to Google Cloud Storage
3. Serve public URLs directly from GCS
4. Handle all file operations seamlessly

## 🚨 Security Notes

- Never commit your `google-cloud-key.json` file
- Use IAM roles with minimal required permissions
- Consider using environment variables for production
- Rotate service account keys periodically

## 💡 Bucket Configuration

The buckets will be created with:
- **Location**: US (configurable in code)
- **Storage Class**: Standard
- **Public Access**: Enabled for direct file serving
- **Uniform Access**: Enabled for security

## 🆘 Troubleshooting

**Error: "Project not found"**
- Verify your `GOOGLE_CLOUD_PROJECT_ID` in `.env.local`

**Error: "Permission denied"**
- Ensure service account has `Storage Admin` role
- Check that Cloud Storage API is enabled

**Error: "Key file not found"**
- Verify path to `google-cloud-key.json`
- Or use the base64 environment variable method

**Buckets not created automatically?**
- Service account needs `Storage Admin` role
- Check console logs for detailed error messages 