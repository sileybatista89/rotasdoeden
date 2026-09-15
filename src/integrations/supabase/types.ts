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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accommodation_rooms: {
        Row: {
          accommodation_id: string
          amenities: Json
          bed_configuration: string | null
          capacity_source: string | null
          created_at: string
          created_by: string | null
          id: string
          images: Json
          max_adults: number | null
          max_children: number | null
          max_guests: number | null
          notes: string | null
          room_name: string
          room_type: string
          size_sqm: number | null
          status: string
          updated_at: string
        }
        Insert: {
          accommodation_id: string
          amenities?: Json
          bed_configuration?: string | null
          capacity_source?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          images?: Json
          max_adults?: number | null
          max_children?: number | null
          max_guests?: number | null
          notes?: string | null
          room_name: string
          room_type?: string
          size_sqm?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          accommodation_id?: string
          amenities?: Json
          bed_configuration?: string | null
          capacity_source?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          images?: Json
          max_adults?: number | null
          max_children?: number | null
          max_guests?: number | null
          notes?: string | null
          room_name?: string
          room_type?: string
          size_sqm?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_rooms_accommodation_id_fkey"
            columns: ["accommodation_id"]
            isOneToOne: false
            referencedRelation: "accommodations"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodations: {
        Row: {
          accommodation_type: string
          address: string | null
          amenities: Json
          contact_email: string | null
          contact_phone: string | null
          country: string
          created_at: string
          created_by: string | null
          description: string | null
          district_id: string | null
          id: string
          images: Json
          locality_id: string | null
          locality_name: string | null
          name: string
          notes: string | null
          rating_source: string | null
          star_rating: number | null
          status: string
          supplier_id: string
          updated_at: string
          website: string | null
        }
        Insert: {
          accommodation_type?: string
          address?: string | null
          amenities?: Json
          contact_email?: string | null
          contact_phone?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          district_id?: string | null
          id?: string
          images?: Json
          locality_id?: string | null
          locality_name?: string | null
          name: string
          notes?: string | null
          rating_source?: string | null
          star_rating?: number | null
          status?: string
          supplier_id: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          accommodation_type?: string
          address?: string | null
          amenities?: Json
          contact_email?: string | null
          contact_phone?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          district_id?: string | null
          id?: string
          images?: Json
          locality_id?: string | null
          locality_name?: string | null
          name?: string
          notes?: string | null
          rating_source?: string | null
          star_rating?: number | null
          status?: string
          supplier_id?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodations_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodations_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      acquisition_assets: {
        Row: {
          asset_type: string
          content_id: string | null
          created_at: string
          id: string
          language: string | null
          note: string | null
          plan_id: string
          purpose: string | null
          requested_task_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          asset_type: string
          content_id?: string | null
          created_at?: string
          id?: string
          language?: string | null
          note?: string | null
          plan_id: string
          purpose?: string | null
          requested_task_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          asset_type?: string
          content_id?: string | null
          created_at?: string
          id?: string
          language?: string | null
          note?: string | null
          plan_id?: string
          purpose?: string | null
          requested_task_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_assets_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_assets_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "acquisition_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_assets_requested_task_id_fkey"
            columns: ["requested_task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      acquisition_campaigns: {
        Row: {
          approval_id: string | null
          budget_cap: number
          channel: string
          created_at: string
          currency: string
          external_reference: string | null
          id: string
          name: string
          period_end: string | null
          period_start: string | null
          plan_id: string
          requested_budget: number
          status: string
          stop_conditions: Json
          updated_at: string
          utm_campaign: string | null
        }
        Insert: {
          approval_id?: string | null
          budget_cap?: number
          channel: string
          created_at?: string
          currency?: string
          external_reference?: string | null
          id?: string
          name: string
          period_end?: string | null
          period_start?: string | null
          plan_id: string
          requested_budget?: number
          status?: string
          stop_conditions?: Json
          updated_at?: string
          utm_campaign?: string | null
        }
        Update: {
          approval_id?: string | null
          budget_cap?: number
          channel?: string
          created_at?: string
          currency?: string
          external_reference?: string | null
          id?: string
          name?: string
          period_end?: string | null
          period_start?: string | null
          plan_id?: string
          requested_budget?: number
          status?: string
          stop_conditions?: Json
          updated_at?: string
          utm_campaign?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_campaigns_approval_id_fkey"
            columns: ["approval_id"]
            isOneToOne: false
            referencedRelation: "agent_approvals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_campaigns_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "acquisition_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      acquisition_learning: {
        Row: {
          channel: string | null
          conclusion: string
          confidence: number
          created_at: string
          evidence: Json
          id: string
          language: string | null
          market: string | null
          plan_id: string | null
          run_id: string | null
          scope: string
          task_id: string | null
        }
        Insert: {
          channel?: string | null
          conclusion: string
          confidence?: number
          created_at?: string
          evidence?: Json
          id?: string
          language?: string | null
          market?: string | null
          plan_id?: string | null
          run_id?: string | null
          scope: string
          task_id?: string | null
        }
        Update: {
          channel?: string | null
          conclusion?: string
          confidence?: number
          created_at?: string
          evidence?: Json
          id?: string
          language?: string | null
          market?: string | null
          plan_id?: string | null
          run_id?: string | null
          scope?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_learning_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "acquisition_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_learning_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_learning_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      acquisition_plan_history: {
        Row: {
          action: string
          actor_id: string | null
          actor_kind: string
          created_at: string
          id: string
          new_status: string | null
          note: string | null
          plan_id: string
          previous_status: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_kind?: string
          created_at?: string
          id?: string
          new_status?: string | null
          note?: string | null
          plan_id: string
          previous_status?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_kind?: string
          created_at?: string
          id?: string
          new_status?: string | null
          note?: string | null
          plan_id?: string
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_plan_history_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "acquisition_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      acquisition_plans: {
        Row: {
          acquisition_score: number
          audience: Json
          channel: string
          confidence_score: number
          country: string | null
          created_at: string
          decision: string
          dedupe_key: string | null
          discovery_opportunity_id: string | null
          estimated_cost: number
          evidence: Json
          hypothesis: string
          id: string
          language: string
          market: string
          market_state: string
          message: Json
          objective: string | null
          offer: Json
          rationale: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          run_id: string | null
          score_breakdown: Json
          status: string
          target_metric: Json
          task_id: string | null
          updated_at: string
        }
        Insert: {
          acquisition_score?: number
          audience?: Json
          channel: string
          confidence_score?: number
          country?: string | null
          created_at?: string
          decision?: string
          dedupe_key?: string | null
          discovery_opportunity_id?: string | null
          estimated_cost?: number
          evidence?: Json
          hypothesis: string
          id?: string
          language: string
          market: string
          market_state?: string
          message?: Json
          objective?: string | null
          offer?: Json
          rationale?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          run_id?: string | null
          score_breakdown?: Json
          status?: string
          target_metric?: Json
          task_id?: string | null
          updated_at?: string
        }
        Update: {
          acquisition_score?: number
          audience?: Json
          channel?: string
          confidence_score?: number
          country?: string | null
          created_at?: string
          decision?: string
          dedupe_key?: string | null
          discovery_opportunity_id?: string | null
          estimated_cost?: number
          evidence?: Json
          hypothesis?: string
          id?: string
          language?: string
          market?: string
          market_state?: string
          message?: Json
          objective?: string | null
          offer?: Json
          rationale?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          run_id?: string | null
          score_breakdown?: Json
          status?: string
          target_metric?: Json
          task_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_plans_discovery_opportunity_id_fkey"
            columns: ["discovery_opportunity_id"]
            isOneToOne: false
            referencedRelation: "discovery_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_plans_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_plans_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      acquisition_results: {
        Row: {
          bookings: number
          campaign_id: string | null
          created_at: string
          currency: string
          id: string
          leads: number
          measured_from: string
          period_end: string
          period_start: string
          plan_id: string | null
          revenue: number
          spend: number
          visits: number
        }
        Insert: {
          bookings?: number
          campaign_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          leads?: number
          measured_from?: string
          period_end: string
          period_start: string
          plan_id?: string | null
          revenue?: number
          spend?: number
          visits?: number
        }
        Update: {
          bookings?: number
          campaign_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          leads?: number
          measured_from?: string
          period_end?: string
          period_start?: string
          plan_id?: string | null
          revenue?: number
          spend?: number
          visits?: number
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_results_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "acquisition_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_results_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "acquisition_plans"
            referencedColumns: ["id"]
          },
        ]
      }
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
      agent_approvals: {
        Row: {
          action_type: string
          agent_type: Database["public"]["Enums"]["agent_type"]
          created_at: string
          description: string
          id: string
          payload: Json
          rejection_reason: string | null
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["agent_approval_status"]
          task_id: string | null
          updated_at: string
        }
        Insert: {
          action_type: string
          agent_type: Database["public"]["Enums"]["agent_type"]
          created_at?: string
          description: string
          id?: string
          payload?: Json
          rejection_reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["agent_approval_status"]
          task_id?: string | null
          updated_at?: string
        }
        Update: {
          action_type?: string
          agent_type?: Database["public"]["Enums"]["agent_type"]
          created_at?: string
          description?: string
          id?: string
          payload?: Json
          rejection_reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["agent_approval_status"]
          task_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_approvals_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_config: {
        Row: {
          created_at: string
          description: string | null
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      agent_costs: {
        Row: {
          agent_type: Database["public"]["Enums"]["agent_type"]
          created_at: string
          currency: string
          estimated_cost: number
          id: string
          input_tokens: number
          model: string
          output_tokens: number
          provider: string
          run_id: string | null
          task_id: string | null
          usage_date: string
        }
        Insert: {
          agent_type: Database["public"]["Enums"]["agent_type"]
          created_at?: string
          currency?: string
          estimated_cost?: number
          id?: string
          input_tokens?: number
          model: string
          output_tokens?: number
          provider: string
          run_id?: string | null
          task_id?: string | null
          usage_date?: string
        }
        Update: {
          agent_type?: Database["public"]["Enums"]["agent_type"]
          created_at?: string
          currency?: string
          estimated_cost?: number
          id?: string
          input_tokens?: number
          model?: string
          output_tokens?: number
          provider?: string
          run_id?: string | null
          task_id?: string | null
          usage_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_costs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_costs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_policies: {
        Row: {
          action_key: string
          agent_type: Database["public"]["Enums"]["agent_type"]
          created_at: string
          description: string | null
          id: string
          level: Database["public"]["Enums"]["agent_permission_level"]
          updated_at: string
        }
        Insert: {
          action_key: string
          agent_type: Database["public"]["Enums"]["agent_type"]
          created_at?: string
          description?: string | null
          id?: string
          level: Database["public"]["Enums"]["agent_permission_level"]
          updated_at?: string
        }
        Update: {
          action_key?: string
          agent_type?: Database["public"]["Enums"]["agent_type"]
          created_at?: string
          description?: string | null
          id?: string
          level?: Database["public"]["Enums"]["agent_permission_level"]
          updated_at?: string
        }
        Relationships: []
      }
      agent_runs: {
        Row: {
          agent_type: Database["public"]["Enums"]["agent_type"]
          attempt: number
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error_code: string | null
          error_message: string | null
          estimated_cost: number
          id: string
          input_summary: string | null
          input_tokens: number
          model_name: string | null
          model_provider: string | null
          output_summary: string | null
          output_tokens: number
          started_at: string
          status: string
          task_id: string | null
          tool_calls_count: number
        }
        Insert: {
          agent_type: Database["public"]["Enums"]["agent_type"]
          attempt?: number
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          estimated_cost?: number
          id?: string
          input_summary?: string | null
          input_tokens?: number
          model_name?: string | null
          model_provider?: string | null
          output_summary?: string | null
          output_tokens?: number
          started_at?: string
          status?: string
          task_id?: string | null
          tool_calls_count?: number
        }
        Update: {
          agent_type?: Database["public"]["Enums"]["agent_type"]
          attempt?: number
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          estimated_cost?: number
          id?: string
          input_summary?: string | null
          input_tokens?: number
          model_name?: string | null
          model_provider?: string | null
          output_summary?: string | null
          output_tokens?: number
          started_at?: string
          status?: string
          task_id?: string | null
          tool_calls_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_settings: {
        Row: {
          agent_type: Database["public"]["Enums"]["agent_type"] | null
          created_at: string
          currency: string
          daily_limit: number
          id: string
          monthly_limit: number
          notes: string | null
          paused: boolean
          scope: string
          updated_at: string
        }
        Insert: {
          agent_type?: Database["public"]["Enums"]["agent_type"] | null
          created_at?: string
          currency?: string
          daily_limit?: number
          id?: string
          monthly_limit?: number
          notes?: string | null
          paused?: boolean
          scope: string
          updated_at?: string
        }
        Update: {
          agent_type?: Database["public"]["Enums"]["agent_type"] | null
          created_at?: string
          currency?: string
          daily_limit?: number
          id?: string
          monthly_limit?: number
          notes?: string | null
          paused?: boolean
          scope?: string
          updated_at?: string
        }
        Relationships: []
      }
      agent_tasks: {
        Row: {
          agent_type: Database["public"]["Enums"]["agent_type"]
          completed_at: string | null
          created_at: string
          created_by: string | null
          depth: number
          failed_at: string | null
          id: string
          idempotency_key: string
          last_error: string | null
          locked_at: string | null
          max_cost_per_run: number
          max_retries: number
          parent_task_id: string | null
          payload: Json
          priority: number
          result: Json | null
          retry_count: number
          scheduled_for: string
          started_at: string | null
          status: Database["public"]["Enums"]["agent_task_status"]
          task_type: string
          updated_at: string
        }
        Insert: {
          agent_type: Database["public"]["Enums"]["agent_type"]
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          depth?: number
          failed_at?: string | null
          id?: string
          idempotency_key: string
          last_error?: string | null
          locked_at?: string | null
          max_cost_per_run?: number
          max_retries?: number
          parent_task_id?: string | null
          payload?: Json
          priority?: number
          result?: Json | null
          retry_count?: number
          scheduled_for?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["agent_task_status"]
          task_type: string
          updated_at?: string
        }
        Update: {
          agent_type?: Database["public"]["Enums"]["agent_type"]
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          depth?: number
          failed_at?: string | null
          id?: string
          idempotency_key?: string
          last_error?: string | null
          locked_at?: string | null
          max_cost_per_run?: number
          max_retries?: number
          parent_task_id?: string | null
          payload?: Json
          priority?: number
          result?: Json | null
          retry_count?: number
          scheduled_for?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["agent_task_status"]
          task_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_flight: {
        Row: {
          created_at: string
          failure_reason: string | null
          flight_offer_id: string | null
          hold_capable: boolean | null
          hold_expires_at: string | null
          hold_reference: string | null
          id: string
          offer_expires_at: string | null
          offer_snapshot: Json | null
          package_booking_id: string
          provider: string | null
          provider_offer_id: string | null
          provider_order_id: string | null
          requires_instant_payment: boolean | null
          status: string
          supplier_cost: number | null
          supplier_currency: string | null
          ticket_numbers: Json
          ticketed_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          failure_reason?: string | null
          flight_offer_id?: string | null
          hold_capable?: boolean | null
          hold_expires_at?: string | null
          hold_reference?: string | null
          id?: string
          offer_expires_at?: string | null
          offer_snapshot?: Json | null
          package_booking_id: string
          provider?: string | null
          provider_offer_id?: string | null
          provider_order_id?: string | null
          requires_instant_payment?: boolean | null
          status?: string
          supplier_cost?: number | null
          supplier_currency?: string | null
          ticket_numbers?: Json
          ticketed_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          failure_reason?: string | null
          flight_offer_id?: string | null
          hold_capable?: boolean | null
          hold_expires_at?: string | null
          hold_reference?: string | null
          id?: string
          offer_expires_at?: string | null
          offer_snapshot?: Json | null
          package_booking_id?: string
          provider?: string | null
          provider_offer_id?: string | null
          provider_order_id?: string | null
          requires_instant_payment?: boolean | null
          status?: string
          supplier_cost?: number | null
          supplier_currency?: string | null
          ticket_numbers?: Json
          ticketed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_flight_flight_offer_id_fkey"
            columns: ["flight_offer_id"]
            isOneToOne: false
            referencedRelation: "flight_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_flight_package_booking_id_fkey"
            columns: ["package_booking_id"]
            isOneToOne: true
            referencedRelation: "package_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          attribution: Json
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
          visitor_id: string | null
        }
        Insert: {
          attribution?: Json
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
          visitor_id?: string | null
        }
        Update: {
          attribution?: Json
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
          visitor_id?: string | null
        }
        Relationships: []
      }
      component_rates: {
        Row: {
          cancellation_summary: string | null
          cancellation_type: string
          component_id: string
          created_at: string
          created_by: string | null
          currency: string
          id: string
          meal_plan: string
          notes: string | null
          observed_at: string
          occupancy_adults: number | null
          occupancy_children: number | null
          occupancy_total: number | null
          price: number
          quantity: number
          rate_kind: string
          source_document_url: string | null
          source_reference: string | null
          source_type: string
          status: string
          supplier_id: string | null
          unit: string
          updated_at: string
          valid_from: string | null
          valid_until: string | null
          validity_unknown: boolean
        }
        Insert: {
          cancellation_summary?: string | null
          cancellation_type?: string
          component_id: string
          created_at?: string
          created_by?: string | null
          currency: string
          id?: string
          meal_plan?: string
          notes?: string | null
          observed_at: string
          occupancy_adults?: number | null
          occupancy_children?: number | null
          occupancy_total?: number | null
          price: number
          quantity?: number
          rate_kind: string
          source_document_url?: string | null
          source_reference?: string | null
          source_type: string
          status?: string
          supplier_id?: string | null
          unit: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          validity_unknown?: boolean
        }
        Update: {
          cancellation_summary?: string | null
          cancellation_type?: string
          component_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          meal_plan?: string
          notes?: string | null
          observed_at?: string
          occupancy_adults?: number | null
          occupancy_children?: number | null
          occupancy_total?: number | null
          price?: number
          quantity?: number
          rate_kind?: string
          source_document_url?: string | null
          source_reference?: string | null
          source_type?: string
          status?: string
          supplier_id?: string | null
          unit?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          validity_unknown?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "component_rates_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "package_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "component_rates_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      content_cache: {
        Row: {
          cache_key: string
          created_at: string
          expires_at: string
          id: string
          payload: Json
        }
        Insert: {
          cache_key: string
          created_at?: string
          expires_at: string
          id?: string
          payload: Json
        }
        Update: {
          cache_key?: string
          created_at?: string
          expires_at?: string
          id?: string
          payload?: Json
        }
        Relationships: []
      }
      content_items: {
        Row: {
          audience: string | null
          content_type: string
          country: string | null
          created_at: string
          current_version_id: string | null
          discovery_opportunity_id: string | null
          generated_by: string
          id: string
          intent: string | null
          language: string
          market: string | null
          quality_issues: Json
          quality_passed: boolean
          run_id: string | null
          season: string | null
          slug: string | null
          status: string
          task_id: string | null
          title: string | null
          translation_group_id: string
          updated_at: string
        }
        Insert: {
          audience?: string | null
          content_type: string
          country?: string | null
          created_at?: string
          current_version_id?: string | null
          discovery_opportunity_id?: string | null
          generated_by?: string
          id?: string
          intent?: string | null
          language: string
          market?: string | null
          quality_issues?: Json
          quality_passed?: boolean
          run_id?: string | null
          season?: string | null
          slug?: string | null
          status?: string
          task_id?: string | null
          title?: string | null
          translation_group_id?: string
          updated_at?: string
        }
        Update: {
          audience?: string | null
          content_type?: string
          country?: string | null
          created_at?: string
          current_version_id?: string | null
          discovery_opportunity_id?: string | null
          generated_by?: string
          id?: string
          intent?: string | null
          language?: string
          market?: string | null
          quality_issues?: Json
          quality_passed?: boolean
          run_id?: string | null
          season?: string | null
          slug?: string | null
          status?: string
          task_id?: string | null
          title?: string | null
          translation_group_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_items_current_version_fkey"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "content_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_discovery_opportunity_id_fkey"
            columns: ["discovery_opportunity_id"]
            isOneToOne: false
            referencedRelation: "discovery_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      content_publications: {
        Row: {
          approval_id: string | null
          content_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          note: string | null
          requested_by: string
          status: string
          updated_at: string
          version_id: string | null
        }
        Insert: {
          approval_id?: string | null
          content_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          note?: string | null
          requested_by?: string
          status?: string
          updated_at?: string
          version_id?: string | null
        }
        Update: {
          approval_id?: string | null
          content_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          note?: string | null
          requested_by?: string
          status?: string
          updated_at?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_publications_approval_id_fkey"
            columns: ["approval_id"]
            isOneToOne: false
            referencedRelation: "agent_approvals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_publications_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_publications_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "content_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reviews: {
        Row: {
          content_id: string
          created_at: string
          decision: string
          id: string
          note: string | null
          previous_status: string | null
          reviewer_id: string | null
          version_id: string | null
        }
        Insert: {
          content_id: string
          created_at?: string
          decision: string
          id?: string
          note?: string | null
          previous_status?: string | null
          reviewer_id?: string | null
          version_id?: string | null
        }
        Update: {
          content_id?: string
          created_at?: string
          decision?: string
          id?: string
          note?: string | null
          previous_status?: string | null
          reviewer_id?: string | null
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_reviews_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reviews_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "content_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      content_sources: {
        Row: {
          consulted_at: string
          content_id: string
          created_at: string
          evidence_type: string
          excerpt: string | null
          id: string
          source_record_id: string | null
          source_scope: string
          source_table: string | null
          title: string | null
          url: string | null
          version_id: string | null
        }
        Insert: {
          consulted_at?: string
          content_id: string
          created_at?: string
          evidence_type: string
          excerpt?: string | null
          id?: string
          source_record_id?: string | null
          source_scope: string
          source_table?: string | null
          title?: string | null
          url?: string | null
          version_id?: string | null
        }
        Update: {
          consulted_at?: string
          content_id?: string
          created_at?: string
          evidence_type?: string
          excerpt?: string | null
          id?: string
          source_record_id?: string | null
          source_scope?: string
          source_table?: string | null
          title?: string | null
          url?: string | null
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_sources_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_sources_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "content_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      content_versions: {
        Row: {
          agent_type: string | null
          author_id: string | null
          author_type: string
          blocks: Json
          change_reason: string | null
          content_id: string
          created_at: string
          id: string
          language: string
          meta_description: string | null
          outline: Json
          quality_result: Json
          run_id: string | null
          seo: Json
          slug: string | null
          task_id: string | null
          title: string | null
          version_number: number
          word_count: number
        }
        Insert: {
          agent_type?: string | null
          author_id?: string | null
          author_type?: string
          blocks?: Json
          change_reason?: string | null
          content_id: string
          created_at?: string
          id?: string
          language: string
          meta_description?: string | null
          outline?: Json
          quality_result?: Json
          run_id?: string | null
          seo?: Json
          slug?: string | null
          task_id?: string | null
          title?: string | null
          version_number: number
          word_count?: number
        }
        Update: {
          agent_type?: string | null
          author_id?: string | null
          author_type?: string
          blocks?: Json
          change_reason?: string | null
          content_id?: string
          created_at?: string
          id?: string
          language?: string
          meta_description?: string | null
          outline?: Json
          quality_result?: Json
          run_id?: string | null
          seo?: Json
          slug?: string | null
          task_id?: string | null
          title?: string | null
          version_number?: number
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_versions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_versions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_versions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
        ]
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
      conversion_conversations: {
        Row: {
          attribution: Json
          created_at: string
          estimated_cost: number
          id: string
          intent: string
          language: string
          last_message_at: string | null
          message_count: number
          session_token_hash: string
          status: string
          updated_at: string
          user_id: string | null
          visitor_id: string | null
        }
        Insert: {
          attribution?: Json
          created_at?: string
          estimated_cost?: number
          id?: string
          intent?: string
          language?: string
          last_message_at?: string | null
          message_count?: number
          session_token_hash: string
          status?: string
          updated_at?: string
          user_id?: string | null
          visitor_id?: string | null
        }
        Update: {
          attribution?: Json
          created_at?: string
          estimated_cost?: number
          id?: string
          intent?: string
          language?: string
          last_message_at?: string | null
          message_count?: number
          session_token_hash?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      conversion_leads: {
        Row: {
          attribution: Json
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          conversation_id: string | null
          created_at: string
          duration_days: number | null
          id: string
          intent: string
          interests: string[]
          notes: string | null
          origin_city: string | null
          product_id: string | null
          quote_id: string | null
          status: string
          travel_end: string | null
          travel_start: string | null
          travelers_adults: number
          travelers_children: number
          updated_at: string
        }
        Insert: {
          attribution?: Json
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          conversation_id?: string | null
          created_at?: string
          duration_days?: number | null
          id?: string
          intent?: string
          interests?: string[]
          notes?: string | null
          origin_city?: string | null
          product_id?: string | null
          quote_id?: string | null
          status?: string
          travel_end?: string | null
          travel_start?: string | null
          travelers_adults?: number
          travelers_children?: number
          updated_at?: string
        }
        Update: {
          attribution?: Json
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          conversation_id?: string | null
          created_at?: string
          duration_days?: number | null
          id?: string
          intent?: string
          interests?: string[]
          notes?: string | null
          origin_city?: string | null
          product_id?: string | null
          quote_id?: string | null
          status?: string
          travel_end?: string | null
          travel_start?: string | null
          travelers_adults?: number
          travelers_children?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversion_leads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversion_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_leads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "travel_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_leads_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "travel_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      conversion_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          estimated_cost: number
          grounded: boolean
          id: string
          input_tokens: number
          intent: string | null
          output_tokens: number
          role: string
          tools_used: Json
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          estimated_cost?: number
          grounded?: boolean
          id?: string
          input_tokens?: number
          intent?: string | null
          output_tokens?: number
          role: string
          tools_used?: Json
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          estimated_cost?: number
          grounded?: boolean
          id?: string
          input_tokens?: number
          intent?: string | null
          output_tokens?: number
          role?: string
          tools_used?: Json
        }
        Relationships: [
          {
            foreignKeyName: "conversion_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversion_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      discovery_cache: {
        Row: {
          cache_key: string
          created_at: string
          expires_at: string
          request: Json
          response: Json
          source: string
        }
        Insert: {
          cache_key: string
          created_at?: string
          expires_at: string
          request?: Json
          response: Json
          source: string
        }
        Update: {
          cache_key?: string
          created_at?: string
          expires_at?: string
          request?: Json
          response?: Json
          source?: string
        }
        Relationships: []
      }
      discovery_opportunities: {
        Row: {
          category: string | null
          confidence_score: number
          country: string
          created_at: string
          discovered_at: string
          evidence_type: string
          expires_at: string | null
          id: string
          intent: string | null
          intent_confidence: number | null
          language: string
          market: string | null
          metrics: Json
          opportunity_score: number
          query: string
          rationale: string | null
          recommended_action: string | null
          run_id: string | null
          season: string | null
          source: string
          source_reference: Json
          status: string
          task_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          confidence_score?: number
          country: string
          created_at?: string
          discovered_at?: string
          evidence_type?: string
          expires_at?: string | null
          id?: string
          intent?: string | null
          intent_confidence?: number | null
          language: string
          market?: string | null
          metrics?: Json
          opportunity_score?: number
          query: string
          rationale?: string | null
          recommended_action?: string | null
          run_id?: string | null
          season?: string | null
          source: string
          source_reference?: Json
          status?: string
          task_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          confidence_score?: number
          country?: string
          created_at?: string
          discovered_at?: string
          evidence_type?: string
          expires_at?: string | null
          id?: string
          intent?: string | null
          intent_confidence?: number | null
          language?: string
          market?: string | null
          metrics?: Json
          opportunity_score?: number
          query?: string
          rationale?: string | null
          recommended_action?: string | null
          run_id?: string | null
          season?: string | null
          source?: string
          source_reference?: Json
          status?: string
          task_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discovery_opportunities_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discovery_opportunities_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      discovery_opportunity_history: {
        Row: {
          changed_by: string | null
          confidence_score: number | null
          evidence_type: string | null
          id: string
          metrics: Json
          note: string | null
          opportunity_id: string
          opportunity_score: number | null
          previous_status: string | null
          recorded_at: string
          run_id: string | null
          source: string | null
          status: string | null
          task_id: string | null
        }
        Insert: {
          changed_by?: string | null
          confidence_score?: number | null
          evidence_type?: string | null
          id?: string
          metrics?: Json
          note?: string | null
          opportunity_id: string
          opportunity_score?: number | null
          previous_status?: string | null
          recorded_at?: string
          run_id?: string | null
          source?: string | null
          status?: string | null
          task_id?: string | null
        }
        Update: {
          changed_by?: string | null
          confidence_score?: number | null
          evidence_type?: string | null
          id?: string
          metrics?: Json
          note?: string | null
          opportunity_id?: string
          opportunity_score?: number | null
          previous_status?: string | null
          recorded_at?: string
          run_id?: string | null
          source?: string | null
          status?: string | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discovery_opportunity_history_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "discovery_opportunities"
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
      flight_offers: {
        Row: {
          base_amount: number | null
          created_at: string
          expires_at: string | null
          fare_conditions: Json
          hold_capable: boolean
          id: string
          last_reprice: Json | null
          owner_carrier: string | null
          owner_name: string | null
          payment_required_by: string | null
          payment_requirements: Json
          price_guarantee_expires_at: string | null
          provider: string
          provider_created_at: string | null
          provider_offer_id: string
          provider_offer_request_id: string | null
          refreshed_at: string | null
          requires_instant_payment: boolean
          search_id: string | null
          services: Json
          slices: Json
          status: string
          tax_amount: number | null
          total_amount: number
          total_currency: string
          updated_at: string
        }
        Insert: {
          base_amount?: number | null
          created_at?: string
          expires_at?: string | null
          fare_conditions?: Json
          hold_capable?: boolean
          id?: string
          last_reprice?: Json | null
          owner_carrier?: string | null
          owner_name?: string | null
          payment_required_by?: string | null
          payment_requirements?: Json
          price_guarantee_expires_at?: string | null
          provider?: string
          provider_created_at?: string | null
          provider_offer_id: string
          provider_offer_request_id?: string | null
          refreshed_at?: string | null
          requires_instant_payment?: boolean
          search_id?: string | null
          services?: Json
          slices?: Json
          status?: string
          tax_amount?: number | null
          total_amount: number
          total_currency: string
          updated_at?: string
        }
        Update: {
          base_amount?: number | null
          created_at?: string
          expires_at?: string | null
          fare_conditions?: Json
          hold_capable?: boolean
          id?: string
          last_reprice?: Json | null
          owner_carrier?: string | null
          owner_name?: string | null
          payment_required_by?: string | null
          payment_requirements?: Json
          price_guarantee_expires_at?: string | null
          provider?: string
          provider_created_at?: string | null
          provider_offer_id?: string
          provider_offer_request_id?: string | null
          refreshed_at?: string | null
          requires_instant_payment?: boolean
          search_id?: string | null
          services?: Json
          slices?: Json
          status?: string
          tax_amount?: number | null
          total_amount?: number
          total_currency?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flight_offers_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "flight_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      flight_searches: {
        Row: {
          adults: number
          cabin: string
          cache_key: string
          children: number
          created_at: string
          created_by: string | null
          departure_date: string
          destination: string
          duration_ms: number | null
          error_code: string | null
          expires_at: string | null
          id: string
          infants: number
          max_connections: number | null
          offers_count: number
          origin: string
          provider: string
          provider_mode: string
          provider_offer_request_id: string | null
          provider_request_id: string | null
          return_date: string | null
          status: string
        }
        Insert: {
          adults: number
          cabin: string
          cache_key: string
          children?: number
          created_at?: string
          created_by?: string | null
          departure_date: string
          destination: string
          duration_ms?: number | null
          error_code?: string | null
          expires_at?: string | null
          id?: string
          infants?: number
          max_connections?: number | null
          offers_count?: number
          origin: string
          provider?: string
          provider_mode?: string
          provider_offer_request_id?: string | null
          provider_request_id?: string | null
          return_date?: string | null
          status?: string
        }
        Update: {
          adults?: number
          cabin?: string
          cache_key?: string
          children?: number
          created_at?: string
          created_by?: string | null
          departure_date?: string
          destination?: string
          duration_ms?: number | null
          error_code?: string | null
          expires_at?: string | null
          id?: string
          infants?: number
          max_connections?: number | null
          offers_count?: number
          origin?: string
          provider?: string
          provider_mode?: string
          provider_offer_request_id?: string | null
          provider_request_id?: string | null
          return_date?: string | null
          status?: string
        }
        Relationships: []
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
      package_booking_items: {
        Row: {
          cancellation_summary: string | null
          cancellation_type: string | null
          component_id: string | null
          component_type: string
          created_at: string
          currency: string | null
          display_name: string
          estimated: boolean
          id: string
          line_order: number
          package_booking_id: string
          quantity: number
          quote_item_id: string | null
          rate_id: string | null
          rate_kind: string | null
          rate_valid_from: string | null
          rate_valid_until: string | null
          selling_price: number
          source_reference: string | null
          source_type: string | null
          supplier_id: string | null
          supplier_name: string | null
          total_cost: number
          unit: string | null
          unit_cost: number
          validity_unknown: boolean
        }
        Insert: {
          cancellation_summary?: string | null
          cancellation_type?: string | null
          component_id?: string | null
          component_type: string
          created_at?: string
          currency?: string | null
          display_name: string
          estimated?: boolean
          id?: string
          line_order?: number
          package_booking_id: string
          quantity?: number
          quote_item_id?: string | null
          rate_id?: string | null
          rate_kind?: string | null
          rate_valid_from?: string | null
          rate_valid_until?: string | null
          selling_price?: number
          source_reference?: string | null
          source_type?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          total_cost?: number
          unit?: string | null
          unit_cost?: number
          validity_unknown?: boolean
        }
        Update: {
          cancellation_summary?: string | null
          cancellation_type?: string | null
          component_id?: string | null
          component_type?: string
          created_at?: string
          currency?: string | null
          display_name?: string
          estimated?: boolean
          id?: string
          line_order?: number
          package_booking_id?: string
          quantity?: number
          quote_item_id?: string | null
          rate_id?: string | null
          rate_kind?: string | null
          rate_valid_from?: string | null
          rate_valid_until?: string | null
          selling_price?: number
          source_reference?: string | null
          source_type?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          total_cost?: number
          unit?: string | null
          unit_cost?: number
          validity_unknown?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "package_booking_items_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "package_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_booking_items_package_booking_id_fkey"
            columns: ["package_booking_id"]
            isOneToOne: false
            referencedRelation: "package_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_booking_items_quote_item_id_fkey"
            columns: ["quote_item_id"]
            isOneToOne: false
            referencedRelation: "travel_quote_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_booking_items_rate_id_fkey"
            columns: ["rate_id"]
            isOneToOne: false
            referencedRelation: "component_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_booking_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      package_bookings: {
        Row: {
          attribution: Json
          booking_number: string
          booking_status: string
          cancelled_at: string | null
          completed_at: string | null
          confirmed_cost: number
          confirmed_price: number
          created_at: string
          created_by: string | null
          currency: string
          customer_email: string | null
          customer_name: string | null
          flight_status: string
          id: string
          idempotency_key: string | null
          internal_notes: string | null
          issue_reason: string | null
          operations_status: string
          payment_status: string
          pricing_calculation_id: string | null
          product_id: string | null
          product_version_id: string | null
          quote_accepted_at: string | null
          quote_id: string
          quote_valid_until: string | null
          quote_version_id: string
          updated_at: string
          user_id: string | null
          visitor_id: string | null
        }
        Insert: {
          attribution?: Json
          booking_number?: string
          booking_status?: string
          cancelled_at?: string | null
          completed_at?: string | null
          confirmed_cost?: number
          confirmed_price?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          flight_status?: string
          id?: string
          idempotency_key?: string | null
          internal_notes?: string | null
          issue_reason?: string | null
          operations_status?: string
          payment_status?: string
          pricing_calculation_id?: string | null
          product_id?: string | null
          product_version_id?: string | null
          quote_accepted_at?: string | null
          quote_id: string
          quote_valid_until?: string | null
          quote_version_id: string
          updated_at?: string
          user_id?: string | null
          visitor_id?: string | null
        }
        Update: {
          attribution?: Json
          booking_number?: string
          booking_status?: string
          cancelled_at?: string | null
          completed_at?: string | null
          confirmed_cost?: number
          confirmed_price?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          flight_status?: string
          id?: string
          idempotency_key?: string | null
          internal_notes?: string | null
          issue_reason?: string | null
          operations_status?: string
          payment_status?: string
          pricing_calculation_id?: string | null
          product_id?: string | null
          product_version_id?: string | null
          quote_accepted_at?: string | null
          quote_id?: string
          quote_valid_until?: string | null
          quote_version_id?: string
          updated_at?: string
          user_id?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "package_bookings_pricing_calculation_id_fkey"
            columns: ["pricing_calculation_id"]
            isOneToOne: false
            referencedRelation: "pricing_calculations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_bookings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "travel_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_bookings_product_version_id_fkey"
            columns: ["product_version_id"]
            isOneToOne: false
            referencedRelation: "travel_product_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_bookings_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "travel_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_bookings_quote_version_id_fkey"
            columns: ["quote_version_id"]
            isOneToOne: false
            referencedRelation: "travel_quote_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      package_components: {
        Row: {
          accommodation_id: string | null
          component_type: string
          created_at: string
          created_by: string | null
          description: string | null
          flight_reference: Json
          guide_profile_id: string | null
          id: string
          metadata: Json
          name: string
          notes: string | null
          room_id: string | null
          service_id: string | null
          status: string
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          accommodation_id?: string | null
          component_type: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          flight_reference?: Json
          guide_profile_id?: string | null
          id?: string
          metadata?: Json
          name: string
          notes?: string | null
          room_id?: string | null
          service_id?: string | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          accommodation_id?: string | null
          component_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          flight_reference?: Json
          guide_profile_id?: string | null
          id?: string
          metadata?: Json
          name?: string
          notes?: string | null
          room_id?: string | null
          service_id?: string | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_components_accommodation_id_fkey"
            columns: ["accommodation_id"]
            isOneToOne: false
            referencedRelation: "accommodations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_components_guide_profile_id_fkey"
            columns: ["guide_profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_components_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "accommodation_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_components_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_components_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          created_at: string
          event_id: string
          event_type: string
          id: string
          package_booking_id: string | null
          processed_at: string
          provider: string
          result: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          event_type: string
          id?: string
          package_booking_id?: string | null
          processed_at?: string
          provider?: string
          result?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          event_type?: string
          id?: string
          package_booking_id?: string | null
          processed_at?: string
          provider?: string
          result?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_package_booking_id_fkey"
            columns: ["package_booking_id"]
            isOneToOne: false
            referencedRelation: "package_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_calculations: {
        Row: {
          calculation_kind: string
          cost_total: number
          created_at: string
          created_by: string | null
          currency: string
          final_price: number
          gross_margin_pct: number | null
          id: string
          input: Json
          markup_total: number
          policy_id: string | null
          policy_version_id: string | null
          policy_version_number: number | null
          product_id: string | null
          product_version_id: string | null
          result: Json
          status: string
          subtotal: number
          validation_errors: Json
          warnings: Json
        }
        Insert: {
          calculation_kind?: string
          cost_total?: number
          created_at?: string
          created_by?: string | null
          currency: string
          final_price?: number
          gross_margin_pct?: number | null
          id?: string
          input?: Json
          markup_total?: number
          policy_id?: string | null
          policy_version_id?: string | null
          policy_version_number?: number | null
          product_id?: string | null
          product_version_id?: string | null
          result?: Json
          status: string
          subtotal?: number
          validation_errors?: Json
          warnings?: Json
        }
        Update: {
          calculation_kind?: string
          cost_total?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          final_price?: number
          gross_margin_pct?: number | null
          id?: string
          input?: Json
          markup_total?: number
          policy_id?: string | null
          policy_version_id?: string | null
          policy_version_number?: number | null
          product_id?: string | null
          product_version_id?: string | null
          result?: Json
          status?: string
          subtotal?: number
          validation_errors?: Json
          warnings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "pricing_calculations_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "pricing_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_calculations_policy_version_id_fkey"
            columns: ["policy_version_id"]
            isOneToOne: false
            referencedRelation: "pricing_policy_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_calculations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "travel_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_calculations_product_version_id_fkey"
            columns: ["product_version_id"]
            isOneToOne: false
            referencedRelation: "travel_product_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_policies: {
        Row: {
          base_currency: string
          created_at: string
          created_by: string | null
          current_version_id: string | null
          description: string | null
          id: string
          name: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          base_currency?: string
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          description?: string | null
          id?: string
          name: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          base_currency?: string
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          description?: string | null
          id?: string
          name?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_policies_current_version_fk"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "pricing_policy_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_policy_versions: {
        Row: {
          activated_at: string | null
          base_currency: string
          change_reason: string | null
          component_rules: Json
          created_at: string
          created_by: string | null
          fees: Json
          flight_protection: Json
          id: string
          margin_mode: string
          min_margin_pct: number
          operational_costs: Json
          policy_id: string
          rounding_mode: string
          status: string
          supplements: Json
          target_margin_pct: number
          updated_at: string
          valid_from: string | null
          valid_until: string | null
          version_number: number
        }
        Insert: {
          activated_at?: string | null
          base_currency?: string
          change_reason?: string | null
          component_rules?: Json
          created_at?: string
          created_by?: string | null
          fees?: Json
          flight_protection?: Json
          id?: string
          margin_mode?: string
          min_margin_pct?: number
          operational_costs?: Json
          policy_id: string
          rounding_mode?: string
          status?: string
          supplements?: Json
          target_margin_pct?: number
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          version_number: number
        }
        Update: {
          activated_at?: string | null
          base_currency?: string
          change_reason?: string | null
          component_rules?: Json
          created_at?: string
          created_by?: string | null
          fees?: Json
          flight_protection?: Json
          id?: string
          margin_mode?: string
          min_margin_pct?: number
          operational_costs?: Json
          policy_id?: string
          rounding_mode?: string
          status?: string
          supplements?: Json
          target_margin_pct?: number
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "pricing_policy_versions_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "pricing_policies"
            referencedColumns: ["id"]
          },
        ]
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
      quote_revalidations: {
        Row: {
          blocking_reasons: Json
          created_at: string
          created_by: string | null
          currency: string | null
          flight_note: string | null
          flight_status: string | null
          id: string
          new_price: number | null
          new_quote_version_id: string | null
          outcome: string
          previous_price: number | null
          price_difference: number | null
          price_difference_pct: number | null
          pricing_calculation_id: string | null
          pricing_status: string | null
          quote_id: string
          quote_version_id: string
          requires_reacceptance: boolean
          warnings: Json
        }
        Insert: {
          blocking_reasons?: Json
          created_at?: string
          created_by?: string | null
          currency?: string | null
          flight_note?: string | null
          flight_status?: string | null
          id?: string
          new_price?: number | null
          new_quote_version_id?: string | null
          outcome: string
          previous_price?: number | null
          price_difference?: number | null
          price_difference_pct?: number | null
          pricing_calculation_id?: string | null
          pricing_status?: string | null
          quote_id: string
          quote_version_id: string
          requires_reacceptance?: boolean
          warnings?: Json
        }
        Update: {
          blocking_reasons?: Json
          created_at?: string
          created_by?: string | null
          currency?: string | null
          flight_note?: string | null
          flight_status?: string | null
          id?: string
          new_price?: number | null
          new_quote_version_id?: string | null
          outcome?: string
          previous_price?: number | null
          price_difference?: number | null
          price_difference_pct?: number | null
          pricing_calculation_id?: string | null
          pricing_status?: string | null
          quote_id?: string
          quote_version_id?: string
          requires_reacceptance?: boolean
          warnings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "quote_revalidations_new_quote_version_id_fkey"
            columns: ["new_quote_version_id"]
            isOneToOne: false
            referencedRelation: "travel_quote_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_revalidations_pricing_calculation_id_fkey"
            columns: ["pricing_calculation_id"]
            isOneToOne: false
            referencedRelation: "pricing_calculations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_revalidations_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "travel_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_revalidations_quote_version_id_fkey"
            columns: ["quote_version_id"]
            isOneToOne: false
            referencedRelation: "travel_quote_versions"
            referencedColumns: ["id"]
          },
        ]
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
      supplier_confirmations: {
        Row: {
          component_id: string | null
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          deadline_at: string | null
          id: string
          notes: string | null
          package_booking_id: string
          requested_at: string | null
          status: string
          supplier_id: string | null
          supplier_reference: string | null
          updated_at: string
        }
        Insert: {
          component_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          deadline_at?: string | null
          id?: string
          notes?: string | null
          package_booking_id: string
          requested_at?: string | null
          status?: string
          supplier_id?: string | null
          supplier_reference?: string | null
          updated_at?: string
        }
        Update: {
          component_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          deadline_at?: string | null
          id?: string
          notes?: string | null
          package_booking_id?: string
          requested_at?: string | null
          status?: string
          supplier_id?: string | null
          supplier_reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_confirmations_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "package_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_confirmations_package_booking_id_fkey"
            columns: ["package_booking_id"]
            isOneToOne: false
            referencedRelation: "package_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_confirmations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          country: string
          created_at: string
          created_by: string | null
          id: string
          legal_name: string
          locality: string | null
          notes: string | null
          relationship_stage: string
          status: string
          supplier_type: string
          trading_name: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          id?: string
          legal_name: string
          locality?: string | null
          notes?: string | null
          relationship_stage?: string
          status?: string
          supplier_type: string
          trading_name?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          id?: string
          legal_name?: string
          locality?: string | null
          notes?: string | null
          relationship_stage?: string
          status?: string
          supplier_type?: string
          trading_name?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
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
      traffic_events: {
        Row: {
          created_at: string
          currency: string | null
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          language: string | null
          path: string | null
          referrer_host: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          value: number | null
          visitor_id: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          language?: string | null
          path?: string | null
          referrer_host?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          value?: number | null
          visitor_id: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          language?: string | null
          path?: string | null
          referrer_host?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          value?: number | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "traffic_events_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "traffic_visitors"
            referencedColumns: ["visitor_id"]
          },
        ]
      }
      traffic_visitors: {
        Row: {
          created_at: string
          first_landing_path: string | null
          first_language: string | null
          first_referrer_host: string | null
          first_utm_campaign: string | null
          first_utm_content: string | null
          first_utm_medium: string | null
          first_utm_source: string | null
          first_utm_term: string | null
          updated_at: string
          visitor_id: string
        }
        Insert: {
          created_at?: string
          first_landing_path?: string | null
          first_language?: string | null
          first_referrer_host?: string | null
          first_utm_campaign?: string | null
          first_utm_content?: string | null
          first_utm_medium?: string | null
          first_utm_source?: string | null
          first_utm_term?: string | null
          updated_at?: string
          visitor_id: string
        }
        Update: {
          created_at?: string
          first_landing_path?: string | null
          first_language?: string | null
          first_referrer_host?: string | null
          first_utm_campaign?: string | null
          first_utm_content?: string | null
          first_utm_medium?: string | null
          first_utm_source?: string | null
          first_utm_term?: string | null
          updated_at?: string
          visitor_id?: string
        }
        Relationships: []
      }
      travel_product_versions: {
        Row: {
          change_reason: string | null
          conditions: Json
          created_at: string
          created_by: string | null
          duration_days: number
          id: string
          included_components: Json
          nights: number
          product_id: string
          published_at: string | null
          status: string
          terms: string | null
          updated_at: string
          version_number: number
        }
        Insert: {
          change_reason?: string | null
          conditions?: Json
          created_at?: string
          created_by?: string | null
          duration_days: number
          id?: string
          included_components?: Json
          nights: number
          product_id: string
          published_at?: string | null
          status?: string
          terms?: string | null
          updated_at?: string
          version_number: number
        }
        Update: {
          change_reason?: string | null
          conditions?: Json
          created_at?: string
          created_by?: string | null
          duration_days?: number
          id?: string
          included_components?: Json
          nights?: number
          product_id?: string
          published_at?: string | null
          status?: string
          terms?: string | null
          updated_at?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "travel_product_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "travel_products"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_products: {
        Row: {
          created_at: string
          created_by: string | null
          current_version_id: string | null
          description: string | null
          id: string
          maximum_days: number | null
          maximum_nights: number | null
          minimum_days: number
          minimum_nights: number
          name: string
          product_type: string
          slug: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          description?: string | null
          id?: string
          maximum_days?: number | null
          maximum_nights?: number | null
          minimum_days: number
          minimum_nights: number
          name: string
          product_type?: string
          slug: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          description?: string | null
          id?: string
          maximum_days?: number | null
          maximum_nights?: number | null
          minimum_days?: number
          minimum_nights?: number
          name?: string
          product_type?: string
          slug?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_products_current_version_fkey"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "travel_product_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_quote_items: {
        Row: {
          cancellation_summary: string | null
          cancellation_type: string | null
          component_id: string | null
          component_type: string
          created_at: string
          currency: string | null
          display_name: string
          estimated: boolean
          id: string
          line_order: number
          notes: Json
          quantity: number
          quote_version_id: string
          rate_id: string | null
          rate_kind: string | null
          rate_status: string | null
          rate_valid_from: string | null
          rate_valid_until: string | null
          rule_mode: string | null
          rule_pct: number | null
          selling_price: number
          source_reference: string | null
          source_type: string | null
          supplier_id: string | null
          supplier_name: string | null
          total_cost: number
          unit: string | null
          unit_cost: number
          validity_unknown: boolean
        }
        Insert: {
          cancellation_summary?: string | null
          cancellation_type?: string | null
          component_id?: string | null
          component_type: string
          created_at?: string
          currency?: string | null
          display_name: string
          estimated?: boolean
          id?: string
          line_order?: number
          notes?: Json
          quantity?: number
          quote_version_id: string
          rate_id?: string | null
          rate_kind?: string | null
          rate_status?: string | null
          rate_valid_from?: string | null
          rate_valid_until?: string | null
          rule_mode?: string | null
          rule_pct?: number | null
          selling_price?: number
          source_reference?: string | null
          source_type?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          total_cost?: number
          unit?: string | null
          unit_cost?: number
          validity_unknown?: boolean
        }
        Update: {
          cancellation_summary?: string | null
          cancellation_type?: string | null
          component_id?: string | null
          component_type?: string
          created_at?: string
          currency?: string | null
          display_name?: string
          estimated?: boolean
          id?: string
          line_order?: number
          notes?: Json
          quantity?: number
          quote_version_id?: string
          rate_id?: string | null
          rate_kind?: string | null
          rate_status?: string | null
          rate_valid_from?: string | null
          rate_valid_until?: string | null
          rule_mode?: string | null
          rule_pct?: number | null
          selling_price?: number
          source_reference?: string | null
          source_type?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          total_cost?: number
          unit?: string | null
          unit_cost?: number
          validity_unknown?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "travel_quote_items_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "package_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_quote_items_quote_version_id_fkey"
            columns: ["quote_version_id"]
            isOneToOne: false
            referencedRelation: "travel_quote_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_quote_items_rate_id_fkey"
            columns: ["rate_id"]
            isOneToOne: false
            referencedRelation: "component_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_quote_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_quote_versions: {
        Row: {
          blocking_reasons: Json
          change_reason: string | null
          confirmable: boolean
          cost_currency: string | null
          created_at: string
          created_by: string | null
          customer_criteria: Json
          flight_expires_at: string | null
          flight_offer_id: string | null
          flight_provider_offer_id: string | null
          flight_snapshot: Json | null
          fx_at: string | null
          fx_rate: number | null
          id: string
          policy_id: string | null
          policy_version_id: string | null
          policy_version_number: number | null
          previous_price: number | null
          previous_version_id: string | null
          price_difference: number | null
          pricing_calculation_id: string | null
          pricing_status: string | null
          quote_id: string
          sale_currency: string | null
          status: string
          superseded_at: string | null
          total_cost: number
          total_price: number
          updated_at: string
          valid_until: string | null
          validity_limited_by: string | null
          version_number: number
          warnings: Json
        }
        Insert: {
          blocking_reasons?: Json
          change_reason?: string | null
          confirmable?: boolean
          cost_currency?: string | null
          created_at?: string
          created_by?: string | null
          customer_criteria?: Json
          flight_expires_at?: string | null
          flight_offer_id?: string | null
          flight_provider_offer_id?: string | null
          flight_snapshot?: Json | null
          fx_at?: string | null
          fx_rate?: number | null
          id?: string
          policy_id?: string | null
          policy_version_id?: string | null
          policy_version_number?: number | null
          previous_price?: number | null
          previous_version_id?: string | null
          price_difference?: number | null
          pricing_calculation_id?: string | null
          pricing_status?: string | null
          quote_id: string
          sale_currency?: string | null
          status?: string
          superseded_at?: string | null
          total_cost?: number
          total_price?: number
          updated_at?: string
          valid_until?: string | null
          validity_limited_by?: string | null
          version_number: number
          warnings?: Json
        }
        Update: {
          blocking_reasons?: Json
          change_reason?: string | null
          confirmable?: boolean
          cost_currency?: string | null
          created_at?: string
          created_by?: string | null
          customer_criteria?: Json
          flight_expires_at?: string | null
          flight_offer_id?: string | null
          flight_provider_offer_id?: string | null
          flight_snapshot?: Json | null
          fx_at?: string | null
          fx_rate?: number | null
          id?: string
          policy_id?: string | null
          policy_version_id?: string | null
          policy_version_number?: number | null
          previous_price?: number | null
          previous_version_id?: string | null
          price_difference?: number | null
          pricing_calculation_id?: string | null
          pricing_status?: string | null
          quote_id?: string
          sale_currency?: string | null
          status?: string
          superseded_at?: string | null
          total_cost?: number
          total_price?: number
          updated_at?: string
          valid_until?: string | null
          validity_limited_by?: string | null
          version_number?: number
          warnings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "travel_quote_versions_flight_offer_id_fkey"
            columns: ["flight_offer_id"]
            isOneToOne: false
            referencedRelation: "flight_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_quote_versions_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "pricing_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_quote_versions_policy_version_id_fkey"
            columns: ["policy_version_id"]
            isOneToOne: false
            referencedRelation: "pricing_policy_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_quote_versions_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "travel_quote_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_quote_versions_pricing_calculation_id_fkey"
            columns: ["pricing_calculation_id"]
            isOneToOne: false
            referencedRelation: "pricing_calculations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_quote_versions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "travel_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_quotes: {
        Row: {
          acceptance_context: Json
          accepted_at: string | null
          accepted_channel: string | null
          accepted_version_id: string | null
          attribution: Json
          cancelled_at: string | null
          channel: string
          created_at: string
          created_by: string | null
          current_version_id: string | null
          customer_email: string | null
          customer_name: string | null
          expires_at: string | null
          id: string
          idempotency_key: string | null
          last_revalidated_at: string | null
          notes: string | null
          package_booking_id: string | null
          product_id: string | null
          product_version_id: string | null
          public_token_expires_at: string | null
          public_token_hash: string | null
          quote_number: string
          requires_reacceptance: boolean
          sale_currency: string
          sent_at: string | null
          status: string
          updated_at: string
          version_count: number
          visitor_id: string | null
        }
        Insert: {
          acceptance_context?: Json
          accepted_at?: string | null
          accepted_channel?: string | null
          accepted_version_id?: string | null
          attribution?: Json
          cancelled_at?: string | null
          channel?: string
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          customer_email?: string | null
          customer_name?: string | null
          expires_at?: string | null
          id?: string
          idempotency_key?: string | null
          last_revalidated_at?: string | null
          notes?: string | null
          package_booking_id?: string | null
          product_id?: string | null
          product_version_id?: string | null
          public_token_expires_at?: string | null
          public_token_hash?: string | null
          quote_number?: string
          requires_reacceptance?: boolean
          sale_currency?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
          version_count?: number
          visitor_id?: string | null
        }
        Update: {
          acceptance_context?: Json
          accepted_at?: string | null
          accepted_channel?: string | null
          accepted_version_id?: string | null
          attribution?: Json
          cancelled_at?: string | null
          channel?: string
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          customer_email?: string | null
          customer_name?: string | null
          expires_at?: string | null
          id?: string
          idempotency_key?: string | null
          last_revalidated_at?: string | null
          notes?: string | null
          package_booking_id?: string | null
          product_id?: string | null
          product_version_id?: string | null
          public_token_expires_at?: string | null
          public_token_hash?: string | null
          quote_number?: string
          requires_reacceptance?: boolean
          sale_currency?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
          version_count?: number
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "travel_quotes_accepted_version_id_fkey"
            columns: ["accepted_version_id"]
            isOneToOne: false
            referencedRelation: "travel_quote_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_quotes_current_version_fk"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "travel_quote_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_quotes_package_booking_id_fkey"
            columns: ["package_booking_id"]
            isOneToOne: false
            referencedRelation: "package_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_quotes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "travel_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_quotes_product_version_id_fkey"
            columns: ["product_version_id"]
            isOneToOne: false
            referencedRelation: "travel_product_versions"
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
      acquisition_markets: { Args: never; Returns: Json }
      acquisition_request_asset: { Args: { _payload: Json }; Returns: Json }
      acquisition_save_campaign_draft: {
        Args: { _payload: Json }
        Returns: Json
      }
      acquisition_save_plan: { Args: { _payload: Json }; Returns: Json }
      acquisition_stats: { Args: never; Returns: Json }
      admin_create_product_version: { Args: { _payload: Json }; Returns: Json }
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
      admin_publish_product_version: {
        Args: { _note?: string; _version_id: string }
        Returns: Json
      }
      admin_record_pricing_calculation: {
        Args: { _payload: Json }
        Returns: Json
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
      admin_restore_content_version: {
        Args: { _content_id: string; _note?: string; _version_id: string }
        Returns: Json
      }
      admin_review_document: {
        Args: { _approve: boolean; _reason?: string; _request_id: string }
        Returns: undefined
      }
      admin_save_accommodation: { Args: { _payload: Json }; Returns: Json }
      admin_save_component: { Args: { _payload: Json }; Returns: Json }
      admin_save_policy_version: { Args: { _payload: Json }; Returns: Json }
      admin_save_pricing_policy: { Args: { _payload: Json }; Returns: Json }
      admin_save_rate: { Args: { _payload: Json }; Returns: Json }
      admin_save_room: { Args: { _payload: Json }; Returns: Json }
      admin_save_supplier: { Args: { _payload: Json }; Returns: Json }
      admin_save_travel_product: { Args: { _payload: Json }; Returns: Json }
      admin_set_content_status: {
        Args: { _content_id: string; _note?: string; _status: string }
        Returns: Json
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
      admin_set_opportunity_status: {
        Args: { _note?: string; _opportunity_id: string; _status: string }
        Returns: undefined
      }
      admin_set_plan_status: {
        Args: { _note?: string; _plan_id: string; _status: string }
        Returns: Json
      }
      admin_set_policy_version_status: {
        Args: { _note?: string; _status: string; _version_id: string }
        Returns: Json
      }
      admin_set_quote_status: {
        Args: { _note?: string; _quote_id: string; _status: string }
        Returns: Json
      }
      admin_set_rate_status: {
        Args: { _note?: string; _rate_id: string; _status: string }
        Returns: Json
      }
      admin_set_supply_status: {
        Args: {
          _entity: string
          _entity_id: string
          _note?: string
          _status: string
        }
        Returns: Json
      }
      admin_set_travel_product_status: {
        Args: { _note?: string; _product_id: string; _status: string }
        Returns: Json
      }
      agent_claim_task: {
        Args: { _limit?: number }
        Returns: {
          agent_type: Database["public"]["Enums"]["agent_type"]
          completed_at: string | null
          created_at: string
          created_by: string | null
          depth: number
          failed_at: string | null
          id: string
          idempotency_key: string
          last_error: string | null
          locked_at: string | null
          max_cost_per_run: number
          max_retries: number
          parent_task_id: string | null
          payload: Json
          priority: number
          result: Json | null
          retry_count: number
          scheduled_for: string
          started_at: string | null
          status: Database["public"]["Enums"]["agent_task_status"]
          task_type: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "agent_tasks"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      agent_cost_totals: {
        Args: { _agent?: Database["public"]["Enums"]["agent_type"] }
        Returns: {
          daily_total: number
          monthly_total: number
        }[]
      }
      agent_recover_stuck_tasks: {
        Args: { _timeout_minutes?: number }
        Returns: {
          agent_type: Database["public"]["Enums"]["agent_type"]
          released_status: Database["public"]["Enums"]["agent_task_status"]
          retry_count: number
          task_id: string
        }[]
      }
      agent_review_approval: {
        Args: { _approval_id: string; _approve: boolean; _reason?: string }
        Returns: undefined
      }
      agent_task_heartbeat: { Args: { _task_id: string }; Returns: undefined }
      approve_professional_verification: {
        Args: { _note?: string; _verification_request_id: string }
        Returns: undefined
      }
      content_cache_get: {
        Args: { _key: string }
        Returns: {
          created_at: string
          payload: Json
        }[]
      }
      content_cache_put: {
        Args: { _key: string; _payload: Json; _ttl_hours?: number }
        Returns: undefined
      }
      content_save_draft: { Args: { _payload: Json }; Returns: Json }
      content_stats: { Args: never; Returns: Json }
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
      discovery_cache_get: {
        Args: { _key: string }
        Returns: {
          created_at: string
          expired: boolean
          response: Json
        }[]
      }
      discovery_cache_put: {
        Args: {
          _key: string
          _request: Json
          _response: Json
          _source: string
          _ttl_hours?: number
        }
        Returns: undefined
      }
      discovery_save_opportunity: { Args: { _payload: Json }; Returns: string }
      discovery_stats: {
        Args: never
        Returns: {
          aceites: number
          avg_confidence: number
          avg_cost: number
          avg_score: number
          distinct_countries: number
          distinct_markets: number
          em_analise: number
          expiradas: number
          last_run_at: string
          novas: number
          rejeitadas: number
          total: number
          total_cost: number
        }[]
      }
      flight_stats: { Args: never; Returns: Json }
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
      next_package_booking_number: { Args: never; Returns: string }
      next_quote_number: { Args: never; Returns: string }
      pricing_stats: { Args: never; Returns: Json }
      quote_stats: { Args: never; Returns: Json }
      record_traffic_event: {
        Args: {
          _attribution?: Json
          _entity_id?: string
          _entity_type?: string
          _event_type: string
          _path?: string
          _visitor_id: string
        }
        Returns: undefined
      }
      request_verification_documents: {
        Args: {
          _items: Json
          _message: string
          _verification_request_id: string
        }
        Returns: string
      }
      supply_stats: { Args: never; Returns: Json }
      travel_product_stats: { Args: never; Returns: Json }
    }
    Enums: {
      agent_approval_status:
        | "pending"
        | "approved"
        | "rejected"
        | "expired"
        | "cancelled"
      agent_permission_level: "free" | "approval_required" | "forbidden"
      agent_task_status:
        | "pending"
        | "queued"
        | "running"
        | "waiting_approval"
        | "completed"
        | "failed"
        | "permanently_failed"
        | "cancelled"
      agent_type:
        | "content"
        | "discovery"
        | "acquisition"
        | "conversion"
        | "orchestrator"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      agent_approval_status: [
        "pending",
        "approved",
        "rejected",
        "expired",
        "cancelled",
      ],
      agent_permission_level: ["free", "approval_required", "forbidden"],
      agent_task_status: [
        "pending",
        "queued",
        "running",
        "waiting_approval",
        "completed",
        "failed",
        "permanently_failed",
        "cancelled",
      ],
      agent_type: [
        "content",
        "discovery",
        "acquisition",
        "conversion",
        "orchestrator",
      ],
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
