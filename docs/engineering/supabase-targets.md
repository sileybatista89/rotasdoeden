# Destinos Supabase: mecanismo real e guarda

## Os três projetos

| Ref | Papel | Onde aparece |
|---|---|---|
| `hiurdjlnnbrdsyplesfb` | **runtime da aplicação** (o site publicado fala com este) | `.env` (claim `ref` do JWT anon), `supabase/config.toml`, `.lovable/mcp/manifest.json` |
| `twdgrnivqodkxputzryt` | staging, usado pelo workflow de migrações | `.github/workflows/supabase-staging-migrations.yml` |
| `zqzkyiycrmqorgrlzptp` | staging v1 histórico, não referido em `main` | — |

## O que decide o destino de um comando

Auditar isto em 2026-11-11 mostrou que **não é o `config.toml` sozinho**. A ordem prática é:

1. **Flag explícita** — `--project-ref <ref>` ou `--db-url <url>`. Ganha a tudo.
2. **Projeto ligado** — `supabase link` escreve `supabase/.temp/project-ref`; `db push` / `migration up` usam esse valor por omissão.
3. **Variáveis de ambiente** — `SUPABASE_DB_URL`, `DATABASE_URL`, `SUPABASE_PROJECT_REF` em CI.
4. **`supabase/config.toml` `project_id`** — identifica o projeto para `supabase start`, serve de valor por omissão em `link` e é o alvo de `supabase config push`.

O modo de falha perigoso está no passo 2: uma ligação antiga a produção continua a valer para todos os comandos seguintes, mesmo que ninguém se lembre dela. Foi isso que o relatório anterior descreveu como se fosse o `config.toml`.

## A guarda

```powershell
npm run guard:db-target              # decide e explica
npm run guard:db-target -- --json    # para máquinas
```

Ela lê o projeto ligado, o `config.toml` e as variáveis de ambiente, e **falha fechado**:

- recusa se detetar produção (`hiurdjlnnbrdsyplesfb`) em qualquer fonte;
- recusa se **não** conseguir identificar destino nenhum — não age às cegas;
- deixa passar quando o destino é conhecido e não é produção;
- só autoriza produção com **duas** variáveis em simultâneo:
  `ALLOW_PRODUCTION=1` e `CONFIRM_PROJECT_REF=hiurdjlnnbrdsyplesfb`;
- nunca imprime passwords de connection strings (mostra só o host).

Testes: `src/test/supabase-target-guard.test.ts` (8 casos, inclui o próprio repositório tal como está).

Hoje, neste repositório, a guarda **recusa** — porque `config.toml` aponta para produção. É o comportamento pretendido.

## Mudar para staging de forma intencional

```powershell
supabase link --project-ref twdgrnivqodkxputzryt
npm run guard:db-target        # passa a permitir
supabase migration list        # leitura
```

Não mudes apenas a string no `config.toml`: isso muda o alvo de `config push` e de `link` sem mudar o projeto ligado, e cria uma divergência silenciosa entre as duas fontes.

## Limite desta proteção

É um *preflight*, não uma imposição. Quem correr `supabase` diretamente sem a guarda não é travado. Para ser imposição, o passo tem de entrar no workflow que executar comandos de base de dados — e esse workflow deve continuar a exigir `confirm_project_ref` e `preview_run_id`, como já faz hoje.
