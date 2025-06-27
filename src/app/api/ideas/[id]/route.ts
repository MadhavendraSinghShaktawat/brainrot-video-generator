import { NextRequest, NextResponse } from 'next/server';
import { IdeasStorageService } from '@/services/ideas-storage';
import { authenticateUser } from '@/lib/auth-helpers';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Authenticate user
    const { user, error: authError, supabase: supabaseClient } = await authenticateUser(request);
    
    if (authError || !user || !supabaseClient) {
      return NextResponse.json(
        { error: authError || 'Authentication failed' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const idea = await IdeasStorageService.getIdeaById(id, user.id, supabaseClient);
    
    if (!idea) {
      return NextResponse.json(
        { error: 'Idea not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      idea
    });

  } catch (error) {
    console.error('Error fetching idea:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch idea', 
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Authenticate user
    const { user, error: authError, supabase: supabaseClient } = await authenticateUser(request);
    
    if (authError || !user || !supabaseClient) {
      return NextResponse.json(
        { error: authError || 'Authentication failed' },
        { status: 401 }
      );
    }

    const updates = await request.json();
    const { id } = await params;
    
    const updatedIdea = await IdeasStorageService.updateIdea(id, user.id, updates, supabaseClient);
    
    if (!updatedIdea) {
      return NextResponse.json(
        { error: 'Idea not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      idea: updatedIdea
    });

  } catch (error) {
    console.error('Error updating idea:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to update idea', 
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Authenticate user
    const { user, error: authError, supabase: supabaseClient } = await authenticateUser(request);
    
    if (authError || !user || !supabaseClient) {
      return NextResponse.json(
        { error: authError || 'Authentication failed' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const success = await IdeasStorageService.deleteIdea(id, user.id, supabaseClient);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Idea not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Idea deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting idea:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to delete idea', 
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 