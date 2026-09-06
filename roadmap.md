# Roadmap

## Fase 3 — Orquestrador completo + Discovery Agent v1 (em curso)
- [ ] Migração: discovery_opportunities, discovery_cache, RLS/grants, dedupe, recuperação de tarefas presas
- [ ] Orquestrador: lease/heartbeat, timeout, limite por execução, aprovações fechadas, encadeamento limitado
- [ ] Tool layer v1: search_console_data, classify_intent, analyze_market, score_opportunity, save_opportunity
- [ ] Discovery Agent v1 com abstração DiscoverySource (SearchConsoleSource)
- [ ] Scores determinísticos (opportunity/confidence) configuráveis
- [ ] Testes (25 casos) a passar
- [ ] Sem cron ativo, sem limites de custo alterados, sem dados fictícios
