import { inngest } from '@/lib/inngest';
import { ScriptGeneratorService } from '@/services/script-generator';
import { createClient } from '@/lib/supabase-server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { IdeasStorageService } from '@/services/ideas-storage';

// Helper function to create service client that bypasses RLS for automated processes
function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const redditStoryAutomation = inngest.createFunction(
  { id: 'reddit-story-automation' },
  { event: 'automation.reddit-story.process' as any },
  async ({ event, step }) => {
    const { 
      automationId, 
      stepId, 
      ideaId,
      idea,
      voiceId, 
      backgroundVideo,
      stepNumber,
      totalSteps,
      userId
    } = event.data;

    console.log(`🤖 Processing automation step ${stepNumber}/${totalSteps}: "${idea.title}"`);

    // Step 1: Save Idea to Database (Required for foreign key constraint)
    const savedIdeaId = await step.run('save-idea', async () => {
      console.log(`💡 Saving idea to database: "${idea.title}"`);
      
      try {
        // Use service client to save idea (bypasses RLS)
        const supabase = createServiceClient();
        
        // Save the idea to database first (required for foreign key)
        const savedIdeas = await IdeasStorageService.saveIdeas(
          [idea], // Array of ideas
          userId, // Use the real user ID from the automation request
          {
            count: 1,
            tone: 'dramatic',
            length: 'medium',
            themes: ['reddit-stories']
          },
          supabase // Use service client
        );

        if (!savedIdeas || savedIdeas.length === 0) {
          throw new Error('Failed to save idea to database');
        }

        console.log(`✅ Idea saved to database: ${savedIdeas[0].id}`);
        return savedIdeas[0].id;

      } catch (error) {
        console.error('❌ Idea saving failed:', error);
        throw error;
      }
    });

    // Step 2: Generate Script
    const scriptId = await step.run('generate-script', async () => {
      console.log(`📝 Generating script for: "${idea.title}"`);
      
      try {
        // Get the saved idea from database (needed for script generation)
        const supabase = createServiceClient();
        const { data: savedIdea, error: ideaError } = await supabase
          .from('generated_ideas')
          .select('*')
          .eq('id', savedIdeaId)
          .single();

        if (ideaError || !savedIdea) {
          throw new Error(`Failed to get saved idea: ${ideaError?.message}`);
        }

        const scriptData = await ScriptGeneratorService.generateScript(savedIdea, {
          ideaId: savedIdeaId,
          style: 'reddit',
          length: 'medium'
        });

        // Save script to database using service client (bypasses RLS)
        const { data: savedScript, error: scriptError } = await supabase
          .from('generated_scripts')
          .insert({
            ...scriptData,
            user_id: userId // Use the real user ID from the automation request
          })
          .select()
          .single();

        if (scriptError) {
          console.error('❌ Script save error details:', scriptError);
          throw new Error(`Failed to save script: ${scriptError.message || JSON.stringify(scriptError)}`);
        }

        if (!savedScript) {
          throw new Error('Script saved but no data returned');
        }

        console.log(`✅ Script generated and saved: ${savedScript.id}`);
        console.log(`📝 Script content length: ${scriptData.script_content?.length || 0} chars`);
        return savedScript.id;

      } catch (error) {
        console.error('❌ Script generation failed:', error);
        throw error;
      }
    });

    // Step 3: Generate Voice (Asynchronous approach)
    const audioUrl = await step.run('generate-voice', async () => {
      console.log(`🎤 Generating voice for script: ${scriptId}`);
      
      try {
        // Get the script content using service client
        const supabase = createServiceClient();
        console.log(`🔍 Looking for script with ID: ${scriptId}`);
        
        const { data: script, error: scriptQueryError } = await supabase
          .from('generated_scripts')
          .select('script_content, audio_url')
          .eq('id', scriptId)
          .single();

        if (scriptQueryError) {
          console.error('❌ Script query error:', scriptQueryError);
          throw new Error(`Script query failed: ${scriptQueryError.message}`);
        }

        if (!script) {
          console.error('❌ Script not found in database. Checking all scripts...');
          // Debug: List all recent scripts
          const { data: allScripts } = await supabase
            .from('generated_scripts')
            .select('id, created_at')
            .order('created_at', { ascending: false })
            .limit(5);
          console.log('Recent scripts:', allScripts);
          throw new Error(`Script not found with ID: ${scriptId}`);
        }

        console.log(`✅ Script found, content length: ${script.script_content?.length || 0} chars`);

        // Check if audio already exists
        if (script.audio_url) {
          console.log(`🎵 Audio already exists: ${script.audio_url}`);
          return script.audio_url;
        }

        console.log(`🎙️ Starting voice generation for ${script.script_content.length} characters...`);

        // Start voice generation asynchronously (don't wait for response)
        const voicePromise = fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/generate-voice`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            script_id: scriptId,
            text: script.script_content,
            voice_id: voiceId,
            settings: {
              exaggeration: 0.5,
              cfg_weight: 0.5,
              temperature: 0.8
            }
          })
        }).catch(error => {
          console.error('❌ Voice generation started but may have timed out:', error);
          // Don't throw here - we'll poll the database instead
          return null;
        });

        console.log('🚀 Voice generation started, polling database for completion...');

        // Poll the database for completion (instead of waiting for HTTP response)
        let audioUrl = null;
        let attempts = 0;
        const maxAttempts = 120; // 30 minutes max (15 second intervals)
        
        while (!audioUrl && attempts < maxAttempts) {
          // Wait before checking
          await new Promise(resolve => setTimeout(resolve, 15000)); // 15 seconds
          
          // Check if audio is ready with more robust query
          const { data: updatedScript, error: pollError } = await supabase
            .from('generated_scripts')
            .select('audio_url, updated_at')
            .eq('id', scriptId)
            .single();

          if (pollError) {
            console.error(`❌ Polling error: ${pollError.message}`);
          } else {
            console.log(`🔍 Polling check ${attempts + 1}: audio_url = ${updatedScript?.audio_url ? 'EXISTS' : 'NULL'}`);
            
            if (updatedScript?.audio_url) {
              audioUrl = updatedScript.audio_url;
              console.log(`✅ Voice generation completed: ${audioUrl}`);
              break;
            }
          }
          
          attempts++;
          console.log(`⏳ Waiting for voice generation... (${attempts}/${maxAttempts}) - ${attempts * 15}s elapsed`);
          
          // Add additional checks every 5 attempts (75 seconds)
          if (attempts % 5 === 0) {
            console.log(`🔍 Extended check - Script ID: ${scriptId}`);
            const { data: debugScript } = await supabase
              .from('generated_scripts')
              .select('id, audio_url, updated_at')
              .eq('id', scriptId)
              .single();
            console.log(`🔍 Debug script data:`, debugScript);
          }
        }

        if (!audioUrl) {
          // Try to get the result from the HTTP response if it's still pending
          try {
            const voiceResponse = await Promise.race([
              voicePromise,
              new Promise((_, reject) => setTimeout(() => reject(new Error('Final timeout')), 30000))
            ]) as Response | null;
            
            if (voiceResponse && voiceResponse.ok) {
        const voiceResult = await voiceResponse.json();
              if (voiceResult.audio_url) {
                console.log(`🎵 Got audio URL from HTTP response: ${voiceResult.audio_url}`);
        return voiceResult.audio_url;
              }
            }
          } catch (error) {
            console.error('❌ HTTP response also failed:', error);
          }
          
          throw new Error('Voice generation timed out after 30 minutes');
        }

        return audioUrl;

      } catch (error) {
        console.error('❌ Voice generation failed:', error);
        throw error;
      }
    });

    // Step 4: Generate Video
    const videoUrl = await step.run('generate-video', async () => {
      console.log(`🎥 Generating video for script: ${scriptId}`);
      
      try {
        // Get the script content for video generation using service client
        const supabase = createServiceClient();
        const { data: script } = await supabase
          .from('generated_scripts')
          .select('script_content')
          .eq('id', scriptId)
          .single();

        if (!script) {
          throw new Error('Script not found');
        }

        // Trigger video generation
        const videoEvent = await inngest.send({
          name: 'video.generation.requested',
          data: {
            scriptId,
            audioUrl,
            backgroundVideo,
            scriptContent: script.script_content,
            userId: userId // Use the real user ID from the automation request
          }
        });

        console.log(`✅ Video generation triggered: ${videoEvent.ids[0]}`);
        
        // Wait for video generation to complete (simplified polling)
        let videoUrl = null;
        let attempts = 0;
        const maxAttempts = 15; // 2.5 minutes (10 seconds * 15)
        
        while (!videoUrl && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
          
          // Check if video is ready using service client
          const supabaseCheck = createServiceClient();
          const { data: videos } = await supabaseCheck
            .from('generated_videos')
            .select('video_url')
            .eq('script_id', scriptId)
            .limit(1);

          if (videos && videos.length > 0) {
            videoUrl = videos[0].video_url;
            console.log(`✅ Video ready: ${videoUrl}`);
            break;
          }
          
          attempts++;
          console.log(`⏳ Waiting for video... (${attempts}/${maxAttempts})`);
        }

        if (!videoUrl) {
          throw new Error('Video generation timed out');
        }

        return videoUrl;

      } catch (error) {
        console.error('❌ Video generation failed:', error);
        throw error;
      }
    });

    // Step 5: Complete automation
    await step.run('complete-automation', async () => {
      console.log(`🎉 Automation step ${stepNumber}/${totalSteps} completed!`);
      console.log(`📝 Script ID: ${scriptId}`);
      console.log(`🎤 Audio: ${audioUrl}`);
      console.log(`🎥 Video: ${videoUrl}`);

      return { success: true, scriptId, audioUrl, videoUrl };
    });

    console.log(`✅ Reddit story automation step ${stepNumber}/${totalSteps} completed successfully!`);
    return {
      success: true,
      stepId,
      scriptId,
      audioUrl,
      videoUrl
    };
  }
); 