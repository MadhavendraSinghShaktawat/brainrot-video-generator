export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      generated_ideas: {
        Row: {
          created_at: string
          emotional_triggers: string[]
          estimated_views: string
          generation_settings: Json
          hook: string
          id: string
          is_favorite: boolean | null
          is_used: boolean | null
          story: string
          target_audience: string
          title: string
          updated_at: string
          user_id: string | null
          viral_factors: string[]
        }
        Insert: {
          created_at?: string
          emotional_triggers?: string[]
          estimated_views: string
          generation_settings?: Json
          hook: string
          id?: string
          is_favorite?: boolean | null
          is_used?: boolean | null
          story: string
          target_audience: string
          title: string
          updated_at?: string
          user_id?: string | null
          viral_factors?: string[]
        }
        Update: {
          created_at?: string
          emotional_triggers?: string[]
          estimated_views?: string
          generation_settings?: Json
          hook?: string
          id?: string
          is_favorite?: boolean | null
          is_used?: boolean | null
          story?: string
          target_audience?: string
          title?: string
          updated_at?: string
          user_id?: string | null
          viral_factors?: string[]
        }
        Relationships: []
      }
      generated_scripts: {
        Row: {
          created_at: string
          estimated_duration: string
          id: string
          idea_id: string | null
          is_favorite: boolean | null
          length: string
          script_content: string
          style: string
          title: string
          updated_at: string
          user_id: string | null
          word_count: number
          audio_url: string | null
        }
        Insert: {
          created_at?: string
          estimated_duration?: string
          id?: string
          idea_id?: string | null
          is_favorite?: boolean | null
          length?: string
          script_content: string
          style?: string
          title: string
          updated_at?: string
          user_id?: string | null
          word_count?: number
          audio_url?: string | null
        }
        Update: {
          created_at?: string
          estimated_duration?: string
          id?: string
          idea_id?: string | null
          is_favorite?: boolean | null
          length?: string
          script_content?: string
          style?: string
          title?: string
          updated_at?: string
          user_id?: string | null
          word_count?: number
          audio_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_scripts_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "generated_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_videos: {
        Row: {
          id: string
          script_id: string | null
          video_url: string
          duration: string | null
          created_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          script_id?: string | null
          video_url: string
          duration?: string | null
          created_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          script_id?: string | null
          video_url?: string
          duration?: string | null
          created_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_videos_script_id_fkey",
            columns: ["script_id"],
            isOneToOne: false,
            referencedRelation: "generated_scripts",
            referencedColumns: ["id"]
          },
        ]
      }
      render_jobs: {
        Row: {
          id: string
          user_id: string
          timeline_json: Json
          status: 'pending' | 'processing' | 'completed' | 'failed'
          result_url: string | null
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          timeline_json: Json
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          result_url?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          timeline_json?: Json
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          result_url?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "render_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      timelines: {
        Row: {
          id: string
          user_id: string
          title: string
          data: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          data: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          data?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timelines_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      user_idea_stats: {
        Row: {
          favorite_ideas: number | null
          ideas_this_month: number | null
          ideas_this_week: number | null
          last_generated: string | null
          total_ideas: number | null
          used_ideas: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

// Helper types for the generated_ideas table
export type GeneratedIdea = Database['public']['Tables']['generated_ideas']['Row']
export type GeneratedIdeaInsert = Database['public']['Tables']['generated_ideas']['Insert']
export type GeneratedIdeaUpdate = Database['public']['Tables']['generated_ideas']['Update']

// Helper types for the generated_scripts table
export type GeneratedScript = Database['public']['Tables']['generated_scripts']['Row']
export type GeneratedScriptInsert = Database['public']['Tables']['generated_scripts']['Insert']
export type GeneratedScriptUpdate = Database['public']['Tables']['generated_scripts']['Update']

// Helper type for user idea stats view
export type UserIdeaStats = Database['public']['Views']['user_idea_stats']['Row']

// Generation settings interface
export interface GenerationSettings {
  tone: 'dramatic' | 'shocking' | 'emotional' | 'controversial' | 'inspiring'
  length: 'short' | 'medium' | 'long'
  count: number
}

export type GeneratedVideo = Database['public']['Tables']['generated_videos']['Row']
export type GeneratedVideoInsert = Database['public']['Tables']['generated_videos']['Insert']
export type GeneratedVideoUpdate = Database['public']['Tables']['generated_videos']['Update']

// Render Jobs types
export type RenderJob = Database['public']['Tables']['render_jobs']['Row']
export type RenderJobInsert = Database['public']['Tables']['render_jobs']['Insert']
export type RenderJobUpdate = Database['public']['Tables']['render_jobs']['Update']

// Timeline types
export type Timeline = Database['public']['Tables']['timelines']['Row']
export type TimelineInsert = Database['public']['Tables']['timelines']['Insert']
export type TimelineUpdate = Database['public']['Tables']['timelines']['Update']