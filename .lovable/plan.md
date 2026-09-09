# Fase 7A — Plano técnico: Motor de Pacotes, Preços e Voos

Plano apenas. Nada é implementado, criado, ligado ou ativado nesta fase.

## 1. Auditoria do modelo atual (verificado)

- **Não existe nada de pacotes, fornecedores, custos, regras de preço, cotações ou voos.** Nenhuma tabela com esses conceitos existe hoje na base de dados.
- O que existe é um catálogo de serviços avulsos: cada serviço tem preço por pessoa, duração em horas, mínimo/máximo de pessoas, categoria, distrito/localidade, idiomas, dias e horas indicativos, e precisa de aprovação para ficar visível.
- A reserva é sempre de **um serviço, uma data, N pessoas**: cria-se a reserva a pagamento pendente, calcula-se `preço por pessoa × pessoas`, retira-se comissão fixa de 15% no servidor e abre-se o pagamento Stripe embebido; o webhook confirma. A origem da visita (UTM) é preservada na reserva.
- Estados de reserva: pagamento pendente, confirmada, concluída, cancelada, reembolsada. Não há grupos de itens, nem itinerário, nem noites, nem validade de preço.
- Não há alojamentos, quartos, voos, avaliações nem calendário de disponibilidade real.
- Os agentes existentes (Descoberta, Conteúdo, Aquisição) já trazem infraestrutura reutilizável: tarefas, execuções, custos, aprovações, políticas, auditoria, notificações e abstração de fornecedor de IA.

## 2. O que se reaproveita e o que falta

Reaproveitável: utilizadores e perfis, guias aprovados, serviços aprovados (como componentes "experiência" e "guia"), distritos e localidades, reservas e Stripe, registo de auditoria, aprovações, medição de origem, área de administração e padrões de acesso.

Em falta (a criar só no Build): produtos de pacote e versões, componentes, fornecedores e custos com fonte, regras e políticas de preço, cotações imutáveis, ofertas de voo e o vínculo entre cotação e reserva.

## 3. Motor de Pacotes

Produtos iniciais: **Rotas Essencial** (5–7 dias), **Rotas Explorar** (8–10 dias), **Rotas Imersão** (14–15 dias), **Rotas à Medida** (mínimo 5 dias, duração variável). Sem preços nem componentes inventados.

Cada produto tem versões. Uma versão publicada é imutável: qualquer alteração cria uma nova versão. A versão define duração e noites, componentes incluídos e opcionais, capacidade, períodos de operação, condições e estado (rascunho, em revisão, publicado, arquivado). O que já foi vendido continua ligado à versão que foi vendida.

## 4. Modelo de componentes

Tipos: alojamento, quarto, transporte, transfer, experiência, guia, refeição, seguro, voo e futuros. Cada componente tem fornecedor, custo real, unidade (por pessoa, por noite, por grupo, por dia, fixo), quantidade, moeda, validade, condições, **fonte obrigatória** (contrato, tabela do fornecedor, orçamento escrito, serviço interno, resposta de fornecedor de voos) e estado. Custo sem fonte e sem validade nunca entra num cálculo comercial — o pacote fica marcado como "preço por confirmar".

## 5. Motor de Custos

`custo terrestre + custo de voo + outros custos = custo total real`, sempre separando:

- **custo do fornecedor** — o que se paga a terceiros;
- **custo operacional** — o que a operação acrescenta (coordenação, taxas, seguros próprios);
- **custo estimado** — sem confirmação, marcado como tal;
- **custo confirmado** — com fonte válida e dentro da validade.

Estimativa e confirmado nunca se somam sem ficar visível qual é qual; um pacote com qualquer parte estimada nunca produz preço "confirmado".

## 6. Motor de Preços

Regras definidas pela empresa e guardadas em versões de política: markup por tipo de componente, margem mínima, margem alvo, custos operacionais, proteção de tarifa aérea, arredondamento, moeda, taxas e suplementos/extras. A IA nunca escolhe margem nem escreve preço: apenas lê o resultado do motor.

