import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Invariantes de segurança verificados por leitura das migrações.
 *
 * Não substituem testes de integração contra uma base de dados real; prendem as propriedades que
 * foram verificadas manualmente em 2026-11-11 e que uma edição futura poderia remover em silêncio.
 */

const ROOT = process.cwd();
const DIRS = ["supabase/migrations", "drizzle/migrations"];

function sqlFiles() {
  const files: { name: string; content: string }[] = [];
  for (const dir of DIRS) {
    for (const name of readdirSync(resolve(ROOT, dir)).filter((f) => f.endsWith(".sql"))) {
      files.push({ name: `${dir}/${name}`, content: readFileSync(resolve(ROOT, dir, name), "utf8") });
    }
  }
  // Os nomes começam por timestamp (`20260421…`) ou por sequência (`0000_`), por isso a ordem
  // lexicográfica é a ordem de aplicação.
  return files.sort((a, b) => a.name.localeCompare(b.name));
}

const FILES = sqlFiles();
const ALL = FILES.map((f) => f.content).join("\n");

/** Última definição de uma função, na ordem de aplicação das migrações. */
function lastDefinition(functionName: string) {
  const matches = FILES.filter((f) =>
    new RegExp(`CREATE OR REPLACE FUNCTION public\\.${functionName}\\b`, "i").test(f.content),
  );
  expect(matches.length, `sem definição de ${functionName}`).toBeGreaterThan(0);
  return matches[matches.length - 1];
}

describe("invariantes de segurança do backend", () => {
  it("há migrações para analisar", () => {
    expect(FILES.length).toBeGreaterThan(10);
  });

  it("eventos de pagamento são idempotentes por (provider, event_id)", () => {
    expect(ALL).toMatch(/UNIQUE\s*\(\s*provider\s*,\s*event_id\s*\)/);
  });

  it("o gate comercial tem RLS e não aceita escrita direta", () => {
    expect(ALL).toMatch(/ALTER TABLE public\.commerce_settings ENABLE ROW LEVEL SECURITY/);
    // Nenhuma policy de escrita para authenticated: a única via é a RPC auditada.
    const writePolicies = [...ALL.matchAll(/CREATE POLICY[^;]*?ON public\.commerce_settings[\s\S]{0,240}?;/gi)]
      .map((m) => m[0])
      .filter((sql) => /FOR\s+(INSERT|UPDATE|DELETE|ALL)/i.test(sql));
    expect(writePolicies).toEqual([]);
  });

  it("a RPC do gate comercial exige administrador", () => {
    expect(ALL).toMatch(/IF auth\.uid\(\) IS NULL OR NOT public\.is_admin\(auth\.uid\(\)\)/);
    expect(ALL).toMatch(/REVOKE EXECUTE ON FUNCTION public\.admin_set_commerce_settings[^;]*FROM PUBLIC, anon/i);
  });

  it("o registo nunca atribui admin a partir de metadados do cliente", () => {
    const last = lastDefinition("handle_new_user");
    expect(last.content).not.toMatch(/'admin'::public\.app_role/);
    expect(last.content).toMatch(/raw_user_meta_data->>'role'/);
    expect(last.content).toMatch(/tourist/);
  });

  it("escrever em user_roles exige administrador", () => {
    const policies = [...ALL.matchAll(/CREATE POLICY[^;]*?ON public\.user_roles[\s\S]{0,260}?;/gi)]
      .map((m) => m[0])
      .filter((sql) => /FOR\s+(INSERT|UPDATE|DELETE|ALL)/i.test(sql));
    expect(policies.length).toBeGreaterThan(0);
    for (const sql of policies) {
      expect(sql, `policy sem is_admin: ${sql.slice(0, 80)}`).toMatch(/is_admin\s*\(\s*auth\.uid\(\)\s*\)/);
    }
  });

  it("o registo de auditoria é apenas de leitura e inserção para administradores", () => {
    expect(ALL).toMatch(/ALTER TABLE public\.admin_audit_log ENABLE ROW LEVEL SECURITY/);
    const destructive = [...ALL.matchAll(/CREATE POLICY[^;]*?ON public\.admin_audit_log[\s\S]{0,240}?;/gi)]
      .map((m) => m[0])
      .filter((sql) => /FOR\s+(UPDATE|DELETE|ALL)/i.test(sql));
    expect(destructive).toEqual([]);
  });
});
