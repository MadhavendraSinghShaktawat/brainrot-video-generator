#!/usr/bin/env python3
"""
Upload voice files to Supabase for easy testing
"""

import base64
import os
import wave
import numpy as np
import json
import requests
from pathlib import Path

# Supabase configuration
SUPABASE_URL = "https://ubkxluzhunwuiuggyszs.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVia3hsdXpodW53dWl1Z2d5c3pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjY3MjMsImV4cCI6MjA2NDkwMjcyM30.Jve1SoYDvGS_6ho_FsDzw4QNd6m3_fNhtZrMoiCJyo0"

def create_test_voice_files():
    """Create test voice files if they don't exist"""
    voices = [
        {"name": "male_voice", "frequency": 150, "description": "Deep male voice"},
        {"name": "female_voice", "frequency": 300, "description": "High female voice"}
    ]
    
    created_files = []
    
    for voice in voices:
        filename = f"{voice['name']}.wav"
        if not os.path.exists(filename):
            print(f"Creating test voice: {filename}")
            
            # Create a simple voice with varying pitch
            sample_rate = 24000
            duration = 2.0
            
            # Generate a more complex sound that resembles speech
            t = np.linspace(0, duration, int(sample_rate * duration))
            
            # Base frequency with some variation
            base_freq = voice['frequency']
            
            # Create a speech-like pattern with multiple harmonics
            audio_data = np.zeros_like(t)
            
            # Add harmonics for more realistic voice
            for harmonic in [1, 2, 3, 4]:
                freq = base_freq * harmonic
                amplitude = 1.0 / harmonic  # Decreasing amplitude for higher harmonics
                
                # Add some frequency modulation for more natural sound
                modulation = np.sin(2 * np.pi * 5 * t) * 0.1  # 5Hz modulation
                freq_modulated = freq * (1 + modulation)
                
                audio_data += amplitude * np.sin(2 * np.pi * freq_modulated * t)
            
            # Apply envelope for more natural sound
            envelope = np.exp(-t * 0.3)  # Gentle decay
            audio_data *= envelope
            
            # Normalize and convert to 16-bit PCM
            audio_data = audio_data / np.max(np.abs(audio_data))
            audio_data = (audio_data * 32767 * 0.8).astype(np.int16)
            
            # Save as WAV file
            with wave.open(filename, 'w') as wav_file:
                wav_file.setnchannels(1)  # Mono
                wav_file.setsampwidth(2)  # 16-bit
                wav_file.setframerate(sample_rate)
                wav_file.writeframes(audio_data.tobytes())
            
            created_files.append(filename)
            print(f"✅ Created {filename}")
    
    return created_files

def get_audio_duration(file_path):
    """Get duration of audio file"""
    try:
        with wave.open(file_path, 'r') as wav_file:
            frames = wav_file.getnframes()
            rate = wav_file.getframerate()
            duration = frames / float(rate)
            return duration
    except:
        return None

def upload_voice_to_supabase(file_path, name, description):
    """Upload a voice file to Supabase"""
    try:
        # Read and encode file
        with open(file_path, 'rb') as f:
            file_data = f.read()
            voice_b64 = base64.b64encode(file_data).decode('utf-8')
        
        # Get file info
        file_size = len(file_data)
        duration = get_audio_duration(file_path)
        
        # Detect file type
        file_ext = Path(file_path).suffix.lower()
        mime_type = {
            '.wav': 'audio/wav',
            '.mp3': 'audio/mpeg',
            '.m4a': 'audio/mp4',
            '.flac': 'audio/flac'
        }.get(file_ext, 'audio/wav')
        
        # Prepare data for Supabase
        data = {
            'name': name,
            'description': description,
            'voice_data': voice_b64,
            'file_type': mime_type,
            'file_size': file_size,
            'duration': duration,
            'sample_rate': 24000  # Default sample rate
        }
        
        # Upload to Supabase
        headers = {
            'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY
        }
        
        response = requests.post(
            f'{SUPABASE_URL}/rest/v1/voice_files',
            headers=headers,
            json=data
        )
        
        if response.status_code == 201:
            result = response.json()
            print(f"✅ Uploaded {name}: {result}")
            return result
        else:
            print(f"❌ Failed to upload {name}: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Error uploading {name}: {e}")
        return None

def list_existing_voices():
    """List existing voices in Supabase"""
    headers = {
        'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
    }
    
    response = requests.get(
        f'{SUPABASE_URL}/rest/v1/voice_files?select=id,name,description,file_size,duration,created_at',
        headers=headers
    )
    
    if response.status_code == 200:
        voices = response.json()
        print(f"\n📋 Existing voices in Supabase ({len(voices)}):")
        for voice in voices:
            print(f"   🎵 {voice['name']} - {voice['description']}")
            print(f"      ID: {voice['id']}")
            print(f"      Size: {voice['file_size']} bytes")
            print(f"      Duration: {voice['duration']:.2f}s" if voice['duration'] else "Duration: Unknown")
            print(f"      Created: {voice['created_at']}")
            print()
        return voices
    else:
        print(f"❌ Failed to list voices: {response.status_code}")
        print(f"   Response: {response.text}")
        return []

def main():
    print("🎵 Voice Files Upload to Supabase")
    print("=" * 50)
    
    # List existing voices
    existing_voices = list_existing_voices()
    existing_names = [v['name'] for v in existing_voices]
    
    # Create test voice files if needed
    created_files = create_test_voice_files()
    
    # Define voice files to upload
    voice_files = [
        {
            'file': 'male_voice.wav',
            'name': 'male_voice',
            'description': 'Deep male voice for testing ChatterboxTTS'
        },
        {
            'file': 'female_voice.wav', 
            'name': 'female_voice',
            'description': 'High female voice for testing ChatterboxTTS'
        }
    ]
    
    # Add any existing voice files from common paths
    common_paths = [
        '../voices/man1.mp3',
        '../voices/man1.wav',
        'man1.mp3',
        'man1.wav',
        'voice.wav',
        'voice.mp3'
    ]
    
    for path in common_paths:
        if os.path.exists(path):
            name = Path(path).stem
            if name not in existing_names:
                voice_files.append({
                    'file': path,
                    'name': name,
                    'description': f'Voice file from {path}'
                })
    
    # Upload voices
    print(f"\n📤 Uploading {len(voice_files)} voice files...")
    uploaded_count = 0
    
    for voice in voice_files:
        if voice['name'] in existing_names:
            print(f"⏭️  Skipping {voice['name']} (already exists)")
            continue
            
        if os.path.exists(voice['file']):
            result = upload_voice_to_supabase(
                voice['file'],
                voice['name'],
                voice['description']
            )
            if result:
                uploaded_count += 1
        else:
            print(f"❌ File not found: {voice['file']}")
    
    print(f"\n🎉 Upload complete! {uploaded_count} new voices uploaded.")
    
    # List all voices again
    print("\n" + "=" * 50)
    list_existing_voices()
    
    # Generate test data for easy copy-paste
    print("📋 Voice IDs for testing:")
    final_voices = list_existing_voices()
    if final_voices:
        print("\n# Copy these IDs for your test scripts:")
        for voice in final_voices:
            print(f"# {voice['name']}: {voice['id']}")

if __name__ == "__main__":
    main() 