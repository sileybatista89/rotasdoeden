# Fase 3 — Orquestrador completo + Discovery Agent v1 (plano)

## 1. Estado atual verificado (consultado agora)
- Tabelas existentes: agent_tasks, agent_runs, agent_costs, agent_approvals, agent_policies, agent_settings. 0 tarefas, 18 políticas.
- agent_settings: global e 4 agentes, todos `paused = true`, limites diário/mensal = 0 (nada pode executar nem gastar).
- Extensões ativas: plpgsql, pg_stat_statements, uuid-ossp, pgcrypto, supabase_vault, **pg_cron**, **pg_net**. Tabela `cron.job` está **vazia** — não há nenhum agendamento ativo.
- Funções de servidor: ai-orchestrator (fila, política, orçamento, retry, aprovações, notificações, auditoria) + 4 esboços (ai-content, ai-discovery, ai-acquisition, ai-conversion) que só respondem "não implementado".
- Camadas partilhadas: core.ts (idempotência, retry, orçamento, sanitização), providers.ts (lovable/openai/google, leitura de segredos só no servidor), tools.ts (registo de ferramentas, sem ferramentas reais).
- Segredos presentes: LOVABLE_API_KEY, GOOGLE_SEARCH_CONSOLE_API_KEY (gerido por conector), chaves Stripe. **Não existe OPENAI_API_KEY nem credenciais de Google Ads.**

## 2. Orquestrador (Fase 3A) — o que passa a fazer
Mantém-se camada de coordenação, sem lógica de negócio. Acrescenta-se:
- Recuperação de tarefas presas: tarefas em `running` há mais de N minutos voltam a `pending` (lease/heartbeat) para não bloquearem a fila.
- Fluxo de aprovação fechado: aprovar uma ação passa a colocar a tarefa em execução; recusar cancela e regista motivo; tudo com auditoria.
- Encadeamento controlado: um agente pode pedir a criação de tarefas seguintes, com profundidade máxima, contador de descendentes e cadeia registada — protege contra ciclos infinitos.
- Limite por execução e por tarefa, além dos limites diário/mensal já existentes.
- Timeout por execução e cancelamento durante execução.
- Endpoint interno para o agendador, protegido por segredo próprio, separado do acesso de administrador.

## 3. Discovery Agent v1 (Fase 3B) — arquitetura
Execução assíncrona: tarefa na fila → orquestrador → função `ai-discovery` → ferramentas controladas → oportunidades gravadas → notificação ao administrador. Nunca depende de browser aberto.

Ciclo de uma execução:
1. Recolha de sinais (dados reais, com fonte).
2. Normalização e deduplicação.
3. Interpretação e classificação de intenção (modelo de linguagem, saída estruturada).
4. Cálculo de pontuação de oportunidade e de confiança.
5. Gravação com fonte, estado `nova`, sem qualquer ação externa.

Mercados: sem limitação artificial — país, língua e sazonalidade são campos de dados, definidos na tarefa.

## 4. Divisão Google / OpenAI
- **Google fornece factos**: dados do Search Console (consultas reais que já trazem tráfego ao site), e, quando autorizado, volumes e previsões de palavras-chave.
- **OpenAI interpreta**: classifica intenção (informativa, comparação, intenção de reserva), avalia relevância para São Tomé e Príncipe, sintetiza e recomenda ação.
- Regra dura: o modelo nunca inventa métricas. Um número sem fonte é hipótese, nunca dado observado. Cada oportunidade guarda o tipo de evidência: observado, interpretado, hipótese, recomendação.

## 5. Google — o que existe e o que falta
- **Search Console**: já ligado por conector. Dá consultas, impressões, cliques, posição e país. Suficiente e sem custo para a v1.
- **Google Ads API / Keyword Planner**: exige conta Google Ads, token de programador aprovado, projeto Google Cloud e OAuth de servidor. Não está disponível hoje. Fica opcional, ativável mais tarde.
- **Pesquisa web genérica**: possível via pesquisa do próprio ambiente ou API paga; na v1 é opcional e limitada.
- Recomendação v1: Search Console + OpenAI. Sem gastos com Google.

## 6. Ferramentas do agente (todas registadas na camada existente)
| Ferramenta | Entrada | Saída | Permissão | Risco/custo |
|---|---|---|---|---|
| search_console_data | intervalo, país, filtro | consultas com métricas reais | livre | sem custo |
| google_keyword_research | termos, país, língua | volumes/previsões | exige aprovação | custo/credenciais |
| search_web | consulta | resumos com ligação | exige aprovação | custo externo |
| classify_intent | consultas | intenção + justificação | livre | custo de modelo |
| analyze_market | conjunto de sinais | leitura de mercado | livre | custo de modelo |
| score_opportunity | sinais + intenção | pontuações | livre | determinístico |
| save_opportunity | oportunidade validada | registo criado | livre (só nesta tabela) | sem gasto |

