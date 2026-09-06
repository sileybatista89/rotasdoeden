# Roadmap

## Fase 3 — Orquestrador completo + Discovery Agent v1 (concluída)
- [x] Migração: discovery_opportunities, discovery_cache, histórico, agent_config, RLS/grants, deduplicação
- [x] Orquestrador: lease/recuperação, timeout, retries com backoff, limite por execução, aprovações fechadas, encadeamento limitado
- [x] Tool layer v1: search_console_data, classify_intent, analyze_market, score_opportunity, save_opportunity
- [x] Discovery Agent v1 com abstração DiscoverySource (SearchConsoleSource + sinais manuais)
- [x] Scores determinísticos (oportunidade/confiança) com pesos configuráveis
- [x] 62 testes a passar + testes de execução controlada (dados de teste apagados)
- [x] Sem cron ativo; todos os limites de custo repostos a pausado/zero

## Próximas fases (requerem autorização)
- [ ] Fase 4: painel de administração das oportunidades (AI Control Center)
- [ ] Content / Acquisition / Conversion agents
