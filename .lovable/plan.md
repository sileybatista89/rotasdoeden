# Fase 4 — Discovery Control Center (plano)

Painel administrativo para consultar e validar oportunidades descobertas. Sem executar agentes, sem scheduler, sem custos de IA, sem alterações no site público.

## A. Arquitetura atual verificada

- Consola admin: `src/pages/AdminPage.tsx` + `src/components/admin/AdminSidebar.tsx` (secções por estado local, não por rota). Rota `/admin` protegida por `ProtectedRoute requireRole="admin"`.
- Tabelas confirmadas: `discovery_opportunities` (0 linhas), `discovery_opportunity_history` (0), `agent_runs` (0), `agent_costs` (0), `agent_tasks` (0), `agent_config` (3 chaves), `agent_approvals`, `agent_policies`, `agent_settings`.
- RLS confirmada: leitura de oportunidades, histórico, runs, custos, config e tasks apenas para `is_admin(auth.uid())`; `discovery_cache` nega anon/authenticated; `discovery_opportunities` tem policy de UPDATE para admins.
- Estados válidos por CHECK: `nova`, `em_analise`, `aceite`, `rejeitada`, `expirada`. `evidence_type`: `observed`, `interpreted`, `hypothesis`, `recommendation`.
- Índices existentes: único em `lower(country), lower(language), lower(query)`; `(opportunity_score DESC, discovered_at DESC)`; `status`.
- Pesos reais em `agent_config.discovery_score_weights`: travel_intent 30, stp_relevance 20, volume 15, potential_value 15, competition 10, seasonality 10 — a UI lê estes valores, nunca os fixa em código.

## B. Rota administrativa

Nova secção `discovery` no `AdminSidebar` (label "Discovery IA", ícone `Radar`/`Sparkles`), renderizada dentro de `AdminPage` como as restantes. Sem nova rota global, sem novo layout, sem nova autenticação. Detalhe abre em `Sheet`/`Dialog` (padrão já usado no drawer de guias), preservando a secção activa.

## C. Componentes existentes reutilizados

`AdminSectionHeader`, `StatsCards` (+ `defaultStats` como referência de forma), `Badge`, `Button`, `Input`, `Select`, `Table`, `Sheet`/`Dialog`, `Tabs`, `Skeleton`, `sonner` toasts, `supabase` client, `Tables<>` types.

## D. Novos componentes

- `src/components/admin/discovery/DiscoveryPanel.tsx` — orquestra overview + filtros + lista.
- `DiscoveryOverview.tsx` — cartões de agregados e qualidade.
- `DiscoveryFilters.tsx` — filtros e pesquisa.
- `DiscoveryTable.tsx` — lista paginada e ordenável.
- `DiscoveryDetailDrawer.tsx` — identificação, fonte, evidência, score, rationale, histórico, execução, acções.
- `EvidenceBlock.tsx` e `ScoreBreakdown.tsx` — blocos reutilizáveis.
- `src/hooks/useDiscovery.ts` — hooks React Query (`useDiscoveryStats`, `useOpportunities`, `useOpportunityDetail`, `useOpportunityHistory`, `useOpportunityRun`, `useDiscoveryWeights`).

## E. Queries

1. Lista: `discovery_opportunities` com `select(..., { count: "exact" })`, filtros server-side (`eq/ilike/gte/lte/in`), `order` configurável, `range()` para paginação (25/página).
2. Agregados: contagens por `status` (head+count por estado) e médias de score/confidence via RPC de leitura `discovery_stats()` (SECURITY DEFINER, admin-only) para evitar carregar todas as linhas.
3. Detalhe: uma linha por `id`.
4. Histórico: `discovery_opportunity_history` por `opportunity_id`, `order recorded_at desc`.
5. Execução: `agent_runs` por `run_id` + `agent_costs` por `run_id` + `agent_tasks` por `task_id`.
6. Pesos: `agent_config` chave `discovery_score_weights`.
7. Custos: somatórios de `agent_costs` filtrados a `agent_type = 'discovery'`.

## F. Mutations

