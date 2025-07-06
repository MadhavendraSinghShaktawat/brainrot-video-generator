# Voice References Directory

This directory contains voice reference files used for generating speech from scripts using the Chatterbox TTS system.

## How to Add Voices

1. **Record or obtain voice samples** (10-30 seconds each)
2. **Save in supported formats**: WAV, MP3, M4A, FLAC, or OGG
3. **Place files in this directory** (`voices/`)
4. **Use descriptive filenames** (e.g., `male-narrator.wav`, `female-energetic.mp3`)

## Voice File Requirements

### Audio Specifications
- **Duration**: 10-30 seconds (optimal for voice cloning)
- **Sample Rate**: 16kHz or 22kHz recommended
- **Channels**: Mono preferred (stereo will work)
- **Quality**: Clear speech without background noise
- **Content**: Natural speech, avoid music or sound effects

### Recommended Settings
- **Format**: WAV (uncompressed) for best quality
- **Bitrate**: 16-bit minimum
- **Speech**: Single speaker, clear pronunciation
- **Background**: Quiet environment, minimal noise

## File Naming Convention

Use descriptive names that help identify the voice characteristics:

```
male-deep-narrator.wav
female-youthful-energetic.mp3
british-accent-male.wav
american-female-calm.mp3
```

## How Voice Generation Works

1. **Voice Detection**: The system scans this directory for audio files
2. **Voice Selection**: Users can choose from available voices in the UI
3. **Preview**: Users can preview voices before generation
4. **TTS Generation**: The Chatterbox model uses your reference to clone the voice
5. **Output**: Generated audio is saved and downloadable

## System Requirements

### For Best Performance (GPU Acceleration)
- **NVIDIA GPU** with CUDA support
- **GPU Memory**: 4GB+ VRAM recommended
- **Processing**: ~1-2 seconds per sentence

### CPU-Only Mode
- **Processing**: ~5-10 seconds per sentence
- **Memory**: 8GB+ RAM recommended
- **Note**: Slower but still functional

## Troubleshooting

### No Voices Showing Up
- Check that files are in the correct format (WAV, MP3, etc.)
- Ensure files are directly in the `voices/` directory
- Restart the application after adding new files

### Poor Voice Quality
- Use higher quality source audio
- Ensure the reference voice is clear and noise-free
- Try voices with consistent tone and pace
- Avoid voices with heavy background music or effects

### Generation Fails
- Check system logs for detailed error messages
- Ensure the Chatterbox TTS model is properly installed
- Verify that Python dependencies are available
- Check GPU drivers if using GPU acceleration

## Example Voice Setup

```bash
voices/
├── README.md (this file)
├── narrator-male-deep.wav      # 22 seconds, clear male voice
├── narrator-female-warm.mp3    # 18 seconds, friendly female voice
├── energetic-young-male.wav    # 15 seconds, upbeat male voice
└── calm-british-female.mp3     # 25 seconds, British accent
```

## Security Note

- Only use voice samples you have permission to use
- Be aware of copyright and privacy considerations
- Consider the ethical implications of voice cloning
- The generated audio includes watermarking for responsible use

## Getting Voice Samples

### Free Sources
- Record your own voice
- Use public domain voice recordings
- Text-to-speech samples (as reference only)

### Professional Sources
- Voice actor recordings
- Royalty-free voice libraries
- Custom voice recordings

Remember: Always respect copyright and privacy rights when using voice samples. 