Ordem de cálculo, para evitar dupla margem:

```text
custo fornecedor (terrestre)      -> markup terrestre
+ custo de voo                    -> proteção de tarifa (nunca markup duplo)
+ custos operacionais             -> já incluídos, não voltam a ser marcados
= subtotal
+ taxas e suplementos             -> aplicados depois do markup
= preço bruto -> arredondamento (uma única vez, no fim) = preço de venda
```

Regra de segurança: se o preço final ficar abaixo da margem mínima, o pacote não é vendável e é assinalado para decisão humana.

## 7. Motor de Voos e integração Duffel (desenho)

Fluxo futuro: origem → destino → datas → passageiros → cabine → filtros → pedido de ofertas → ofertas → seleção → nova consulta de preço → cotação. Guarda-se sempre: fornecedor, identificador da oferta, validade da oferta, valor total, moeda, itinerário, companhia, bagagem/serviços e condições tarifárias quando existirem — nunca apenas o número mostrado no ecrã.

Duffel entra como **fornecedor**, atrás de uma interface `FlightProvider` (procurar ofertas, obter oferta, reconsultar preço, requisitos de passageiro, criar reserva). O negócio nunca depende de detalhes de Duffel; um segundo fornecedor ou alternativa de recurso pode entrar depois sem tocar no motor de preços. Sem chaves e sem ligação nesta fase.

Sobre reservar: a arquitetura prevê cliente escolhe → oferta reconfirmada → eventual reserva provisória → pagamento → emissão, mas o suporte real a reserva provisória, pagamento imediato e pagamento posterior tem de ser confirmado junto do fornecedor antes de qualquer construção, e o fluxo final tem de respeitar as obrigações legais de operador turístico.

## 8. Proteção de tarifa aérea

Política configurável, com métodos avaliados: valor fixo, percentagem, percentagem com mínimo, percentagem com máximo e misto. Exemplo ilustrativo (não é regra definida): voo 800 € com 10% de proteção resulta em 880 €. Os valores reais são decisão da empresa e ficam guardados numa versão de política, com auditoria de quem os mudou.

## 9. Motor de Cotações e estados de preço

Uma cotação guarda: identificador, produto e versão, componentes escolhidos, referência e validade da oferta de voo, custos do fornecedor, markup aplicado, preço final, moeda, data de criação e de expiração, critérios do cliente e versão da política de preços. **Depois de emitida é imutável**: qualquer alteração gera nova versão da cotação.

Estados de preço, nunca misturados: **estimado**, **calculado**, **cotado**, **reconsultado**, **confirmado**, **expirado**, **cancelado**.

## 10. Reconsulta antes de reservar

Antes da reserva final: verificar validade → reconsultar a oferta → detetar alteração → recalcular o pacote → aplicar a política de proteção → decidir se pode seguir ou se exige nova confirmação do cliente. Nunca se cobra com base numa oferta expirada; se a diferença ultrapassar o limite configurado, o cliente confirma outra vez.

## 11. Origem do cliente, moeda e critérios

A origem escolhida pelo cliente (país, cidade, aeroporto) manda sempre; localização por IP é apenas sugestão. A origem influencia aeroporto, rota, voo, moeda e disponibilidade — **nunca a margem por nacionalidade**.

Multi-moeda: guardar moeda de origem do custo, taxa usada, momento da taxa e moeda cobrada. A conversão acontece num único ponto do motor de preços, nunca no ecrã nem na IA.

Critérios do cliente aceites pelo motor: pessoas, adultos, crianças, datas, duração, origem, interesses, orçamento e nível de conforto. Resposta do motor: pacote adequado, componentes, custo, preço, condições, confiança e validade — ou uma recusa clara quando não há combinação real.

## 12. Rotas à Medida

Duração mínima de 5 dias, composição variável a partir de componentes que existam mesmo, cálculo automático pelas mesmas regras e proposta própria. A IA nunca acrescenta componentes inexistentes nem altera preço.

