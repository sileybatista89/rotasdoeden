# Fase 6 — Conversion Agent e jornada comercial (plano técnico)

Apenas plano. Nenhum código, schema, UI ou configuração alterados nesta etapa.

## 1. Estado encontrado (verificado agora)

Já existe e será reutilizado sem reconstrução:

- Produtos: `travel_products` (4 registos: Essencial, Explorar, Imersão, À Medida) e `travel_product_versions`.
- Supply: `suppliers`, `accommodations`, `accommodation_rooms`, `package_components`, `component_rates`.
- Pricing Engine (`pricing-engine` + `_shared/pricing-engine.ts`), Quote Engine (`quote-engine`), acesso público por token (`quote-public`) e página `/proposta?token=...`.
- Reserva de pacote: `package_bookings`, `package_booking_items`, `booking_flight`, `supplier_confirmations`, `payment_events` + função `package-booking`.
- Voos: `FlightProvider` / `DuffelFlightProvider`, `flight_searches`, `flight_offers` (Duffel TEST ligado e validado).
- Tracking próprio: `traffic_visitors`, `traffic_events`, RPC `record_traffic_event`, `src/lib/attribution.ts` (só com consentimento).
- Agentes: orquestrador completo (fila, políticas, orçamento, aprovações, custos, auditoria), providers de IA, e agentes Discovery / Content / Acquisition implementados.
- Políticas já definidas para `conversion`: `reply` livre, `create_lead` livre, `create_proposal` livre, `confirm_booking` exige aprovação, `execute_payment` proibido.
- Mensagens humanas: `conversations`, `messages`, `support_conversations`, `support_messages`, filtro anti-fraude.

O que **não** existe ainda:

- `supabase/functions/ai-conversion/index.ts` é apenas o stub da Fase 2A (sem IA, sem ferramentas).
- Não existe nenhuma interface de chat público no site.
- Não existe tabela de conversas do agente nem de leads/pedidos de orçamento.
- `traffic_events` só regista, na prática, eventos `visit`; os tipos de conversão existem no código mas quase não são emitidos.

Constatação crítica de dados reais:

- 0 versões de produto publicadas, 0 componentes, 0 tarifas, 0 serviços, 0 cotações. Existem 5 perfis profissionais e 5 ofertas de voo de teste.
- Ou seja: hoje o agente teria quase nada de real para responder. O plano trata isto como regra de produto, não como bug: o agente só afirma o que a base confirma e, quando não há dados, assume a lacuna e recolhe o pedido.

## 2. Plano macro proposto

### 2.1 Onde o agente vive

- Botão flutuante discreto no canto inferior direito, presente nas páginas públicas (início, experiências, guias, sobre, proposta). Sem redesign de nada existente.
- Painel lateral/modal de chat, em português, reutilizando os componentes shadcn já instalados.
- No painel admin, um separador "Conversão" para ler conversas, leads e resultados. Sem nova navegação global.

### 2.2 Identificação como IA

- Primeira mensagem sempre fixa e não gerada por IA: identifica-se como assistente virtual da Rotas do Éden, avisa que não é um guia humano e que qualquer valor só é confirmado numa proposta formal.
- Etiqueta permanente "IA" no cabeçalho do painel e opção sempre visível de falar com a equipa humana.

### 2.3 Só dados reais

- O agente **não** responde a partir do modelo sobre factos comerciais. Todas as afirmações sobre produtos, experiências, guias, alojamentos, preços, voos e disponibilidade passam por ferramentas server-side que leem a base.
- Ferramentas previstas (leitura apenas): produtos publicados, experiências/serviços ativos, guias verificados, conteúdo editorial publicado, e estado de uma cotação por token.
- Se a ferramenta devolver vazio, o agente diz que ainda não pode confirmar e passa a recolher o pedido. Nunca inventa alternativas.
- Preços: o agente nunca calcula nem estima. Só pode mostrar um valor que venha de uma cotação já criada pelo Pricing/Quote Engine.

### 2.4 Deteção de intenção

Classificação server-side em cinco estados, guardada na conversa: `inspiracao`, `duvida`, `interesse_pacote`, `pedido_orcamento`, `intencao_reserva`. A classificação é feita pelo mesmo passo do modelo, mas as ações permitidas dependem do estado e das políticas já existentes.

### 2.5 Encaminhamento para cotação

- `pedido_orcamento` / `intencao_reserva` → o agente recolhe critérios (datas, duração, nº de pessoas, origem do voo, interesses, contacto) e cria um **lead**, não uma cotação.
- A cotação continua a ser criada por um administrador, com o Quote Engine atual, e enviada com o link `/proposta?token=...` já existente.
- Fica previsto (fase seguinte, não agora) o agente pedir ao orquestrador uma tarefa `create_proposal`; nesta fase o lead é o limite.

