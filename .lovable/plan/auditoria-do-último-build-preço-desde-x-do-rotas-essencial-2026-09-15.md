# Auditoria do último build (preço "desde €X" do Rotas Essencial)

Auditoria apenas de leitura: código do serviço de pacotes, módulo de preço de referência, migração aplicada e estado atual da base de dados. Nada foi alterado.

## A. O que o último build fez corretamente

- Criou uma tabela de preço de referência por produto, visível só para administradores, com estado, base de cálculo, motivo de bloqueio, componentes em falta, origens usadas e data de validade.
- A regra do "desde €X" é configuração do produto (2 adultos, 1 quarto, categorias obrigatórias: voo, quarto, transporte, experiência), não está escrita no ecrã.
- O cálculo é delegado ao motor de preços já existente. Não foi criado um segundo motor.
- Todos os 7 preços registados estão classificados como observação de mercado, estado "observado", com fonte, endereço oficial e data de observação 15/09/2026. Nenhum está como tarifa negociada, contratada ou confirmada.
- Os quatro fornecedores foram registados como referência de mercado em fase de prospeção, com nota explícita de que não há contrato.
- Não houve duplicação: existem exatamente 7 preços, 7 componentes, 4 fornecedores e 1 linha de preço de referência.
- O visitante só recebe valor, moeda, duração, ocupação e aviso de valor indicativo — nunca custo, margem, fornecedor ou origem interna.

## B. O que está incorreto ou potencialmente incorreto

1. **Voo obrigatório no preço de referência.** A configuração exige voo para publicar o "desde €X". Isto amarra o preço público à observação da TAP e faz o valor saltar assim que a tarifa aérea mudar. A referência de mercado comparável do setor é apresentada sem voo.
2. **Escolha da tarifa mais barata ignora a compatibilidade de ocupação.** A seleção escolhe a linha mais barata antes de o motor validar ocupação; se a linha escolhida não servir 2 adultos, o resultado fica bloqueado em vez de escolher a alternativa válida.
3. **Preço registado no limite inferior de um intervalo.** A viatura foi registada a €40 quando a observação é €40–45. É defensável, mas deve ficar assinalado como limite inferior observado.
4. **Validade das observações.** Todas têm validade desconhecida e valem 180 dias a contar da observação; passado esse prazo o preço deixa de aparecer no site. Está correto, mas não há aviso antecipado no admin antes de expirar.
5. **Sem histórico.** Cada recálculo substitui a linha anterior, pelo que não é possível ver como o "desde" evoluiu.

## C. Acoplamento indevido a TAP / Pestana / São Tomé Expert / Rent-a-Car

**Não existe acoplamento no código.** A pesquisa em todo o projeto não encontra nenhum destes nomes em código, componentes, configuração ou lógica. Os nomes aparecem apenas em linhas de dados da migração (fornecedores, alojamento, componentes e observações de preço), que é exatamente onde devem estar.

A seleção é feita por categoria (voo, quarto, transporte, experiência) e escolhe o componente real mais barato de cada categoria. Substituir qualquer destes fornecedores por outro, ou por preço vindo de um fornecedor externo de voos/alojamento, é uma troca de dados — não exige alteração de arquitetura.

O único acoplamento real é **de configuração**: o produto exige a categoria "voo" para ter preço público (ponto B1).

## D. Por que o "desde €X" ficou bloqueado

Motivo registado: *"Não existe política de preços ativa. Sem política não é publicado preço."*

A base de dados não tem nenhuma política comercial nem nenhuma versão de política (zero registos em ambas as tabelas). O motor de preços já existente exige uma versão de política ativa para calcular — margem mínima, margem alvo, proteção de tarifa aérea, arredondamento e taxas vêm de lá. **Não é uma decisão nova do último build**, é um requisito da arquitetura anterior.

Confirmação importante: a linha de bloqueio tem a lista de componentes em falta **vazia**. Ou seja, as quatro categorias obrigatórias já têm dados reais elegíveis. Falta exclusivamente a política comercial, que só a Rotas pode definir. Nenhuma margem pode ser inventada aqui.

## E. Correção mínima necessária

1. Tornar o voo **opcional** no preço de referência: publicar o "desde €X" sem voo (base terrestre) e indicar claramente que o voo não está incluído. Passa a existir preço público sem depender da tarifa aérea.
2. Corrigir a escolha da tarifa para só considerar linhas compatíveis com a ocupação da configuração mínima.
3. Marcar no admin, junto de cada origem, quando o valor registado é o limite inferior de um intervalo observado.
4. Sinalizar no admin as observações que expiram nos próximos 30 dias, antes de o preço cair.
5. Criar um caminho claro no admin para definir a política comercial — sem valores pré-preenchidos por mim. Enquanto não existir, o preço continua bloqueado e o admin explica exatamente o que falta e quem tem de decidir.

## F. Plano de implementação num único build

1. Ajustar a configuração de preço de referência do Rotas Essencial para categorias obrigatórias (quarto, transporte, experiência) e opcionais (voo), mantendo o mesmo formato de configuração para os outros três produtos.
2. Atualizar o módulo de preço de referência para tratar categorias opcionais e para filtrar tarifas por compatibilidade de ocupação antes de escolher a mais barata.
3. Atualizar o painel de administração: aviso de expiração próxima, marcação de "limite inferior observado" e mensagem explícita quando o bloqueio é por falta de política comercial, com ligação para o ecrã onde ela é definida.
4. Na página do produto, mostrar "Desde €X / pessoa, sem voo" quando o cálculo só cobre a base terrestre, mantendo o aviso de valor indicativo.
5. Testes focados apenas nisto: categoria opcional não bloqueia, incompatibilidade de ocupação não bloqueia indevidamente, ausência de dados nunca vira zero, expiração retira o preço do site, e o resultado público não contém custo nem fornecedor. Depois verificação de tipos e build.

Resultado esperado: assim que a política comercial for definida pela Rotas, o Rotas Essencial passa a apresentar um "desde €X / pessoa" real, calculado pelo motor existente, sobre a base terrestre — e continua a funcionar quando os preços de mercado forem substituídos por tarifas próprias ou por fornecedores externos de voos e alojamento.

## G. O que NÃO deve ser alterado

- Motor de preços, motor de propostas e as regras de margem/proteção existentes.
- Camada de prontidão comercial (já concluída).
- Integrações externas de voos e alojamento, que continuam em modo de teste e sem reservas.
- Classificação de mercado dos dados atuais: mantêm-se como observação, nunca como tarifa confirmada.
- Fluxos de pagamento, reserva, contacto a fornecedores e automações.
- Preço público para Explorar, Imersão e À Medida: continua sem ser publicado enquanto não houver base comercial suficiente.
- Nenhuma margem, fornecedor, preço ou disponibilidade será inventado.
