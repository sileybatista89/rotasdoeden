# Roadmap

## Fase 3 — Orquestrador completo + Discovery Agent v1 (concluída)
- [x] Migração: discovery_opportunities, discovery_cache, histórico, agent_config, RLS/grants, deduplicação
- [x] Orquestrador: lease/recuperação, timeout, retries com backoff, limite por execução, aprovações fechadas, encadeamento limitado
- [x] Tool layer v1: search_console_data, classify_intent, analyze_market, score_opportunity, save_opportunity
- [x] Discovery Agent v1 com abstração DiscoverySource (SearchConsoleSource + sinais manuais)
- [x] Scores determinísticos (oportunidade/confiança) com pesos configuráveis
- [x] 62 testes a passar + testes de execução controlada (dados de teste apagados)
- [x] Sem cron ativo; todos os limites de custo repostos a pausado/zero

## Fase 4 — Discovery Control Center (concluída)
- [x] RPCs discovery_stats() e admin_set_opportunity_status()
- [x] Hooks React Query (stats, lista, detalhe, histórico, execução, pesos)
- [x] Secção admin "Discovery IA": overview, filtros, lista paginada, detalhe (fonte/evidência/score/rationale/histórico/execução/custos)
- [x] Ações: aceitar / em análise / rejeitar (nota) / expirar (nota) + auditoria
- [x] Testes, typecheck, verificação desktop/mobile; sem agentes ativos nem dados fictícios

## Fase 5 — Content Agent v1 (concluída)
- [x] Migrações: content_items, content_versions, content_sources, content_reviews, content_publications, content_cache
- [x] RPCs: content_save_draft, content_cache_get/put, content_stats, admin_set_content_status, admin_restore_content_version
- [x] Módulo puro content.ts: elegibilidade da oportunidade, parsing estruturado, SEO, controlo de qualidade anti-invenção
- [x] Edge function ai-content: fontes internas reais, outline+draft com abstração de fornecedor, cache, custos
- [x] Admin "Conteúdo IA": resumo, filtros, lista paginada, detalhe (texto/fontes/versões/histórico/execução), aprovar/rejeitar/arquivar/repor versão
- [x] 84 testes a passar; sem cron, sem publicação automática, sem alterações ao site público

## Próximas fases (requerem autorização)
- [ ] Acquisition / Conversion agents