### 2.6 Eventos de conversão no tracking existente

Acrescentar tipos ao `record_traffic_event` atual, sem nova infraestrutura: `chat_opened`, `chat_intent_detected`, `lead_created`, `quote_link_opened`, `quote_accepted`. Mantêm-se as regras de consentimento e ausência de dados pessoais.

### 2.7 Tabelas / endpoints / funções a criar ou ajustar

A criar:

- `conversion_conversations` — sessão do chat, visitante (anónimo ou autenticado), intenção atual, idioma, estado, atribuição.
- `conversion_messages` — mensagens, papel, ferramentas usadas, custo.
- `conversion_leads` — pedido estruturado: datas, duração, pessoas, origem, interesses, contacto, estado, ligação opcional a produto e a cotação.

Todas com RLS: leitura/escrita do próprio via função server-side, gestão só para admin, sem exposição pública direta.

A ajustar:

- `supabase/functions/ai-conversion/index.ts` — substituir o stub pela implementação real com ferramentas, seguindo o padrão de `ai-content` / `ai-discovery`.
- `supabase/functions/_shared/agents/conversion.ts` — novo módulo puro com classificação de intenção, validação de lead e sanitização (testável em vitest).
- Nova função pública `conversion-chat` — a única porta do browser: rate limiting, criação de sessão, chamada ao agente, persistência. O `LOVABLE_API_KEY` nunca sai do servidor.
- `record_traffic_event` — aceitar os novos tipos de evento.

### 2.8 UI mínima

- `src/components/conversion/ChatLauncher.tsx` e `ChatPanel.tsx` (composição via AI Elements).
- `src/hooks/useConversion.ts`.
- Um painel admin `src/components/admin/conversion/ConversionPanel.tsx` + entrada na sidebar admin.
- Sem alteração de cores, tipografia, layout ou páginas existentes.

### 2.9 Testes

- Unitários puros: classificação de intenção, validação de lead, sanitização (sem custos, margens nem tarifas de fornecedor no output).
- Guardas: sem dados reais, o agente não afirma factos; preços só a partir de cotação existente.
- Segurança: endpoint sem sessão limitado, tokens de cotação nunca expostos, RLS de admin.
- Regressão: correr a suíte completa atual (305 testes) + typecheck.

### 2.10 Fronteiras de segurança

Proibido ao agente: pagar, cobrar, criar reservas LIVE, criar orders Duffel, emitir bilhetes, contactar fornecedores, alterar preços/margens/políticas, aceder a custos de fornecedor, criar ou publicar produtos, ativar cron ou campanhas. `execute_payment` permanece `forbidden` e `confirm_booking` permanece com aprovação humana.

## 3. Ficheiros e tabelas afetados

- Novos: 3 tabelas, 1 migração, `_shared/agents/conversion.ts`, função `conversion-chat`, 3 ficheiros de UI, 1 hook, 1 painel admin, 1 ficheiro de testes.
- Alterados: `ai-conversion/index.ts`, `record_traffic_event`, `src/lib/attribution.ts`, `App.tsx` (montar o launcher), `AdminSidebar.tsx`, `AdminPage.tsx`.
- Intocados: pricing, quotes, flights, package bookings, Stripe, reservas de serviços, MCP, autenticação.

## 4. Riscos e dependências

- **Base comercial vazia** — o risco maior. Sem versões publicadas, componentes nem tarifas, o agente terá pouco a dizer. Mitigação: respostas honestas + recolha de lead. Recomendo publicar pelo menos uma versão de produto antes de abrir o chat ao público.
- Alucinação: mitigada por ferramentas obrigatórias e por proibição de falar de preços fora de cotação.
- Abuso/custo: rate limiting por IP/sessão e os limites de orçamento do sistema de agentes já existentes.
- Dados pessoais: contacto no lead é dado pessoal — guardar apenas o mínimo, com aviso de privacidade no início da conversa.
- Dependência: `LOVABLE_API_KEY` (já em uso por outros agentes).

## 5. Complexidade e consumo estimado

- Complexidade: média-alta. Sugiro dois Builds: (6A) base de dados + agente + endpoint + testes; (6B) UI de chat + eventos de tracking + painel admin.
- Consumo: 6A moderado, 6B moderado. Fazer tudo num só Build é possível mas mais arriscado de rever.

Aguardo aprovação antes de qualquer implementação.
