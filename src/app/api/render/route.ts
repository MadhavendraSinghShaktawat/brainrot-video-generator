import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database, RenderJobInsert } from '@/types/database';
import { inngest } from '@/lib/inngest';

interface RenderRequest {
  timeline_json: Record<string, any>;
  title?: string;
}

interface RenderResponse {
  success: boolean;
  job_id?: string;
  error?: string;
  message?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<RenderResponse>> {
  try {
    const body: RenderRequest = await request.json();
    const { timeline_json, title } = body;

    if (!timeline_json || typeof timeline_json !== 'object') {
      return NextResponse.json(
        { success: false, error: 'timeline_json is required and must be an object' },
        { status: 400 }
      );
    }

    // Get JWT token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authorization header with Bearer token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Initialize Supabase client with user's JWT token
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // Get user from JWT token
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Create render job in database
    const renderJob: RenderJobInsert = {
      user_id: user.id,
      timeline_json: timeline_json as any,
      status: 'pending',
    };

    const { data: job, error: insertError } = await supabase
      .from('render_jobs')
      .insert(renderJob)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating render job:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to create render job' },
        { status: 500 }
      );
    }

    // Job will be picked up by the render job poller (runs every 30 seconds)
    // No need to send an event here - the poller will automatically find and process pending jobs
    
    return NextResponse.json({
      success: true,
      job_id: job.id,
      message: 'Render job created and queued for processing',
    });
  } catch (error) {
    console.error('Error in render API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('job_id');

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'job_id parameter is required' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get user from session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get render job status
    const { data: job, error: jobError } = await supabase
      .from('render_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError) {
      console.error('Error fetching render job:', jobError);
      return NextResponse.json(
        { success: false, error: 'Render job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        result_url: job.result_url,
        error_message: job.error_message,
        created_at: job.created_at,
        updated_at: job.updated_at,
      },
    });
  } catch (error) {
    console.error('Error in render status API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 