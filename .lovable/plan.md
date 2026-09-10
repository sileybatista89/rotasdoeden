# Fase 7F — Plano Técnico do Quote Engine (só desenho)

Nada é construído nesta fase: sem tabelas, sem UI, sem código, sem reservas, sem pagamentos, sem orders Duffel, sem produção.

## 1. Auditoria do que já existe

Verificado diretamente na base de dados e no código:

- **Produtos (7B)**: `travel_products`, `travel_product_versions`. Versão publicada é imutável; nova alteração exige nova versão. Reutilizável tal como está.
- **Supply (7C)**: `suppliers`, `accommodations`, `accommodation_rooms`, `package_components`, `component_rates`. As tarifas já guardam `rate_kind` (observado / fornecedor / negociado / estimado), `source_type`, `source_reference`, `observed_at`, `valid_from`, `valid_until`, `validity_unknown`, ocupação, regime alimentar e política de cancelamento. Tudo o que a cotação precisa de fotografar já existe na origem.
- **Preços (7D)**: `pricing_policies`, `pricing_policy_versions`, `pricing_calculations` e a função servidor `pricing-engine`, que só aceita admin, carrega a política ativa da base de dados e nunca aceita preço ou margem do cliente. `pricing_calculations` já guarda política, versão, custos, margem, subtotal, preço final, input e resultado completo — é o registo de cálculo que a cotação vai referenciar.
- **Voos (7E)**: `flight_searches`, `flight_offers` com custo de fornecedor, validade, requisitos de pagamento, capacidade de reserva sem pagamento e reprice. Sem chave de teste configurada, o motor devolve "não configurado" e não inventa resultados.
- **Reservas atuais**: `bookings` é de serviços individuais (`service_id`, `guide_id`, Stripe). Não é adequado a pacotes e **não será alterado**.
- **Atribuição (5A)**: `traffic_visitors`, `traffic_events`, e `bookings` já guarda `visitor_id` + `attribution` jsonb. A cotação segue exatamente o mesmo padrão — nada de novo sistema de atribuição.

**Conclusão**: nada precisa de ser duplicado. O Quote Engine é uma camada de composição e fotografia por cima do que já existe.

## 2. Arquitetura

```text
critérios do cliente
   -> produto + versão do produto        (7B)
   -> componentes + tarifas válidas      (7C)
   -> oferta de voo válida               (7E)
   -> Pricing Engine (única fonte do preço)  (7D)
   -> Quote Engine: fotografa tudo e emite a cotação
```

O Quote Engine **não tem matemática de preço**. Chama o motor de preços existente, recebe o resultado e guarda-o. Se o motor recusar, não há cotação.

Componentes a criar no Build (7G):
- `supabase/functions/_shared/quote-engine.ts` — lógica pura: numeração, validade limitada pelo elemento mais curto, comparação entre versões, decisão de revalidação, estados. Sem I/O.
- `supabase/functions/quote-engine/index.ts` — função servidor: valida entrada, carrega dados reais, chama o motor de preços, grava a cotação e as suas linhas.
- `src/lib/quotes.ts` — reexporta os tipos e etiquetas para o admin, tal como `src/lib/pricing.ts`.

## 3. Modelo de dados proposto (a criar só no Build)

Nomes seguem as convenções já usadas (`travel_*`, `*_versions`, uuid, `created_at`/`updated_at`, `created_by`):

**`travel_quotes`** — identidade estável da cotação: número legível, produto e versão do produto, estado, moeda de venda, versão atual, criador, canal de criação (`admin`/`public`/`agent`), visitante e atribuição, contacto mínimo do cliente, validade.

**`travel_quote_versions`** — a fotografia imutável. Cada versão guarda: número da versão, estado, critérios do cliente, versão da política de preços, referência ao `pricing_calculations` gerado, custo total, preço total, moeda de custo e de venda, câmbio usado e momento da conversão, referência à oferta de voo, validade da versão, motivo da nova versão, comparação com a versão anterior (preço antigo, novo, diferença), quem criou e quando foi substituída.

**`travel_quote_items`** — uma linha por componente da versão: componente e tarifa de origem, fornecedor, nome apresentado, quantidade, unidade, custo unitário e total no momento, regra de margem aplicada, preço resultante, moeda, tipo de tarifa, fonte, validade da tarifa e condições de cancelamento. As linhas guardam texto e valores, não apenas chaves: a cotação continua legível mesmo que o fornecedor mude o preço depois.

Regras: sem eliminação (guardas de `delete` como em 7C/7D), acesso apenas a admin via RLS, `GRANT` explícito, alterações registadas em `admin_audit_log`, e uma RPC `quote_stats()` protegida por `is_admin`.

## 4. Imutabilidade e versionamento

