

# Plano — Auth com primeiro user = Admin, KYC, Anti-fraude e Chat Interno

Esta é uma fase grande. Requer **activar o Lovable Cloud** (Supabase gerido) para autenticação real, base de dados, storage de documentos KYC, chat em tempo real e protecção de rotas.

---

## 1. Activar Lovable Cloud

Necessário para: auth, base de dados, storage (documentos KYC), realtime (chat), edge functions (filtro anti-fraude no chat).

## 2. Autenticação — primeiro user vira Admin automaticamente

**Fluxo:**
- Página `/auth` com tabs Login / Registo (email + password).
- Após signup, trigger SQL `handle_new_user` cria registo em `profiles` e atribui role:
  - Se a tabela `user_roles` ainda estiver vazia → `admin`
  - Caso contrário → `tourist` (default) ou conforme escolha no registo (`tourist` / `guide`)
- Tabela `user_roles` separada (segurança — nunca colocar role em `profiles`) com enum `app_role: admin | guide | tourist`.
- Função SECURITY DEFINER `has_role(_user_id, _role)` para usar em RLS sem recursão.
- Sessão gerida com `onAuthStateChange` + `getSession`.
- Navbar passa a mostrar avatar + dropdown (Dashboard / Sair) quando autenticado.

## 3. Schema da Base de Dados

Tabelas novas:
- `profiles` — id (FK auth.users), full_name, avatar_url, phone, country, kyc_status (`pending|submitted|verified|rejected`), banned (bool), created_at
- `user_roles` — id, user_id, role (enum)
- `kyc_submissions` — id, user_id, document_type, document_url (storage), selfie_url, status, reviewer_notes, submitted_at, reviewed_at, reviewed_by
- `bookings` — id, tourist_id, guide_id, service_id, date, num_people, total_price, status, created_at
- `conversations` — id, booking_id (nullable), tourist_id, guide_id, created_at, last_message_at
- `messages` — id, conversation_id, sender_id, content, content_filtered (bool), flagged_reason (text), created_at
- `flagged_messages` — id, message_id, reason, reviewed (bool), action_taken

Storage buckets:
- `kyc-documents` (privado, RLS estrita — só dono e admin)
- `avatars` (público)

## 4. Painel Admin completo (`/admin` protegido)

Substitui o mock actual. Secções:
- **Dashboard** — KPIs reais (users, guias verificados, reservas, receita, chats activos, mensagens flagged)
- **Utilizadores** — lista de todos, com acções: ver perfil, **banir/desbanir**, alterar role, ver histórico
- **Guias** — lista com filtro por status KYC, botão **Aprovar/Rejeitar verificação**, ver documentos KYC
- **KYC / Verificação** — fila de submissões pendentes com preview de documento + selfie, aprovar/rejeitar com nota
- **Reservas** — todas as reservas, filtros, cancelar/reembolsar
- **Chats / Moderação** — lista de conversas, mensagens flagged pelo filtro anti-fraude, ver contexto, banir user
- **Reviews** — moderação (já existe)
- **Definições** — comissão, configurações da plataforma

## 5. KYC para Guias

- Após registo como guia, perfil `kyc_status = pending`.
- Página `/kyc` onde guia faz upload de:
  - Documento de identificação (BI/passaporte) — frente e verso
  - Selfie segurando o documento
  - Licença turística (já existia conceptualmente)
- Submissão grava em `kyc_submissions` + storage privado.
- Guia fica com `kyc_status = submitted`, perfil **não aparece publicamente** em `/guides` até admin aprovar (`verified`).
- Admin vê fila no painel, aprova/rejeita.

## 6. Chat Interno (anti-fuga da plataforma)

- Página `/messages` (lista de conversas) e `/messages/:conversationId`.
- Conversa é criada automaticamente quando turista envia mensagem ao guia ou faz reserva.
- Realtime via Supabase Realtime — mensagens aparecem ao vivo.
- **Filtro anti-fraude** numa edge function `filter-message` chamada antes de inserir:
  - Bloqueia/máscara: emails, números de telefone (formatos PT/STP/internacionais), URLs externos, handles de redes sociais (@instagram, @whatsapp, t.me/, wa.me/, etc.), palavras-chave ("paypal", "mbway", "iban", "fora da plataforma", "diretamente comigo", etc.)
  - Mensagem detectada: marcada como `flagged`, conteúdo substituído por aviso, registada em `flagged_messages` para revisão admin.
  - Usuário recebe toast: "Por segurança, contactos e pagamentos externos não são permitidos. Toda a comunicação e pagamentos devem ocorrer dentro da plataforma."
- Aviso permanente no topo do chat: banner com termos anti-fraude.
- Modal "Contactar guia" da página de perfil passa a abrir/criar uma conversa real em vez de ser UI mock.

## 7. Protecção de rotas

- `/admin/*` → exige role `admin`
- `/kyc` → exige login + role `guide`
- `/messages/*` → exige login
- `/book/*` → exige login + KYC do guia verificado

## 8. Ficheiros principais

**Novos:**
- Migrações SQL (enum, tabelas, RLS, trigger first-user-admin)
- `src/pages/AuthPage.tsx`, `src/pages/KycPage.tsx`, `src/pages/MessagesPage.tsx`, `src/pages/ConversationPage.tsx`
- `src/hooks/useAuth.tsx`, `src/hooks/useUserRole.tsx`
- `src/components/admin/UsersTable.tsx`, `KycQueue.tsx`, `FlaggedMessages.tsx`
- `src/components/chat/MessageList.tsx`, `MessageInput.tsx`, `AntiFraudBanner.tsx`
- `src/components/auth/ProtectedRoute.tsx`
- Edge function `supabase/functions/filter-message/index.ts`

**Editados:**
- `App.tsx` (rotas + guards), `Navbar.tsx` (estado real), `AdminPage.tsx` (dados reais + KYC + chats), `GuideProfilePage.tsx` (botão Mensagem cria conversa), `BookingPage.tsx` (cria booking real + conversa)

## Notas

- Pagamentos reais (Stripe/Paddle) ficam para fase seguinte — por agora reservas ficam `pending_payment`.
- Filtro anti-fraude é heurístico (regex + lista negra). Pode ser reforçado depois com IA via Lovable AI Gateway.
- Admin do projecto que mencionas tinha exactamente este padrão (primeiro user = admin, KYC, banir, moderação) — vou replicar essa arquitectura aqui.

