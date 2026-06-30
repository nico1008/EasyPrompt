import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

function migration(name: string): string {
  return read(join("supabase", "migrations", name));
}

function listFiles(dir: string): string[] {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(rel) : [rel];
  });
}

function functionDefinition(sql: string, fn: string): string {
  const start = sql.search(new RegExp(`create (?:or replace )?function public\\.${fn}\\b`, "i"));
  if (start < 0) return "";
  const rest = sql.slice(start);
  const end = rest.search(new RegExp(`\\nrevoke all on function public\\.${fn}\\b`, "i"));
  return end < 0 ? rest : rest.slice(0, end);
}

describe("Supabase auth security contract", () => {
  it("does not authorize from user metadata", () => {
    const files = [
      "app",
      "components",
      "lib",
      "supabase/migrations",
    ];
    const hits: string[] = [];

    function scan(dir: string) {
      for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
        const rel = join(dir, entry.name);
        if (entry.isDirectory()) {
          scan(rel);
          continue;
        }
        if (!/\.(ts|tsx|sql)$/.test(entry.name)) continue;
        const text = read(rel);
        if (/user_metadata|raw_user_meta_data/.test(text)) hits.push(rel.replace(/\\/g, "/"));
      }
    }

    files.forEach(scan);
    expect(hits.sort()).toEqual(["supabase/migrations/0015_username_accounts.sql"]);
  });

  it("blocks direct entitlement writes and keeps select RLS-scoped", () => {
    const sql = migration("0017_auth_contract_hardening.sql");

    expect(sql).toMatch(/revoke all privileges on all tables in schema public from anon,\s*authenticated;/);
    expect(sql).toMatch(/grant select on public\.entitlements to authenticated;/);
    expect(sql).not.toMatch(/grant\s+(insert|update|delete)[^;]*on public\.entitlements to authenticated;/i);
    expect(migration("0003_entitlements.sql")).toMatch(
      /create policy "entitlements_owner_all"[\s\S]*using \(auth\.uid\(\) = owner_id\)[\s\S]*with check \(auth\.uid\(\) = owner_id\);/
    );
  });

  it("uses service role only for validated entitlement redemption", () => {
    const service = read("lib/supabase/serviceRole.ts");
    const action = read("lib/entitlements/actions.ts");
    const allClientFacing = [
      ...listFiles("app"),
      ...listFiles("components"),
      "middleware.ts",
    ].filter((p) => /\.(ts|tsx)$/.test(p));

    expect(service).toContain('import "server-only"');
    expect(service).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(action).toContain("getProvider(env.PAYMENT_PROVIDER).check");
    expect(action).toContain("getServerUser()");
    expect(action).toContain("createServiceRoleClient()");
    expect(action).toContain('.from("entitlements").upsert');

    for (const file of allClientFacing) {
      expect(read(file), file).not.toMatch(/serviceRole|createServiceRoleClient|SUPABASE_SERVICE_ROLE_KEY/);
    }
  });

  it("does not define privileged public environment variables", () => {
    const envExample = read(".env.example");
    const badName = /^NEXT_PUBLIC_.*(?:SERVICE[_-]?ROLE|SECRET|PRIVATE|ADMIN|PRIVILEGED)/im;
    expect(envExample).not.toMatch(badName);

    for (const key of Object.keys(process.env)) {
      expect(key).not.toMatch(/^NEXT_PUBLIC_.*(?:SERVICE[_-]?ROLE|SECRET|PRIVATE|ADMIN|PRIVILEGED)/i);
    }
  });

  it("publishing RPC is narrow and explicit", () => {
    const sql = migration("0017_auth_contract_hardening.sql");
    const body = sql.match(/create or replace function public\.set_content_visibility[\s\S]*?\$\$;/
    )?.[0] ?? "";

    expect(body).toContain("security definer");
    expect(body).toContain("set search_path = ''");
    expect(body).toContain("v_user uuid := auth.uid()");
    expect(body).toContain("p_target_kind not in ('notebook', 'user_template', 'saved_prompt')");
    expect(body).toContain("p_visibility not in");
    expect(body).toContain("and owner_id = v_user");
    expect(body).toContain("update public.prompt_notebooks");
    expect(body).toContain("update public.user_templates");
    expect(body).toContain("update public.saved_prompts");
    expect(body).not.toMatch(/\bexecute\b/i);
    expect(body).not.toMatch(/\bformat\s*\(/i);
    expect(body).not.toMatch(/\bjsonb?_set\b/i);
  });

  it("public SECURITY DEFINER RPCs are visibility gated or aggregate-only", () => {
    const visibilitySql = migration("0016_private_public_visibility.sql");
    for (const fn of [
      "shared_template",
      "shared_prompt",
      "shared_notebook",
      "published_prompts",
      "published_templates",
      "community_prompt",
      "community_template",
      "public_profile_content",
    ]) {
      const fnBody = functionDefinition(visibilitySql, fn);
      expect(fnBody, fn).toContain("security definer");
      expect(fnBody, fn).toMatch(/set search_path (?:=|to) ''/);
      expect(fnBody, fn).toContain("visibility = 'public'");
      expect(fnBody, fn).not.toMatch(/\bexecute\b/i);
      expect(fnBody, fn).not.toMatch(/\bformat\s*\(/i);
    }

    const metricsSql = migration("0009_interaction_metrics.sql");
    expect(metricsSql).toContain("alter table public.interaction_events enable row level security");
    expect(metricsSql).toContain("alter table public.content_stats enable row level security");
    expect(metricsSql).toContain("returns table(uses bigint, views bigint)");
  });
});
