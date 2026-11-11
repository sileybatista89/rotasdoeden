import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const GUARD = resolve(process.cwd(), "scripts/guards/supabase-target.mjs");
const PROD = "hiurdjlnnbrdsyplesfb";
const STAGING = "twdgrnivqodkxputzryt";

const SENSITIVE_ENV = [
  "SUPABASE_PROJECT_REF",
  "SUPABASE_STAGING_PROJECT_REF",
  "SUPABASE_DB_URL",
  "DATABASE_URL",
  "SUPABASE_STAGING_DB_URL",
  "SUPABASE_DB_HOST",
  "PGHOST",
  "ALLOW_PRODUCTION",
  "CONFIRM_PROJECT_REF",
];

function makeRoot(options: { configRef?: string; linkedRef?: string } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "supabase-guard-"));
  mkdirSync(join(dir, "supabase", ".temp"), { recursive: true });
  if (options.configRef) {
    writeFileSync(join(dir, "supabase", "config.toml"), `project_id = "${options.configRef}"\n`);
  }
  if (options.linkedRef) {
    writeFileSync(join(dir, "supabase", ".temp", "project-ref"), options.linkedRef);
  }
  return dir;
}

function run(root: string, env: Record<string, string> = {}) {
  const base: Record<string, string | undefined> = { ...process.env };
  for (const key of SENSITIVE_ENV) delete base[key];
  const result = spawnSync(process.execPath, [GUARD, "--json"], {
    env: { ...base, GUARD_ROOT: root, ...env } as NodeJS.ProcessEnv,
    encoding: "utf8",
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    json: () => JSON.parse(result.stdout ?? "{}"),
  };
}

describe("guarda de destino Supabase", () => {
  it("recusa quando o projeto ligado é o de produção", () => {
    const root = makeRoot({ linkedRef: PROD });
    const r = run(root);
    expect(r.status).toBe(1);
    expect(r.json().decision).toBe("deny");
    expect(r.json().production).toContain("supabase/.temp/project-ref (projeto ligado)");
    rmSync(root, { recursive: true, force: true });
  });

  it("recusa quando só o config.toml aponta para produção", () => {
    const root = makeRoot({ configRef: PROD });
    const r = run(root);
    expect(r.status).toBe(1);
    expect(r.json().production).toContain("supabase/config.toml project_id");
    rmSync(root, { recursive: true, force: true });
  });

  it("recusa quando não consegue identificar destino nenhum", () => {
    const root = makeRoot();
    const r = run(root);
    expect(r.status).toBe(1);
    expect(r.json().reasons.join(" ")).toMatch(/Nenhum destino/);
    rmSync(root, { recursive: true, force: true });
  });

  it("deixa passar quando o destino é o staging", () => {
    const root = makeRoot({ configRef: STAGING, linkedRef: STAGING });
    const r = run(root);
    expect(r.status).toBe(0);
    expect(r.json().decision).toBe("allow");
    rmSync(root, { recursive: true, force: true });
  });

  it("deteta produção dentro de uma connection string", () => {
    const root = makeRoot({ linkedRef: STAGING });
    const r = run(root, {
      SUPABASE_DB_URL: `postgresql://postgres:segredo@db.${PROD}.supabase.co:5432/postgres`,
    });
    expect(r.status).toBe(1);
    expect(r.json().production.join(" ")).toMatch(/SUPABASE_DB_URL/);
    rmSync(root, { recursive: true, force: true });
  });

  it("nunca imprime a password de uma connection string", () => {
    const root = makeRoot({ linkedRef: STAGING });
    const r = run(root, {
      SUPABASE_DB_URL: `postgresql://postgres:segredo@db.${PROD}.supabase.co:5432/postgres`,
    });
    expect(r.stdout).not.toContain("segredo");
    expect(r.stdout).toContain(`db.${PROD}.supabase.co`);
    rmSync(root, { recursive: true, force: true });
  });

  it("só autoriza produção com as duas variáveis explícitas", () => {
    const root = makeRoot({ linkedRef: PROD });
    const withoutBoth = run(root, { ALLOW_PRODUCTION: "1" });
    expect(withoutBoth.status).toBe(1);

    const wrongRef = run(root, { ALLOW_PRODUCTION: "1", CONFIRM_PROJECT_REF: STAGING });
    expect(wrongRef.status).toBe(1);

    const authorised = run(root, { ALLOW_PRODUCTION: "1", CONFIRM_PROJECT_REF: PROD });
    expect(authorised.status).toBe(0);
    expect(authorised.json().decision).toBe("allow");
    rmSync(root, { recursive: true, force: true });
  });

  it("recusa o próprio repositório tal como está hoje (config aponta para produção)", () => {
    const r = run(process.cwd());
    expect(r.status).toBe(1);
    expect(r.json().production).toContain("supabase/config.toml project_id");
  });
});

/** Modo invólucro: `guard -- <comando>` valida as flags do comando antes de o executar. */
function writeProbe(root: string) {
  const probe = join(root, "probe.cjs");
  writeFileSync(probe, "console.log('EXECUTOU');\n");
  return probe;
}

function runWrapped(root: string, args: string[], env: Record<string, string> = {}) {
  const base: Record<string, string | undefined> = { ...process.env };
  for (const key of SENSITIVE_ENV) delete base[key];
  const result = spawnSync(process.execPath, [GUARD, "--", ...args], {
    env: { ...base, GUARD_ROOT: root, ...env } as NodeJS.ProcessEnv,
    encoding: "utf8",
  });
  return { status: result.status, stdout: result.stdout ?? "" };
}

describe("guarda em modo invólucro", () => {
  it("não executa o comando quando --project-ref aponta para produção", () => {
    const root = makeRoot({ linkedRef: STAGING });
    const r = runWrapped(root, [process.execPath, writeProbe(root), "--project-ref", PROD]);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain("RECUSADO");
    expect(r.stdout).not.toContain("EXECUTOU");
    rmSync(root, { recursive: true, force: true });
  });

  it("não executa o comando quando --db-url aponta para produção", () => {
    const root = makeRoot({ linkedRef: STAGING });
    const r = runWrapped(root, [
      process.execPath,
      writeProbe(root),
      "--db-url",
      `postgresql://postgres:x@db.${PROD}.supabase.co:5432/postgres`,
    ]);
    expect(r.status).toBe(1);
    expect(r.stdout).not.toContain("EXECUTOU");
    rmSync(root, { recursive: true, force: true });
  });

  it("executa o comando quando o destino validado é o staging", () => {
    const root = makeRoot({ linkedRef: STAGING });
    const r = runWrapped(root, [process.execPath, writeProbe(root), "--project-ref", STAGING]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("EXECUTOU");
    rmSync(root, { recursive: true, force: true });
  });
});
