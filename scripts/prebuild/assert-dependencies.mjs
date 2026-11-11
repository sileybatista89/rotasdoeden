#!/usr/bin/env node
/**
 * Verificação de dependências no arranque do build.
 *
 * Motivo: a build da Cloudflare falhou com
 *   [vite]: Rollup failed to resolve import "zod" from src/pages/AuthPage.tsx
 * enquanto um clone limpo local instala zod@3.25.76 e compila. Não foi possível confirmar, daqui,
 * se a árvore instalada no ambiente de build continha zod.
 *
 * Este passo não adivinha a causa: torna o estado observável. Se `zod` não resolver, o build falha
 * aqui com uma mensagem explícita (em vez de um erro profundo do Rollup); se resolver, o log fica com
 * a prova de que a dependência estava presente e o problema é de resolução em Rollup.
 *
 * Também regista as versões de Node e npm do ambiente — que é a variável que não consigo ver daqui.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const REQUIRED = ['zod'];

const versions = {
  node: process.version,
  npm: process.env.npm_config_user_agent ?? '(desconhecido)',
  platform: `${process.platform}-${process.arch}`,
};

let failed = false;

for (const name of REQUIRED) {
  try {
    const resolved = require.resolve(`${name}/package.json`);
    const { version } = require(`${name}/package.json`);
    const dir = resolved.replace(/[\\/]package\.json$/, '');
    console.log(`[prebuild] ${name}@${version} -> ${dir}`);
  } catch (error) {
    failed = true;
    console.error(
      `[prebuild] ${name} NÃO resolve neste ambiente. ` +
        `Isto indica árvore de dependências incompleta, não um erro de resolução do bundler. ` +
        `(${String(error).slice(0, 160)})`,
    );
  }
}

console.log(`[prebuild] ambiente: node=${versions.node} platform=${versions.platform} agent=${versions.npm}`);

if (failed) process.exit(1);
