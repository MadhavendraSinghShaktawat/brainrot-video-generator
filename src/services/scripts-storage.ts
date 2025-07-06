import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { GeneratedScript } from '@/types/database';

export class ScriptsStorageService {
  /**
   * Check if a script exists for a given idea
   */
  static async getScriptByIdeaId(
    ideaId: string, 
    userId: string, 
    supabaseClient?: SupabaseClient
  ): Promise<GeneratedScript | null> {
    try {
      const client = supabaseClient || supabase;
      const { data, error } = await client
        .from('generated_scripts')
        .select('*')
        .eq('idea_id', ideaId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching script:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error checking script existence:', error);
      return null;
    }
  }

  /**
   * Get all scripts for a user
   */
  static async getUserScripts(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      ideaId?: string;
    } = {},
    supabaseClient?: SupabaseClient
  ): Promise<{ scripts: GeneratedScript[]; total: number }> {
    try {
      const client = supabaseClient || supabase;
      const { limit = 20, offset = 0, ideaId } = options;

      let query = client
        .from('generated_scripts')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      if (ideaId) {
        query = query.eq('idea_id', ideaId);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        scripts: data || [],
        total: count || 0
      };
    } catch (error) {
      console.error('Error fetching user scripts:', error);
      throw new Error('Failed to fetch scripts from database');
    }
  }

  /**
   * Delete a script
   */
  static async deleteScript(
    scriptId: string, 
    userId: string, 
    supabaseClient?: SupabaseClient
  ): Promise<boolean> {
    try {
      const client = supabaseClient || supabase;
      const { error } = await client
        .from('generated_scripts')
        .delete()
        .eq('id', scriptId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting script:', error);
      throw new Error('Failed to delete script');
    }
  }

  /**
   * Update script favorite status
   */
  static async toggleScriptFavorite(
    scriptId: string, 
    userId: string,
    supabaseClient?: SupabaseClient
  ): Promise<GeneratedScript | null> {
    try {
      const client = supabaseClient || supabase;
      
      // First get current favorite status
      const { data: script, error: fetchError } = await client
        .from('generated_scripts')
        .select('is_favorite')
        .eq('id', scriptId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !script) throw new Error('Script not found');

      // Update favorite status
      const { data: updatedScript, error: updateError } = await client
        .from('generated_scripts')
        .update({ is_favorite: !script.is_favorite })
        .eq('id', scriptId)
        .eq('user_id', userId)
        .select('*')
        .single();

      if (updateError) throw updateError;
      return updatedScript;
    } catch (error) {
      console.error('Error toggling script favorite:', error);
      throw new Error('Failed to toggle script favorite status');
    }
  }
} 