Nenhuma ferramenta lê segredos; a leitura fica na camada de fornecedores. Escrita apenas na tabela de oportunidades.

## 7. Modelo de dados proposto (a criar só no build)
`discovery_opportunities`: id, market, country, language, query, intent, intent_confidence, category, season, source, source_reference, metrics (JSON), evidence_type, opportunity_score, confidence_score, rationale, recommended_action, status (nova / em análise / aceite / rejeitada / expirada), task_id, run_id, discovered_at, expires_at, unicidade por (country, language, query) com atualização em vez de duplicado.
`discovery_cache`: chave da consulta, resposta, fonte, validade (24h a 7 dias), para nunca repetir a mesma pesquisa dentro do prazo.
Acesso restrito a administradores; funções de servidor escrevem com papel de serviço.

## 8. Pontuações
**Oportunidade** (0–100), média ponderada explícita e revisível: intenção de viagem 30, relevância para São Tomé 20, volume 15, valor potencial 15, concorrência 10, sazonalidade 10. Pesos guardados em configuração, não fixos no código, e justificados no registo.
**Confiança** (0–100): qualidade dos dados — fonte real e recente sobe; extrapolação, amostra pequena ou ausência de métricas desce. Uma oportunidade com confiança baixa nunca é apresentada como facto nem gera ação.

## 9. Custos e cache
- Verificação de orçamento antes de qualquer chamada (já existe) mais limite por execução.
- Cache obrigatória antes de qualquer chamada externa; execução repetida do mesmo período não gasta nada.
- Lote reduzido por execução (por exemplo, até 50 consultas), modelo económico para classificação em massa e modelo mais forte só para síntese final.
- Continua tudo em pausa e com limite zero: para funcionar, o administrador terá de definir limites explicitamente.

## 10. Segurança
Sem segredos no frontend; sem acesso direto a tabelas fora das permitidas; RLS mantida; ações fora da lista de políticas são recusadas por omissão; ações que gastam dinheiro exigem aprovação humana; auditoria de todas as decisões administrativas.

## 11. Agendamento
pg_cron e pg_net estão ativos mas sem tarefas. Na Fase 3 fica **preparado, não ativado**: definição pronta de uma chamada periódica ao orquestrador, protegida por segredo, para ser ligada por decisão explícita. Limites conhecidos: janela de execução da função, número de tarefas por ciclo, e necessidade de idempotência (já garantida).

## 12. Observabilidade
Cada execução regista: tarefa, tentativa, fornecedor, modelo, ferramentas usadas, duração, tokens, custo estimado, resumo de entrada/saída, erros, decisão de retry, oportunidades criadas/atualizadas, confiança média e fontes.

## 13. Testes
Unitários: pontuações, deduplicação, cache, classificação de evidência, profundidade de encadeamento, recuperação de tarefas presas, limites por execução.
Fim a fim (com fornecedores simulados): tarefa válida, tarefa inválida, agente inválido, fornecedor indisponível, timeout, erro de API, retry e falha definitiva, bloqueio por orçamento, idempotência, oportunidade duplicada, oportunidade sem fonte (recusada), pontuação inválida, acesso não autorizado (guia e turista não conseguem executar nem ler).

## 14. Reutilizar vs criar
Reutiliza: fila, tarefas, execuções, custos, aprovações, políticas, retry, idempotência, notificações, auditoria, camada de fornecedores, camada de ferramentas, testes existentes.
Cria: recuperação de tarefas presas, encadeamento com limite, limite por execução, fluxo de aprovação fechado, tabelas de oportunidades e cache, ferramentas de descoberta, agente de descoberta real, novos testes.

## 15. Sequência, complexidade e impacto
1) Orquestrador completo + testes. 2) Tabelas de oportunidade e cache. 3) Ferramentas (Search Console primeiro). 4) Agente de descoberta com saída estruturada. 5) Testes fim a fim com simulação. 6) Execução manual controlada com limite mínimo.
Complexidade: média-alta (3A média, 3B alta). Impacto no site público: nenhum — nada muda no design, nas páginas, na autenticação, nas reservas ou nos pagamentos.

## 16. Pré-requisitos antes do build
- Decidir o fornecedor de inteligência: usar o já disponível (sem chave nova) ou configurar uma chave OpenAI própria.
- Confirmar que o Search Console será a fonte de dados da v1 (Google Ads fica para depois).
- Definir limites de custo diário/mensal a ativar para testes.
- Confirmar que o agendamento fica preparado mas desligado.

Nada será implementado, ligado ou gasto sem a sua autorização explícita.
