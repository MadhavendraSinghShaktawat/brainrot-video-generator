import { supabase } from '@/lib/supabase';
import { GeneratedIdea, GeneratedIdeaInsert, GeneratedIdeaUpdate, UserIdeaStats } from '@/types/database';
import { StoryIdea, IdeaGenerationRequest } from '@/lib/openai';
import { SupabaseClient } from '@supabase/supabase-js';

export class IdeasStorageService {
  /**
   * Save generated ideas to Supabase
   */
  static async saveIdeas(
    ideas: StoryIdea[], 
    userId: string, 
    settings: IdeaGenerationRequest,
    supabaseClient?: SupabaseClient
  ): Promise<GeneratedIdea[]> {
    try {
      const ideasToInsert: GeneratedIdeaInsert[] = ideas.map(idea => ({
        user_id: userId,
        title: idea.title,
        hook: idea.hook,
        story: idea.story,
        viral_factors: idea.viralFactors,
        estimated_views: idea.estimatedViews,
        emotional_triggers: idea.emotionalTriggers,
        target_audience: idea.targetAudience,
        generation_settings: {
          tone: settings.tone || 'dramatic',
          length: settings.length || 'medium',
          count: settings.count,
          timestamp: new Date().toISOString()
        }
      }));

      const client = supabaseClient || supabase;
      const { data, error } = await client
        .from('generated_ideas')
        .insert(ideasToInsert)
        .select('*');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error saving ideas:', error);
      throw new Error('Failed to save ideas to database');
    }
  }

  /**
   * Get user's idea history with pagination
   */
  static async getUserIdeas(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      favoriteOnly?: boolean;
      sortBy?: 'created_at' | 'title';
      sortOrder?: 'asc' | 'desc';
    } = {},
    supabaseClient?: SupabaseClient
  ): Promise<{ ideas: GeneratedIdea[]; total: number }> {
    try {
      const { 
        limit = 20, 
        offset = 0, 
        favoriteOnly = false,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = options;

      const client = supabaseClient || supabase;
      let query = client
        .from('generated_ideas')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      if (favoriteOnly) {
        query = query.eq('is_favorite', true);
      }

      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        ideas: data || [],
        total: count || 0
      };
    } catch (error) {
      console.error('Error fetching user ideas:', error);
      throw new Error('Failed to fetch ideas from database');
    }
  }

  /**
   * Get a single idea by ID
   */
  static async getIdeaById(
    ideaId: string, 
    userId: string, 
    supabaseClient?: SupabaseClient
  ): Promise<GeneratedIdea | null> {
    try {
      const client = supabaseClient || supabase;
      const { data, error } = await client
        .from('generated_ideas')
        .select('*')
        .eq('id', ideaId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching idea:', error);
      return null;
    }
  }

  /**
   * Update an idea (toggle favorite, mark as used, etc.)
   */
  static async updateIdea(
    ideaId: string, 
    userId: string, 
    updates: GeneratedIdeaUpdate,
    supabaseClient?: SupabaseClient
  ): Promise<GeneratedIdea | null> {
    try {
      const client = supabaseClient || supabase;
      const { data, error } = await client
        .from('generated_ideas')
        .update(updates)
        .eq('id', ideaId)
        .eq('user_id', userId)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating idea:', error);
      throw new Error('Failed to update idea');
    }
  }

  /**
   * Delete an idea
   */
  static async deleteIdea(
    ideaId: string, 
    userId: string, 
    supabaseClient?: SupabaseClient
  ): Promise<boolean> {
    try {
      const client = supabaseClient || supabase;
      const { error } = await client
        .from('generated_ideas')
        .delete()
        .eq('id', ideaId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting idea:', error);
      throw new Error('Failed to delete idea');
    }
  }

  /**
   * Toggle favorite status
   */
  static async toggleFavorite(
    ideaId: string, 
    userId: string,
    supabaseClient?: SupabaseClient
  ): Promise<GeneratedIdea | null> {
    try {
      // First get current favorite status
      const idea = await this.getIdeaById(ideaId, userId, supabaseClient);
      if (!idea) throw new Error('Idea not found');

      return await this.updateIdea(ideaId, userId, {
        is_favorite: !idea.is_favorite
      }, supabaseClient);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw new Error('Failed to toggle favorite status');
    }
  }

  /**
   * Mark idea as used
   */
  static async markAsUsed(
    ideaId: string, 
    userId: string
  ): Promise<GeneratedIdea | null> {
    try {
      return await this.updateIdea(ideaId, userId, {
        is_used: true
      });
    } catch (error) {
      console.error('Error marking as used:', error);
      throw new Error('Failed to mark idea as used');
    }
  }

  /**
   * Get user's idea statistics
   */
  static async getUserStats(userId: string): Promise<UserIdeaStats | null> {
    try {
      const { data, error } = await supabase
        .from('user_idea_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return null;
    }
  }

  /**
   * Search ideas by title or content
   */
  static async searchIdeas(
    userId: string, 
    searchTerm: string,
    limit: number = 20,
    supabaseClient?: SupabaseClient
  ): Promise<GeneratedIdea[]> {
    try {
      const client = supabaseClient || supabase;
      const { data, error } = await client
        .from('generated_ideas')
        .select('*')
        .eq('user_id', userId)
        .or(`title.ilike.%${searchTerm}%,hook.ilike.%${searchTerm}%,story.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching ideas:', error);
      throw new Error('Failed to search ideas');
    }
  }

  /**
   * Get recent ideas (last 7 days)
   */
  static async getRecentIdeas(userId: string, limit: number = 10): Promise<GeneratedIdea[]> {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('generated_ideas')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching recent ideas:', error);
      throw new Error('Failed to fetch recent ideas');
    }
  }

  /**
   * Bulk delete ideas
   */
  static async bulkDeleteIdeas(ideaIds: string[], userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('generated_ideas')
        .delete()
        .in('id', ideaIds)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error bulk deleting ideas:', error);
      throw new Error('Failed to delete ideas');
    }
  }

  /**
   * Export user's ideas as JSON
   */
  static async exportUserIdeas(userId: string): Promise<GeneratedIdea[]> {
    try {
      const { data, error } = await supabase
        .from('generated_ideas')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error exporting ideas:', error);
      throw new Error('Failed to export ideas');
    }
  }
} 