# Rota do Éden — Auditoria e Evolução Operacional

## O que a auditoria encontrou (verificado na base de dados e no código)

**Causa raiz do "guia aprovado não aparece" (Prioridade 2).**
Existem hoje **dois circuitos de verificação em paralelo**:

1. Circuito antigo (KYC): `kyc_submissions` + `profiles.kyc_status`. É por aqui que o Esmael Lima e o Silas Batista foram aprovados — a tabela tem 2 submissões e ambos ficaram com `kyc_status = verified`.
2. Circuito novo (profissional): `professional_profiles` + `verification_requests`, que é o **único** que alimenta a página pública de guias e o perfil `/guides/:id`.

Consulta à base de dados: `professional_profiles` tem **0 registos**, `verification_requests` **0**, `document_requests` **0**, `services` **0**, `bookings` **0**.

Ou seja: aprovar KYC no painel nunca publica ninguém, porque a listagem pública lê outra tabela. Não é um bug de UI — são dois fluxos desligados.

**Consequências em cadeia:**
- O pedido de documentos em falta só existe dentro da fila de verificação e exige um `verification_request` pendente. Como não existe nenhum, o administrador **não tem forma de pedir documentos** aos guias atuais. A funcionalidade existe em código mas é inalcançável no fluxo real.
- No perfil do guia no painel (drawer) o administrador só pode ver, aprovar, rejeitar e banir — sem pedir documento, sem enviar mensagem, sem estados intermédios.
- Estados do guia resumem-se a `kyc_status` + `banned`; não existem "Em análise", "Documentação pendente", "Suspenso".
- Página de Experiências não tem camada editorial de categorias; sem serviços reais fica vazia.
- Serviços não têm estado de moderação — qualquer serviço criado ficaria público sem revisão.

## O que vai ser feito

### 1. Unificar o circuito de verificação (Prioridade 2, primeiro)
- Ao aprovar/rever um guia, o painel passa a trabalhar sobre `professional_profiles` + `verification_requests`, criando o registo em falta quando o guia ainda não o tem (migração dos guias já aprovados via KYC, sem apagar o histórico de `kyc_submissions`).
- Adicionar um campo de **estado do guia** com os valores pedidos: candidatura recebida, em análise, documentação pendente, verificação em curso, aprovado, rejeitado, suspenso, banido.
- Regra de publicação explícita e visível ao admin: um guia só aparece publicamente com estado aprovado **e** perfil completo (fotografia real, localização, idiomas, apresentação). Se faltar algo, o painel mostra exatamente o que falta em vez de esconder o guia em silêncio.
- A página de guias deixa de depender apenas do diretório: lista os guias reais aprovados e completos; se não houver nenhum, mostra a mensagem honesta ("estamos a selecionar e verificar os primeiros parceiros").

### 2. Painel administrativo — central de gestão de guias (Prioridade 1)
Ficha completa por guia, com dados reais: perfil, fotografia, localização, descrição, idiomas, estado, datas de candidatura e aprovação, serviços, documentos, reservas. Sem números inventados — se não há dados, diz-se isso.

Ações reais na ficha:
- **Alterar estado** (com registo em auditoria).
- **Solicitar documento**: tipo (identificação, licença profissional, certificação, seguro, outro) + mensagem. Passa a funcionar para qualquer guia, mesmo sem pedido de verificação prévio — o sistema cria o pedido em falta automaticamente.
- **Ver, aprovar ou rejeitar cada documento** individualmente, com motivo obrigatório na rejeição.
- **Enviar mensagem** ao guia, persistente, a partir da ficha.

### 3. Lado do guia — receber, responder, cumprir (Prioridade 1)
- Área autenticada mostra os pedidos de documento em aberto, com upload por pedido; o ficheiro fica associado ao pedido específico.
- Notificação in-app e por email em cada evento: documento pedido, documento aprovado, documento rejeitado (com motivo), perfil aprovado, perfil rejeitado, mensagem do administrador.
- Mensagens do administrador aparecem na área de suporte já existente e ficam registadas.

### 4. Perfil e serviços do guia (Prioridades 2 e 3)
- Fotografia real **obrigatória** antes da publicação pública.
- "Os meus serviços": criar serviço com nome, descrição, localização, duração, participantes máximos, idiomas, categoria, fotografias e informações adicionais.
- Serviço novo entra em **estado de revisão**; o administrador aprova, pede alterações ou corrige o texto. Só serviços aprovados de guias aprovados ficam públicos.

### 5. Experiências — descoberta sem inventar nada (Prioridades 4 e 5)
- Camada editorial de categorias de São Tomé e Príncipe (praias e natureza, trilhos, cultura e história, cacau e café, gastronomia, vida marinha, passeios de barco, mergulho, floresta, roças, experiências comunitárias, Ilha do Príncipe), com fotografia real.
- Categoria sem oferta real: explica a experiência e indica que estão a ser selecionados parceiros locais. **Sem preços, avaliações ou disponibilidade fictícios.**
- Assim que existir um serviço aprovado, aparece automaticamente na categoria correspondente, com fotografia, nome, localização, categoria, duração, guia, idiomas, preço definido pelo parceiro e selo "Parceiro verificado". Reserva só quando a configuração real existir.

### 6. Parceiros e estatísticas (Prioridade 6)
- Estrutura de parceiros preparada para guias, hotéis, alojamentos, agências, restaurantes, operadores e experiências, com candidatura em destaque; nenhum parceiro fictício.
- Revisão de todas as métricas do site: qualquer número que sugira atividade da plataforma (reservas, utilizadores, parceiros, avaliações) é removido ou substituído por "ainda não existem dados suficientes". Os dados turísticos do destino, quando ficarem, ficam claramente identificados como estatísticas de turismo do país e não da plataforma.

### 7. Design, tom e responsividade (Prioridades 6 e 7)
Ajustes contidos, sem redesenho: menos gradientes e sombras, fotografia forte, tipografia e espaçamento, copy direto e específico. Teste em desktop, tablet e telemóvel nas páginas de experiências, guias, perfil, candidatura, painel, upload e mensagens.

## Notas técnicas

- Migrações necessárias: estado do guia em `professional_profiles`; estado de moderação em `services`; `document_requests` com tipo e ciclo aprovar/rejeitar + motivo; função para abrir pedido de verificação a partir do painel; políticas de acesso para as novas ações de administrador.
- Documentos continuam no bucket privado `kyc-documents`, acessíveis só por administradores através de URLs assinados. Fotografias públicas ficam no bucket `avatars`/`service-images` — separação mantida.
- Emails transacionais usam a infraestrutura já verificada em `notify.rotasdoeden.com`.
- Nada é reconstruído: as páginas, tabelas e componentes existentes são corrigidos e ligados entre si.

## Testes antes de fechar
Os sete fluxos de aceitação são executados no browser (desktop e mobile) com dados reais: pedido e envio de documento, aprovação/rejeição com motivo, mensagem admin→guia, fotografia no perfil, criação e moderação de serviço, publicação do guia aprovado e comportamento da página de experiências sem oferta real. No fim, relatório com IMPLEMENTADO / CORRIGIDO / PENDENTE / TESTADO.
