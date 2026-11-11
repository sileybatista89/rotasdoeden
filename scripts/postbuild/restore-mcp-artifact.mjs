#!/usr/bin/env node
/**
 * O plugin `@lovable.dev/mcp-js` regenera `supabase/functions/mcp/index.ts` a cada build.
 * No Windows escreve um caminho absoluto (`npm:C:\Users\...\src\lib\mcp\index.ts`), que não
 * funciona fora desta máquina e suja a árvore de trabalho em cada build.
 *
 * Este passo de pós-build deteta essa assinatura e repõe o ficheiro versionado. Só age quando o
 * artefacto tem caminho absoluto: se alguém editou o ficheiro a sério, é deixado em paz.
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const REL = 'supabase/functions/mcp/index.ts';
const ROOT = process.cwd();
const FILE = resolve(ROOT, REL);
const ABSOLUTE_PATH = /npm:[A-Za-z]:|[A-Za-z]:\\\\[A-Za-z]/;

let content;
try {
  content = readFileSync(FILE, 'utf8');
} catch {
  process.exit(0);
}

if (!ABSOLUTE_PATH.test(content)) {
  // Sem artefacto absoluto: nada a fazer. Uma edição legítima fica intacta.
  process.exit(0);
}

try {
  execFileSync('git', ['checkout', '--', REL], { cwd: ROOT, stdio: 'pipe' });
  console.log(`[postbuild] ${REL} regenerado com caminho absoluto; reposto a partir do git.`);
} catch (error) {
  console.warn(`[postbuild] não foi possível repor ${REL}: ${String(error).slice(0, 120)}`);
}