- Assim que uma versão sai de `draft`, torna-se imutável por trigger: preço, itens, política, voo e validade não podem ser alterados.
- Qualquer mudança cria **nova versão**; a anterior passa a `superseded` e permanece no histórico.
- O cabeçalho (`travel_quotes`) só pode mudar de estado e apontar para a versão atual.

## 5. Estados

`draft` → `calculated` → `sent` → `awaiting_confirmation` → `accepted` → `superseded` / `expired` / `cancelled`.

Separação obrigatória, nunca colapsada: cotação válida ≠ cliente aceitou ≠ reserva criada ≠ pagamento iniciado ≠ pagamento concluído. `accepted` significa apenas aceitação comercial.

## 6. Validade

Validade da cotação = **mínimo** entre: validade escolhida pela política/operador, expiração da oferta de voo, e a menor `valid_until` das tarifas usadas. Tarifas com `validity_unknown` impedem estado confirmável e forçam revisão. Uma oferta de voo expirada nunca pode sustentar uma cotação válida.

## 7. Recálculo antes da confirmação

Sequência: verificar estado → verificar expiração do voo → reconsultar preço do voo (7E) → verificar tarifas dos componentes → chamar o motor de preços → comparar com a versão atual. Resultado: mantém, ou cria nova versão com o diferencial explícito (preço antigo, preço novo, diferença, motivo, nova validade). A versão original nunca é sobrescrita nem a diferença escondida.

## 8. Falhas — nunca inventar preço

Tarifa expirada, voo expirado, componente indisponível, fornecedor indisponível, câmbio em falta, política inativa, versão do produto arquivada: em todos os casos a cotação fica em revisão ou é recusada, com motivo estruturado. Sem valores por omissão, sem estimativas silenciosas.

## 9. Moeda

A cotação guarda moeda de custo, moeda de venda, câmbio usado e o momento da conversão. Não se cria serviço de câmbio externo nesta fase: se as moedas divergirem e não houver taxa registada válida, a cotação exige revisão.

## 10. Segurança

Criação sempre no servidor. O cliente envia apenas critérios (destino, datas, pessoas, conforto, orçamento indicativo). Nunca preço, margem, markup, custos, política ou tarifa. Uma proposta simples pode ser gerada sem conta, com dados pessoais mínimos e limites de utilização; tudo o que seja sensível depois exige o fluxo autenticado já existente. Agentes podem propor, nunca escrever preço nem alterar cotações.

## 11. Admin (só desenho)

Futura secção "Cotações": número, produto, contexto do cliente, preço, moeda, estado, criação, validade, voo e versão; filtros por estado, produto, período, moeda, origem e autor. Não é implementada nesta fase.

## 12. Testes previstos para o Build

Criação, imutabilidade, versionamento, expiração da cotação/tarifa/voo, reconsulta de voo, alteração de preço, moeda, atribuição, versão da política, fotografia da tarifa, permissões de admin e de cliente, duplicação/idempotência e falha do fornecedor.

Testes críticos de dinheiro: preço ao cliente diferente do custo; motor de preços como única fonte do preço; impossibilidade de alterar preço pelo frontend; versão de política correta; ausência de dupla margem; nenhuma tarifa expirada usada; nenhum voo expirado usado; alteração de preço gera sempre nova versão.

## 13. Riscos

- Dupla margem se o custo do voo entrar já marcado — mitigado por o Quote Engine passar apenas custo de fornecedor.
- Validade otimista se o mínimo entre elementos não for aplicado.
- Fotografia incompleta se as linhas guardarem apenas chaves em vez de valores.
- Sem chave de teste Duffel configurada, cotações com voo real não são testáveis ponta a ponta.
- Ainda não existem fornecedores, tarifas nem política ativa reais: o motor funcionará mas devolverá "sem tarifa válida" até existirem dados reais.

## 14. Dependências

Política de preços ativa; tarifas reais de fornecedores; opcionalmente a chave de teste Duffel para cotações com voo.

## 15. Ordem exata do Build (Fase 7G)

1. Migração: `travel_quotes`, `travel_quote_versions`, `travel_quote_items` com grants, RLS de admin, guardas de imutabilidade e de eliminação, auditoria e `quote_stats()`.
2. Lógica pura partilhada `quote-engine.ts` (numeração, validade mínima, estados, comparação de versões) + testes unitários.
3. Função servidor `quote-engine` integrada com o motor de preços e com o motor de voos.
4. Recálculo e criação de nova versão com diferencial explícito.
5. `src/lib/quotes.ts` e hooks de admin.
6. Secção admin "Cotações" (leitura e recálculo).
7. Suite de testes completa, incluindo os testes críticos de dinheiro.
8. Relatório final. Parar antes de reserva de pacote, pagamento, orders Duffel e Conversion Agent.
