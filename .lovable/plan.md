
## Plano — corrigir chat interno, remover botões mortos e redesenhar o painel admin

## 1. Corrigir a causa principal do chat não funcionar

Hoje o fluxo está partido por dois motivos:
- o botão “Enviar Mensagem” no perfil do guia não cria conversa nenhuma; só mostra toast e manda para `/messages`
- o booking também continua mock e não cria reserva/conversa real
- o `last_message_at` está a ser actualizado no cliente, mas a política actual da tabela `conversations` não permite isso aos participantes

### O que será feito
- Criar um helper reutilizável para procurar ou criar conversa entre turista e guia
- No `GuideProfilePage`, trocar o botão “Enviar Mensagem” para:
  - pedir login se necessário
  - criar/recuperar a conversa real
  - navegar directamente para `/messages/:conversationId`
- No `BookingPage`, trocar a confirmação mock por:
  - inserção real em `bookings`
  - criação/associação da conversa
  - redirecção para a conversa ou página de mensagens com contexto da reserva
- Em `MessagesPage`, adicionar actualização em tempo real para novas conversas e melhor empty state
- Em `ConversationPage`, adicionar tratamento de loading/erro/permissão para não ficar silenciosamente vazio
- Tirar do cliente a responsabilidade de actualizar `last_message_at` e passar isso para a base de dados com trigger em `messages`
- Aproveitar o mesmo trigger para registar automaticamente entradas em `flagged_messages` quando `was_filtered = true`

## 2. Eliminar os botões mortos no admin

Hoje há vários controlos que parecem reais mas são apenas `toast`:
- “Ver” em Guias
- “Aprovar” em Guias
- parte da moderação de reviews
- vários elementos ainda dependem de mock data

### O que será feito
- Substituir a secção “Guias” do `AdminPage` por dados reais do backend (`profiles` + `user_roles` + `kyc_submissions`)
- Trocar o botão “Ver” por uma acção real:
  - abrir drawer/modal de detalhe do guia dentro do admin
  - mostrar nome, email, estado KYC, documentos, data de registo, estado da conta, e métricas básicas
- Trocar “Aprovar” por acção real:
  - actualizar `profiles.kyc_status`
  - actualizar submissão KYC correspondente quando existir
- Manter “Banir/Desbanir” funcional e mais visível
- Remover ou converter qualquer botão ainda não suportado para estado explícito “Em breve”, evitando mais botões mortos

## 3. Ligar o admin ao perfil certo do guia

O problema actual é também de arquitectura: o site público usa `mockGuides`, mas o admin usa utilizadores reais. Isso impede que “ver perfil do guia” aponte para um perfil real coerente.

### O que será feito
- Separar claramente:
  - perfil público do guia
  - detalhe administrativo do guia
- No admin, deixar de tentar depender do perfil público mock
- Criar uma vista de detalhe administrativa real, baseada no backend
- Se necessário para fechar o fluxo completo, preparar a migração gradual da área pública de guias/serviços para dados reais, para que booking + chat partam de entidades reais e não de mocks

## 4. Melhorar bastante o visual do painel admin

Sem mudar para dark mode, o painel pode ficar muito mais premium e menos “branco comum”.

### O que será feito
- Redesenhar `AdminPage` e `AdminSidebar` com a identidade da marca:
  - superfícies verde-eden, areia e oceano em camadas suaves
  - cards com gradientes subtis, destaques e melhor profundidade
  - header administrativo com contexto, KPIs e atalhos
  - sidebar mais forte visualmente e com estados activos mais elegantes
- Dar mais hierarquia visual:
  - secções com títulos, descrições e acções claras
  - tabelas dentro de shells mais ricos
  - badges e estados mais legíveis
  - empty states mais bonitos e informativos
- Melhorar a experiência mobile/tablet do admin com navegação lateral responsiva

## 5. Tornar o chat mais confiável e mais claro

### O que será feito
- Melhorar `MessageInput` com estados de erro mais claros
- Mostrar feedback quando a conversa ainda está a ser criada/carregada
- Melhorar a lista de mensagens e a lista de conversas com:
  - nomes e avatars consistentes
  - última mensagem/última actividade
  - estados vazios úteis
- Garantir que o banner anti-fraude fica sempre visível e contextual
- Confirmar que mensagens filtradas aparecem correctamente no chat e no admin

## 6. Ajustes de backend necessários

### Migrações / regras
- Adicionar trigger em `messages` para:
  - actualizar `conversations.last_message_at`
  - inserir em `flagged_messages` quando a mensagem for filtrada
- Rever políticas RLS relacionadas com:
  - leitura de conversas
  - criação de conversas
  - inserção de mensagens
  - fluxos do admin sobre KYC e moderação
- Manter a segurança actual: admin via `user_roles`, sem roles em `profiles`

## 7. Ficheiros a alterar

### Frontend
- `src/pages/GuideProfilePage.tsx`
- `src/pages/BookingPage.tsx`
- `src/pages/MessagesPage.tsx`
- `src/pages/ConversationPage.tsx`
- `src/components/chat/MessageInput.tsx`
- `src/components/chat/MessageList.tsx`
- `src/pages/AdminPage.tsx`
- `src/components/admin/AdminSidebar.tsx`
- `src/components/admin/UsersTable.tsx`
- `src/components/admin/KycQueue.tsx`
- `src/components/admin/FlaggedMessages.tsx`
- possivelmente novos componentes como:
  - `AdminGuideTable.tsx`
  - `AdminGuideDetailDrawer.tsx`
  - `AdminSectionHeader.tsx`

### Backend
- nova migration SQL para trigger/políticas auxiliares
- eventual helper partilhado para criação/abertura de conversa

## 8. Resultado esperado

No fim desta fase:
- clicar em “Enviar Mensagem” abre uma conversa real
- reservar deixa de ser apenas visual e passa a criar booking/conversa
- o chat interno funciona de ponta a ponta
- o admin deixa de ter botões falsos
- “Ver perfil” do guia passa a abrir uma vista real e útil
- o painel fica visualmente mais marcante, mais premium e menos genérico
- a moderação anti-fraude passa a ficar sincronizada com o que acontece no chat

## Detalhes técnicos

```text
Fluxo corrigido:
Perfil do guia / Reserva
        ↓
getOrCreateConversation(...)
        ↓
/messages/:conversationId
        ↓
insert em messages
        ↓
trigger actualiza last_message_at
        ↓
admin vê mensagens filtradas / actividade real
```

```text
Admin renovado:
Sidebar premium
  + Dashboard com contexto
  + Guias reais
  + KYC funcional
  + Utilizadores funcionais
  + Chat moderation ligada ao backend
```
