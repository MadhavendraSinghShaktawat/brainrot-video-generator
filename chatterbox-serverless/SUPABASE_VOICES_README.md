# 🎵 Supabase Voice Files System for ChatterboxTTS

This system stores voice files in Supabase as base64 encoded data, making it easy to test your ChatterboxTTS RunPod function without dealing with local file paths.

## 🚀 Quick Start

### 1. Upload Voices to Supabase
```bash
cd chatterbox-serverless
python upload_voices_to_supabase.py
```

This will:
- Create test voice files if none exist
- Upload them to your Supabase `voice_files` table
- Show you the voice IDs for testing

### 2. Test with Python
```bash
python test_runpod_with_supabase.py
```

Interactive testing with voice selection from Supabase.

### 3. Generate Postman Payloads
```bash
python fetch_voice_from_supabase.py
```

Choose option 3 to generate complete Postman payloads.

## 📁 Files Overview

| File | Purpose |
|------|---------|
| `upload_voices_to_supabase.py` | Upload voice files to Supabase |
| `fetch_voice_from_supabase.py` | Fetch voices and generate payloads |
| `test_runpod_with_supabase.py` | Test RunPod function with Supabase voices |
| `rp_handler.py` | RunPod handler with base64 fixes |

## 🗄️ Database Schema

```sql
CREATE TABLE voice_files (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  voice_data TEXT NOT NULL,        -- base64 encoded audio
  file_type TEXT NOT NULL,         -- MIME type
  file_size INTEGER NOT NULL,      -- original file size
  duration REAL,                   -- audio duration in seconds
  sample_rate INTEGER,             -- audio sample rate
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🔧 Usage Examples

### Upload Custom Voice File
```python
python upload_voices_to_supabase.py
# Place your voice files in the directory and they'll be detected
```

### Get Voice for Testing
```python
from fetch_voice_from_supabase import get_voice_by_name

voice_data = get_voice_by_name("male_voice")
print(f"Base64 length: {len(voice_data['voice_data'])}")
```

### Command Line Voice Fetch
```bash
# Get base64 for a specific voice
python fetch_voice_from_supabase.py male_voice
```

## 📋 Postman Testing

### Method 1: Use Generated Payloads
1. Run: `python fetch_voice_from_supabase.py`
2. Choose option 3
3. Import the generated JSON file into Postman

### Method 2: Manual Setup
```json
{
  "input": {
    "text": "Your test text here",
    "voice_file": "VOICE_BASE64_FROM_SUPABASE",
    "settings": {
      "exaggeration": 0.7,
      "cfg_weight": 0.5,
      "temperature": 0.8,
      "min_p": 0.05,
      "top_p": 1.0,
      "repetition_penalty": 1.2
    }
  }
}
```

**Headers:**
```
Authorization: Bearer YOUR_RUNPOD_API_KEY
Content-Type: application/json
```

**URL:** `https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/runsync`

## 🎯 Benefits

### ✅ Advantages
- **No local file dependencies** - Works from any machine
- **Easy Postman testing** - Generate payloads instantly
- **Centralized storage** - All team members can access same voices
- **Version control** - Track voice files with metadata
- **Base64 validation** - Automatic padding and format fixes

### 🔄 Workflow
1. **Upload** → Store voices in Supabase once
2. **Fetch** → Get voice data for testing
3. **Test** → Use in Python scripts or Postman
4. **Share** → Team members use same voice IDs

## 🛠️ Configuration

Update these in your scripts:

```python
# Supabase configuration (already set for here2order project)
SUPABASE_URL = "https://ubkxluzhunwuiuggyszs.supabase.co"
SUPABASE_ANON_KEY = "your_anon_key_here"

# RunPod configuration
RUNPOD_ENDPOINT = "https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/runsync"
RUNPOD_API_KEY = "your_runpod_api_key"
```

## 🚨 Troubleshooting

### Voice Not Found
```bash
python fetch_voice_from_supabase.py
# Check available voices first
```

### Base64 Padding Issues
The `rp_handler.py` automatically fixes padding issues:
- Removes data URL prefixes
- Adds missing padding characters
- Validates format before decoding

### Upload Fails
- Check Supabase connection
- Verify file exists and is readable
- Ensure voice file is valid audio format

## 📊 Voice Management

### List All Voices
```python
from fetch_voice_from_supabase import list_voices
voices = list_voices()
```

### Add New Voice
1. Place voice file in directory
2. Run `upload_voices_to_supabase.py`
3. Script auto-detects and uploads new files

### Delete Voice
Use Supabase dashboard or API:
```sql
DELETE FROM voice_files WHERE name = 'voice_name';
```

## 🔍 Testing Checklist

- [ ] Voices uploaded to Supabase
- [ ] RunPod function deployed with base64 fixes
- [ ] API credentials configured
- [ ] Test payloads generated
- [ ] Postman requests working
- [ ] Audio output validation

## 📈 Next Steps

1. **Deploy fixed RunPod function** with base64 improvements
2. **Upload your voice files** using the upload script
3. **Test with Supabase voices** using the new test script
4. **Use generated Postman payloads** for API testing
5. **Share voice IDs** with your team for consistent testing

The base64 padding issues should now be resolved with the improved `decode_voice_file()` function in `rp_handler.py`! 