import { NextRequest, NextResponse } from 'next/server';
import { IdeasStorageService } from '@/services/ideas-storage';
import { authenticateUser } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { user, error: authError, supabase: supabaseClient } = await authenticateUser(request);
    
    if (authError || !user || !supabaseClient) {
      return NextResponse.json(
        { error: authError || 'Authentication failed' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const favoriteOnly = searchParams.get('favoriteOnly') === 'true';
    const sortBy = (searchParams.get('sortBy') || 'created_at') as 'created_at' | 'title';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    const search = searchParams.get('search');

    let result;
    
    if (search) {
      // Search ideas
      const ideas = await IdeasStorageService.searchIdeas(user.id, search, limit, supabaseClient);
      result = { ideas, total: ideas.length };
    } else {
      // Get paginated ideas
      result = await IdeasStorageService.getUserIdeas(user.id, {
        limit,
        offset,
        favoriteOnly,
        sortBy,
        sortOrder
      }, supabaseClient);
    }

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Error in ideas API:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch ideas', 
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 