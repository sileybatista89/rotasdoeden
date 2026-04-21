

# Plano — Modernização, Imagens, Admin e Correcção de Bugs

## 1. Actualizar referências a 2024 → 2026

- `Footer.tsx`: copyright dinâmico `© {new Date().getFullYear()} Rotas do Éden`
- `HeroSection.tsx`: badge "40.822 visitantes em 2024" → "52.000+ visitantes em 2025"
- `StatsSection.tsx`: label "Visitantes em 2024" → "Visitantes em 2025"
- `mockReviews.ts`: actualizar datas de 2023/2024 para 2025/2026 (mantendo realismo cronológico)

## 2. Nova imagem de hero — Pico Cão Grande

O **Pico Cão Grande** é o ícone visual de São Tomé: um pico vulcânico em forma de agulha com 663 m, emergindo dramaticamente da floresta tropical no sul da ilha. É a imagem mais reconhecível do país.

- Gerar nova imagem hero com IA (modelo `google/gemini-3-pro-image-preview` para alta qualidade): vista panorâmica do Pico Cão Grande emergindo da floresta tropical com luz dourada ao amanhecer, oceano ao fundo, atmosfera cinematográfica
- Substituir `src/assets/hero-bg.jpg`
- Ajustar `alt` text para "Pico Cão Grande, São Tomé e Príncipe"

## 3. Página de Admin

Criar dashboard de administração estático (UI mock — sem backend, dados de `mockData`):

**Rota:** `/admin` (protecção real virá com Lovable Cloud na Fase 2)

**Layout:** Sidebar lateral + área principal com 4 secções:

```text
┌─────────────┬───────────────────────────────┐
│  Dashboard  │  KPIs: guias, reservas,       │
│  Guias      │  receita, taxa de conversão   │
│  Reservas   │                               │
│  Reviews    │  Gráfico de reservas/mês      │
│  Definições │  Lista de actividade recente  │
└─────────────┴───────────────────────────────┘
```

- **Dashboard:** cards de KPIs (total de guias, reservas pendentes, receita simulada, rating médio) + gráfico de barras (recharts) com reservas por mês
- **Guias:** tabela com 6 guias, colunas: foto, nome, cidade, rating, status (verificado/pendente), acções (ver/aprovar/suspender — apenas UI)
- **Reservas:** tabela de reservas mock com filtros por status (pendente/confirmada/cancelada)
- **Reviews:** lista de reviews com botão de moderação (aprovar/remover — UI)
- **Definições:** placeholder com avisos sobre integração futura com Lovable Cloud

Adicionar link discreto no footer "Admin" e rota em `App.tsx`.

## 4. Correcção de bugs e melhorias

Após inspecção do código identifiquei:

- **Inconsistência de comissão:** `BookingPage` usa 15% (`commissionRate = 0.15`) mas `GuideProfilePage` usa 10% na sidebar. Padronizar para **10%** em ambos.
- **Links mortos no Footer:** as listas "Plataforma" e "Para Guias" são `<li>` sem links. Converter em links funcionais (ou desabilitar visualmente como "Em breve" para itens sem destino) — links válidos: "Encontrar Guias" → `/guides`, "Como Funciona" → `/#como-funciona`.
- **Booking sem validação de `numPeople` por defeito:** quando `service.min_people` é maior que 1 (ex: 2), o estado inicial pode ficar a 1. Inicializar correctamente com `service?.min_people ?? 1`.
- **Hash links no Navbar:** quando o utilizador está em `/guides` e clica "Como Funciona" (`#como-funciona`), nada acontece. Já está parcialmente corrigido com `/#como-funciona` no menu mobile mas não no desktop. Padronizar para `/#como-funciona` em ambos.
- **Página `/auth/login` e `/auth/register`** não existem mas o Navbar (botões Entrar/Registar) não tem `onClick` — neste momento são botões inertes. Adicionar toast "Brevemente disponível" enquanto a Fase 2 (Lovable Cloud) não estiver activa.

## Ficheiros afectados

- `src/components/layout/Footer.tsx` — copyright dinâmico + links funcionais
- `src/components/home/HeroSection.tsx` — texto + nova imagem + alt
- `src/components/home/StatsSection.tsx` — label
- `src/data/mockReviews.ts` — datas actualizadas
- `src/assets/hero-bg.jpg` — nova imagem gerada
- `src/pages/AdminPage.tsx` — **novo**
- `src/components/admin/AdminSidebar.tsx` — **novo**
- `src/components/admin/StatsCards.tsx` — **novo**
- `src/components/admin/BookingsTable.tsx` — **novo**
- `src/data/mockBookings.ts` — **novo** (reservas fictícias)
- `src/App.tsx` — rota `/admin`
- `src/components/layout/Navbar.tsx` — toast nos botões auth + hash link consistente
- `src/pages/BookingPage.tsx` — comissão 10%

## Notas

- Autenticação real do admin fica para a Fase 2 (Lovable Cloud com tabela `user_roles`)
- A imagem do hero será gerada via Lovable AI Gateway (modelo Gemini 3 Pro Image)

