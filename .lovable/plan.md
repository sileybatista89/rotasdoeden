# Fase 7H — Plano Técnico: Reserva de Pacote + Pagamento (só desenho)

Nada é construído: sem tabelas, sem UI, sem código, sem Stripe, sem orders Duffel, sem pagamentos, sem reservas reais.

## 1. Auditoria

Verificado no código e na base de dados:

- **`bookings`**: reserva de **serviço único** — `service_id`, `guide_id`, `service_title`, `date`, `num_people`, `total_price`, comissão 15%, `guide_payout`, `stripe_session_id`, `payment_status`, `visitor_id`, `attribution`. Não tem lugar para múltiplos componentes, voo, fornecedores nem confirmações parciais.
- **`create-checkout`**: exige sessão autenticada, calcula o preço **no servidor** a partir de `services.price_per_person`, cria a reserva em `pending_payment` e só depois abre a sessão Stripe, com `bookingId` em metadata. Ambiente Stripe decidido no servidor.
- **`payments-webhook`**: verifica assinatura, trata `checkout.session.completed`, `async_payment_succeeded`, `expired`, `async_payment_failed`; atualiza a reserva e regista o evento de conversão em `traffic_events`. **Não é idempotente por evento** — não existe registo de `event.id` processado; hoje isso é inofensivo porque a atualização é idempotente, mas não serve para pacotes (voo, fornecedores, emails).
- **Cotações (7G)**: `travel_quotes` / `travel_quote_versions` / `travel_quote_items` — versões imutáveis, `valid_until` limitado pelo elemento mais curto, `confirmable` + `blocking_reasons`, `pricing_calculation_id`, snapshot do voo, token público com hash. Estados terminam em `accepted` = **aceitação comercial apenas**.
- **Voos (7E)**: `flight_offers` com `expires_at`, `hold_capable`, `requires_instant_payment`, refresh/reprice; `createOrder` está bloqueado. Sem `DUFFEL_TEST_API_KEY` configurada.
- **Preços (7D)**: `pricing-engine` é a única fonte do preço; política ativa carregada do servidor.
- **Notificações**: `notifications` + `create_notification(...)` com `dedupe_key` — já dá idempotência de mensagens.
- **Atribuição**: `traffic_visitors`, `traffic_events`, `visitor_id`+`attribution` nas reservas e nas cotações. Reutilizar tal e qual.
- **Admin/auditoria**: `is_admin`, `admin_audit_log`, guardas de eliminação e RLS só-admin nas tabelas de operação.

## 2. Arquitetura escolhida — opção B

**`package_bookings` novo, ligado à cotação, sem tocar em `bookings`.**
`bookings` continua a servir exclusivamente reservas de serviços com guias (Stripe atual intacto). Um pacote tem N componentes, um voo, vários fornecedores e confirmações parciais — forçar isso em `bookings` quebraria o fluxo estável e as políticas existentes. Ligação opcional `bookings.package_booking_id` só se, mais tarde, um serviço de guia for vendido dentro de um pacote.

## 3. Aceitação ≠ reserva ≠ pagamento

- **QUOTE ACCEPTED** — o cliente aceita comercialmente uma versão concreta. Não bloqueia nada, não cobra, não cria order.
- **BOOKING CONFIRMED** — só depois de revalidação, pagamento e confirmação de fornecedores/voo.
- **PAYMENT COMPLETED** — só o webhook Stripe verificado o declara. Nunca o browser.

## 4. Revalidação final (obrigatória antes de qualquer cobrança)

Sequência no servidor: estado e validade da cotação → versão do produto não arquivada → componentes ativos → tarifas dentro de validade e sem `validity_unknown` → voo não expirado → refresh/reprice do voo → recálculo pelo Pricing Engine → margem mínima → comparação de preço.
Sem alteração: emite-se um **payment intent token** de curta duração ligado à versão. Com alteração: nova versão da cotação com preço antigo/novo/diferença e, acima de tolerância definida pela política, **nova aceitação obrigatória**. Nunca se cobra um valor não revalidado.

## 5. Árvore de decisão do voo

