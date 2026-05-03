Vou tratar isto em duas frentes: primeiro a correção crítica de segurança/UX, depois a melhoria visual e idiomas.

## 1. Remover definitivamente a mensagem pública sobre administrador
- Vou fazer uma limpeza completa para que a frase sobre “primeiro utilizador registado torna-se administrador” não apareça em nenhuma página pública.
- Vou remover também referências remanescentes em ficheiros internos de plano que podem continuar a ser servidos/visíveis no ambiente de preview.
- Vou validar novamente as páginas públicas principais, especialmente `/auth`, `/`, `/seja-parceiro` e o fluxo “Tornar-me parceiro”.

## 2. Mudar a regra de administrador para seleção manual
Hoje o backend ainda tem uma regra que promove o primeiro utilizador para `admin`. Vou substituir essa regra por uma lógica segura:
- Novos utilizadores nunca serão criados automaticamente como administradores.
- Se a pessoa escolher “guia”, entra como `guide` e segue para KYC.
- Se escolher “turista”, entra como `tourist`.
- Qualquer novo administrador só poderá ser atribuído manualmente por um administrador já existente, através da tabela de papéis (`user_roles`) protegida pelas permissões atuais.

Observação importante: a tua conta que já é administradora não será removida. A mudança só impede futuras promoções automáticas.

## 3. Adicionar gestão manual de papéis no painel admin
No painel de administração, na tabela “Utilizadores”, vou melhorar a gestão para permitir:
- Ver o papel atual do utilizador.
- Promover/despromover manualmente entre `tourist`, `guide` e `admin`.
- Manter ações protegidas: só administradores autenticados conseguem fazer essas alterações.
- Evitar ações perigosas óbvias na UI, como retirar inadvertidamente o último admin, se possível validar com os dados disponíveis.

## 4. Melhorar o logo/identidade visual no site
Vou substituir a folha simples por uma marca visual mais cuidada em componente reutilizável:
- Símbolo mais premium inspirado em rotas, folha, ilha e bússola.
- Usar gradiente verde/sand alinhado à identidade “Rotas do Éden”.
- Aplicar no Navbar, Footer, Auth e AdminSidebar para consistência.
- Manter o nome “Rotas do Éden” com tipografia elegante.

## 5. Modernizar a página inicial e deixar a UI mais clean
Vou melhorar a homepage sem fugir à marca atual:
- Navbar mais sofisticada e leve, com melhor espaçamento, CTA e acabamento visual.
- Hero mais premium: melhor composição, cartões flutuantes, destaques, search mais bonita e sensação de profundidade.
- Secções com cartões mais elegantes, sombras suaves, bordas arredondadas, gradientes leves e micro-interações.
- Melhorar blocos “Confiança”, “Como Funciona”, estatísticas e CTA para parecerem mais modernos e vivos.
- Ajustar mensagens da UI para tom mais profissional e menos “básico”.

## 6. Adicionar seletor de idioma e base de tradução
Vou implementar uma primeira base de internacionalização para a experiência pública:
- Idiomas: Português, Inglês, Francês, Alemão, Chinês Mandarim e Coreano.
- Detetar automaticamente o idioma do navegador/região na primeira visita.
- Permitir o utilizador escolher manualmente o idioma no Navbar.
- Guardar a escolha localmente para visitas seguintes.
- Traduzir inicialmente os textos principais públicos: Navbar, Hero, estatísticas, confiança, como funciona, CTA, Footer e página de autenticação/parceiro onde for mais importante para o fluxo.

## 7. Verificação final
Depois da implementação vou:
- Pesquisar novamente no projeto inteiro pela frase proibida.
- Confirmar que `/auth?mode=register`, `/auth?mode=register&role=guide&next=/kyc`, `/` e `/seja-parceiro` não mostram a mensagem.
- Confirmar que a função de criação de conta já não promove automaticamente o primeiro utilizador para admin.
- Confirmar visualmente a homepage e o seletor de idioma no preview.