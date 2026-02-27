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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: Database["public"]["Enums"]["admin_action"]
          admin_id: string
          created_at: string
          id: string
          reason: string | null
          target_id: string
          target_type: Database["public"]["Enums"]["admin_target_type"]
        }
        Insert: {
          action: Database["public"]["Enums"]["admin_action"]
          admin_id: string
          created_at?: string
          id?: string
          reason?: string | null
          target_id: string
          target_type: Database["public"]["Enums"]["admin_target_type"]
        }
        Update: {
          action?: Database["public"]["Enums"]["admin_action"]
          admin_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          target_id?: string
          target_type?: Database["public"]["Enums"]["admin_target_type"]
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          inquiry_status: Database["public"]["Enums"]["inquiry_status"]
          last_message_at: string
          lister_id: string
          listing_id: string
          move_in_date: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          inquiry_status?: Database["public"]["Enums"]["inquiry_status"]
          last_message_at?: string
          lister_id: string
          listing_id: string
          move_in_date?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          inquiry_status?: Database["public"]["Enums"]["inquiry_status"]
          last_message_at?: string
          lister_id?: string
          listing_id?: string
          move_in_date?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_lister_id_fkey"
            columns: ["lister_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_drafts: {
        Row: {
          created_at: string
          current_step: number
          data: Json
          lister_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_step?: number
          data?: Json
          lister_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_step?: number
          data?: Json
          lister_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_drafts_lister_id_fkey"
            columns: ["lister_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_photos: {
        Row: {
          ai_confidence: number | null
          ai_verified: boolean | null
          angle: Database["public"]["Enums"]["listing_photo_angle"]
          created_at: string
          id: string
          listing_id: string
          public_url: string
          storage_path: string
          updated_at: string
        }
        Insert: {
          ai_confidence?: number | null
          ai_verified?: boolean | null
          angle: Database["public"]["Enums"]["listing_photo_angle"]
          created_at?: string
          id?: string
          listing_id: string
          public_url: string
          storage_path: string
          updated_at?: string
        }
        Update: {
          ai_confidence?: number | null
          ai_verified?: boolean | null
          angle?: Database["public"]["Enums"]["listing_photo_angle"]
          created_at?: string
          id?: string
          listing_id?: string
          public_url?: string
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_photos_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          amenities: Json
          available_from: string | null
          created_at: string
          description: string
          district: string
          featured: boolean
          gender_preference: Database["public"]["Enums"]["gender_preference"]
          house_rules: string | null
          id: string
          lat: number | null
          lister_id: string
          lng: number | null
          near_universities: string[]
          price_monthly: number
          promotion_expires_at: string | null
          promotion_level: number
          region: string
          rejection_reason: string | null
          room_type: Database["public"]["Enums"]["room_type"]
          status: Database["public"]["Enums"]["listing_status"]
          street: string
          title: string
          updated_at: string
          utilities_included: boolean
          vacancy_status: Database["public"]["Enums"]["vacancy_status"]
          view_count: number
          ward: string
        }
        Insert: {
          amenities?: Json
          available_from?: string | null
          created_at?: string
          description: string
          district: string
          featured?: boolean
          gender_preference?: Database["public"]["Enums"]["gender_preference"]
          house_rules?: string | null
          id?: string
          lat?: number | null
          lister_id: string
          lng?: number | null
          near_universities?: string[]
          price_monthly: number
          promotion_expires_at?: string | null
          promotion_level?: number
          region: string
          rejection_reason?: string | null
          room_type: Database["public"]["Enums"]["room_type"]
          status?: Database["public"]["Enums"]["listing_status"]
          street: string
          title: string
          updated_at?: string
          utilities_included?: boolean
          vacancy_status?: Database["public"]["Enums"]["vacancy_status"]
          view_count?: number
          ward: string
        }
        Update: {
          amenities?: Json
          available_from?: string | null
          created_at?: string
          description?: string
          district?: string
          featured?: boolean
          gender_preference?: Database["public"]["Enums"]["gender_preference"]
          house_rules?: string | null
          id?: string
          lat?: number | null
          lister_id?: string
          lng?: number | null
          near_universities?: string[]
          price_monthly?: number
          promotion_expires_at?: string | null
          promotion_level?: number
          region?: string
          rejection_reason?: string | null
          room_type?: Database["public"]["Enums"]["room_type"]
          status?: Database["public"]["Enums"]["listing_status"]
          street?: string
          title?: string
          updated_at?: string
          utilities_included?: boolean
          vacancy_status?: Database["public"]["Enums"]["vacancy_status"]
          view_count?: number
          ward?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_lister_id_fkey"
            columns: ["lister_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          seen_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          seen_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          seen_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_verification_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          phone: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          phone: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "phone_verification_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          commission_rate_pct: number | null
          created_at: string
          full_name: string
          id: string
          id_doc_url: string | null
          lister_type: Database["public"]["Enums"]["lister_type"] | null
          payout_provider: string | null
          payout_reference: string | null
          phone: string | null
          phone_verified: boolean
          profile_photo_url: string | null
          role: Database["public"]["Enums"]["app_role"]
          selfie_url: string | null
          subscription_plan: Database["public"]["Enums"]["subscription_plan"]
          university: string | null
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          commission_rate_pct?: number | null
          created_at?: string
          full_name: string
          id: string
          id_doc_url?: string | null
          lister_type?: Database["public"]["Enums"]["lister_type"] | null
          payout_provider?: string | null
          payout_reference?: string | null
          phone?: string | null
          phone_verified?: boolean
          profile_photo_url?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          selfie_url?: string | null
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          university?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          commission_rate_pct?: number | null
          created_at?: string
          full_name?: string
          id?: string
          id_doc_url?: string | null
          lister_type?: Database["public"]["Enums"]["lister_type"] | null
          payout_provider?: string | null
          payout_reference?: string | null
          phone?: string | null
          phone_verified?: boolean
          profile_photo_url?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          selfie_url?: string | null
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          university?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: []
      }
      saved_listings: {
        Row: {
          listing_id: string
          saved_at: string
          tenant_id: string
        }
        Insert: {
          listing_id: string
          saved_at?: string
          tenant_id: string
        }
        Update: {
          listing_id?: string
          saved_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_listings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_listings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_action_handler: {
        Args: {
          p_action: string
          p_reason?: string
          p_target_id: string
          p_target_type: string
        }
        Returns: Json
      }
      cleanup_expired_phone_otps: { Args: never; Returns: number }
      cleanup_stale_listing_drafts: { Args: never; Returns: number }
      increment_listing_view: {
        Args: { p_listing_id: string }
        Returns: number
      }
      is_admin: { Args: { target_user_id?: string }; Returns: boolean }
      is_lister: { Args: { target_user_id?: string }; Returns: boolean }
      request_phone_otp: { Args: { p_phone: string }; Returns: Json }
      submit_listing: { Args: { p_listing: Json }; Returns: string }
      verify_phone_otp: {
        Args: { p_code: string; p_phone: string }
        Returns: Json
      }
    }
    Enums: {
      admin_action:
        | "approve_landlord"
        | "reject_landlord"
        | "approve_listing"
        | "reject_listing"
        | "flag"
        | "unflag"
        | "suspend"
      admin_target_type: "landlord" | "listing"
      app_role: "student" | "lister" | "admin"
      gender_preference: "any" | "male" | "female"
      inquiry_status: "open" | "interested" | "unavailable" | "booked"
      lister_type: "owner" | "manager" | "dalali"
      listing_photo_angle: "bedroom" | "kitchen" | "bathroom" | "outside"
      listing_status:
        | "draft"
        | "pending"
        | "approved"
        | "rejected"
        | "flagged"
        | "suspended"
      room_type: "single" | "shared" | "bedsit" | "studio" | "apartment"
      subscription_plan: "free" | "verified" | "premium"
      vacancy_status: "available" | "occupied" | "coming_soon"
      verification_status:
        | "unverified"
        | "pending"
        | "verified"
        | "rejected"
        | "suspended"
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
      admin_action: [
        "approve_landlord",
        "reject_landlord",
        "approve_listing",
        "reject_listing",
        "flag",
        "unflag",
        "suspend",
      ],
      admin_target_type: ["landlord", "listing"],
      app_role: ["student", "lister", "admin"],
      gender_preference: ["any", "male", "female"],
      inquiry_status: ["open", "interested", "unavailable", "booked"],
      lister_type: ["owner", "manager", "dalali"],
      listing_photo_angle: ["bedroom", "kitchen", "bathroom", "outside"],
      listing_status: [
        "draft",
        "pending",
        "approved",
        "rejected",
        "flagged",
        "suspended",
      ],
      room_type: ["single", "shared", "bedsit", "studio", "apartment"],
      subscription_plan: ["free", "verified", "premium"],
      vacancy_status: ["available", "occupied", "coming_soon"],
      verification_status: [
        "unverified",
        "pending",
        "verified",
        "rejected",
        "suspended",
      ],
    },
  },
} as const