**A) `requires_instant_payment = true`** — nunca criar order antes do dinheiro. Ordem: revalidar → cobrar cliente → confirmar pagamento por webhook → criar order Duffel → emitir. Falha na order depois do pagamento: estado `issue`, intervenção humana, reembolso total ou nova oferta com diferencial aceite. Expiração antes da cobrança: nova pesquisa, nova versão.

**B) `requires_instant_payment = false` e `hold_capable = true`** — hold primeiro: revalidar → criar order em hold → guardar `hold_expires_at` → cobrar → pagar a companhia dentro do prazo → emitir. Hold expirado antes do pagamento: cancelar hold, nova pesquisa, nova versão, sem cobrança. Se já houve cobrança e o hold expirou: `issue` + reembolso ou reoferta.

Sem `hold_capable` e sem pagamento imediato: tratar como A.

## 6. Pagamento e Stripe

Continua o modelo atual: Checkout Session criada no servidor, valor derivado exclusivamente do **preço final confirmado no servidor** (última versão revalidada), metadata com `package_booking_id`, `quote_version_id` e `revalidation_id`. Nunca aceitar valor do frontend, de IA, de cotação expirada ou de versão diferente. Um webhook dedicado a pacotes, separado do de serviços, para não perturbar o fluxo estável.

## 7. Idempotência

- Tabela de eventos Stripe processados (`event.id` único) — descarta webhooks repetidos.
- `package_bookings.quote_version_id` único enquanto ativo — impede reserva duplicada.
- Uma só sessão Stripe aberta por reserva.
- Order Duffel guardada com chave de idempotência própria; nunca recriada se já existir referência.
- Confirmações de fornecedor com chave única por (reserva, componente).
- Emails via `create_notification` com `dedupe_key`.

## 8. Falha de fornecedor

Alojamento indisponível, tarifa alterada, voo alterado/indisponível, fornecedor sem resposta: a reserva passa a `issue` com motivo estruturado, sem cobrança nova automática e sem substituição silenciosa. Pagamento feito e fornecedor falha: dinheiro fica retido em estado explícito até decisão humana — alternativa equivalente aceite pelo cliente, ou reembolso. Nunca degradar o pacote sem aceitação escrita.

## 9. Matrizes de estados (separadas)

- **BOOKING**: `draft` → `awaiting_payment` → `paid` → `confirmed` → `completed`; ramos `cancelled`, `issue`.
- **FLIGHT**: `none` → `selected` → `revalidated` → `held` → `ordered` → `ticketed`; ramos `expired`, `unavailable`, `failed`, `cancelled`.
- **PAYMENT**: `none` → `pending` → `paid` → `partially_refunded` / `refunded`; ramos `failed`, `expired`.
- **OPERATIONS**: `preparing` → `supplier_confirmation` → `flight_confirmation` → `accommodation_confirmation` → `ready` → `completed`; ramos `issue`, `cancelled`.

Nenhum estado colapsa noutro; a reserva só é `confirmed` quando pagamento, voo e fornecedores estiverem cada um no seu estado final positivo.

## 10. Cliente sem conta

Ver e aceitar cotação: apenas com o token público já existente, sem conta. Fornecer dados de passageiros, pagar e gerir a reserva: exige conta ou magic link, ligando a reserva a um utilizador antes da cobrança.

## 11. Dados de passageiros

Recolhidos **só depois da aceitação e antes da emissão**, e só o que a companhia exige: nome completo como no documento, data de nascimento, género quando exigido, nacionalidade, documento e validade, contacto do titular. Guardados na reserva, acesso restrito a administradores e ao próprio titular, nunca no payload público, nunca em logs, nunca enviados a agentes IA.

## 12. Notificações

Ciclo, todas com `dedupe_key`: cotação aceite, pagamento pendente, pagamento recebido, reserva criada, confirmação de fornecedor, estado do voo, confirmação de alojamento, confirmação final, incidente, cancelamento/reembolso.

## 13. Cancelamento e reembolso

Quatro planos distintos: cancelar cotação (não afeta dinheiro), cancelar reserva, cancelamento pelo fornecedor, reembolso de pagamento. As condições comerciais vêm das `cancellation_type`/`cancellation_summary` já guardadas nas linhas da cotação e da política do voo — **não se inventa política**; enquanto não houver política escrita da empresa, qualquer reembolso é decisão humana registada.

