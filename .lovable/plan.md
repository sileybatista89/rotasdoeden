# Fase 5 — Plano técnico do Agente de Aquisição IA (só desenho, sem build)

## 1. Estado atual do sistema de aquisição
Não existe qualquer sistema de aquisição. Confirmado na base de dados e no código:
- A função `ai-acquisition` é apenas o esqueleto da Fase 2A: responde "agente ainda não implementado", não chama modelos, não gasta nada.
- Não existe nenhuma tabela de aquisição (as 34 tabelas atuais são plataforma, agentes, discovery e conteúdo).
- Não existe nenhuma campanha, anúncio, lead, métrica de canal ou atribuição.
- Limites de custo: tudo a zero e em pausa (global e por agente). Nenhum cron ativo.
- Políticas já existentes para `acquisition`: `analyze_campaigns` (livre), `prepare_campaign` (livre), `publish_paid_campaign` (aprovação), `spend_money` (aprovação).

## 2. Recursos existentes reutilizáveis (nada disto será duplicado)
- Orquestrador: fila, idempotência, lease, retries, timeout, recuperação de tarefas presas, encadeamento limitado, aprovações.
- `agent_tasks`, `agent_runs`, `agent_costs`, `agent_approvals`, `agent_policies`, `agent_settings`, `agent_config`.
- Camada de fornecedores (`providers.ts`) com Lovable, OpenAI e Google, e classificação de erros.
- Camada de ferramentas (`tools.ts`) com validação de argumentos, verificação de política e registo.
- Discovery: oportunidades aceites, evidência, scores, histórico, cache.
- Conteúdo: geração de rascunhos com fontes, controlo anti-invenção, aprovação humana, versões.
- Admin: padrão de secção (resumo, filtros, lista paginada, ficha lateral, ações auditadas), notificações, registo de auditoria.

## 3. Integrações que existem realmente
- **Google Search Console** — ligado por conector, usado pelo Discovery. Dá procura observada no próprio site (consulta, país, cliques, impressões, posição). É a única fonte externa de procura disponível.
- **Stripe** — pagamentos reais de reservas (checkout e webhook). Dá receita real por reserva.
- **Dados internos** — utilizadores, perfis profissionais, serviços aprovados, reservas, mensagens, distritos/localidades, conteúdo gerado, oportunidades Discovery.
- **Lovable AI** — disponível sem chaves próprias.

## 4. Integrações ausentes (não fingir que existem)
- Google Ads e Keyword Planner: **não existem**. Sem conta, sem credenciais, sem volumes de pesquisa de mercado.
- GA4 / analítica web: **não existe**. Não há script de medição no site.
- Atribuição UTM / gclid: **não existe**. Não guardamos origem de visita nem origem de reserva.
- Meta/Instagram Ads, email marketing, CRM, afiliados: não existem.
- Conversões: só existem reservas pagas; não há eventos intermédios (visita, pedido de contacto, início de checkout).

## 5. Gap analysis
O maior bloqueio não é o agente — é a **medição**. Sem atribuição nem analítica, qualquer campanha seria impossível de avaliar e o agente não teria como aprender. Por isso a implementação futura tem de começar pela medição própria (UTM + eventos + atribuição da reserva), que não depende de nenhuma conta externa nova.

Segundo bloqueio: sem Google Ads/Keyword Planner, o agente **não pode estimar volume de mercado nem custo por clique**. O plano trata isto explicitamente: mercados sem evidência ficam classificados como "sem evidência suficiente" e não geram propostas de gasto.

## 6. Arquitetura proposta
Server-side, dentro do que já existe:
- `ai-acquisition` (Edge Function) passa de esqueleto a agente real, chamado apenas pelo orquestrador com chave de serviço.
- `_shared/agents/acquisition.ts`: lógica pura (elegibilidade, scoring, validações, estados) testável fora do Deno, tal como `discovery.ts` e `content.ts`.
- Ferramentas registadas na camada existente, cada uma ligada a uma chave de política.
- Nenhuma chave no frontend; nenhum segredo no código.

