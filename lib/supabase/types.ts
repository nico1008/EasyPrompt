/* Database types for the typed Supabase client.
 *
 * Hand-written to match supabase/migrations/0001_accounts.sql. If you wire up
 * the Supabase CLI you can regenerate this with:
 *   supabase gen types typescript --project-id <ref> > lib/supabase/types.ts
 * Keep the two in sync — the migration is the source of truth for the DB; this
 * file is the source of truth for the TypeScript surface.
 *
 * JSONB columns (fields/checkboxes/answers) are typed as `Json` here; the
 * mapping layer (lib/userTemplates/map.ts, lib/savedPrompts/map.ts) casts them
 * to the structured `Field[]` / `Checkbox[]` / `Answers` shapes. */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/** Shared visibility for Templates + Prompts (migration 0007). */
export type ContentVisibility = "draft" | "published" | "unlisted";

/* NOTE (internal ↔ external naming): in the UI, both `prompt_notebooks`
 * (block-built) and `user_templates` (form-based) are "Templates", and
 * `saved_prompts` are "Prompts". The table names are implementation detail. */

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          display_name: string | null;
          bio: string | null;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          display_name?: string | null;
          bio?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          username?: string | null;
          display_name?: string | null;
          bio?: string | null;
          is_public?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_templates: {
        Row: {
          id: string;
          owner_id: string;
          slug: string | null;
          title: string;
          category: string;
          icon: string;
          tag: string | null;
          blurb: string | null;
          intro: string | null;
          base_prompt: string;
          fields: Json;
          checkboxes: Json;
          is_public: boolean;
          visibility: ContentVisibility;
          share_slug: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          slug?: string | null;
          title: string;
          category: string;
          icon: string;
          tag?: string | null;
          blurb?: string | null;
          intro?: string | null;
          base_prompt: string;
          fields?: Json;
          checkboxes?: Json;
          is_public?: boolean;
          visibility?: ContentVisibility;
          share_slug?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          slug?: string | null;
          title?: string;
          category?: string;
          icon?: string;
          tag?: string | null;
          blurb?: string | null;
          intro?: string | null;
          base_prompt?: string;
          fields?: Json;
          checkboxes?: Json;
          is_public?: boolean;
          visibility?: ContentVisibility;
          share_slug?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      saved_prompts: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          source_kind: "catalog" | "user" | "import" | "manual" | "ai";
          catalog_slug: string | null;
          user_template_id: string | null;
          answers: Json;
          body: string | null;
          category: string | null;
          visibility: ContentVisibility;
          share_slug: string | null;
          remixed_from: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          source_kind: "catalog" | "user" | "import" | "manual" | "ai";
          catalog_slug?: string | null;
          user_template_id?: string | null;
          answers: Json;
          body?: string | null;
          category?: string | null;
          visibility?: ContentVisibility;
          share_slug?: string | null;
          remixed_from?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          answers?: Json;
          body?: string | null;
          category?: string | null;
          visibility?: ContentVisibility;
          share_slug?: string | null;
          remixed_from?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      entitlements: {
        Row: {
          id: string;
          owner_id: string;
          plan: "lifetime" | "pass" | "subscription";
          source: string | null;
          code_hash: string | null;
          ent_exp: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          plan: "lifetime" | "pass" | "subscription";
          source?: string | null;
          code_hash?: string | null;
          ent_exp?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          plan?: "lifetime" | "pass" | "subscription";
          source?: string | null;
          code_hash?: string | null;
          ent_exp?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      prompt_ratings: {
        Row: {
          id: string;
          owner_id: string;
          target_kind: "catalog";
          target_key: string;
          rating: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          target_kind: "catalog";
          target_key: string;
          rating: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          rating?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      bookmarks: {
        Row: {
          id: string;
          owner_id: string;
          // text column — "catalog" (Template) or "example_prompt" (curated Prompt)
          target_kind: "catalog" | "example_prompt";
          target_key: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          target_kind: "catalog" | "example_prompt";
          target_key: string;
          created_at?: string;
        };
        Update: {
          target_kind?: "catalog" | "example_prompt";
          target_key?: string;
        };
        Relationships: [];
      };
      // A "Template" in the UI (block-built). See the naming note at the top.
      prompt_notebooks: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          doc: Json;
          /** Non-null = shareable via /s/t/<slug> (capability token). */
          share_slug: string | null;
          visibility: ContentVisibility;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          doc?: Json;
          share_slug?: string | null;
          visibility?: ContentVisibility;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          doc?: Json;
          share_slug?: string | null;
          visibility?: ContentVisibility;
          updated_at?: string;
        };
        Relationships: [];
      };
      prompt_notebook_versions: {
        Row: {
          id: string;
          notebook_id: string;
          owner_id: string;
          name: string;
          doc: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          notebook_id: string;
          owner_id: string;
          name: string;
          doc: Json;
          created_at?: string;
        };
        Update: {
          name?: string;
          doc?: Json;
        };
        Relationships: [];
      };
      // Usage metrics (migration 0009). RLS-on with no policies + no grants — only
      // the security-definer RPCs below touch these; the app never reads them direct.
      interaction_events: {
        Row: {
          id: string;
          target_kind: string;
          target_key: string;
          action: string;
          actor_hash: string;
          ip_hash: string | null;
          bucket: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          target_kind: string;
          target_key: string;
          action: string;
          actor_hash: string;
          ip_hash?: string | null;
          bucket: string;
          created_at?: string;
        };
        Update: {
          target_kind?: string;
          target_key?: string;
          action?: string;
        };
        Relationships: [];
      };
      content_stats: {
        Row: {
          target_kind: string;
          target_key: string;
          copies: number;
          opens: number;
          views: number;
          updated_at: string;
        };
        Insert: {
          target_kind: string;
          target_key: string;
          copies?: number;
          opens?: number;
          views?: number;
          updated_at?: string;
        };
        Update: {
          copies?: number;
          opens?: number;
          views?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      delete_current_user: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      rating_aggregate: {
        Args: { p_target_kind: string; p_target_key: string };
        Returns: { avg: number; count: number }[];
      };
      shared_notebook: {
        Args: { p_slug: string };
        Returns: { name: string; doc: Json }[];
      };
      shared_template: {
        Args: { p_slug: string };
        Returns: { kind: "notebook" | "user_template"; title: string; payload: Json }[];
      };
      shared_prompt: {
        Args: { p_slug: string };
        Returns: {
          name: string;
          body: string | null;
          answers: Json;
          source_kind: string;
          catalog_slug: string | null;
          user_template_id: string | null;
        }[];
      };
      record_interaction: {
        Args: {
          p_kind: string;
          p_key: string;
          p_action: string;
          p_actor_hash: string;
          p_ip_hash?: string | null;
        };
        Returns: undefined;
      };
      content_stats_get: {
        Args: { p_kind: string; p_key: string };
        Returns: { uses: number; views: number }[];
      };
      content_stats_batch: {
        Args: { p_kind: string; p_keys: string[] };
        Returns: { target_key: string; uses: number; views: number }[];
      };
      published_prompts: {
        Args: { p_limit: number; p_offset: number };
        Returns: {
          share_slug: string;
          name: string;
          preview: string | null;
          category: string | null;
          created_at: string;
          updated_at: string;
          author_username: string | null;
          author_display_name: string | null;
        }[];
      };
      published_templates: {
        Args: { p_limit: number; p_offset: number; p_category?: string | null };
        Returns: {
          share_slug: string;
          title: string;
          category: string | null;
          icon: string | null;
          tag: string | null;
          blurb: string | null;
          created_at: string;
          updated_at: string;
          author_username: string | null;
          author_display_name: string | null;
        }[];
      };
      community_prompt: {
        Args: { p_slug: string };
        Returns: {
          id: string;
          name: string;
          body: string | null;
          answers: Json;
          source_kind: string;
          catalog_slug: string | null;
          user_template_id: string | null;
          visibility: string;
          author_username: string | null;
          author_display_name: string | null;
        }[];
      };
      community_template: {
        Args: { p_slug: string };
        Returns: {
          kind: "notebook" | "user_template";
          title: string;
          payload: Json;
          visibility: string;
          author_username: string | null;
          author_display_name: string | null;
        }[];
      };
      public_profile: {
        Args: { p_username: string };
        Returns: {
          id: string;
          username: string | null;
          display_name: string | null;
          bio: string | null;
          created_at: string;
          reputation: number;
        }[];
      };
      public_profile_content: {
        Args: { p_username: string };
        Returns: {
          object_type: "prompt" | "template";
          share_slug: string;
          title: string;
          category: string | null;
          icon: string | null;
          preview: string | null;
          updated_at: string;
          uses: number;
        }[];
      };
    };
    Enums: { content_visibility: ContentVisibility };
    CompositeTypes: Record<string, never>;
  };
}
