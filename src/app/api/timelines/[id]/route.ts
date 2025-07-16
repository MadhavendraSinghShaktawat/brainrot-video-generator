import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth-helpers';
import { upsertTimeline, fetchTimeline, supabaseAdmin } from '@/lib/db';
import { timelineSchema } from '@/types/timeline';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// Schema for timeline update request
const updateTimelineSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  data: timelineSchema.optional(),
});

/**
 * GET /api/timelines/[id] - Load a specific timeline
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Authenticate user
    const { user, error: authError } = await authenticateUser(request);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || 'Authentication failed' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    // Fetch timeline from database
    const result = await fetchTimeline(id);
    
    if (result.error) {
      console.error('Database error:', result.error);
      return NextResponse.json(
        { error: 'Timeline not found' },
        { status: 404 }
      );
    }

    // Check if user owns this timeline
    if (result.data.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      timeline: {
        id: result.data.id,
        title: result.data.title,
        data: result.data.data,
        created_at: result.data.created_at,
        updated_at: result.data.updated_at,
      }
    });

  } catch (error) {
    console.error('Error fetching timeline:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch timeline', 
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/timelines/[id] - Update a specific timeline
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Authenticate user
    const { user, error: authError } = await authenticateUser(request);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || 'Authentication failed' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    // First, check if timeline exists and user owns it
    const existingResult = await fetchTimeline(id);
    
    if (existingResult.error) {
      return NextResponse.json(
        { error: 'Timeline not found' },
        { status: 404 }
      );
    }

    if (existingResult.data.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateTimelineSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid timeline data', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    const updates = validationResult.data;

    // Update timeline in database
    const result = await upsertTimeline({
      id,
      user_id: user.id,
      title: updates.title || existingResult.data.title,
      data: updates.data || existingResult.data.data,
    });

    if (result.error) {
      console.error('Database error:', result.error);
      return NextResponse.json(
        { error: 'Failed to update timeline' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      timeline: {
        id: result.data.id,
        title: result.data.title,
        data: result.data.data,
        created_at: result.data.created_at,
        updated_at: result.data.updated_at,
      }
    });

  } catch (error) {
    console.error('Error updating timeline:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to update timeline', 
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/timelines/[id] - Delete a specific timeline
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Authenticate user
    const { user, error: authError } = await authenticateUser(request);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || 'Authentication failed' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    // First, check if timeline exists and user owns it
    const existingResult = await fetchTimeline(id);
    
    if (existingResult.error) {
      return NextResponse.json(
        { error: 'Timeline not found' },
        { status: 404 }
      );
    }

    if (existingResult.data.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Delete timeline from database
    const { error: deleteError } = await supabaseAdmin
      .from('timelines')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Database error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete timeline' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Timeline deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting timeline:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to delete timeline', 
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 