## 7. Fluxo completo
```text
Oportunidade Discovery (aceite, não expirada)
  -> análise de aquisição (mercado, canal, capacidade de atendimento real)
  -> decisão: perseguir / esperar / descartar (com justificação e evidência)
  -> plano de aquisição (hipótese, público, mensagem, oferta, objetivo, métrica, custo estimado)
  -> ativos necessários -> pedido ao Content Agent (tarefa filha, sem duplicar a sua lógica)
  -> preparação da campanha em rascunho (nada externo)
  -> APROVAÇÃO HUMANA obrigatória para publicar, gastar ou contactar
  -> execução (fase futura, só depois de existir canal ligado)
  -> medição (atribuição própria: visitas, pedidos, reservas, receita)
  -> aprendizagem (o que resultou por mercado/canal/mensagem)
  -> devolução ao Discovery: sinal de procura confirmada ou desmentida
```

## 8. Modelo de dados proposto (a criar só no Build)
Cinco tabelas novas, não onze — só onde há necessidade real:
- `acquisition_plans` — o plano por oportunidade: mercado, idioma, canal, estado do mercado, hipótese, público, mensagem, oferta, objetivo, métrica-alvo, custo estimado, scores, estado (rascunho / em revisão / aprovado / rejeitado / arquivado), ligação à tarefa e execução.
- `acquisition_assets` — ativos de que o plano precisa e o seu estado; liga ao `content_items` quando o ativo é conteúdo (sem copiar conteúdo).
- `acquisition_campaigns` — a campanha preparada e o seu ciclo de vida (rascunho, à espera de aprovação, aprovada, ativa, pausada, terminada), orçamento pedido e teto, sempre sem execução externa nesta geração.
- `acquisition_results` — resultados medidos por período: visitas, pedidos, reservas, receita, custo. Só dados reais e verificáveis; nunca estimativas guardadas como resultado.
- `acquisition_learning` — conclusões por mercado/canal/mensagem, com a evidência que as suporta.

Reutilizadas sem duplicar: `agent_approvals` (aprovações), `agent_costs` (custo de IA), `admin_audit_log`, `notifications`, `content_items`.

Medição (pré-requisito): uma tabela leve de eventos de origem (`visita`, `pedido`, `reserva`) com UTM e campanha, mais um campo de atribuição na reserva. Só primeira-parte, com respeito pelo consentimento de cookies já existente.

Todas com RLS: leitura/escrita apenas para administradores; funções servidor escrevem com chave de serviço.

## 9. Camada de ferramentas proposta
Leitura/análise: `read_accepted_opportunities`, `read_internal_capacity` (guias publicados, serviços aprovados, línguas, territórios), `read_booking_history`, `read_search_console_market`, `read_attribution_results`.
Preparação: `draft_acquisition_plan`, `score_acquisition`, `request_content_asset` (cria tarefa filha para o Content Agent), `draft_campaign`.
Execução (definidas mas desligadas nesta geração): `publish_campaign`, `set_budget`, `contact_partner`, `send_external_message`.

## 10. Matriz de permissões proposta
| Ação | Nível |
| --- | --- |
| ler dados internos e Search Console | livre |
| analisar mercado e canais | livre |
| gerar estratégia e plano em rascunho | livre |
| pontuar e priorizar | livre |
| pedir ativo ao Content Agent (rascunho) | livre |
| preparar campanha em rascunho | livre |
| criar anúncio em rascunho num canal externo | exige aprovação |
| publicar campanha | exige aprovação |
| definir ou alterar orçamento | exige aprovação |
| gastar dinheiro | exige aprovação |
| contactar parceiros ou enviar mensagens externas | exige aprovação |
| apagar planos, campanhas ou resultados | proibido |
Regra base: ações desconhecidas são negadas. Aprovar não executa: cria uma ação pendente que continua a exigir o teto de orçamento.

## 11. Controlo de custos
Dois orçamentos separados e nunca misturados: **custo de IA** (já em `agent_costs`, tetos diário/mensal em `agent_settings`) e **orçamento de campanha** (teto por campanha, por período e total, verificado antes de qualquer ação de gasto). Condições de paragem: teto atingido, custo por reserva acima do limite definido, ausência de resultados após o período mínimo, falha de medição, e interruptor geral de pausa. Nesta geração o orçamento de campanha fica a zero.

