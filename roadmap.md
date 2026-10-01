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

## Fase 6 — Aquisição: medição própria + fundação (etapas 1-3 concluídas)
- [x] Medição primeira-parte: traffic_visitors, traffic_events, record_traffic_event (consentimento obrigatório)
- [x] Atribuição na reserva (visitor_id + origem) no checkout e evento de reserva paga no webhook
- [x] Tabelas de aquisição: plans, assets, campaigns, results, learning (RLS admin-only)
- [x] Políticas e configuração de aquisição; orçamento de campanha a zero
- [x] Módulo puro acquisition.ts (elegibilidade, estados de mercado, scoring, orçamento, paragens) + 31 testes

## Fase 5B — Acquisition Agent v1 (concluída)
- [x] Registo de canais (nenhum executável), capacidade real, factores determinísticos, parser seguro
- [x] ai-acquisition: planos só em rascunho, dedup, pedidos de ativos ao Conteúdo IA, campanhas a orçamento zero
- [x] RPCs de aquisição + histórico de planos + auditoria de administração
- [x] Secção admin "Aquisição IA" (visão geral, filtros, lista, detalhe, decisões)

## Fase 7B — Produtos e versões de pacotes (concluída)
- [x] Tabelas travel_products + travel_product_versions (RLS admin, versão publicada imutável)
- [x] RPCs de criação/edição/estado/versão com auditoria
- [x] Os 4 produtos oficiais (Essencial, Explorar, Imersão, À Medida) sem preços nem componentes
- [x] Secção admin "Pacotes" (lista + detalhe + ações)
- [x] Testes de duração, versionamento, imutabilidade, permissões

## Próximas fases (requerem autorização)
- [ ] Fase 7A restante: fornecedores/custos, pricing engine, voos/Duffel, cotações
- [ ] Resultados/aprendizagem e, só com autorização, canal externo (etapas 9-10)
- [ ] Conversion agent (plano da Fase 6 por aprovar)

## Reformulação visual pública — Editorial boutique
- [x] Consolidar paleta floresta/coral e tipografia Instrument Serif + Work Sans
- [x] Redesenhar navegação, homepage e rodapé com hierarquia Destino → Pacotes → Experiências → Guias
- [x] Dar protagonismo aos quatro pacotes e manter o preço dinâmico do Rotas Essencial
- [x] Redesenhar páginas públicas de destino, experiências e guias
- [x] Redesenhar visualmente o configurador partilhado sem alterar a lógica
- [x] Verificar páginas públicas em desktop e mobile, typecheck e build
- [x] Repor as fotografias enviadas pelo proprietário (whitelist em src/assets/real) e remover só as versões "melhoradas" pelo sistema

## Homepage e entrada para os pacotes
- [x] Apresentar os quatro pacotes imediatamente após a abertura da homepage
- [x] Criar uma escolha simples entre viagem completa e exploração do destino
- [x] Simplificar o preço público e orientar as quatro etapas do configurador
- [x] Verificar computador, telemóvel, tipos e build de produção


## Fase 7I passo 1 — Estruturas de reserva de pacote (concluída)
- [x] package_bookings, package_booking_items, booking_flight, supplier_confirmations, payment_events
- [x] Estados separados (reserva / voo / pagamento / operações), RLS só admin, sem acesso público
- [x] Guardas: nada é eliminado, linhas imutáveis, cotação/versão coerentes, sem reserva duplicada
- [x] Auditoria de criação e de mudança de estado; modelo partilhado + 9 testes
- [x] Passos 2-4: aceitação pelo cliente (ligação com código), revalidação final server-side, criação da reserva
- [x] Página pública /proposta (só preço final, sem custos) + ações de revalidar/criar reserva no painel
- [ ] Passo 5 (pagamento, Stripe de pacote, voo real, confirmação de fornecedores) — requer autorização

## Fluxo comercial dos pacotes (concluído)
- [x] Pedido do configurador gera proposta automaticamente pelo Quote Engine (chamada interna de serviço) e grava quote_id
- [x] Aceitação pública passa sempre por revalidação; preço alterado mostra proposta atualizada ao cliente
- [x] Admin: fase do ciclo (criada / enviada / aceite / aguarda revalidação / pronta para pagamento) e lista de pedidos do configurador
- [x] Pagamento continua desativado, reserva fica a aguardar pagamento; Duffel em teste