## 13. Modelo de dados proposto (só no Build)

Produtos de pacote; versões de pacote; componentes da versão; fornecedores; custos de fornecedor com fonte e validade; políticas de preço com versão; regras de preço; ofertas de voo guardadas; cotações; itens da cotação. Nomes finais decididos no Build, depois de confirmar convenções. Todas as tabelas com acesso restrito: leitura pública apenas do que for publicado, escrita apenas por administração ou por funções do servidor.

## 14. Ligação a reservas e pagamento

Uma futura reserva de pacote refere a versão do pacote, a cotação, a oferta de voo escolhida, os componentes, o preço final, o cliente, a reserva e o pagamento — reutilizando a tabela de reservas atual, sem criar um sistema de reservas paralelo. O Stripe não muda agora; no futuro o valor cobrado tem de ser exatamente o preço confirmado da cotação, validado no servidor.

## 15. Ligação aos agentes

Conversão: conversa → critérios → motor de pacotes → opções → cotação → confirmação → fluxo de reserva → Stripe. Nenhuma lógica de preço vive dentro do agente. Aquisição: pode conhecer produtos, preço inicial, mercados, margem potencial e capacidade, mas **nunca alterar preço**.

## 16. Administração, segurança, privacidade e auditoria

Futura área "Pacotes": produtos, versões, componentes, fornecedores, custos, regras, margens, preços, cotações, voos e configurações. Não se implementa agora.

Segurança: chamadas a fornecedores de voo só no servidor, nenhuma chave no site, regras de preço só no servidor, o cliente nunca altera preço, a IA nunca escreve preço, todas as ferramentas validam valores e alterações sensíveis exigem aprovação.

Privacidade: dados de passageiro só quando forem mesmo necessários para emitir, minimizados, nunca enviados ao modelo.

Auditoria: quem alterou regra, custo, margem; quem publicou pacote; que versão de preço foi usada; que oferta de voo e que fornecedor foram usados.

## 17. Testes previstos

Cálculo e arredondamento, markup e margem mínima, proteção de tarifa, alteração de preço do voo, expiração, reconsulta, moedas, repetição de pedidos, imutabilidade da cotação, versões, permissões, auditoria e falha do fornecedor de voos.

## 18. Dependências e riscos

Dependências: decisão da empresa sobre margens e proteção; fornecedores reais com custos documentados; contrato e credenciais de voos; confirmação das obrigações legais de operador turístico.

Riscos: variação de tarifa aérea entre cotação e pagamento (mitigado com validade curta, reconsulta e proteção); dupla margem (mitigado com ordem de cálculo fixa); custos desatualizados (mitigado com validade obrigatória e bloqueio de venda); complexidade a mais cedo demais (mitigado pela ordem de construção abaixo); expectativa de voos antes de existir contrato.

## 19. Ordem exata de construção futura

1. Produtos, versões e publicação (sem preços).
2. Fornecedores, componentes e custos com fonte e validade.
3. Motor de custos (estimado vs confirmado).
4. Políticas e regras de preço com versão + motor de preços e arredondamento.
5. Motor de cotações imutável e estados de preço.
6. Interface de fornecedor de voos e simulação, sem ligação externa.
7. Ligação real a Duffel, só no servidor, com credenciais aprovadas.
8. Reconsulta e proteção de tarifa.
9. Ligação da cotação à reserva e ao pagamento existente.
10. Área de administração "Pacotes".
11. Consumo pelo agente de Conversão.
12. Testes completos e verificação em computador e telemóvel.

## 20. O que continua desligado

Sem tabelas, sem interface, sem Duffel, sem chaves, sem produtos, custos, fornecedores, preços, voos ou cotações fictícias, sem alterações ao Stripe, sem agendamentos e sem agentes ativos.

## 21. Nota de acompanhamento

O plano do agente de Conversão (Fase 6) continua por aprovar e passa a depender deste núcleo comercial; a lista de tarefas do projeto será atualizada com a Fase 7A quando começarmos a construir.
