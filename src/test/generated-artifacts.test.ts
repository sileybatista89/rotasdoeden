import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = process.cwd();

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === "dist") continue;
      walk(full, out);
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe("artefactos gerados e segredos", () => {
  it("a função MCP gerada não contém caminhos absolutos da máquina", () => {
    const file = resolve(ROOT, "supabase/functions/mcp/index.ts");
    const content = readFileSync(file, "utf8");

    expect(content).toContain("AUTO-GENERATED");
    // O plugin do Lovable, no Windows, escreve npm:C:\Users\...\src\lib\mcp\index.ts e o ficheiro
    // deixa de ser utilizável fora desta máquina. Este teste impede que isso seja commitado.
    expect(content).not.toMatch(/npm:[A-Za-z]:/);
    expect(content).not.toMatch(/[A-Za-z]:\\\\[A-Za-z]/);
  });

  it("os ficheiros .env versionados só contêm chaves publicáveis", () => {
    for (const name of [".env", ".env.development", ".env.production"]) {
      const content = readFileSync(resolve(ROOT, name), "utf8");
      expect(content, `${name} não pode conter service_role`).not.toMatch(/service_role/i);
      expect(content, `${name} não pode conter chave secreta Supabase`).not.toMatch(/sb_secret/i);
      expect(content, `${name} não pode conter chave secreta Stripe`).not.toMatch(/sk_live|sk_test/i);
    }
  });

  it("nenhum ficheiro de código do frontend contém chaves privilegiadas", () => {
    const offenders: string[] = [];
    for (const file of walk(resolve(ROOT, "src"))) {
      // Este próprio teste nomeia os padrões que procura; excluí-lo evita o falso positivo.
      if (file.endsWith("generated-artifacts.test.ts")) continue;
      const content = readFileSync(file, "utf8");
      if (/service_role|sb_secret|sk_live_/i.test(content)) {
        offenders.push(file.replace(ROOT + "\\", "").replace(ROOT + "/", ""));
      }
    }
    expect(offenders).toEqual([]);
  });
});
