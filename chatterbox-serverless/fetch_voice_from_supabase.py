#!/usr/bin/env python3
"""
Fetch voice files from Supabase for testing ChatterboxTTS
"""

import json
import requests
import sys

# Supabase configuration
SUPABASE_URL = "https://ubkxluzhunwuiuggyszs.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVia3hsdXpodW53dWl1Z2d5c3pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjY3MjMsImV4cCI6MjA2NDkwMjcyM30.Jve1SoYDvGS_6ho_FsDzw4QNd6m3_fNhtZrMoiCJyo0"

def list_voices():
    """List all available voices in Supabase"""
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
        print(f"\n📋 Available voices in Supabase ({len(voices)}):")
        for i, voice in enumerate(voices, 1):
            print(f"   {i}. 🎵 {voice['name']} - {voice['description']}")
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

def get_voice_by_id(voice_id):
    """Get voice file data by ID"""
    headers = {
        'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
    }
    
    response = requests.get(
        f'{SUPABASE_URL}/rest/v1/voice_files?id=eq.{voice_id}&select=*',
        headers=headers
    )
    
    if response.status_code == 200:
        voices = response.json()
        if voices:
            return voices[0]
        else:
            print(f"❌ Voice with ID {voice_id} not found")
            return None
    else:
        print(f"❌ Failed to fetch voice: {response.status_code}")
        print(f"   Response: {response.text}")
        return None

def get_voice_by_name(voice_name):
    """Get voice file data by name"""
    headers = {
        'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
    }
    
    response = requests.get(
        f'{SUPABASE_URL}/rest/v1/voice_files?name=eq.{voice_name}&select=*',
        headers=headers
    )
    
    if response.status_code == 200:
        voices = response.json()
        if voices:
            return voices[0]
        else:
            print(f"❌ Voice with name '{voice_name}' not found")
            return None
    else:
        print(f"❌ Failed to fetch voice: {response.status_code}")
        print(f"   Response: {response.text}")
        return None

def generate_postman_payload(voice_data, test_text=None):
    """Generate a complete Postman payload with voice data"""
    if not test_text:
        test_text = """Picture this: It's 3 AM, and I'm scrolling through TikTok when I stumble upon the most mind-blowing conspiracy theory I've ever heard. Apparently, dolphins are actually alien spies sent to monitor our beach activities. I know, I know, it sounds crazy, but hear me out. Think about it - dolphins are incredibly intelligent, they communicate in ways we don't fully understand, and they're always watching us from the water. Plus, have you ever seen a dolphin blink? Exactly. That's because they don't have eyelids like Earth creatures should."""
    
    payload = {
        "input": {
            "text": test_text,
            "voice_file": voice_data['voice_data'],
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
    
    return payload

def main():
    print("🎵 Voice Files Fetcher for ChatterboxTTS Testing")
    print("=" * 60)
    
    # List all voices
    voices = list_voices()
    
    if not voices:
        print("❌ No voices found in Supabase")
        return
    
    # Interactive selection
    print("Choose an option:")
    print("1. Get voice by ID")
    print("2. Get voice by name")
    print("3. Generate Postman payload for a voice")
    print("4. Export all voices info")
    
    choice = input("\nEnter your choice (1-4): ").strip()
    
    if choice == "1":
        voice_id = input("Enter voice ID: ").strip()
        voice = get_voice_by_id(voice_id)
        
        if voice:
            print(f"\n✅ Found voice: {voice['name']}")
            print(f"   Description: {voice['description']}")
            print(f"   Base64 length: {len(voice['voice_data'])} characters")
            
            # Save base64 to file
            with open(f"voice_{voice['name']}_base64.txt", "w") as f:
                f.write(voice['voice_data'])
            print(f"   💾 Base64 saved to: voice_{voice['name']}_base64.txt")
    
    elif choice == "2":
        voice_name = input("Enter voice name: ").strip()
        voice = get_voice_by_name(voice_name)
        
        if voice:
            print(f"\n✅ Found voice: {voice['name']}")
            print(f"   Description: {voice['description']}")
            print(f"   Base64 length: {len(voice['voice_data'])} characters")
            
            # Save base64 to file
            with open(f"voice_{voice['name']}_base64.txt", "w") as f:
                f.write(voice['voice_data'])
            print(f"   💾 Base64 saved to: voice_{voice['name']}_base64.txt")
    
    elif choice == "3":
        print("\nAvailable voices:")
        for i, voice in enumerate(voices, 1):
            print(f"   {i}. {voice['name']} - {voice['description']}")
        
        try:
            voice_num = int(input(f"\nSelect voice (1-{len(voices)}): ").strip())
            if 1 <= voice_num <= len(voices):
                selected_voice = voices[voice_num - 1]
                
                # Get full voice data
                voice_data = get_voice_by_id(selected_voice['id'])
                
                if voice_data:
                    payload = generate_postman_payload(voice_data)
                    
                    # Save payload to file
                    filename = f"postman_payload_{voice_data['name']}.json"
                    with open(filename, "w") as f:
                        json.dump(payload, f, indent=2)
                    
                    print(f"\n✅ Postman payload generated!")
                    print(f"   Voice: {voice_data['name']}")
                    print(f"   Base64 length: {len(voice_data['voice_data'])} characters")
                    print(f"   💾 Payload saved to: {filename}")
                    print(f"\n📋 Import this file into Postman or copy the JSON content")
            else:
                print("❌ Invalid selection")
        except ValueError:
            print("❌ Invalid input")
    
    elif choice == "4":
        # Export all voices info
        voices_info = []
        for voice in voices:
            voices_info.append({
                'id': voice['id'],
                'name': voice['name'],
                'description': voice['description'],
                'file_size': voice['file_size'],
                'duration': voice['duration'],
                'created_at': voice['created_at']
            })
        
        with open("voices_info.json", "w") as f:
            json.dump(voices_info, f, indent=2)
        
        print(f"\n✅ Voices info exported to: voices_info.json")
        print(f"   Total voices: {len(voices_info)}")
        
        # Also create a simple mapping file
        with open("voice_ids.txt", "w") as f:
            f.write("# Voice IDs for testing\n")
            f.write("# Copy these IDs to use in your test scripts\n\n")
            for voice in voices:
                f.write(f"# {voice['name']}: {voice['id']}\n")
        
        print(f"   💾 Voice IDs saved to: voice_ids.txt")
    
    else:
        print("❌ Invalid choice")

def get_voice_for_testing(voice_name_or_id):
    """Utility function to get voice data for testing scripts"""
    # Try by name first
    voice = get_voice_by_name(voice_name_or_id)
    if not voice:
        # Try by ID
        voice = get_voice_by_id(voice_name_or_id)
    
    if voice:
        return voice['voice_data']
    else:
        print(f"❌ Voice '{voice_name_or_id}' not found")
        return None

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Command line usage
        voice_identifier = sys.argv[1]
        voice_data = get_voice_for_testing(voice_identifier)
        if voice_data:
            print(voice_data)
    else:
        # Interactive mode
        main() 