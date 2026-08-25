# Plano final — área Experiências com fotografias reais

## Diagnóstico confirmado

- A página pública já consulta apenas serviços com `is_active = true` e `moderation_status = approved`; o detalhe aplica os mesmos filtros. Esta proteção será preservada.
- O conteúdo editorial atual só aparece quando não existem serviços e fica depois de um grande estado vazio. A ordem não corresponde à experiência editorial pedida.
- O bloco atual tem seis cartões, mas usa ficheiros antigos da pasta `optimized`; as imagens de roça, floresta e gastronomia apresentam aspeto sintético e serão removidas desta área.
- O texto atual mistura descoberta editorial com “experiências que estamos a organizar”, o que pode sugerir oferta comercial ainda inexistente.
- Não será criada qualquer experiência, guia, preço, avaliação, reserva, disponibilidade ou estatística.

## Alterações objetivas

### 1. Substituir as imagens editoriais
- Retirar da área de Experiências todas as imagens antigas com aparência gerada/artificial.
- Usar exclusivamente fotografias reais já identificadas nos assets `real` e as duas fotografias agora fornecidas pelo proprietário.
- Organizar as seis categorias com correspondência direta e verificável:
  - **Vida Marinha** — atividade marítima real/barco na gruta ou costa real agora fornecida.
  - **Praias e Ilhas** — fotografia real de Praia Banana, enseada ou ilha.
  - **Natureza e Floresta** — fotografia real de costa/floresta de São Tomé e Príncipe.
  - **Trilhos e Aventura** — fotografia real do Pico Cão Grande/paisagem de trilho.
  - **Cacau e Gastronomia** — fotografia real de cacau ou prato local.
  - **Cultura e Património** — fotografia real de roça histórica ou Tchiloli.
- Guardar as fotografias novas através do fluxo de assets do projeto, sem deixar binários pesados no repositório.
- Não apagar ficheiros partilhados por outras páginas; apenas remover o seu uso nesta área, evitando regressões fora do pedido.

### 2. Reorganizar a página sem reconstrução
- Manter Navbar, Footer, identidade visual, tokens, tipografia e rotas atuais.
- Ajustar o topo para uma introdução humana sobre descobrir o destino através de conhecimento e experiências locais, sem afirmar que já existe oferta abundante.
- Mostrar primeiro a secção **Explore o destino**, com as seis categorias editoriais reais.
- Criar uma separação visual e semântica clara antes da secção **Experiências disponíveis**.
- Manter pesquisa e filtro ligados apenas aos serviços comerciais, não aos cartões editoriais.

### 3. Estados da oferta comercial
- **Com serviços reais aprovados:** mostrar exclusivamente os registos reais devolvidos pela base de dados, associados ao guia/parceiro e com os dados e preços fornecidos por ele.
- **Sem serviços aprovados:** mostrar um estado editorial compacto e elegante informando que os primeiros parceiros estão a ser selecionados e que a oferta será adicionada progressivamente; sem grande espaço vazio.
- **Pesquisa sem resultados:** manter opção de limpar filtros, sem esconder a secção editorial.
- Os cartões editoriais não terão preço, disponibilidade, reserva, avaliações ou aparência de produto comercial; usarão linguagem como “Descubra”, “Conheça” e “Explore”.

### 4. Preservar fluxos existentes
- Não alterar painel administrativo, ficha de guia, documentação, mensagens, notas internas ou pedidos de documentos.
- Não alterar criação de serviços, moderação, reserva ou checkout.
- Preservar a exigência pública de serviço ativo e aprovado na listagem e no detalhe.
- Não criar ou alterar dados na base de dados.

## Validação antes da conclusão

1. Rever os imports e o DOM da área de Experiências para confirmar que nenhuma imagem editorial antiga/sintética continua em uso.
2. Confirmar visualmente as seis fotografias e a correspondência com cada categoria.
3. Confirmar que editorial e oferta comercial têm títulos, linguagem e áreas distintas.
4. Confirmar ausência de preços, disponibilidade, reservas e avaliações no editorial.
5. Confirmar que serviços não aprovados continuam ausentes da listagem e do detalhe público.
6. Testar o estado real atual sem serviços, garantindo que não existe área branca excessiva.
7. Testar pesquisa/filtros e o estado sem resultados sem alterar o conteúdo editorial.
8. Abrir `/experiences` no browser em desktop (1280 px) e mobile (390 px), verificar enquadramento das imagens, legibilidade, sobreposições e consola.
9. Executar verificação TypeScript/testes relevantes e só considerar concluído após validação visual.

## Limites da intervenção

Alteração incremental restrita aos componentes de apresentação da página Experiências e aos novos apontadores das duas fotografias fornecidas. Sem reconstrução, sem dados fictícios e sem mudanças nos fluxos funcionais já operacionais.
