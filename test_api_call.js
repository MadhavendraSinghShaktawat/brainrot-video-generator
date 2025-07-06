const fetch = require('node-fetch');

async function testVoiceGeneration() {
  try {
    console.log('Testing voice generation API...');
    
    const response = await fetch('http://localhost:3000/api/generate-voice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: "Hello world. This is a short test.",
        voice_id: "man1",
        settings: {
          exaggeration: 0.5,
          cfg_weight: 0.5,
          temperature: 0.8
        }
      })
    });

    console.log('Response status:', response.status);
    const result = await response.json();
    console.log('Response body:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testVoiceGeneration(); 