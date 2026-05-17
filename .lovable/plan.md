# Plano de melhorias — Rotas do Éden

Trabalho dividido em 7 frentes. Faço tudo numa única passagem.

## 1. Logo oficial (novo, fundo transparente)
- Copio a imagem enviada para `src/assets/logo-rotas-eden.png` (substitui a actual).
- Verifico que aparece bem em: Navbar, Footer, AuthPage, favicons (mantenho favicon actual, só actualizo o logo principal).
- Ajusto tamanhos se necessário para o novo aspect ratio.

## 2. Email único + sem telefone
- Confirmo que **todas** as ocorrências usam `info@rotasdoeden.com` (já está em Footer, Legal, mas faço varredura completa em `src/`, `index.html`, `public/`, edge functions e mock data).
- Removo qualquer número de telefone restante (auditoria a `src/`, dados mock de guias — `phone` em `mockGuides`/`AdminGuideDetailDrawer` — e ajusto UI para não mostrar campo telefone).
- Removo menção a "telefone" em textos de aviso onde fizer sentido (mantenho no `AntiFraudBanner` porque é educacional sobre não partilhar contactos externos).

## 3. Fluxo "Criar conta" simplificado + Google sign-in
- Adiciono **Sign in with Google** via `supabase--configure_social_auth` (managed, sem precisar de credenciais).
- Refaço `AuthPage.tsx`:
  - Quando o utilizador clica "Criar conta" no site, vai directo ao tab **Registar** (já suportado via `?mode=register`, garanto que todos os CTAs usam isso).
  - Botão "Continuar com Google" em destaque no topo (1 clique).
  - Formulário email/password mais curto e claro abaixo.
  - Mantenho aceitação de Termos + escolha turista/guia.
- Email de verificação fica **activo** (segurança). Adiciono página `/reset-password` para reset de password (em falta hoje) e link "Esqueci-me" no login.
- Activo **HIBP password check** (`configure_auth` com `password_hibp_enabled: true`) para bloquear passwords vazadas.

## 4. Cliques mortos / navegação fluída
- Faço auditoria a todos os `<Link>`, `<a href>` e `onClick` em `src/` para garantir que todos os destinos existem (rotas reais em `App.tsx`).
- Verifico CTAs do Hero, cards de guias, cards de experiências, navegação footer, links legais.
- Adiciono `<Suspense>` + lazy loading com fallback rápido às rotas pesadas (`ExperiencesPage`, `GuidesPage`, `ExperienceDetailPage`) para reduzir percepção de lentidão.
- Faço scroll-to-top em mudança de rota (helper simples no `App.tsx`).

## 5. Conteúdo autêntico São Tomé e Príncipe
- **Nova secção na homepage**: bloco "Descobre São Tomé e Príncipe" com 4-6 destaques (Pico Cão Grande, Roça Agostinho Neto, praias do sul, cacau, biodiversidade, gastronomia — calulu, banana frita).
- **Nova página `/sobre-sao-tome`**: hero + secções (História breve, Geografia & ilhas, Cultura & gastronomia, Natureza & biodiversidade, Quando visitar, Como chegar). Linkada da Navbar e Footer. Adicionada ao `sitemap.xml`.
- **Enriquecer Experiências**: descrições mais ricas no `mockServices` com contexto local (locais reais, duração, dificuldade, o que esperar).
- Tudo em PT-PT, sem fluff.

## 6. Polish visual (paleta actual mantida)
- Refino na homepage: espaçamentos consistentes, hover/transição suave (200-250ms ease-out) em cards, botões e links.
- Cards de guias/experiências: shadow mais subtil, scale 1.02 em hover, badge "Verificado" mais elegante.
- Anima entrada de secções com fade-up via `framer-motion` (já no projecto via deps? — adiciono se não estiver).
- Skeleton states em vez de spinners nas listas.
- Hero: melhor ritmo tipográfico, CTA com micro-interaction.

## 7. Pagamentos & Segurança (go-live + auditoria)
- **Go-live Stripe**: chamo `payments--get_go_live_status` e mostro-te os passos exactos que tens de completar no Stripe (claim conta, onboarding, install app na conta live). A activação é tua, eu deixo tudo preparado.
- Verifico fluxo end-to-end de reserva: data picker → checkout embedded → confirmação → my-bookings. Confirmo webhook funciona.
- **Auditoria de segurança**: corro `security--run_security_scan` e `supabase--linter`. Corrijo achados (RLS, exposição de dados, etc.).
- Verifico que o chat (`MessagesPage`, `ConversationPage`, filtro anti-fraude) está operacional.

## Detalhes técnicos
- Stack: React + Vite + Tailwind + Supabase + Stripe embedded (já em uso).
- Mudanças de DB: migration para enable Google provider + HIBP (via tools, sem SQL manual).
- Sem novas dependências pesadas — `framer-motion` se ainda não estiver.
- Mantenho design tokens (`--primary` eden-green, `--secondary` eden-sand, Playfair + Source Sans).

## Ordem de execução
1. Logo + auditoria email/telefone (rápido, alta visibilidade)
2. Google auth + AuthPage redesenhada + reset password + HIBP
3. Página Sobre STP + secção homepage + enriquecimento Experiências
4. Polish visual + lazy routes + scroll-to-top + verificação de links
5. Security scan + linter + correcções
6. Go-live status do Stripe (mostro-te os passos)
7. Republicar
