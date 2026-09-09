# Fase 6 — Plano técnico do Agente de Conversão IA

Plano apenas. Nada é implementado, criado ou ativado nesta fase.

## 1. Estado atual do Agente de Conversão

- `ai-conversion` continua a ser o esqueleto da Fase 2A: valida o fluxo do orquestrador e não faz mais nada.
- Já existem regras de permissão para este agente: responder, criar contacto e criar proposta são livres; confirmar reserva exige aprovação; efetuar pagamento está proibido.
- Não existe qualquer interface de conversa pública, nem tabelas de conversa com o assistente, nem área de administração para conversão.
- Orçamentos a zero, sem agendamentos automáticos, sem canais externos.

## 2. Dados reais disponíveis hoje (verificado na base de dados)

| Área | Existe? | Estado real |
|---|---|---|
| Serviços/experiências comerciais | Sim (tabela) | **0 serviços**, 0 aprovados e publicados |
| Guias/profissionais | Sim | **1 perfil aprovado** |
| Reservas | Sim | **0 reservas** |
| Distritos / localidades | Sim | 7 distritos, 29 localidades |
| Conteúdo editorial do Conteúdo IA | Sim | **0 publicados** |
| Medição de origem (visitas, UTM) | Sim | 8 eventos registados |
| Oportunidades Discovery | Sim | 0 |
| **Avaliações / reviews** | **Não existe tabela** | O agente não pode falar de avaliações |
| **Alojamentos / quartos** | **Não existe tabela** | O agente não pode procurar nem reservar alojamento |
| **Calendário de disponibilidade real** | **Não existe** | Só há dias e horas indicativos declarados no serviço |

Consequência central: hoje o agente teria quase nada de comercial verdadeiro para recomendar. O assistente tem de nascer honesto — capaz de dizer "ainda não temos isso publicado" — e crescer à medida que guias e serviços entram.

## 3. Fluxo de reserva existente (a reutilizar, nunca duplicar)

1. Página da experiência lê o serviço ativo.
2. Página de reserva pede data, número de pessoas e pedidos especiais; o total é `preço por pessoa × pessoas`.
3. É registado o evento "reserva iniciada" com o visitante e a origem.
4. `create-checkout` cria a reserva e o pagamento (Stripe embebido), preservando a atribuição.
5. `payments-webhook` confirma o pagamento, marca a reserva paga e regista a conversão.
6. Estados da reserva: pagamento pendente, confirmada, concluída, cancelada, reembolsada.

Não há disponibilidade bloqueada por data, nem sobreposição, nem preço por quarto/duração. O agente tem de trabalhar exatamente sobre este fluxo e terminar no checkout existente.

## 4. Arquitetura proposta

```text
Widget de conversa (site)  ->  Edge Function ai-conversion (servidor)
                                   |
                                   |-- camada de ferramentas controladas (só leitura + preparação)
                                   |-- dados reais: serviços aprovados, guias aprovados,
                                   |   territórios, conteúdo publicado, reserva do próprio utilizador
                                   |-- provider abstraction existente (falha fechada)
                                   |
                              orquestrador existente (tarefas, custos, aprovações, auditoria)
```

Regra dura: o modelo nunca escreve na base de dados; só chama ferramentas do servidor com argumentos validados.

## 5. Arquitetura da conversa

Recolha progressiva, nunca formulário: destino/zona, datas, pessoas, duração, orçamento, interesses, idioma. O agente pergunta no máximo uma coisa de cada vez e recomenda assim que tiver o mínimo útil (interesse + datas ou interesse + zona).

Estados: saudação → descoberta → qualificação → recomendação → consideração → intenção de reserva → reserva → pagamento → concluído, com retrocesso livre.

## 6. Modelo de intenções (final proposto)

`pergunta_destino`, `procurar_experiencia`, `procurar_guia`, `procurar_alojamento` (responde "ainda não disponível"), `pergunta_disponibilidade`, `pergunta_preco`, `ajuda_itinerario`, `ajuda_reserva`, `estado_reserva`, `ajuda_pagamento`, `ajuda_cancelamento`, `informacao_geral`, `apoio_humano`, `fora_de_ambito`.

## 7. Modelo de recomendação

Só recomenda serviços aprovados e ativos de guias aprovados. Pontuação explicável e determinística: correspondência de interesse/categoria, zona, idioma, capacidade para o número de pessoas, orçamento por pessoa, dias declarados compatíveis, completude da ficha (fotos, ponto de encontro, descrição). Sem opção adequada: diz claramente que não existe e oferece contacto ou alternativa real. Nunca preenche com aproximações.

## 8. Camada de ferramentas (desenho, não implementação)

| Ferramenta | Argumentos | Fonte | Permissão |
|---|---|---|---|
| `procurar_experiencias` | interesses, zona, pessoas, orçamento, idioma, datas | serviços aprovados | leitura livre |
| `procurar_guias` | zona, idioma, tipo | perfis aprovados | leitura livre |
| `procurar_alojamento` | — | inexistente | devolve "não suportado" |
| `verificar_disponibilidade` | serviço, data, pessoas | dias/horas declarados + capacidade | leitura livre |
| `obter_preco_real` | serviço, pessoas | preço publicado × pessoas | leitura livre |
| `informacao_destino` | tema, idioma | conteúdo publicado + territórios | leitura livre |
| `estado_reserva` | — | reservas do próprio utilizador autenticado | leitura autenticada |
| `preparar_reserva` | serviço, data, pessoas | devolve link para o fluxo existente | preparação |
| `escalar_para_humano` | motivo | suporte existente | ação controlada |

