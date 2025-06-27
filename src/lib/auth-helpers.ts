import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { User, SupabaseClient } from '@supabase/supabase-js';

export interface AuthResult {
  user: User | null;
  error: string | null;
  supabase: SupabaseClient | null;
}

/**
 * Authenticate user from cookies in API routes (Next.js SSR pattern)
 */
export async function authenticateUser(request: NextRequest): Promise<AuthResult> {
  try {
    // Create Supabase client with cookies
    const supabase = await createClient();
    
    // Get the user from the session (which uses cookies)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Auth error:', authError);
      return {
        user: null,
        error: `Authentication error: ${authError.message}`,
        supabase: null
      };
    }
    
    if (!user) {
      return {
        user: null,
        error: 'User not authenticated',
        supabase: null
      };
    }

    return {
      user,
      error: null,
      supabase
    };

  } catch (error) {
    console.error('Authentication helper error:', error);
    return {
      user: null,
      error: 'Authentication failed',
      supabase: null
    };
  }
} 