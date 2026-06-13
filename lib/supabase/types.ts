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

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          username?: string | null;
          display_name?: string | null;
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
          updated_at?: string;
        };
        Relationships: [];
      };
      saved_prompts: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          source_kind: "catalog" | "user";
          catalog_slug: string | null;
          user_template_id: string | null;
          answers: Json;
          generated_text: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          source_kind: "catalog" | "user";
          catalog_slug?: string | null;
          user_template_id?: string | null;
          answers: Json;
          generated_text?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          answers?: Json;
          generated_text?: string | null;
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
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