Cada ferramenta valida argumentos, limita resultados, devolve as fontes usadas e um erro claro em vez de um palpite.

## 9. Segurança das ações

Separação obrigatória: ler → preparar → confirmar → executar. O agente lê e prepara; confirmar reserva exige confirmação explícita da pessoa e passa pelo fluxo existente; pagar é sempre o checkout Stripe atual; cancelar usa o processo já autorizado. Ambiguidade nunca dispara ação comercial.

## 10. Disponibilidade e preço

Níveis de disponibilidade: **confirmada**, **provavelmente disponível** (dia declarado compatível), **por confirmar**, **indisponível**. "Não encontrei" nunca é apresentado como "não existe".

Preço: publicado, calculado pelo sistema (preço × pessoas), sob consulta ou indisponível. Nada é estimado.

## 11. Passagem para humano e identificação como IA

Escala para o suporte existente em caso de reclamação, dúvida complexa, falta de dados ou pedido explícito. Na primeira mensagem o assistente identifica-se como assistente automático da Rotas do Éden e explica o que consegue fazer; nunca finge ser pessoa.

## 12. Memória, dados pessoais e privacidade

Sessão anónima por omissão; contexto autenticado só quando a pessoa tem sessão iniciada e para consultar as suas próprias reservas. Ao modelo vão apenas preferências de viagem e resultados das ferramentas — nunca email, telefone, morada, documentos ou dados de pagamento. Guarda-se a conversa apenas com consentimento; retenção limitada e apagável.

## 13. Eventos e atribuição

Novos eventos, sem duplicar os existentes: assistente aberto, recomendação mostrada, recomendação clicada, intenção de reserva, passagem para humano, pergunta sem resposta. As reservas continuam a usar os eventos atuais. A origem (UTM/visitante) é preservada quando a conversa leva ao checkout, para não quebrar a atribuição já construída.

## 14. Base de dados proposta (a criar só na fase de construção)

- `conversation_sessions` — sessão, idioma, visitante, utilizador opcional, estado, origem.
- `conversation_messages` — mensagens, papel, ferramentas usadas, fontes.
- `conversation_events` — eventos acima, ligados à sessão.
- `conversation_gaps` — perguntas sem resposta e procura não satisfeita (alimenta Discovery e Aquisição de forma agregada).

Tudo com acesso restrito: a própria sessão ou administração. Reutiliza-se custos, definições, políticas, aprovações, notificações e registo de auditoria já existentes.

## 15. Área de administração "Conversão IA" (desenho)

Conversas e sessões, recomendações mostradas e clicadas, intenções de reserva, conversões, passagens para humano, perguntas sem resposta, erros, custos e qualidade das respostas.

## 16. Fornecedor de modelo, custos e segurança

Usa a abstração existente; sem credenciais novas nesta fase; se não houver fornecedor configurado, o assistente não abre e diz que está indisponível. Limites futuros por conversa, por sessão, por utilizador e por dia/mês — todos a zero até decisão explícita. Tudo no servidor, sem segredos no site, com validação estrita e acesso por regras de segurança.

## 17. Qualidade e testes

Controlo de qualidade: resposta comercial sem fonte é bloqueada; preço e disponibilidade sem fonte são bloqueados; deteção de contradição e de dados desatualizados.

Testes previstos: saudação, classificação de intenção, pesquisa, recomendação, sem resultados, disponibilidade desconhecida, preço, passagem para reserva e pagamento, estado da reserva, passagem para humano, guardas contra invenção, validação de fontes, privacidade, permissões, atribuição, ações duplicadas, validação de argumentos, falha do fornecedor, repetição e idempotência.

## 18. Multilingue

Suporta os mesmos idiomas do site, com a mesma fonte de dados em qualquer idioma. Nada de traduzir preços, condições ou disponibilidade de forma criativa.

## 19. Ligação aos outros agentes

Conteúdo IA: o assistente encaminha para conteúdos publicados, nunca gera conteúdo comercial novo. Discovery: recebe apenas sinais agregados de procura real, nunca altera oportunidades. Aquisição: recebe sinais de que canais e mercados geram conversas e intenção de reserva.

## 20. Dependências e riscos

Dependências: existirem serviços aprovados e guias publicados; fornecedor de modelo configurado; consentimento para guardar conversa.

Riscos principais: catálogo vazio (o assistente parece inútil) — mitigado com respostas honestas e encaminhamento para contacto; ausência de disponibilidade real — mitigado com o nível "por confirmar"; expectativa de alojamento — o assistente diz claramente que ainda não existe; custo por conversa — limites e travões.

## 21. Ordem exata de implementação (fases futuras)

1. Tabelas de conversa e regras de acesso.
2. Ferramentas de leitura no servidor, com fontes e validação.
3. Recomendação determinística e explicável, sem modelo.
4. Agente `ai-conversion` com intenções, estados e respostas ancoradas nas ferramentas.
5. Eventos, atribuição e sinais para Discovery/Aquisição.
6. Widget de conversa no site, com identificação como IA (ligado só no fim).
7. Área de administração "Conversão IA".
8. Testes completos e verificação em computador e telemóvel.

## 22. O que continua desligado

Sem chatbot público, sem alterações ao site atual, sem agendamentos automáticos, sem campanhas, sem canais de anúncios, sem gastos, sem dados, avaliações, preços, disponibilidade ou parceiros fictícios, sem base de conhecimento comercial paralela e sem orçamentos acima de zero.
