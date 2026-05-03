## Remover menção pública a "primeiro utilizador = administrador"

Esta frase aparece publicamente na página de registo (`/auth`) e expõe um detalhe interno sensível da plataforma. Vou removê-la por completo da interface.

### Alterações

**1. `src/pages/AuthPage.tsx`**
- Remover o parágrafo no final do formulário de registo:
  > "O primeiro utilizador registado torna-se administrador da plataforma."
- Remover também a descrição do toast de sucesso após criar conta que diz a mesma coisa:
  > "O primeiro utilizador da plataforma fica como administrador."
- O toast passa a mostrar apenas: "Conta criada — pode iniciar sessão."

**2. Procurar outras ocorrências**
- Verificar se existe a mesma frase noutras páginas (ex.: `SejaParceiroPage`, landing, legais) e remover/reformular caso apareça.

### Notas de segurança
- A lógica de promoção do primeiro utilizador a administrador (se existir no backend) **não é alterada** neste passo — apenas escondemos a frase do utilizador final. Se quiseres, num próximo passo posso também rever essa regra no backend e substituí-la por atribuição manual de admin via painel de administração, que é mais seguro.

Queres que avance só com a remoção do texto, ou também com a revisão da regra de "primeiro = admin" no backend?
