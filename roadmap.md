# Roadmap

## Fase 3 — Orquestrador completo + Discovery Agent v1 (concluída)
- [x] Migração: discovery_opportunities, discovery_cache, histórico, agent_config, RLS/grants, deduplicação
- [x] Orquestrador: lease/recuperação, timeout, retries com backoff, limite por execução, aprovações fechadas, encadeamento limitado
- [x] Tool layer v1: search_console_data, classify_intent, analyze_market, score_opportunity, save_opportunity
- [x] Discovery Agent v1 com abstração DiscoverySource (SearchConsoleSource + sinais manuais)
- [x] Scores determinísticos (oportunidade/confiança) com pesos configuráveis
- [x] 62 testes a passar + testes de execução controlada (dados de teste apagados)
- [x] Sem cron ativo; todos os limites de custo repostos a pausado/zero

## Fase 4 — Discovery Control Center (em curso)
- [ ] RPCs discovery_stats() e admin_set_opportunity_status()
- [ ] Hooks React Query (stats, lista, detalhe, histórico, execução, pesos)
- [ ] Secção admin "Discovery IA": overview, filtros, lista paginada, detalhe (fonte/evidência/score/rationale/histórico/execução/custos)
- [ ] Ações: aceitar / em análise / rejeitar (nota) / expirar (nota) + auditoria
- [ ] Testes, typecheck, verificação desktop/mobile; sem agentes ativos nem dados fictícios

## Próximas fases (requerem autorização)
- [ ] Content / Acquisition / Conversion agents

