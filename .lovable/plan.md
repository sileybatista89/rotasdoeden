Diagnóstico confirmado: o botão “Candidatar-me agora” em `/seja-parceiro` envia para `/auth`, mas se já existir sessão iniciada a página de autenticação redireciona imediatamente para `/` antes de mostrar a opção de criar conta de guia. Além disso, a candidatura não abre diretamente o separador de registo nem pré-seleciona “Guia turístico”, e há CTAs sem link funcional. Isto bloqueia ou confunde o fluxo de criação de conta de guia.

Plano de correção imediata:

1. Corrigir o fluxo “Tornar parceiro” → candidatura de guia
- Alterar todos os CTAs de guia para apontarem para uma rota explícita, por exemplo `/auth?mode=register&role=guide&next=/kyc`.
- Atualizar os botões em:
  - Página “Seja Parceiro”
  - Página de guias
  - CTA da homepage “Registar como Guia”, que atualmente é um botão sem navegação
  - Navbar/mobile, adicionando uma entrada visível “Tornar parceiro” para visitantes
- Resultado esperado: ao clicar em “Tornar parceiro” ou “Candidatar-me agora”, o utilizador vê imediatamente o formulário de criação de conta com “Guia turístico” selecionado.

2. Tornar a página de autenticação consciente do contexto
- Fazer `AuthPage` ler query params:
  - `mode=register` abre o separador “Registar”
  - `role=guide` pré-seleciona “Guia turístico”
  - `next=/kyc` define o destino depois de autenticar/criar conta
- Se o utilizador já estiver autenticado e tentar candidatar-se como guia:
  - se já for guia, enviar para `/kyc` ou `/my-services`
  - se for turista/admin, mostrar uma mensagem clara em vez de simplesmente mandar para a homepage
- Após registo com papel “guide”, orientar para login/verificação e depois para `/kyc`.

3. Criar uma página/rota dedicada para candidatura de guia, se necessário
- Adicionar rota curta e clara: `/candidatura-guia` ou `/auth/guia`.
- Essa rota pode reutilizar `AuthPage` internamente, mas evita ambiguidades e facilita links públicos.
- O texto deve deixar claro: “Criar conta de guia”, “Depois vais submeter documentos KYC”, “Após aprovação poderás publicar serviços”.

4. Corrigir a pesquisa pública para turistas
- A homepage atualmente tem barra de pesquisa, mas o botão “Pesquisar Guias” leva para `/guides`, que ainda é uma página institucional “em adesão”.
- Alterar para pesquisar experiências reais em `/experiences`, passando o termo de pesquisa pela URL.
- Atualizar `ExperiencesPage` para ler `?q=...` e aplicar o filtro automaticamente.
- Ajustar textos para turistas: “Procurar experiências”, “Ver experiências disponíveis”, “Encontrar guias através das experiências publicadas”.

5. Melhorar a página de guias para não parecer vazia/quebrada
- Manter a mensagem de verificação, mas adicionar ações claras:
  - “Ver experiências disponíveis”
  - “Tornar-me guia parceiro”
  - “Como funciona a verificação”
- Se existirem serviços ativos, a experiência pública continua a funcionar por `/experiences`.

6. Segurança e backend
- Não vou guardar papéis em localStorage nem confiar no cliente.
- O registo continuará a enviar apenas `role=guide` nos metadados; a função segura do backend já só aceita `guide` ou `tourist` e impede criação de admin pelo cliente.
- Não é necessária alteração estrutural na base de dados para corrigir este bug.

7. Verificação final
- Testar no preview:
  - visitante clica “Tornar parceiro” → abre registo de guia
  - visitante cria conta de guia → perfil recebe papel de guia e estado KYC pendente
  - guia autenticado acessa `/kyc`
  - CTA da homepage funciona
  - pesquisa na homepage leva a `/experiences?q=...`
  - navegação mobile e desktop mostram caminhos claros para turistas e guias

Como estamos em modo de planeamento, preciso da tua aprovação para aplicar as alterações agora.