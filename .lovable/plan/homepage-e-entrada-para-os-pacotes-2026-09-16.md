# Homepage e entrada para os pacotes

## Objetivo
Tornar evidente, nos primeiros segundos, que a Rotas do Éden organiza viagens completas para São Tomé e Príncipe, apresentar imediatamente as quatro opções e conduzir cada pessoa ao próximo passo certo.

## Alterações propostas

### 1. Abertura clara e escolha imediata
- Manter a direção visual editorial e a fotografia atual.
- Ajustar o título e o texto inicial para explicar diretamente que a Rotas do Éden organiza viagens completas e personalizáveis para as ilhas.
- Manter o botão **Começar a viagem**, mas fazê-lo abrir uma escolha simples e acessível:
  - **Quero organizar uma viagem completa**: apresenta os quatro pacotes com duração e ligações diretas.
  - **Quero explorar São Tomé e Príncipe primeiro**: apresenta acessos claros a Experiências, Guias e Destino.
- Aplicar a mesma escolha ao botão equivalente da navegação, em computador e telemóvel, para evitar comportamentos diferentes.

### 2. Pacotes com prioridade comercial
- Colocar os quatro pacotes logo após a abertura da homepage, antes das secções editoriais do destino.
- Manter as fotografias atuais e a estética premium, mas reforçar a leitura rápida de nome, duração, proposta e ação.
- Mostrar no Rotas Essencial o preço público devolvido pelo sistema, quando disponível, com esta prioridade:
  - **Desde 1.475 € / pessoa**
  - **5 a 7 dias · personalizável**
  - **O valor final é confirmado antes da reserva.**
- Não mostrar preço nos outros três pacotes sem um preço público elegível.
- Usar as durações pedidas: Essencial 5 a 7 dias, Explorar 8 a 10 dias, Imersão 14 a 15 dias e À Medida a partir de 5 dias.
- Dar a cada pacote uma ação explícita e fácil de compreender, sem depender apenas da fotografia ou de um ícone.

### 3. Percurso da homepage
Organizar a página para seguir esta sequência:

```text
Destino e desejo
      ↓
Escolher entre os quatro pacotes
      ↓
Perceber como personalizar
      ↓
Explorar Experiências, Guias e Destino
      ↓
Confiança e próximos passos
```

- Manter o marketplace e os restantes acessos públicos.
- Reposicionar e ajustar apenas o necessário nas secções existentes, evitando transformar a página num catálogo ou acrescentar conteúdo de enchimento.
- Criar uma passagem organizada, depois dos pacotes, para **Experiências**, **Guias** e **O destino**, aproveitando as páginas e o conteúdo já existentes.
- Atualizar apenas o título e a descrição pública da homepage necessários para refletir a oferta de viagens completas.

### 4. Configurador mais orientado, sem alterar a lógica
- Manter duração, viajantes, seleções por dia, gravação, resumo e envio de proposta exatamente sobre os fluxos atuais.
- Simplificar o topo de cada pacote para responder claramente:
  - onde está;
  - o que pode personalizar;
  - o que acontece depois;
  - qual é o preço público disponível.
- No Rotas Essencial, retirar da área pública principal a linguagem técnica sobre dados de mercado e mostrar apenas o preço, a duração personalizável e a confirmação do valor antes da reserva.
- Tornar as quatro etapas visualmente inequívocas: **Viajantes**, **Dias**, **Resumo**, **Receber proposta**.
- Acrescentar ações de continuidade visíveis entre etapas e garantir que, no telemóvel, a próxima ação continua fácil de encontrar.
- Melhorar rótulos e instruções curtas onde necessário, sem criar um novo sistema, alterar limites ou esconder distinções obrigatórias entre inspiração e serviço confirmado.

## Responsividade e acessibilidade
- Garantir alvos de toque confortáveis, texto legível, ordem de foco previsível e escolha inicial utilizável por teclado.
- Em telemóvel, apresentar os pacotes numa sequência simples, com duração, preço disponível e ação sempre visíveis.
- Evitar travessões decorativos e preservar a linguagem natural em português.

## Limites preservados
- Nenhuma alteração ao backend, banco de dados, Pricing Engine, Quote Engine, integrações, agentes, pagamentos, reservas ou arquitetura.
- Nenhuma alteração de preços, fornecedores, fotografias ou dados comerciais.
- Nenhuma atividade fictícia ou prova social inventada.
- Sem reconstruir o configurador e sem criar testes extensivos.

## Verificação
- Confirmar em computador e telemóvel que a homepage explica a oferta, mostra os quatro pacotes sem ação prévia e abre a escolha correta em todos os botões **Começar a viagem**.
- Confirmar que o Rotas Essencial mostra o preço público simplificado quando disponível e que os restantes não inventam preços.
- Percorrer o configurador até ao pedido de proposta, validando orientação, ações seguintes e preservação da lógica.
- Executar verificação de tipos e build de produção.