## 14. Atribuição

`visitor_id` e `attribution` propagam-se da cotação para a reserva; a conversão paga gera um `traffic_events` como já acontece nas reservas de serviços. Nenhum sistema novo.

## 15. Segurança

O frontend nunca decide preço, reserva, pagamento, voo ou fornecedor. A IA nunca confirma pagamento, nunca altera preço, nunca cria order e nunca executa ação irreversível: propõe, e um administrador aprova pelo mecanismo de aprovações já existente. Tabelas de operação só-admin com RLS, sem eliminação, tudo em `admin_audit_log`.

## 16. Operações pós-pagamento

Painel operacional com os estados de OPERATIONS acima, checklist por fornecedor, prazos, responsável e registo de cada confirmação recebida.

## 17. Proposta de base de dados (a criar só no Build)

`package_bookings` (identidade, cotação e versão, cliente, estados de booking/flight/payment/operations, preço confirmado, moeda, atribuição, validade), `package_booking_items` (fotografia das linhas confirmadas), `booking_flight` (oferta, order, hold, bilhetes, estado), `supplier_confirmations` (por componente/fornecedor, referência, estado, prazo), estado de pagamento com registo de eventos Stripe processados, e registo operacional. Sem duplicar `bookings`.

## 18. Matriz de falhas

| Cenário | Estado | Ação | Retry | Notificação | Humano |
|---|---|---|---|---|---|
| Voo expirado antes de cobrar | flight `expired` | nova pesquisa, nova versão | auto 1x | cliente | não |
| Preço do voo subiu | booking `draft` | nova versão com diferencial | não | cliente | se acima da tolerância |
| Voo indisponível | flight `unavailable` | bloquear cobrança | não | cliente+admin | sim |
| Hold expirado | flight `expired` | cancelar hold, reoferta | não | cliente+admin | se já pago |
| Pagamento falhou | payment `failed` | manter reserva em espera | cliente repete | cliente | não |
| Webhook duplicado | inalterado | descartar por `event.id` | — | nenhuma | não |
| Tarifa de fornecedor subiu | booking `issue` | nova versão ou cancelar | não | cliente+admin | sim |
| Alojamento indisponível | ops `issue` | procurar alternativa aceite | não | cliente+admin | sim |
| Falha parcial de fornecedor | ops `issue` | confirmar o resto, isolar falha | não | cliente+admin | sim |
| Reembolso | payment `refunded` | reembolso registado | não | cliente | sim |
| Cancelamento | booking `cancelled` | libertar hold/ordens | não | cliente+fornecedor | conforme política |
| Indisponibilidade do fornecedor externo | ops `issue` | fila e nova tentativa | auto com espera | admin | se persistir |

## 19. Fronteira legal

Cotação e reserva são técnicos; **cobrar por um pacote de viagem organizado e emitir bilhetes** depende da habilitação legal da empresa como agência/operador (registo próprio, seguro/garantia, condições gerais, direito de desistência e informação pré-contratual). O Build pode preparar toda a arquitetura, mas a ativação do pagamento de pacotes e da emissão fica dependente dessa habilitação e de política comercial escrita.

## 20. Testes previstos

Aceitação, revalidação, alteração de preço, hold, pagamento imediato, criação de reserva, pagamento, webhook, idempotência, prevenção de duplicados, cancelamento, reembolso, falha de fornecedor, RLS, adulteração pelo frontend e atribuição.

## 21. Ordem mínima de Build (Fase 7I+)

1. Migração das tabelas de reserva de pacote, com RLS, guardas e auditoria.
2. Aceitação da cotação pelo cliente (token) e registo da aceitação.
3. Revalidação final no servidor, com nova versão e diferencial.
4. Criação da reserva de pacote e das suas linhas, sem pagamento.
5. Estados de voo sem order real (hold e order continuam bloqueados).
6. Pagamento: sessão Stripe dedicada a pacotes + webhook idempotente.
7. Confirmações de fornecedor e painel operacional.
8. Cancelamento/reembolso manual registado.
9. Suíte de testes completa e relatório. Parar antes de orders Duffel reais, emissão e produção.