## 12. Fornecedores
Manter a abstração atual. Análise estruturada e pontuação: modelo rápido e barato (Lovable/Gemini flash, como já usa o Conteúdo). Redação de mensagens e ofertas: pode justificar um modelo mais forte quando a qualidade não bastar. Sem credenciais novas nesta fase; se não houver fornecedor configurado, o agente falha fechado, como o Discovery.

## 13. Centro de controlo no admin (só desenho)
Secção "Aquisição IA" a seguir a "Conteúdo IA", com o mesmo padrão: resumo, mercados (com o estado de cada um), oportunidades em avaliação, planos, canais, campanhas, ativos, resultados medidos, custos, aprovações pendentes, aprendizagem e registo de execuções. Cada plano tem ficha própria com hipótese, evidência, score explicado, ativos, aprovações e resultados. Nenhum número aparece sem origem.

## 14. Agendamento (nada é ativado)
Futuramente: diário — reavaliar oportunidades aceites e recolher resultados; semanal — rever mercados, atualizar aprendizagem e propor prioridades; por evento — nova oportunidade aceite, ativo aprovado, aprovação concedida, teto atingido. Todas as tarefas de gasto continuam a exigir aprovação humana, independentemente do agendamento.

## 15. Segurança
Agente só server-side, invocável apenas com a chave de serviço; RLS admin-only nas tabelas novas; segredos apenas em variáveis de ambiente; nada de chaves no frontend; separação estrita entre ler, analisar, preparar e executar; dados pessoais nunca entram nos pedidos ao modelo (a limpeza já existente é reutilizada); toda a decisão humana fica no registo de auditoria.

## 16. Testes propostos
Unitários (elegibilidade, scoring, estados, validações), integração (fluxo oportunidade → plano → pedido de ativo), permissões (cada ação contra a matriz), orçamento (bloqueio antes de qualquer chamada), idempotência (mesma oportunidade não gera plano duplicado), falha/retry, aprovação (nada externo acontece sem ela), segurança (acesso negado a não-administradores), qualidade de dados (nenhum número sem fonte), atribuição (uma reserva é contada uma só vez) e ciclo de vida da campanha.

## 17. Dependências
Medição própria (UTM + eventos + atribuição) antes de qualquer campanha; Content Agent já pronto (está); para canais pagos, uma conta e credenciais que hoje não existem; decisão sua sobre orçamento e mercados.

## 18. Riscos
Recomendar gasto sem forma de medir retorno; propor mercados sem procura provada; prometer capacidade de atendimento que não temos (poucos guias publicados); confundir procura observada no site com procura de mercado; custo de IA a crescer sem teto. Cada um é travado por uma regra acima.

## 19. O que NÃO deve ser implementado nesta fase nem no primeiro Build
Ligação a Google Ads ou a qualquer plataforma de anúncios; envio de comunicações externas; execução automática; cron; aumento de orçamentos; alterações ao site público; dados ou métricas fictícios; qualquer gasto real.

## 20. Ordem recomendada para a implementação futura
1. Medição própria (UTM, eventos de origem, atribuição da reserva) — é o pré-requisito de tudo.
2. Tabelas de aquisição com RLS e configuração de pesos/limites.
3. Módulo puro `acquisition.ts` com elegibilidade, estados de mercado e scoring, com testes.
4. Ferramentas de leitura e análise, todas ligadas à política.
5. `ai-acquisition` real: oportunidade aceite → plano em rascunho, sem nada externo.
6. Pedido de ativos ao Content Agent por tarefa filha.
7. Preparação de campanha em rascunho e fila de aprovação.
8. Secção "Aquisição IA" no admin.
9. Recolha de resultados e aprendizagem, com devolução ao Discovery.
10. Só depois, e com autorização explícita: canal externo, orçamento e execução.

## Modelo de pontuação proposto (pesos a justificar)
Intenção de viagem 25 · relevância para São Tomé 15 · potencial de conversão 15 · capacidade real de atendimento 15 · custo estimado de aquisição 10 · tamanho/procura do mercado 8 · sazonalidade 6 · margem potencial 6. Confiança dos dados não soma pontos: **multiplica** o resultado, para que uma oportunidade bem pontuada mas mal sustentada nunca suba ao topo. A capacidade de atendimento pesa alto de propósito: trazer procura que não conseguimos servir custa dinheiro e reputação. Sem Keyword Planner, o fator de tamanho de mercado começa com peso baixo e confiança baixa.
