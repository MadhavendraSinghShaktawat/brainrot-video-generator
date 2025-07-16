import { NextRequest, NextResponse } from 'next/server';
import { IdeaGeneratorService } from '@/services/idea-generator';
import { inngest } from '@/lib/inngest';
import { createClient } from '@/lib/supabase-server';
import { v4 as uuidv4 } from 'uuid';

interface AutomationRequest {
  niche: string;
  voiceId?: string;
  backgroundVideo?: 'subwaySurfer.mp4' | 'trackmania.mp4';
  count?: number;
}

interface AutomationResponse {
  success: boolean;
  automationId: string;
  message: string;
  estimatedTime: string;
  ideas?: any[];
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const body: AutomationRequest = await request.json();
    const { niche, voiceId = 'man1.mp3', backgroundVideo = 'subwaySurfer.mp4' } = body;
    const count = 1; // Force count to 1 to prevent resource overload

    if (!niche) {
      return NextResponse.json({
        success: false,
        error: 'Niche is required'
      }, { status: 400 });
    }

    const automationId = uuidv4();
    console.log(`🤖 Starting full automation for ${count} Reddit stories...`);
    console.log(`📊 Niche: ${niche}, Voice: ${voiceId}, Background: ${backgroundVideo}`);

    // Step 1: Generate Ideas
    console.log('🧠 Step 1: Generating ideas...');
    const ideaRequest = {
      count: 1, // Force exactly 1 idea to prevent resource overload
      tone: 'dramatic' as const,
      length: 'medium' as const,
      themes: [niche]
    };

    const allIdeas = await IdeaGeneratorService.generateIdeas(ideaRequest);
    // Take only the first idea to ensure we process exactly 1 video
    const ideas = allIdeas.slice(0, 1);
    console.log(`✅ Generated ${ideas.length} ideas (limited to 1 for resource management)`);

    // Step 2: Send each idea to Inngest for processing
    const automationPromises = ideas.map(async (idea, index) => {
      const stepId = `${automationId}-${index + 1}`;
      const ideaId = uuidv4();
      
      try {
        console.log(`🚀 Sending idea ${index + 1}/${ideas.length} to Inngest: "${idea.title}"`);

        // Send to Inngest for complete processing (script + voice + video)
        const automationEvent = await inngest.send({
          name: 'automation.reddit-story.process',
          data: {
            automationId,
            stepId,
            ideaId,
            idea: { ...idea, id: ideaId },
            voiceId,
            backgroundVideo,
            stepNumber: index + 1,
            totalSteps: ideas.length,
            userId: user.id // Pass the real user ID
          }
        } as any);

        console.log(`✅ Inngest event sent for step ${index + 1}: ${automationEvent.ids[0]}`);
        return {
          stepId,
          ideaId,
          ideaTitle: idea.title,
          status: 'processing',
          eventId: automationEvent.ids[0]
        };

      } catch (error) {
        console.error(`❌ Error sending idea ${index + 1} to Inngest:`, error);
        return {
          stepId,
          ideaId,
          ideaTitle: idea.title,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    const automationSteps = await Promise.all(automationPromises);
    
    // Calculate estimated time (voice gen + video gen per story)
    const estimatedMinutes = ideas.length * 3; // ~3 minutes per story
    const estimatedTime = estimatedMinutes < 60 
      ? `${estimatedMinutes} minutes`
      : `${Math.round(estimatedMinutes / 60)} hour${estimatedMinutes >= 120 ? 's' : ''}`;

    console.log(`🎉 Automation pipeline started for ${ideas.length} stories`);
    console.log(`⏱️ Estimated completion time: ${estimatedTime}`);

    return NextResponse.json({
      success: true,
      automationId,
      message: `Started full automation for ${ideas.length} Reddit stories`,
      estimatedTime,
      ideas: automationSteps.map((step, index) => ({
        id: step.ideaId,
        title: ideas[index].title,
        hook: ideas[index].hook
      })),
      steps: automationSteps
    });

  } catch (error) {
    console.error('❌ Full automation failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Automation failed'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const automationId = searchParams.get('automationId');

    if (!automationId) {
      return NextResponse.json({
        success: false,
        error: 'Automation ID is required'
      }, { status: 400 });
    }

    // Get scripts created by this automation for the authenticated user
    const { data: scripts, error: scriptsError } = await supabase
      .from('generated_scripts')
      .select(`
        id,
        title,
        created_at,
        audio_url,
        generated_videos!inner(
          id,
          video_url,
          duration,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .order('created_at');

    if (scriptsError) {
      throw new Error(`Failed to fetch automation status: ${scriptsError.message}`);
    }

    const status = scripts?.map(script => ({
      scriptId: script.id,
      title: script.title,
      hasAudio: !!script.audio_url,
      hasVideo: script.generated_videos?.length > 0,
      videoUrl: script.generated_videos?.[0]?.video_url,
      duration: script.generated_videos?.[0]?.duration,
      createdAt: script.created_at
    })) || [];

    const completed = status.filter(s => s.hasVideo).length;
    const total = status.length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return NextResponse.json({
      success: true,
      automationId,
      progress,
      completed,
      total,
      status,
      isComplete: completed === total && total > 0
    });

  } catch (error) {
    console.error('❌ Error fetching automation status:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch status'
    }, { status: 500 });
  }
} 