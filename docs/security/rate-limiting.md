# Rate limiting — onde pode realmente ser aplicado

## Distinção que importa

O site é uma SPA estática. **O browser não fala com o Worker no que toca a dados**: fala diretamente
com `https://hiurdjlnnbrdsyplesfb.supabase.co`. Logo, limitar pedidos no Worker não protege a base de
dados, e limitar no Worker não conta chamadas feitas por `curl` direto à API do Supabase.

Há três superfícies distintas:

| Superfície | Quem a alcança | Onde se limita |
|---|---|---|
| Assets estáticos (HTML, JS, CSS) | qualquer visitante | Cloudflare (WAF/rate limiting por IP, caching) |
| API Supabase (REST/Realtime/Auth) | qualquer cliente com a chave anon (pública) | Supabase (limites de Auth, pooler) + RLS; rate limiting por IP só no Cloudflare se o tráfego passar por lá |
| Edge Functions (`/functions/v1/*`) | qualquer cliente com JWT ou com a service role | a própria função (código) + Supabase |

## Endpoints sensíveis identificados no repositório

| Função | Risco | Controlo existente | Lacuna |
|---|---|---|---|
| `create-checkout` | criar sessões de pagamento em massa | exige utilizador autenticado; preço vem do servidor | sem limite por utilizador |
| `payments-webhook` | repetição de eventos | assinatura HMAC + `UNIQUE (provider, event_id)` | sem limite de pedidos (aceitável: é a Stripe) |
| `booking-complete` | transições de reserva | exige admin | — |
| `ai-content`, `ai-discovery`, `ai-acquisition`, `ai-conversion`, `ai-orchestrator` | **custo por chamada** | exigem `Authorization: Bearer <SERVICE_ROLE_KEY>` | se a chave for exposta, custo ilimitado |
| `conversion-chat` | abuso de chat / custo | verificação de JWT | sem limite por sessão/IP |
| `auth-email-hook` | envio de emails | assinatura do Supabase | depende do Auth |
| `mcp` | ferramentas expostas | OAuth (`accepted_audiences: authenticated`) | delimitação por escopo |

Nota sobre as funções `ai-*`: a autenticação por comparação com `SUPABASE_SERVICE_ROLE_KEY` é um
segredo partilhado, não um utilizador. Funciona, mas um único vazamento dá acesso a **todas** elas e
sem limite de custo.

## O que pode ser feito localmente (sem tocar em configuração remota)

1. **Documentar o limite de custo** — está feito aqui e em `docs/engineering/supabase-targets.md`.
2. **Preparar a verificação de `aal`/role** nas funções de custo — depende do plano de MFA.
3. **Nada de configuração remota**: não sei qual o plano da Cloudflare nem quais os limites do projeto
   Supabase; inventar valores seria pior do que não ter nada.

## O que exige acesso e decisão

| Ação | Onde | Efeito |
|---|---|---|
| Regras de rate limiting por IP nas rotas de assets | Cloudflare (WAF) | protege contra scraping e floods simples |
| Limites de Auth (signups, emails, tentativas) | Supabase Auth settings | reduz abuso de registo e email |
| Limite por utilizador nas funções de IA | código (tabela de quotas + verificação) | controla custo real |
| Alerta de custo | painel Supabase/fornecedor de IA | deteta abuso |

## Recomendação mínima para staging

Antes de expor staging: (a) confirmar que `conversion-chat` e as funções `ai-*` não estão publicadas
sem autenticação; (b) pôr um limite de faturação/alerta no fornecedor de IA; (c) não ativar tráfego
público para staging sem rate limiting na Cloudflare.

Este documento descreve onde o controlo pode existir. Não afirma que exista.
