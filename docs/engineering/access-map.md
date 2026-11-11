# Mapa de acessos para staging

Lista mínima do que falta, com finalidade e menor privilégio. **Não colar tokens, passwords ou
connection strings no chat.** A autenticação deve ser feita na ferramenta (login do `wrangler`,
`gh auth login`, `supabase login`) ou por variável de ambiente definida por ti, nunca por texto numa
conversa.

## 1. GitHub — para enviar a branch e abrir PR

| Campo | Valor |
|---|---|
| Finalidade | publicar `continuity/sprint1-integration` e abrir PR para `main`; deixar de haver cópia única |
| Menor privilégio | `Contents: read/write` no repositório `sileybatista89/rotasdoeden`; `Pull requests: write` |
| Leitura necessária | `git ls-remote`, `git fetch`, `git log` remoto |
| Escrita futura | `git push` da branch, criação de PR (não merge) |
| Autenticação segura | `gh auth login` (device flow) ou chave SSH com passphrase; ou token fine-grained com escopo só neste repo e validade curta |
| Alternativa sem acesso | gerar um `git bundle` e tu enviares manualmente; continua a não ser publicado |

**Nota:** o `git` desta máquina precisa de `-c http.sslBackend=openssl` para HTTPS (o `schannel` está
quebrado). Ver `docs/engineering/supabase-targets.md` para o contexto de rede.

## 2. Cloudflare — para consultar e preparar preview

| Campo | Valor |
|---|---|
| Finalidade | confirmar a versão ativa do Worker, data, associação a commit; criar preview da branch; validar cabeçalhos e CSP |
| Menor privilégio | `Workers Scripts: Read` + `Workers Builds: Read` para auditoria; `Workers Scripts: Edit` **só** quando for para publicar preview |
| Leitura necessária | lista de versões/deployments, configuração de assets, domínios, logs de build |
| Escrita futura | deploy de preview a partir da branch; nada em produção sem aprovação separada |
| Autenticação segura | `wrangler login` (OAuth) na máquina; ou `CLOUDFLARE_API_TOKEN` com escopo mínimo definido no ambiente |
| Limite | sem isto, `workers.dev` continua verificado apenas por HTTP (200) e a versão `969e8735…` permanece não confirmada |

## 3. Supabase — para verificar ambiente e controlos comerciais

| Campo | Valor |
|---|---|
| Finalidade | confirmar que projeto serve o quê, migrações aplicadas, RLS, e os valores de `sales_enabled` / `payment_mode` |
| Menor privilégio | papel de leitura no projeto **staging** (`twdgrnivqodkxputzryt`); para runtime (`hiurdjlnnbrdsyplesfb`) apenas leitura de metadados |
| Leitura necessária | `migration list`, contagem de tabelas, `pg_policies`, `information_schema`, contagem em `auth.users`, `select sales_enabled, payment_mode from commerce_settings` |
| Escrita futura | aplicar migrações em staging (com `confirm_project_ref` e `preview_run_id`, como o workflow já exige); **nunca** em runtime neste âmbito |
| Autenticação segura | `supabase login` (token guardado pela CLI) ou `SUPABASE_ACCESS_TOKEN` no ambiente; `SUPABASE_STAGING_DB_URL` como secret do GitHub, nunca em ficheiro |
| Limite | sem isto, todo o estado remoto do Supabase continua não verificado |

**Regra operacional já implementada:** qualquer comando que fale com a base de dados deve passar por
`npm run guard:db-target -- <comando>`, que recusa produção e recusa destinos ambíguos.

## 4. DNS — só na etapa de corte

| Campo | Valor |
|---|---|
| Finalidade | apontar `rotasdoeden.com` para o Worker quando o preview estiver validado |
| Menor privilégio | acesso de edição de DNS no registrador (Name.com) **só** no momento do corte |
| Leitura necessária | registos A/AAAA/CNAME, NS, MX, TXT (SPF e verificação Zoho) |
| Escrita futura | alteração de A/CNAME do apex e `www`; **não** tocar em MX/SPF/verificação |
| Autenticação segura | sessão no painel do registrador, com 2FA; nada partilhado por chat |
| Limite | mudar a entrega do site não pode partir o email Zoho |

## Definição do ambiente de staging pretendido

| Dimensão | Decisão proposta |
|---|---|
| Frontend | mesmo código da branch, build de produção, servido por preview do Worker |
| Backend | projeto Supabase **staging** `twdgrnivqodkxputzryt` — nunca o de runtime |
| Dados | sintéticos ou autorizados; **não** restaurar o dump com dados pessoais sem autorização |
| Pagamentos | chaves de teste; `sales_enabled=false`, `payment_mode=test` |
| Domínio | URL de preview (`*.workers.dev` ou preview URL), nunca o domínio público |
| Email | desligado ou para endereço controlado; nada de envio a clientes reais |
| Acesso | restrito por Cloudflare Access ou por lista, enquanto for staging |

O runtime `hiurdjlnnbrdsyplesfb` **não** faz parte de staging: é o que serve o site atual. Staging não
deve partilhar credenciais com ele.
