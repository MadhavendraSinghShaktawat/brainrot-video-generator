import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth-helpers';
import { upsertTimeline, supabaseAdmin } from '@/lib/db';
import { timelineSchema } from '@/types/timeline';
import { z } from 'zod';

// Schema for timeline creation request
const createTimelineSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  data: timelineSchema,
});

/**
 * POST /api/timelines - Create a new timeline
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { user, error: authError } = await authenticateUser(request);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || 'Authentication failed' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const validationResult = createTimelineSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid timeline data', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    const { title, data } = validationResult.data;

    // Create timeline in database
    const result = await upsertTimeline({
      user_id: user.id,
      title,
      data,
    });

    if (result.error) {
      console.error('Database error:', result.error);
      return NextResponse.json(
        { error: 'Failed to create timeline' },
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
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating timeline:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create timeline', 
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/timelines - List user's timelines
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { user, error: authError } = await authenticateUser(request);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || 'Authentication failed' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'updated_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build query
    let query = supabaseAdmin
      .from('timelines')
      .select('id, title, data, created_at, updated_at, user_id')
      .eq('user_id', user.id);

    // Add search filter
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    // Add sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Add pagination
    query = query.range(offset, offset + limit - 1);

    const { data: timelines, error: queryError, count } = await query;

    if (queryError) {
      console.error('Database error:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch timelines' },
        { status: 500 }
      );
    }

    // Get total count for pagination
    const { count: totalCount } = await supabaseAdmin
      .from('timelines')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    return NextResponse.json({
      success: true,
      timelines: timelines || [],
      pagination: {
        total: totalCount || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (totalCount || 0),
      },
    });

  } catch (error) {
    console.error('Error fetching timelines:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch timelines', 
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 