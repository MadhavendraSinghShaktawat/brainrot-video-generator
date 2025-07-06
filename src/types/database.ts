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