#!/usr/bin/env python3
"""
Test script for ChatterboxTTS RunPod Serverless Function with Supabase voices
"""

import requests
import json
import base64
import time
import os
from fetch_voice_from_supabase import get_voice_by_name, get_voice_by_id, list_voices

# Configuration
RUNPOD_ENDPOINT = "https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/runsync"  # Replace with your actual endpoint
RUNPOD_API_KEY = "YOUR_API_KEY"  # Replace with your RunPod API key

def test_runpod_with_supabase_voice():
    """Test the RunPod serverless endpoint using voice from Supabase"""
    
    # Test data - 180-200 word script for comprehensive testing
    test_text = """
    Picture this: It's 3 AM, and I'm scrolling through TikTok when I stumble upon the most mind-blowing conspiracy theory I've ever heard. 
    Apparently, dolphins are actually alien spies sent to monitor our beach activities. I know, I know, it sounds crazy, but hear me out.
    
    Think about it - dolphins are incredibly intelligent, they communicate in ways we don't fully understand, and they're always watching us from the water. 
    Plus, have you ever seen a dolphin blink? Exactly. That's because they don't have eyelids like Earth creatures should.
    
    But here's where it gets really wild. My friend Jake, who works at SeaWorld, told me that dolphins there have been acting strange lately. 
    They keep forming perfect geometric patterns in the water, almost like they're transmitting signals. And get this - every time a new iPhone is released, 
    the dolphins get more active. Coincidence? I think not.
    
    Now I can't go to the beach without feeling like I'm being watched. Every time I see a dolphin, I wave, just in case they're reporting back to their mothership. 
    Better safe than sorry, right?
    """
    
    # List available voices
    print("🎵 Fetching voices from Supabase...")
    voices = list_voices()
    
    if not voices:
        print("❌ No voices found in Supabase. Please run upload_voices_to_supabase.py first.")
        return
    
    # Let user choose a voice
    print("\nAvailable voices:")
    for i, voice in enumerate(voices, 1):
        print(f"   {i}. {voice['name']} - {voice['description']}")
    
    try:
        choice = int(input(f"\nSelect voice (1-{len(voices)}): ").strip())
        if 1 <= choice <= len(voices):
            selected_voice = voices[choice - 1]
            print(f"✅ Selected: {selected_voice['name']}")
            
            # Get full voice data
            voice_data = get_voice_by_id(selected_voice['id'])
            if not voice_data:
                print("❌ Failed to fetch voice data")
                return
            
            voice_b64 = voice_data['voice_data']
            
        else:
            print("❌ Invalid selection")
            return
    except ValueError:
        print("❌ Invalid input")
        return
    
    # Prepare request payload
    payload = {
        "input": {
            "text": test_text.strip(),
            "voice_file": voice_b64,
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
    
    # Headers
    headers = {
        "Authorization": f"Bearer {RUNPOD_API_KEY}",
        "Content-Type": "application/json"
    }
    
    print("\n" + "="*50)
    print("🚀 Testing RunPod ChatterboxTTS Serverless Function...")
    print("="*50)
    print(f"📝 Text length: {len(test_text.strip())} characters")
    print(f"🎵 Voice: {voice_data['name']} ({voice_data['description']})")
    print(f"📄 Voice base64 length: {len(voice_b64)} characters")
    print("⏳ Sending request...")
    
    try:
        # Send request
        start_time = time.time()
        response = requests.post(RUNPOD_ENDPOINT, json=payload, headers=headers, timeout=300)
        end_time = time.time()
        
        print(f"⏱️  Request took: {end_time - start_time:.2f} seconds")
        print(f"📊 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Request successful!")
            print(f"📄 Response: {json.dumps(result, indent=2)}")
            
            # Save audio if present
            if "output" in result and "audio_base64" in result["output"]:
                audio_data = base64.b64decode(result["output"]["audio_base64"])
                output_file = f"test_output_{voice_data['name']}.wav"
                with open(output_file, "wb") as f:
                    f.write(audio_data)
                print(f"🎵 Audio saved to: {output_file}")
                
                # Save payload for easy Postman testing
                payload_file = f"postman_payload_{voice_data['name']}.json"
                with open(payload_file, "w") as f:
                    json.dump(payload, f, indent=2)
                print(f"📋 Postman payload saved to: {payload_file}")
            
        else:
            print(f"❌ Request failed with status {response.status_code}")
            print(f"📄 Response: {response.text}")
            
    except requests.exceptions.Timeout:
        print("⏰ Request timed out after 5 minutes")
    except requests.exceptions.RequestException as e:
        print(f"❌ Request error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

def quick_test_with_voice_name(voice_name):
    """Quick test using a specific voice name"""
    voice_data = get_voice_by_name(voice_name)
    if not voice_data:
        print(f"❌ Voice '{voice_name}' not found")
        return
    
    test_text = "This is a quick test of ChatterboxTTS with Supabase voice storage. The voice quality should be preserved through the base64 encoding and decoding process."
    
    # Prepare request payload
    payload = {
        "input": {
            "text": test_text,
            "voice_file": voice_data['voice_data'],
            "settings": {
                "exaggeration": 0.5,
                "cfg_weight": 0.5,
                "temperature": 0.8,
                "min_p": 0.05,
                "top_p": 1.0,
                "repetition_penalty": 1.2
            }
        }
    }
    
    headers = {
        "Authorization": f"Bearer {RUNPOD_API_KEY}",
        "Content-Type": "application/json"
    }
    
    print(f"🚀 Quick test with voice: {voice_data['name']}")
    print(f"📝 Text: {test_text}")
    
    try:
        response = requests.post(RUNPOD_ENDPOINT, json=payload, headers=headers, timeout=180)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Quick test successful!")
            
            if "output" in result and "audio_base64" in result["output"]:
                audio_data = base64.b64decode(result["output"]["audio_base64"])
                output_file = f"quick_test_{voice_data['name']}.wav"
                with open(output_file, "wb") as f:
                    f.write(audio_data)
                print(f"🎵 Audio saved to: {output_file}")
        else:
            print(f"❌ Quick test failed: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Quick test error: {e}")

def generate_all_postman_payloads():
    """Generate Postman payloads for all voices"""
    voices = list_voices()
    
    if not voices:
        print("❌ No voices found in Supabase")
        return
    
    test_text = """Picture this: It's 3 AM, and I'm scrolling through TikTok when I stumble upon the most mind-blowing conspiracy theory I've ever heard. Apparently, dolphins are actually alien spies sent to monitor our beach activities. I know, I know, it sounds crazy, but hear me out. Think about it - dolphins are incredibly intelligent, they communicate in ways we don't fully understand, and they're always watching us from the water. Plus, have you ever seen a dolphin blink? Exactly. That's because they don't have eyelids like Earth creatures should."""
    
    print("📋 Generating Postman payloads for all voices...")
    
    for voice in voices:
        voice_data = get_voice_by_id(voice['id'])
        if voice_data:
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
            
            filename = f"postman_payload_{voice_data['name']}.json"
            with open(filename, "w") as f:
                json.dump(payload, f, indent=2)
            
            print(f"✅ Generated: {filename}")
    
    print(f"\n🎉 All Postman payloads generated!")

def main():
    print("🧪 ChatterboxTTS RunPod Test with Supabase Voices")
    print("=" * 60)
    
    # Check if configuration is set
    if RUNPOD_ENDPOINT == "https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/runsync":
        print("⚠️  Please update RUNPOD_ENDPOINT with your actual endpoint URL")
        print("⚠️  Please update RUNPOD_API_KEY with your actual API key")
        print("\nMeanwhile, you can:")
        print("1. Generate Postman payloads for all voices")
        print("2. Upload voices to Supabase (run upload_voices_to_supabase.py)")
        
        choice = input("\nGenerate Postman payloads? (y/n): ").strip().lower()
        if choice == 'y':
            generate_all_postman_payloads()
        return
    
    # Interactive menu
    print("Choose an option:")
    print("1. Interactive voice test")
    print("2. Quick test with 'male_voice'")
    print("3. Quick test with 'female_voice'")
    print("4. Generate all Postman payloads")
    print("5. List available voices")
    
    choice = input("\nEnter your choice (1-5): ").strip()
    
    if choice == "1":
        test_runpod_with_supabase_voice()
    elif choice == "2":
        quick_test_with_voice_name("male_voice")
    elif choice == "3":
        quick_test_with_voice_name("female_voice")
    elif choice == "4":
        generate_all_postman_payloads()
    elif choice == "5":
        list_voices()
    else:
        print("❌ Invalid choice")

if __name__ == "__main__":
    main() 