Uma única RPC nova, `admin_set_opportunity_status(_opportunity_id uuid, _status text, _note text default null)`, SECURITY DEFINER, que: valida `is_admin(auth.uid())`, valida o estado contra a lista permitida, actualiza `status`/`updated_at`, escreve uma linha em `discovery_opportunity_history` (snapshot de métricas/scores) e um registo em `admin_audit_log` com admin, timestamp e nota. Aceitar apenas marca validação — não inicia agentes, campanhas nem despesas. Nenhum outro write a partir do frontend.

## G/H. Permissões e RLS

Sem alterações às políticas existentes: leitura já é admin-only, logo guias/turistas/anónimos recebem zero linhas e a acção falha server-side. A UI esconde a secção a não-admins, mas a segurança fica na RLS + verificação dentro da RPC. Nunca usar service role no frontend.

## I. Fluxo de aprovação

`nova → em_analise → aceite | rejeitada`; `expirada` apenas manual quando a oportunidade deixou de ser relevante. Rejeitar e expirar exigem nota obrigatória. Cada transição gera histórico + auditoria.

## J. Histórico

Somente leitura, ordem cronológica inversa, com métricas, scores, evidência, fonte, task e run associados. Nunca apagado.

## K. Custos

Área simples: custo total de discovery, custo médio por oportunidade (total ÷ nº de oportunidades, "—" quando zero), custo por execução no detalhe. Sem gráficos nesta fase.

## L–P. Estrutura de ecrãs

- Overview: cartões com total, novas, em análise, aceites, rejeitadas, expiradas, score médio, confidence média, países/mercados distintos, custo de discovery, última execução (`agent_runs` mais recente do tipo discovery). Sem dados → `0` ou `—`.
- Lista: mercado, país, idioma, query, intenção, categoria, estação, fonte, score, confidence, status, discovered_at; ordenação por score/confidence/data; paginação.
- Detalhe: identificação → fonte e `source_reference` (ou "Fonte não disponível") → evidência separada por tipo → scores lado a lado com decomposição pelos pesos da execução → rationale registado → recomendação → histórico → execução.
- Filtros: país, mercado, idioma, intenção, categoria, status, fonte, score mínimo, confidence mínima, intervalo de datas; opções de listas derivadas dos dados existentes (sem opções vazias).
- Métricas de qualidade: totais, aceites, taxa de rejeição, médias, duplicados actualizados (oportunidades com mais de uma linha de histórico), custo total e médio.

## Q. Loading / vazio / erro

Skeletons nas tabelas e cartões; estado vazio no padrão já usado ("Ainda não existem oportunidades descobertas."); erros mostrados com mensagem explícita e botão "Tentar novamente"; erro de autorização mostra acesso negado. Nunca falhar em silêncio.

## R. Responsividade

Desktop primeiro: tabela completa. Tablet/mobile: cartões empilhados com campos essenciais e detalhe em sheet full-screen, seguindo os padrões actuais.

## S/T. Performance e índices

Paginação server-side, filtros no servidor, agregados por RPC. Índices actuais cobrem status e score/data. Só se a pesquisa textual ficar lenta com volume real se avaliará um índice trigram em `query`/`rationale` — não criado agora.

## U. Riscos

Zero dados hoje (só estados vazios são verificáveis); `source_reference` pode vir vazio; nova RPC precisa de aprovação de migração; risco de o painel dar impressão de automação — mitigado com aviso explícito de que aceitar não executa nada.

## V. Testes

Unitários para derivação de agregados, decomposição de score com pesos vindos da config, mapeamento de estados e formatação de custo; verificação de que não-admin não lê nem escreve; verificação em browser das telas com dados vazios em desktop e mobile; typecheck e Vitest.

## W. Sequência

1. RPC de estado + RPC de estatísticas (única migração). 2. Hooks. 3. Overview. 4. Lista + filtros. 5. Detalhe com evidência/score/rationale. 6. Histórico + execução + custos. 7. Acções administrativas. 8. Estados vazios/erro, testes e verificação em browser.

## X/Y. Complexidade e impacto

Média (frontend extenso, backend mínimo: uma migração com duas funções). Sem consumo de IA, sem alterações a limites, sem cron, sem dados fictícios, sem impacto no site público.

## Z. Checklist pré-build

Sem mudanças no site público; sem activação de agentes ou scheduler; limites continuam pausados/zero; RLS intacta; nenhum secret exposto; nenhum dado de demonstração; apenas a secção admin nova.
