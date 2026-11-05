export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      admin_audit: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          details: Json;
          entity: string;
          entity_id: string | null;
          id: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          details?: Json;
          entity: string;
          entity_id?: string | null;
          id?: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          details?: Json;
          entity?: string;
          entity_id?: string | null;
          id?: string;
        };
        Relationships: [];
      };
      account_page_visits: {
        Row: {
          country_of_residence: string | null;
          id: string;
          route_id: string;
          user_id: string;
          visited_at: string;
        };
        Insert: {
          country_of_residence?: string | null;
          id?: string;
          route_id: string;
          user_id: string;
          visited_at?: string;
        };
        Update: {
          country_of_residence?: string | null;
          id?: string;
          route_id?: string;
          user_id?: string;
          visited_at?: string;
        };
        Relationships: [];
      };
      announcements: {
        Row: {
          author_id: string | null;
          body: string;
          category: string;
          created_at: string;
          id: string;
          published: boolean;
          published_at: string | null;
          show_banner: boolean;
          slug: string;
          summary: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          author_id?: string | null;
          body?: string;
          category?: string;
          created_at?: string;
          id?: string;
          published?: boolean;
          published_at?: string | null;
          show_banner?: boolean;
          slug: string;
          summary?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string | null;
          body?: string;
          category?: string;
          created_at?: string;
          id?: string;
          published?: boolean;
          published_at?: string | null;
          show_banner?: boolean;
          slug?: string;
          summary?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      demo_accounts: {
        Row: {
          created_at: string;
          state: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          state: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          state?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      market_overrides: {
        Row: {
          featured: boolean;
          hidden: boolean;
          note: string;
          symbol: string;
          updated_at: string;
        };
        Insert: {
          featured?: boolean;
          hidden?: boolean;
          note?: string;
          symbol: string;
          updated_at?: string;
        };
        Update: {
          featured?: boolean;
          hidden?: boolean;
          note?: string;
          symbol?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          email: string;
          id: string;
          last_seen_at: string;
          status: string;
          status_reason: string | null;
        };
        Insert: {
          created_at?: string;
          display_name?: string;
          email: string;
          id: string;
          last_seen_at?: string;
          status?: string;
          status_reason?: string | null;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          email?: string;
          id?: string;
          last_seen_at?: string;
          status?: string;
          status_reason?: string | null;
        };
        Relationships: [];
      };
      support_tickets: {
        Row: {
          category: string;
          created_at: string;
          email: string;
          id: string;
          priority: string;
          status: string;
          subject: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category?: string;
          created_at?: string;
          email?: string;
          id?: string;
          priority?: string;
          status?: string;
          subject: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          email?: string;
          id?: string;
          priority?: string;
          status?: string;
          subject?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      ticket_messages: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          id: string;
          is_staff: boolean;
          ticket_id: string;
        };
        Insert: {
          author_id: string;
          body: string;
          created_at?: string;
          id?: string;
          is_staff?: boolean;
          ticket_id: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          id?: string;
          is_staff?: boolean;
          ticket_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "support_tickets";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_list_audit: {
        Args: { _entity?: string; _limit?: number };
        Returns: {
          action: string;
          actor_email: string;
          created_at: string;
          details: Json;
          entity: string;
          entity_id: string;
          id: string;
        }[];
      };
      admin_list_investment_requests: {
        Args: { _limit?: number };
        Returns: {
          created_at: string;
          details: Json;
          email: string;
          id: string;
          reviewed_at: string | null;
          review_note: string | null;
          status: string;
          summary: string;
          transaction_type: string;
          user_id: string;
        }[];
      };
      admin_list_investment_plans: {
        Args: never;
        Returns: {
          archived_at: string | null;
          bonus_label: string;
          daily_rate: number;
          display_order: number;
          duration_days: number;
          enabled: boolean;
          featured: boolean;
          id: string;
          maximum_amount: number;
          minimum_amount: number;
          name: string;
          updated_at: string;
        }[];
      };
      admin_list_user_investments: {
        Args: { _limit?: number };
        Returns: {
          accrued_return: number;
          asset: string;
          daily_rate: number;
          duration_days: number;
          email: string;
          id: string;
          plan_name: string;
          principal: number;
          redeemable_at: string;
          started_at: string;
          status: string;
          user_id: string;
        }[];
      };
      admin_list_user_investment_page: {
        Args: {
          _before_created_at?: string;
          _before_id?: string;
          _limit?: number;
        };
        Returns: {
          accrued_return: number;
          asset: string;
          created_at: string;
          daily_rate: number;
          duration_days: number;
          email: string;
          id: string;
          plan_name: string;
          principal: number;
          redeemable_at: string;
          started_at: string;
          status: string;
          user_id: string;
        }[];
      };
      admin_create_investment_plan: {
        Args: {
          _bonus_label: string;
          _daily_rate: number;
          _duration_days: number;
          _enabled: boolean;
          _featured: boolean;
          _maximum_amount: number;
          _minimum_amount: number;
          _name: string;
          _reason: string;
        };
        Returns: string;
      };
      admin_update_investment_plan: {
        Args: {
          _bonus_label: string;
          _daily_rate: number;
          _duration_days: number;
          _enabled: boolean;
          _featured: boolean;
          _id: string;
          _maximum_amount: number;
          _minimum_amount: number;
          _name: string;
          _reason: string;
        };
        Returns: undefined;
      };
      admin_archive_investment_plan: {
        Args: { _id: string; _reason: string };
        Returns: undefined;
      };
      admin_review_investment_request: {
        Args: { _note?: string; _approve: boolean; _request_id: string };
        Returns: undefined;
      };
      admin_list_visitor_activity: {
        Args: { _limit?: number };
        Returns: {
          country_of_residence: string | null;
          display_name: string;
          email: string;
          id: string;
          route_id: string;
          visited_at: string;
        }[];
      };
      admin_list_tickets: {
        Args: { _search?: string; _status?: string };
        Returns: {
          category: string;
          created_at: string;
          email: string;
          id: string;
          last_from_staff: boolean;
          message_count: number;
          priority: string;
          status: string;
          subject: string;
          updated_at: string;
          user_id: string;
        }[];
      };
      admin_list_users: {
        Args: {
          _limit?: number;
          _offset?: number;
          _role?: string;
          _search?: string;
          _status?: string;
        };
        Returns: {
          created_at: string;
          display_name: string;
          email: string;
          id: string;
          is_admin: boolean;
          last_active: string;
          open_tickets: number;
          order_count: number;
          status: string;
          status_reason: string;
          total_count: number;
        }[];
      };
      admin_overview: { Args: never; Returns: Json };
      admin_set_admin: {
        Args: { _make: boolean; _user: string };
        Returns: undefined;
      };
      admin_set_user_status: {
        Args: { _reason?: string; _status: string; _user: string };
        Returns: undefined;
      };
      admin_user_detail: { Args: { _user: string }; Returns: Json };
      get_my_transaction_history: {
        Args: { _limit?: number };
        Returns: {
          created_at: string;
          details: Json;
          id: string;
          reference: string;
          review_note: string | null;
          reviewed_at: string | null;
          status: string;
          summary: string;
          transaction_type: string;
        }[];
      };
      get_my_investment_portfolio: {
        Args: never;
        Returns: {
          accrued_return: number;
          asset: string;
          daily_rate: number;
          duration_days: number;
          id: string;
          plan_id: string;
          plan_name: string;
          principal: number;
          redeemable_at: string;
          started_at: string;
          status: string;
        }[];
      };
      get_my_investment_requests: {
        Args: { _limit?: number };
        Returns: {
          amount: number;
          asset: string;
          created_at: string;
          id: string;
          plan_name: string;
          reference: string;
          request_type: string;
          review_note: string | null;
          reviewed_at: string | null;
          status: string;
        }[];
      };
      request_investment_subscription: {
        Args: { _amount: number; _plan_id: string };
        Returns: string;
      };
      request_investment_redemption: {
        Args: { _position_id: string };
        Returns: string;
      };
      request_investment_jumpstart: {
        Args: { _amount: number; _asset: string; _project_name: string };
        Returns: string;
      };
      assert_admin: { Args: never; Returns: undefined };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_suspended: { Args: { _user_id: string }; Returns: boolean };
      public_market_flags: {
        Args: never;
        Returns: {
          featured: boolean;
          hidden: boolean;
          symbol: string;
        }[];
      };
      public_investment_plans: {
        Args: never;
        Returns: {
          bonus_label: string;
          daily_rate: number;
          display_order: number;
          duration_days: number;
          featured: boolean;
          id: string;
          maximum_amount: number;
          minimum_amount: number;
          name: string;
        }[];
      };
      record_my_page_visit: {
        Args: { _route_id: string };
        Returns: undefined;
      };
      write_audit: {
        Args: {
          _action: string;
          _details: Json;
          _entity: string;
          _entity_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: "admin" | "moderator" | "user";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const;
