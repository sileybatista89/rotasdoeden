export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          commission_amount: number | null
          created_at: string
          currency: string
          date: string
          guide_id: string
          guide_payout: number | null
          id: string
          num_people: number
          paid_at: string | null
          payment_status: string
          service_id: string
          service_title: string
          special_requests: string | null
          status: Database["public"]["Enums"]["booking_status"]
          stripe_session_id: string | null
          total_price: number
          tourist_id: string
          updated_at: string
        }
        Insert: {
          commission_amount?: number | null
          created_at?: string
          currency?: string
          date: string
          guide_id: string
          guide_payout?: number | null
          id?: string
          num_people: number
          paid_at?: string | null
          payment_status?: string
          service_id: string
          service_title: string
          special_requests?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          stripe_session_id?: string | null
          total_price: number
          tourist_id: string
          updated_at?: string
        }
        Update: {
          commission_amount?: number | null
          created_at?: string
          currency?: string
          date?: string
          guide_id?: string
          guide_payout?: number | null
          id?: string
          num_people?: number
          paid_at?: string | null
          payment_status?: string
          service_id?: string
          service_title?: string
          special_requests?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          stripe_session_id?: string | null
          total_price?: number
          tourist_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          booking_id: string | null
          created_at: string
          guide_id: string
          id: string
          last_message_at: string
          tourist_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          guide_id: string
          id?: string
          last_message_at?: string
          tourist_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          guide_id?: string
          id?: string
          last_message_at?: string
          tourist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      districts: {
        Row: {
          country_code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          country_code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      document_requests: {
        Row: {
          created_at: string
          document_type: string
          document_url: string | null
          fulfilled_at: string | null
          id: string
          label: string
          note: string
          rejection_reason: string | null
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
          verification_request_id: string
        }
        Insert: {
          created_at?: string
          document_type: string
          document_url?: string | null
          fulfilled_at?: string | null
          id?: string
          label: string
          note: string
          rejection_reason?: string | null
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
          verification_request_id: string
        }
        Update: {
          created_at?: string
          document_type?: string
          document_url?: string | null
          fulfilled_at?: string | null
          id?: string
          label?: string
          note?: string
          rejection_reason?: string | null
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          verification_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_requests_verification_request_id_fkey"
            columns: ["verification_request_id"]
            isOneToOne: false
            referencedRelation: "verification_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      flagged_messages: {
        Row: {
          action_taken: string | null
          conversation_id: string
          created_at: string
          id: string
          message_id: string
          reason: string
          reviewed: boolean
          sender_id: string
        }
        Insert: {
          action_taken?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          message_id: string
          reason: string
          reviewed?: boolean
          sender_id: string
        }
        Update: {
          action_taken?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          message_id?: string
          reason?: string
          reviewed?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flagged_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flagged_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_submissions: {
        Row: {
          document_back_url: string | null
          document_front_url: string
          document_type: string
          id: string
          license_number: string | null
          license_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          selfie_url: string
          status: Database["public"]["Enums"]["kyc_status"]
          submitted_at: string
          user_id: string
        }
        Insert: {
          document_back_url?: string | null
          document_front_url: string
          document_type: string
          id?: string
          license_number?: string | null
          license_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          selfie_url: string
          status?: Database["public"]["Enums"]["kyc_status"]
          submitted_at?: string
          user_id: string
        }
        Update: {
          document_back_url?: string | null
          document_front_url?: string
          document_type?: string
          id?: string
          license_number?: string | null
          license_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          selfie_url?: string
          status?: Database["public"]["Enums"]["kyc_status"]
          submitted_at?: string
          user_id?: string
        }
        Relationships: []
      }
      localities: {
        Row: {
          created_at: string
          district_id: string
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          district_id: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          district_id?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "localities_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          flagged_reason: string | null
          id: string
          original_content: string | null
          sender_id: string
          was_filtered: boolean
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          flagged_reason?: string | null
          id?: string
          original_content?: string | null
          sender_id: string
          was_filtered?: boolean
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          flagged_reason?: string | null
          id?: string
          original_content?: string | null
          sender_id?: string
          was_filtered?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          dedupe_key: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          dedupe_key?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          dedupe_key?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      professional_profiles: {
        Row: {
          admin_notes: string | null
          applied_at: string
          approved_at: string | null
          areas_of_activity: string[]
          company_name: string | null
          created_at: string
          description: string | null
          district_id: string | null
          experience_types: string[]
          gallery_urls: string[]
          headline: string | null
          id: string
          languages: string[]
          locality_id: string | null
          professional_type:
            | Database["public"]["Enums"]["professional_type"]
            | null
          profile_photo_url: string | null
          status: Database["public"]["Enums"]["guide_status"]
          status_changed_at: string
          suspended: boolean
          updated_at: string
          user_id: string
          verification_expires_at: string | null
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          years_experience: number | null
        }
        Insert: {
          admin_notes?: string | null
          applied_at?: string
          approved_at?: string | null
          areas_of_activity?: string[]
          company_name?: string | null
          created_at?: string
          description?: string | null
          district_id?: string | null
          experience_types?: string[]
          gallery_urls?: string[]
          headline?: string | null
          id?: string
          languages?: string[]
          locality_id?: string | null
          professional_type?:
            | Database["public"]["Enums"]["professional_type"]
            | null
          profile_photo_url?: string | null
          status?: Database["public"]["Enums"]["guide_status"]
          status_changed_at?: string
          suspended?: boolean
          updated_at?: string
          user_id: string
          verification_expires_at?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          years_experience?: number | null
        }
        Update: {
          admin_notes?: string | null
          applied_at?: string
          approved_at?: string | null
          areas_of_activity?: string[]
          company_name?: string | null
          created_at?: string
          description?: string | null
          district_id?: string | null
          experience_types?: string[]
          gallery_urls?: string[]
          headline?: string | null
          id?: string
          languages?: string[]
          locality_id?: string | null
          professional_type?:
            | Database["public"]["Enums"]["professional_type"]
            | null
          profile_photo_url?: string | null
          status?: Database["public"]["Enums"]["guide_status"]
          status_changed_at?: string
          suspended?: boolean
          updated_at?: string
          user_id?: string
          verification_expires_at?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_profiles_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_profiles_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banned: boolean
          bio: string | null
          country: string | null
          created_at: string
          full_name: string
          id: string
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          banned?: boolean
          bio?: string | null
          country?: string | null
          created_at?: string
          full_name?: string
          id: string
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          banned?: boolean
          bio?: string | null
          country?: string | null
          created_at?: string
          full_name?: string
          id?: string
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          additional_info: string | null
          available_days: string[]
          available_times: string[]
          category: Database["public"]["Enums"]["service_category"]
          created_at: string
          currency: string
          description: string
          district_id: string | null
          duration_hours: number
          excludes: string[] | null
          guide_id: string
          id: string
          images: string[]
          includes: string[] | null
          is_active: boolean
          languages: string[]
          locality_id: string | null
          max_people: number
          meeting_point: string | null
          min_people: number
          moderated_at: string | null
          moderation_notes: string | null
          moderation_status: string
          price_per_person: number
          title: string
          updated_at: string
        }
        Insert: {
          additional_info?: string | null
          available_days?: string[]
          available_times?: string[]
          category: Database["public"]["Enums"]["service_category"]
          created_at?: string
          currency?: string
          description: string
          district_id?: string | null
          duration_hours: number
          excludes?: string[] | null
          guide_id: string
          id?: string
          images?: string[]
          includes?: string[] | null
          is_active?: boolean
          languages?: string[]
          locality_id?: string | null
          max_people?: number
          meeting_point?: string | null
          min_people?: number
          moderated_at?: string | null
          moderation_notes?: string | null
          moderation_status?: string
          price_per_person: number
          title: string
          updated_at?: string
        }
        Update: {
          additional_info?: string | null
          available_days?: string[]
          available_times?: string[]
          category?: Database["public"]["Enums"]["service_category"]
          created_at?: string
          currency?: string
          description?: string
          district_id?: string | null
          duration_hours?: number
          excludes?: string[] | null
          guide_id?: string
          id?: string
          images?: string[]
          includes?: string[] | null
          is_active?: boolean
          languages?: string[]
          locality_id?: string | null
          max_people?: number
          meeting_point?: string | null
          min_people?: number
          moderated_at?: string | null
          moderation_notes?: string | null
          moderation_status?: string
          price_per_person?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
        ]
      }
      support_conversations: {
        Row: {
          assigned_admin_id: string | null
          created_at: string
          created_by: string
          id: string
          last_message_at: string
          status: string
          subject: string
          updated_at: string
          user_id: string
          verification_request_id: string | null
        }
        Insert: {
          assigned_admin_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          last_message_at?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
          verification_request_id?: string | null
        }
        Update: {
          assigned_admin_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          last_message_at?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
          verification_request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_conversations_verification_request_id_fkey"
            columns: ["verification_request_id"]
            isOneToOne: false
            referencedRelation: "verification_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "support_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_requests: {
        Row: {
          created_at: string
          credential_url: string | null
          experience_summary: string | null
          id: string
          id_document_url: string | null
          other_document_urls: string[]
          professional_photo_url: string | null
          professional_type:
            | Database["public"]["Enums"]["professional_type"]
            | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: Database["public"]["Enums"]["verification_status"]
          training_certificate_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credential_url?: string | null
          experience_summary?: string | null
          id?: string
          id_document_url?: string | null
          other_document_urls?: string[]
          professional_photo_url?: string | null
          professional_type?:
            | Database["public"]["Enums"]["professional_type"]
            | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          training_certificate_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credential_url?: string | null
          experience_summary?: string | null
          id?: string
          id_document_url?: string | null
          other_document_urls?: string[]
          professional_photo_url?: string | null
          professional_type?:
            | Database["public"]["Enums"]["professional_type"]
            | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          training_certificate_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles_public: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_list_flagged_messages: {
        Args: { _limit?: number }
        Returns: {
          content: string
          created_at: string
          flagged_reason: string
          id: string
          original_content: string
          sender_id: string
        }[]
      }
      admin_message_guide: {
        Args: { _message: string; _subject: string; _user_id: string }
        Returns: string
      }
      admin_moderate_service: {
        Args: { _approve: boolean; _note?: string; _service_id: string }
        Returns: undefined
      }
      admin_request_document: {
        Args: {
          _document_type: string
          _label: string
          _message: string
          _user_id: string
        }
        Returns: string
      }
      admin_review_document: {
        Args: { _approve: boolean; _reason?: string; _request_id: string }
        Returns: undefined
      }
      admin_set_document_status: {
        Args: { _request_id: string; _status: string }
        Returns: undefined
      }
      admin_set_guide_status: {
        Args: {
          _note?: string
          _status: Database["public"]["Enums"]["guide_status"]
          _user_id: string
        }
        Returns: undefined
      }
      approve_professional_verification: {
        Args: { _note?: string; _verification_request_id: string }
        Returns: undefined
      }
      create_notification: {
        Args: {
          _body: string
          _dedupe_key?: string
          _entity_id?: string
          _entity_type?: string
          _link?: string
          _title: string
          _type: string
          _user_id: string
        }
        Returns: string
      }
      fulfill_document_request: {
        Args: { _document_url: string; _request_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_banned: { Args: { _user_id: string }; Returns: boolean }
      request_verification_documents: {
        Args: {
          _items: Json
          _message: string
          _verification_request_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "guide" | "tourist"
      booking_status:
        | "pending_payment"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "refunded"
      guide_status:
        | "candidatura_recebida"
        | "em_analise"
        | "documentacao_pendente"
        | "verificacao_em_curso"
        | "aprovado"
        | "rejeitado"
        | "suspenso"
        | "banido"
      kyc_status: "pending" | "submitted" | "verified" | "rejected"
      professional_type:
        | "guia_credenciado"
        | "guia_local"
        | "operador_turistico"
        | "empresa_agencia"
        | "outro"
      service_category:
        | "tour"
        | "experience"
        | "transfer"
        | "diving"
        | "hiking"
        | "fishing"
        | "kayak"
        | "surfing"
        | "birdwatching"
        | "photography"
        | "gastronomy"
        | "culture"
        | "nightlife"
      verification_status:
        | "not_verified"
        | "pending"
        | "verified"
        | "rejected"
        | "expired"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "guide", "tourist"],
      booking_status: [
        "pending_payment",
        "confirmed",
        "completed",
        "cancelled",
        "refunded",
      ],
      guide_status: [
        "candidatura_recebida",
        "em_analise",
        "documentacao_pendente",
        "verificacao_em_curso",
        "aprovado",
        "rejeitado",
        "suspenso",
        "banido",
      ],
      kyc_status: ["pending", "submitted", "verified", "rejected"],
      professional_type: [
        "guia_credenciado",
        "guia_local",
        "operador_turistico",
        "empresa_agencia",
        "outro",
      ],
      service_category: [
        "tour",
        "experience",
        "transfer",
        "diving",
        "hiking",
        "fishing",
        "kayak",
        "surfing",
        "birdwatching",
        "photography",
        "gastronomy",
        "culture",
        "nightlife",
      ],
      verification_status: [
        "not_verified",
        "pending",
        "verified",
        "rejected",
        "expired",
      ],
    },
  },
} as const
