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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          user_email: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          user_email?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          user_email?: string | null
        }
        Relationships: []
      }
      cart_email_progress: {
        Row: {
          created_at: string
          current_product_index: number
          id: string
          last_sent_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_product_index?: number
          id?: string
          last_sent_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_product_index?: number
          id?: string
          last_sent_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          last_login_at: string | null
          phone: string | null
          provider: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          phone?: string | null
          provider?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          phone?: string | null
          provider?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          audience: string
          banner_image: string | null
          body: string | null
          campaign_type: string
          created_at: string
          created_by: string | null
          failed_count: number
          id: string
          product_ids: string[]
          selected_user_ids: string[]
          sent_count: number
          status: string
          template_type: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          audience?: string
          banner_image?: string | null
          body?: string | null
          campaign_type: string
          created_at?: string
          created_by?: string | null
          failed_count?: number
          id?: string
          product_ids?: string[]
          selected_user_ids?: string[]
          sent_count?: number
          status?: string
          template_type?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          audience?: string
          banner_image?: string | null
          body?: string | null
          campaign_type?: string
          created_at?: string
          created_by?: string | null
          failed_count?: number
          id?: string
          product_ids?: string[]
          selected_user_ids?: string[]
          sent_count?: number
          status?: string
          template_type?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          campaign_id: string | null
          email: string | null
          event_at: string
          id: string
          metadata: Json
          provider_message_id: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          email?: string | null
          event_at?: string
          id?: string
          metadata?: Json
          provider_message_id?: string | null
          status: string
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          email?: string | null
          event_at?: string
          id?: string
          metadata?: Json
          provider_message_id?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          created_at: string
          id: string
          template_content: string
          template_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          template_content?: string
          template_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          template_content?: string
          template_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          item_count: number
          items: Json
          order_code: string
          pdf_path: string | null
          total_estimate: number | null
          user_id: string | null
          whatsapp_status: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          item_count?: number
          items?: Json
          order_code: string
          pdf_path?: string | null
          total_estimate?: number | null
          user_id?: string | null
          whatsapp_status?: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          item_count?: number
          items?: Json
          order_code?: string
          pdf_path?: string | null
          total_estimate?: number | null
          user_id?: string | null
          whatsapp_status?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          currency: string
          family: string | null
          finished_image: string | null
          full_details: string | null
          id: string
          item_code: string | null
          price: number | null
          product_image: string | null
          product_name: string
          product_type: string | null
          tags: string[] | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          currency?: string
          family?: string | null
          finished_image?: string | null
          full_details?: string | null
          id?: string
          item_code?: string | null
          price?: number | null
          product_image?: string | null
          product_name: string
          product_type?: string | null
          tags?: string[] | null
        }
        Update: {
          category?: string | null
          created_at?: string
          currency?: string
          family?: string | null
          finished_image?: string | null
          full_details?: string | null
          id?: string
          item_code?: string | null
          price?: number | null
          product_image?: string | null
          product_name?: string
          product_type?: string | null
          tags?: string[] | null
        }
        Relationships: []
      }
      project_requests: {
        Row: {
          created_at: string
          description: string | null
          email: string | null
          full_name: string
          id: string
          phone: string
          preferred_contact: string | null
          project_type: string | null
          state: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          email?: string | null
          full_name: string
          id?: string
          phone: string
          preferred_contact?: string | null
          project_type?: string | null
          state?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          email?: string | null
          full_name?: string
          id?: string
          phone?: string
          preferred_contact?: string | null
          project_type?: string | null
          state?: string | null
        }
        Relationships: []
      }
      scheduler_state: {
        Row: {
          automation_status: string
          cart_reminder_index: number
          created_at: string
          current_product_index: number
          current_template_index: number
          id: string
          last_execution: string | null
          meta: Json
          next_execution: string | null
          scheduler_name: string
          updated_at: string
          used_product_combos: Json
          used_template_indexes: Json
        }
        Insert: {
          automation_status?: string
          cart_reminder_index?: number
          created_at?: string
          current_product_index?: number
          current_template_index?: number
          id?: string
          last_execution?: string | null
          meta?: Json
          next_execution?: string | null
          scheduler_name: string
          updated_at?: string
          used_product_combos?: Json
          used_template_indexes?: Json
        }
        Update: {
          automation_status?: string
          cart_reminder_index?: number
          created_at?: string
          current_product_index?: number
          current_template_index?: number
          id?: string
          last_execution?: string | null
          meta?: Json
          next_execution?: string | null
          scheduler_name?: string
          updated_at?: string
          used_product_combos?: Json
          used_template_indexes?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "staff" | "customer"
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
      app_role: ["super_admin", "staff", "customer"],
    },
  },
} as const
