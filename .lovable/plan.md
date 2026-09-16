# Fechar o fluxo comercial dos pacotes

Objetivo: ligar as peças que já existem para que exista um caminho completo do configurador até ficar pronto para pagamento. Sem redesign, sem novos sistemas, sem pagamentos ou reservas reais.

## Situação atual (verificada)

- O configurador guarda a configuração e, ao submeter, apenas regista o contacto. Não gera proposta: o campo `quote_id` do pedido existe mas nunca é preenchido.
- O motor de propostas já cria proposta, versões, linhas, validade e proveniência interna, mas só pode ser chamado por um administrador autenticado.
- A página pública da proposta permite aceitar, mas aceita sem revalidar preço ou disponibilidade.
- A revalidação e a criação de reserva de pacote já existem e já exigem aceitação válida, mas são passos manuais do administrador.
- A reserva de pacote já tem estado de pagamento e fica em "a aguardar pagamento". Nada é cobrado.

## O que vai ser feito

### 1. Pedido do configurador gera proposta

Quando o cliente submete a configuração:

- os itens escolhidos que correspondem a componentes reais são convertidos em componentes de preço (função já existente);
- o sistema pede ao motor de propostas a criação da proposta com duração, viajantes, quartos, datas, componentes e produto;
- a proposta fica guardada e ligada ao pedido do configurador;
- se não houver política ativa ou componentes elegíveis, o pedido fica no estado atual "a aguardar preparação" e a equipa gera a proposta pelo Admin, como hoje.

A proposta guarda o que foi pedido: pacote, duração, passageiros, configuração, componentes, preço calculado, estado, validade e proveniência interna (já suportado pelas tabelas existentes).

### 2. Aceitação passa sempre por revalidação

Na aceitação pública:

- antes de registar a aceitação, o sistema corre a revalidação/reprecificação já existente;
- se nada mudou, a aceitação é registada como hoje;
- se o preço ou a disponibilidade mudaram, a aceitação não avança e o cliente vê de forma clara que a proposta foi atualizada, com o valor anterior e o novo valor, e pode aceitar a versão atualizada;
- se ficar bloqueada, o cliente vê uma mensagem clara de que a equipa vai rever a proposta.

A página pública da proposta passa a mostrar este estado. Sem alterar o design.

### 3. Preparação para pagamento

- Depois da aceitação válida, a proposta fica marcada como pronta para pagamento e a reserva de pacote é criada com a estrutura existente, com estado de pagamento "a aguardar pagamento".
- O passo de pagamento usa a estrutura de checkout já existente, mas fica desativado enquanto não houver autorização LIVE: o botão explica que o pagamento ainda não está ativo. Nenhuma cobrança, nenhuma reserva de fornecedor, Duffel mantém-se em teste.

### 4. Acompanhamento no Admin

No painel de propostas, cada proposta mostra o estado do ciclo:

criada → enviada (ligação emitida) → aceite → a aguardar revalidação → pronta para pagamento.

Acrescenta-se ainda uma lista dos pedidos vindos do configurador, com ligação à proposta gerada e ação para gerar/regenerar a proposta quando a geração automática não foi possível.

## Notas técnicas

- `package-builder` (ação `submit`): mapeia seleções com `componentIdsFor`, chama `quote-engine` numa chamada interna de serviço com canal `public`, grava `quote_id` no `package_builder_configs` e regista o estado do pedido.
- `quote-engine`: aceita invocação interna de serviço além do administrador, sem alterar a lógica de cálculo, validade, confirmabilidade ou proveniência.
- `quote-public` (ação `accept`): chama a revalidação existente antes de gravar a aceitação e devolve o resultado (`unchanged`, `changed`, `requires_reacceptance`, `blocked`) para a página pública.
- `package-booking`: sem alterações de lógica; continua a exigir aceitação válida e revalidação final.
- Base de dados: apenas o preenchimento de `package_builder_configs.quote_id` e novos valores de estado do pedido. Sem tabelas novas. Sem alterações em Pricing Engine, Quote Engine (matemática), Supply Readiness, Duffel, agentes, imagens ou copy comercial.
- Verificação: typecheck, build e um percurso manual configurador → proposta → aceitação com revalidação, em ambiente de teste.
