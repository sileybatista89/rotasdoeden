#!/usr/bin/env node
/**
 * Guarda de destino para operações Supabase.
 *
 * Existe porque a seleção do projeto num comando de base de dados não depende de um único fator:
 * depende do projeto ligado (`supabase/.temp/project-ref`), de flags explícitas (`--project-ref`,
 * `--db-url`), de variáveis de ambiente e, nalguns comandos, do `project_id` do `config.toml`.
 * O modo de falha perigoso é uma ligação antiga apontar para produção e um comando "normal" correr
 * contra ela sem ninguém dar por isso.
 *
 * Política: falhar fechado. Só deixa passar quando o destino é explícito, conhecido e não é produção,
 * ou quando produção foi autorizada de forma igualmente explícita.
 *
 * Uso:
 *   node scripts/guards/supabase-target.mjs            # inspeciona e decide
 *   node scripts/guards/supabase-target.mjs --json     # saída legível por máquina
 *
 * Autorizar produção (raro, exige as duas variáveis):
 *   ALLOW_PRODUCTION=1 CONFIRM_PROJECT_REF=<ref> node scripts/guards/supabase-target.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export const PRODUCTION_REF = "hiurdjlnnbrdsyplesfb";
export const STAGING_REF = "twdgrnivqodkxputzryt";

const REF_RE = /^[a-z]{20}$/;

/** Redige connection strings: mantém só o host, nunca a password. */
export function redactUrl(value) {
  try {
    const u = new URL(value);
    return `${u.protocol}//${u.hostname}`;
  } catch {
    return "<valor ilegível>";
  }
}

export function extractRefFromUrl(value) {
  try {
    const host = new URL(value).hostname;
    // db.<ref>.supabase.co, <ref>.supabase.co, e poolers com o ref no subdomínio.
    const m = host.match(/^(?:db\.)?([a-z]{20})\.supabase\.(?:co|in|net)$/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

/**
 * @param {object} input
 * @param {string|null} input.configRef   project_id do config.toml
 * @param {string|null} input.linkedRef   ref em supabase/.temp/project-ref
 * @param {Record<string,string|undefined>} input.env
 * @returns {{targets: Array<{source: string, ref: string|null, value?: string}>, production: Array<string>, decision: "allow"|"deny", reasons: string[]}}
 */
export function evaluateTargets({ configRef, linkedRef, env }) {
  const targets = [];
  const reasons = [];

  if (linkedRef) targets.push({ source: "supabase/.temp/project-ref (projeto ligado)", ref: linkedRef });
  if (configRef) targets.push({ source: "supabase/config.toml project_id", ref: configRef });

  for (const key of ["SUPABASE_PROJECT_REF", "SUPABASE_STAGING_PROJECT_REF"]) {
    const v = env[key];
    if (v) targets.push({ source: `env ${key}`, ref: REF_RE.test(v) ? v : null, value: v });
  }
  for (const key of ["SUPABASE_DB_URL", "DATABASE_URL", "SUPABASE_STAGING_DB_URL"]) {
    const v = env[key];
    if (v) targets.push({ source: `env ${key}`, ref: extractRefFromUrl(v), value: redactUrl(v) });
  }
  for (const key of ["SUPABASE_DB_HOST", "PGHOST"]) {
    const v = env[key];
    if (v) targets.push({ source: `env ${key}`, ref: extractRefFromUrl(`postgres://${v}/x`), value: v });
  }

  const production = targets.filter((t) => t.ref === PRODUCTION_REF).map((t) => t.source);
  const known = targets.filter((t) => t.ref && t.ref !== PRODUCTION_REF);

  const authorised =
    env.ALLOW_PRODUCTION === "1" && env.CONFIRM_PROJECT_REF === PRODUCTION_REF;

  let decision = "deny";

  if (production.length > 0) {
    if (authorised) {
      decision = "allow";
      reasons.push(
        "Produção explicitamente autorizada (ALLOW_PRODUCTION=1 + CONFIRM_PROJECT_REF correto).",
      );
    } else {
      reasons.push(
        `Destino de PRODUÇÃO detetado em: ${production.join(", ")}. Operação recusada. ` +
          "Se for mesmo intencional: ALLOW_PRODUCTION=1 CONFIRM_PROJECT_REF=" + PRODUCTION_REF,
      );
    }
  } else if (known.length === 0) {
    reasons.push(
      "Nenhum destino reconhecível encontrado. O comando recusa agir às cegas: " +
        "indique o projeto com --project-ref, ligue com `supabase link --project-ref <ref>` " +
        "ou defina SUPABASE_STAGING_PROJECT_REF.",
    );
  } else {
    decision = "allow";
    const refs = [...new Set(known.map((t) => t.ref))];
    reasons.push(`Destino não-produção: ${refs.join(", ")} (${known.map((t) => t.source).join(", ")}).`);
    if (refs.length > 1) {
      reasons.push(
        `Aviso: foram detetados ${refs.length} destinos distintos. Confirme que quer mesmo usar ${refs[0]}.`,
      );
    }
  }

  return { targets, production, decision, reasons };
}

export function loadContext(root) {
  const configPath = join(root, "supabase", "config.toml");
  let configRef = null;
  if (existsSync(configPath)) {
    const m = readFileSync(configPath, "utf8").match(/^\s*project_id\s*=\s*"([^"]+)"/m);
    if (m) configRef = m[1];
  }
  const linkedPath = join(root, "supabase", ".temp", "project-ref");
  const linkedRef = existsSync(linkedPath) ? readFileSync(linkedPath, "utf8").trim() || null : null;
  return { configRef, linkedRef };
}

function main() {
  const asJson = process.argv.includes("--json");
  const root = process.env.GUARD_ROOT || process.cwd();
  const { configRef, linkedRef } = loadContext(root);
  const result = evaluateTargets({ configRef, linkedRef, env: process.env });

  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log("Guarda de destino Supabase");
    console.log(`  produção conhecida: ${PRODUCTION_REF}`);
    for (const t of result.targets) {
      console.log(`  - ${t.source}: ${t.ref ?? "não identificado"}${t.value ? ` (${t.value})` : ""}`);
    }
    if (result.targets.length === 0) console.log("  - (nenhum destino detetado)");
    for (const r of result.reasons) console.log(`  ${result.decision === "allow" ? "OK" : "RECUSADO"}: ${r}`);
  }

  process.exit(result.decision === "allow" ? 0 : 1);
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}` || process.argv[1]?.endsWith("supabase-target.mjs")) {
  main();
}
