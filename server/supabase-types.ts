export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: number
          username: string
          email: string | null
          password: string
          display_name: string | null
          profile_image: string | null
          role: string | null
          api_key_chatgpt: string | null
          api_key_grok: string | null
          api_key_claude: string | null
          api_key_gemini: string | null
          ai_model_chatgpt: string | null
          ai_model_grok: string | null
          ai_model_claude: string | null
          ai_model_gemini: string | null
          conversation_profiles: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          username: string
          email?: string | null
          password: string
          display_name?: string | null
          profile_image?: string | null
          role?: string | null
          api_key_chatgpt?: string | null
          api_key_grok?: string | null
          api_key_claude?: string | null
          api_key_gemini?: string | null
          ai_model_chatgpt?: string | null
          ai_model_grok?: string | null
          ai_model_claude?: string | null
          ai_model_gemini?: string | null
          conversation_profiles?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          username?: string
          email?: string | null
          password?: string
          display_name?: string | null
          profile_image?: string | null
          role?: string | null
          api_key_chatgpt?: string | null
          api_key_grok?: string | null
          api_key_claude?: string | null
          api_key_gemini?: string | null
          ai_model_chatgpt?: string | null
          ai_model_grok?: string | null
          ai_model_claude?: string | null
          ai_model_gemini?: string | null
          conversation_profiles?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      settings: {
        Row: {
          id: number
          key: string
          value: string
        }
        Insert: {
          id?: number
          key: string
          value: string
        }
        Update: {
          id?: number
          key?: string
          value?: string
        }
      }
      stories: {
        Row: {
          id: number
          title: string
          description: string | null
          image: string | null
          genre: string | null
          author: string | null
          story_settings: string | null
          prologue: string | null
          prompt_template: string | null
          example_user_input: string | null
          example_ai_response: string | null
          starting_situation: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          title: string
          description?: string | null
          image?: string | null
          genre?: string | null
          author?: string | null
          story_settings?: string | null
          prologue?: string | null
          prompt_template?: string | null
          example_user_input?: string | null
          example_ai_response?: string | null
          starting_situation?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          title?: string
          description?: string | null
          image?: string | null
          genre?: string | null
          author?: string | null
          story_settings?: string | null
          prologue?: string | null
          prompt_template?: string | null
          example_user_input?: string | null
          example_ai_response?: string | null
          starting_situation?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      sessions: {
        Row: {
          id: number
          story_id: number
          user_id: number
          title: string
          conversation_profile: string | null
          user_note: string | null
          summary_memory: string | null
          session_model: string | null
          session_provider: string | null
          ai_message_count: number | null
          last_summary_turn: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          story_id: number
          user_id: number
          title: string
          conversation_profile?: string | null
          user_note?: string | null
          summary_memory?: string | null
          session_model?: string | null
          session_provider?: string | null
          ai_message_count?: number | null
          last_summary_turn?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          story_id?: number
          user_id?: number
          title?: string
          conversation_profile?: string | null
          user_note?: string | null
          summary_memory?: string | null
          session_model?: string | null
          session_provider?: string | null
          ai_message_count?: number | null
          last_summary_turn?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      messages: {
        Row: {
          id: number
          session_id: number
          role: string
          content: string
          character: string | null
          created_at: string | null
        }
        Insert: {
          id?: number
          session_id: number
          role: string
          content: string
          character?: string | null
          created_at?: string | null
        }
        Update: {
          id?: number
          session_id?: number
          role?: string
          content?: string
          character?: string | null
          created_at?: string | null
        }
      }
    }
  }
}
