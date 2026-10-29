# Eden Explorer

# PROMPT DE ENGENHARIA — MVP MARKETPLACE DE GUIAS TURÍSTICOS EM SÃO TOMÉ E PRÍNCIPE

> **Instrução ao Replit AI:** Este documento é um briefing técnico completo e autocontido. Constrói o projeto exactamente como descrito, do início ao fim, sem fazer perguntas adicionais. Quando tiveres dúvidas sobre uma decisão de implementação, usa o teu melhor julgamento e documenta a decisão no README. Segue a ordem de implementação indicada na Secção 11.

---

## ÍNDICE

1. [Contexto do Projecto](#1-contexto-do-projecto)
2. [Nome e Identidade](#2-nome-e-identidade)
3. [Stack Técnico](#3-stack-técnico)
4. [Estrutura de Ficheiros](#4-estrutura-de-ficheiros)
5. [Base de Dados — Schema Completo](#5-base-de-dados--schema-completo)
6. [Tipos TypeScript](#6-tipos-typescript)
7. [Variáveis de Ambiente](#7-variáveis-de-ambiente)
8. [Páginas e Rotas (App Router)](#8-páginas-e-rotas-app-router)
9. [Funcionalidades Detalhadas](#9-funcionalidades-detalhadas)
10. [Design e UI](#10-design-e-ui)
11. [Sistema de Pagamento Stripe](#11-sistema-de-pagamento-stripe)
12. [Dados de Seed (Mock Data)](#12-dados-de-seed-mock-data)
13. [Ordem de Implementação](#13-ordem-de-implementação)
14. [README Final](#14-readme-final)

---

## 1. CONTEXTO DO PROJECTO

### O que é

**Rotas do Éden** (nome definitivo — ver Secção 2) é uma plataforma web marketplace que conecta turistas a guias turísticos licenciados e verificados em São Tomé e Príncipe. Funciona de forma semelhante ao Airbnb Experiences ou ao Viator, mas exclusivamente focada neste arquipélago.

### O problema que resolve

São Tomé e Príncipe registou **40.822 visitantes em 2024** (novo recorde histórico), dos quais 54% são provenientes de Portugal. O turismo representa 11% do PIB do país. No entanto, a descoberta de guias turísticos é extremamente informal — acontece por recomendação boca-a-boca, em hotéis, ou por WhatsApp. Não existe nenhuma plataforma digital que:
- Liste guias verificados com licença governamental
- Permita reserva e pagamento online com segurança
- Mostre avaliações reais de turistas anteriores
- Agregue serviços e tours num único local

### Para quem é

**Turistas (lado da procura):**
- Maioritariamente portugueses (54%), americanos (8%), franceses (5%), angolanos (5%), alemães (4%)
- Viajantes independentes que chegam por via aérea (77%) ou marítima (excursionistas, 23%)
- Média de estadia: 18 dias — turistas com tempo para explorar
- Perfil: turismo de natureza, aventura, mergulho, história colonial, gastronomia

**Guias turísticos (lado da oferta):**
- Guias locais licenciados pela Direcção-Geral do Turismo e Hotelaria de STP
- Freelancers que querem digitalizar o seu negócio e receber pagamentos online
- Pequenas agências locais com múltiplos guias

**Administração da plataforma:**
- Equipa interna responsável por verificar licenças, aprovar guias e gerir pagamentos

### Posicionamento

Marketplace **premium** com barreira de entrada (verificação de licença obrigatória) e **badge governamental** de guia verificado. Diferenciador face à concorrência informal: confiança, segurança de pagamento, e qualidade garantida.

---

## 2. NOME E IDENTIDADE

- **Nome da plataforma:** `Rotas do Éden`
- **Tagline:** *"Descobre São Tomé com quem a conhece de verdade."*
- **Domínio sugerido:** `rotasdoeden.st`
- **Logo:** SVG inline — folha tropical estilizada integrada numa rota/caminho. Usar `#2D6A4F` (verde floresta) como cor primária do logo.
- **Favicon:** versão simplificada do logo a 32×32px

---

## 3. STACK TÉCNICO

### Versões exactas a usar

```json
{
  "next": "14.2.x",
  "react": "18.x",
  "typescript": "5.x",
  "tailwindcss": "3.4.x",
  "@supabase/supabase-js": "2.x",
  "@supabase/ssr": "0.x",
  "stripe": "14.x",
  "mapbox-gl": "3.x",
  "@radix-ui/react-*": "latest",
  "shadcn/ui": "latest (via CLI)",
  "resend": "3.x",
  "react-hook-form": "7.x",
  "zod": "3.x",
  "date-fns": "3.x",
  "react-day-picker": "8.x",
  "lucide-react": "latest",
  "recharts": "2.x"
}
```

### Detalhes de cada tecnologia

**Next.js 14 App Router**
- Usar exclusivamente o App Router (`app/` directory)
- Server Components por defeito; Client Components apenas quando necessário (interactividade, hooks)
- Route Handlers em `app/api/` para webhooks e lógica de servidor
- Server Actions para mutações de formulários

**Tailwind CSS + shadcn/ui**
- Inicializar shadcn/ui com: `npx shadcn@latest init`
- Componentes shadcn a instalar: `button`, `card`, `dialog`, `dropdown-menu`, `form`, `input`, `label`, `select`, `tabs`, `textarea`, `toast`, `badge`, `avatar`, `calendar`, `popover`, `separator`, `skeleton`, `sheet`, `table`, `alert`
- Configurar `tailwind.config.ts` com as cores da marca (ver Secção 10)

**Supabase**
- Auth: email/password + magic link
- Database: PostgreSQL com Row Level Security (RLS) activado em todas as tabelas
- Storage: bucket `guide-photos` (público) e bucket `documents` (privado, apenas admin)
- Realtime: para o sistema de mensagens

**Stripe**
- PaymentIntent para captura de pagamento no momento da reserva
- Webhook para actualizar estado após pagamento confirmado
- Stripe Transfer para payout ao guia (ou gestão manual via dashboard Stripe)
- Não usar Stripe Connect neste MVP — gestão de comissão é manual

**Mapbox GL JS**
- Mapa centrado em São Tomé e Príncipe: `{ lng: 6.6131, lat: 0.1864, zoom: 11 }`
- Pins interactivos dos guias com popup ao clicar
- Usar `react-map-gl` como wrapper React para Mapbox

**Resend**
- Emails transaccionais: confirmação de reserva, aprovação de guia, notificação de mensagem
- Templates HTML simples com branding da plataforma

---

## 4. ESTRUTURA DE FICHEIROS

```
rotasdoeden/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   │   ├── tourist/
│   │   │   │   └── page.tsx
│   │   │   ├── guide/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── profile/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── services/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── new/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── bookings/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── earnings/
│   │   │   │       └── page.tsx
│   │   │   └── admin/
│   │   │       ├── page.tsx
│   │   │       ├── guides/
│   │   │       │   └── page.tsx
│   │   │       ├── bookings/
│   │   │       │   └── page.tsx
│   │   │       └── analytics/
│   │   │           └── page.tsx
│   │   └── layout.tsx
│   ├── guides/
│   │   ├── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   ├── book/
│   │   └── [serviceId]/
│   │       └── page.tsx
│   ├── messages/
│   │   └── [bookingId]/
│   │       └── page.tsx
│   ├── api/
│   │   ├── stripe/
│   │   │   ├── create-payment-intent/
│   │   │   │   └── route.ts
│   │   │   └── webhook/
│   │   │       └── route.ts
│   │   ├── guides/
│   │   │   └── route.ts
│   │   └── admin/
│   │       └── approve-guide/
│   │           └── route.ts
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── ui/                        # shadcn/ui components (auto-gerados)
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   └── DashboardSidebar.tsx
│   ├── guides/
│   │   ├── GuideCard.tsx
│   │   ├── GuideGrid.tsx
│   │   ├── GuideFilters.tsx
│   │   ├── GuideMap.tsx
│   │   ├── VerifiedBadge.tsx
│   │   └── ReviewCard.tsx
│   ├── services/
│   │   ├── ServiceCard.tsx
│   │   └── ServiceForm.tsx
│   ├── bookings/
│   │   ├── BookingCalendar.tsx
│   │   ├── BookingCard.tsx
│   │   └── PaymentForm.tsx
│   ├── messages/
│   │   └── ChatWindow.tsx
│   ├── home/
│   │   ├── HeroSection.tsx
│   │   ├── SearchBar.tsx
│   │   ├── FeaturedGuides.tsx
│   │   └── StatsSection.tsx
│   └── admin/
│       ├── GuideApprovalCard.tsx
│       └── AnalyticsChart.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # createBrowserClient
│   │   ├── server.ts              # createServerClient
│   │   └── middleware.ts
│   ├── stripe.ts
│   ├── resend.ts
│   ├── mapbox.ts
│   └── utils.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useGuides.ts
│   ├── useBookings.ts
│   └── useMessages.ts
├── types/
│   └── index.ts
├── middleware.ts
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── seed.sql
├── public/
│   ├── images/
│   │   └── hero-bg.jpg
│   └── icons/
│       └── favicon.ico
├── .env.local                     # nunca commitar
├── .env.example
├── tailwind.config.ts
├── next.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 5. BASE DE DADOS — SCHEMA COMPLETO

Criar o ficheiro `supabase/migrations/001_initial_schema.sql` com o seguinte conteúdo:

```sql
-- ============================================================
-- EXTENSÕES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- para coordenadas geográficas

-- ============================================================
-- TABELA: users (estende auth.users do Supabase)
-- ============================================================
CREATE TABLE public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  role        TEXT NOT NULL DEFAULT 'tourist' CHECK (role IN ('tourist', 'guide', 'admin')),
  name        TEXT NOT NULL,
  avatar_url  TEXT,
  phone       TEXT,
  nationality TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: guides
-- ============================================================
CREATE TABLE public.guides (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  bio              TEXT,
  bio_en           TEXT,                -- bio em inglês (opcional)
  languages        TEXT[] NOT NULL DEFAULT '{}',
  specialties      TEXT[] NOT NULL DEFAULT '{}',
  license_number   TEXT,
  license_verified BOOLEAN NOT NULL DEFAULT FALSE,
  rating           NUMERIC(3,2) DEFAULT 0.00,
  total_reviews    INTEGER NOT NULL DEFAULT 0,
  price_per_day    NUMERIC(10,2),       -- em EUR
  location_lat     NUMERIC(10,7),
  location_lng     NUMERIC(10,7),
  city             TEXT NOT NULL DEFAULT 'São Tomé',
  cover_photo_url  TEXT,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  rejection_reason TEXT,
  years_experience INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: services (tours/experiências oferecidos por guias)
-- ============================================================
CREATE TABLE public.services (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guide_id       UUID NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  title_en       TEXT,
  description    TEXT NOT NULL,
  description_en TEXT,
  duration_hours NUMERIC(4,1) NOT NULL,
  price          NUMERIC(10,2) NOT NULL,  -- preço total em EUR
  max_people     INTEGER NOT NULL DEFAULT 8,
  min_people     INTEGER NOT NULL DEFAULT 1,
  category       TEXT NOT NULL CHECK (category IN ('tour', 'experience', 'transfer', 'diving', 'hiking')),
  images         TEXT[] NOT NULL DEFAULT '{}',
  includes       TEXT[],                  -- ex: ['almoço', 'transporte', 'snorkel']
  excludes       TEXT[],
  meeting_point  TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: bookings
-- ============================================================
CREATE TABLE public.bookings (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tourist_id              UUID NOT NULL REFERENCES public.users(id),
  guide_id                UUID NOT NULL REFERENCES public.guides(id),
  service_id              UUID NOT NULL REFERENCES public.services(id),
  booking_date            DATE NOT NULL,
  num_people              INTEGER NOT NULL DEFAULT 1,
  status                  TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'refunded')),
  total_price             NUMERIC(10,2) NOT NULL,
  commission_rate         NUMERIC(4,3) NOT NULL DEFAULT 0.15,  -- 15%
  commission_amount       NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  guide_payout_amount     NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  stripe_payment_intent_id TEXT,
  payment_status          TEXT NOT NULL DEFAULT 'unpaid'
                            CHECK (payment_status IN ('unpaid', 'paid', 'held', 'released', 'refunded')),
  payout_released_at      TIMESTAMPTZ,
  payout_released_by      UUID REFERENCES public.users(id),
  special_requests        TEXT,
  cancellation_reason     TEXT,
  cancelled_at            TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: reviews
-- ============================================================
CREATE TABLE public.reviews (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id  UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  tourist_id  UUID NOT NULL REFERENCES public.users(id),
  guide_id    UUID NOT NULL REFERENCES public.guides(id),
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  reply       TEXT,                 -- resposta do guia
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: messages
-- ============================================================
CREATE TABLE public.messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id  UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES public.users(id),
  receiver_id UUID NOT NULL REFERENCES public.users(id),
  content     TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: documents (documentos submetidos pelo guia)
-- ============================================================
CREATE TABLE public.documents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guide_id    UUID NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('license', 'id_card', 'certificate', 'photo')),
  file_url    TEXT NOT NULL,
  file_name   TEXT,
  verified    BOOLEAN NOT NULL DEFAULT FALSE,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: availability (disponibilidade do guia)
-- ============================================================
CREATE TABLE public.availability (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guide_id    UUID NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  note        TEXT,
  UNIQUE (guide_id, date)
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX idx_guides_status ON public.guides(status);
CREATE INDEX idx_guides_city ON public.guides(city);
CREATE INDEX idx_guides_user_id ON public.guides(user_id);
CREATE INDEX idx_services_guide_id ON public.services(guide_id);
CREATE INDEX idx_services_category ON public.services(category);
CREATE INDEX idx_bookings_tourist_id ON public.bookings(tourist_id);
CREATE INDEX idx_bookings_guide_id ON public.bookings(guide_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_bookings_date ON public.bookings(booking_date);
CREATE INDEX idx_messages_booking_id ON public.messages(booking_id);
CREATE INDEX idx_reviews_guide_id ON public.reviews(guide_id);

-- ============================================================
-- TRIGGERS: actualizar updated_at automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER guides_updated_at BEFORE UPDATE ON public.guides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER services_updated_at BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER reviews_updated_at BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TRIGGER: actualizar rating do guia após nova review
-- ============================================================
CREATE OR REPLACE FUNCTION update_guide_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.guides
  SET
    rating = (
      SELECT ROUND(AVG(rating)::NUMERIC, 2)
      FROM public.reviews
      WHERE guide_id = NEW.guide_id
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM public.reviews
      WHERE guide_id = NEW.guide_id
    )
  WHERE id = NEW.guide_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reviews_update_guide_rating
  AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION update_guide_rating();

-- ============================================================
-- TRIGGER: criar perfil em public.users após registo no Supabase Auth
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'tourist')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Activar RLS em todas as tabelas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;

-- USERS: utilizador vê o seu próprio perfil; admin vê todos
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- GUIDES: perfis verificados são públicos; guia gere o seu; admin gere todos
CREATE POLICY "guides_select_public" ON public.guides
  FOR SELECT USING (status = 'verified' OR user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "guides_insert_own" ON public.guides
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "guides_update_own" ON public.guides
  FOR UPDATE USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ));

-- SERVICES: serviços de guias verificados são públicos
CREATE POLICY "services_select_public" ON public.services
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.guides WHERE id = guide_id AND status = 'verified')
    OR EXISTS (SELECT 1 FROM public.guides WHERE id = guide_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "services_manage_own" ON public.services
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.guides WHERE id = guide_id AND user_id = auth.uid())
  );

-- BOOKINGS: turista vê as suas; guia vê as suas; admin vê todas
CREATE POLICY "bookings_select" ON public.bookings
  FOR SELECT USING (
    tourist_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.guides WHERE id = guide_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "bookings_insert_tourist" ON public.bookings
  FOR INSERT WITH CHECK (tourist_id = auth.uid());
CREATE POLICY "bookings_update" ON public.bookings
  FOR UPDATE USING (
    tourist_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.guides WHERE id = guide_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- REVIEWS: qualquer pessoa lê; turista escreve a sua
CREATE POLICY "reviews_select_public" ON public.reviews FOR SELECT USING (TRUE);
CREATE POLICY "reviews_insert_tourist" ON public.reviews
  FOR INSERT WITH CHECK (tourist_id = auth.uid());
CREATE POLICY "reviews_update_own" ON public.reviews
  FOR UPDATE USING (tourist_id = auth.uid());

-- MESSAGES: apenas participantes da reserva
CREATE POLICY "messages_select" ON public.messages
  FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());
CREATE POLICY "messages_update_read" ON public.messages
  FOR UPDATE USING (receiver_id = auth.uid());

-- DOCUMENTS: guia vê os seus; admin vê todos
CREATE POLICY "documents_select" ON public.documents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.guides WHERE id = guide_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "documents_insert_own" ON public.documents
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.guides WHERE id = guide_id AND user_id = auth.uid())
  );

-- AVAILABILITY: pública para leitura
CREATE POLICY "availability_select_public" ON public.availability FOR SELECT USING (TRUE);
CREATE POLICY "availability_manage_own" ON public.availability
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.guides WHERE id = guide_id AND user_id = auth.uid())
  );
```

---

## 6. TIPOS TYPESCRIPT

Criar o ficheiro `types/index.ts`:

```typescript
export type UserRole = 'tourist' | 'guide' | 'admin';

export type GuideStatus = 'pending' | 'verified' | 'rejected';

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refunded';

export type PaymentStatus = 'unpaid' | 'paid' | 'held' | 'released' | 'refunded';

export type ServiceCategory = 'tour' | 'experience' | 'transfer' | 'diving' | 'hiking';

export type DocumentType = 'license' | 'id_card' | 'certificate' | 'photo';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  avatar_url?: string;
  phone?: string;
  nationality?: string;
  created_at: string;
  updated_at: string;
}

export interface Guide {
  id: string;
  user_id: string;
  bio?: string;
  bio_en?: string;
  languages: string[];
  specialties: string[];
  license_number?: string;
  license_verified: boolean;
  rating: number;
  total_reviews: number;
  price_per_day?: number;
  location_lat?: number;
  location_lng?: number;
  city: string;
  cover_photo_url?: string;
  status: GuideStatus;
  rejection_reason?: string;
  years_experience?: number;
  created_at: string;
  updated_at: string;
  // Relations (joined)
  user?: User;
  services?: Service[];
  reviews?: Review[];
}

export interface Service {
  id: string;
  guide_id: string;
  title: string;
  title_en?: string;
  description: string;
  description_en?: string;
  duration_hours: number;
  price: number;
  max_people: number;
  min_people: number;
  category: ServiceCategory;
  images: string[];
  includes?: string[];
  excludes?: string[];
  meeting_point?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  guide?: Guide;
}

export interface Booking {
  id: string;
  tourist_id: string;
  guide_id: string;
  service_id: string;
  booking_date: string;
  num_people: number;
  status: BookingStatus;
  total_price: number;
  commission_rate: number;
  commission_amount: number;
  guide_payout_amount: number;
  stripe_payment_intent_id?: string;
  payment_status: PaymentStatus;
  payout_released_at?: string;
  special_requests?: string;
  cancellation_reason?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
  // Relations
  tourist?: User;
  guide?: Guide;
  service?: Service;
  messages?: Message[];
  review?: Review;
}

export interface Review {
  id: string;
  booking_id: string;
  tourist_id: string;
  guide_id: string;
  rating: number;
  comment?: string;
  reply?: string;
  created_at: string;
  updated_at: string;
  // Relations
  tourist?: User;
}

export interface Message {
  id: string;
  booking_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  // Relations
  sender?: User;
}

export interface Document {
  id: string;
  guide_id: string;
  type: DocumentType;
  file_url: string;
  file_name?: string;
  verified: boolean;
  notes?: string;
  created_at: string;
}

export interface Availability {
  id: string;
  guide_id: string;
  date: string;
  is_available: boolean;
  note?: string;
}

// Filtros para a página de listagem de guias
export interface GuideFilters {
  search?: string;
  specialty?: string;
  language?: string;
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  date?: string;
}

// Resposta da API do Stripe para criação de PaymentIntent
export interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

// Analytics para o admin
export interface AdminAnalytics {
  totalRevenue: number;
  totalCommission: number;
  totalBookings: number;
  bookingsByMonth: { month: string; count: number; revenue: number }[];
  topGuides: { guide: Guide; totalBookings: number; totalRevenue: number }[];
  bookingsByStatus: { status: BookingStatus; count: number }[];
}
```

---

## 7. VARIÁVEIS DE AMBIENTE

Criar o ficheiro `.env.example` (e instruir o utilizador a criar `.env.local` com valores reais):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoiLi4uIiwiYSI6Ii4uLiJ9...

# Resend
RESEND_API_KEY=re_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Rotas do Éden
```

---

## 8. PÁGINAS E ROTAS (App Router)

### 8.1 Homepage — `app/page.tsx`

**Secções (de cima para baixo):**

1. **Navbar** — logo + links de navegação + botão "Entrar" / avatar do utilizador
2. **Hero Section** — fundo com imagem de São Tomé, título grande, tagline, barra de pesquisa central
3. **Barra de pesquisa** — inputs: [Especialidade ▼] [Língua ▼] [Data] + botão Pesquisar → navega para `/guides?...`
4. **Stats strip** — 3 cards: "40.822 visitantes em 2024 · 54% portugueses · 18 dias de estadia média"
5. **Guias em destaque** — grid 3 colunas com os 6 guias com melhor rating (GuideCard)
6. **Mapa interactivo** — mapa Mapbox com pins dos guias activos (height: 500px)
7. **Como funciona** — 3 steps: "Encontra o teu guia → Reserva online → Vive a experiência"
8. **CTA para guias** — secção com fundo verde: "És guia turístico? Regista-te e começa a receber"
9. **Footer** — links, contacto, redes sociais

### 8.2 Listagem de Guias — `app/guides/page.tsx`

**Layout:** sidebar de filtros (esquerda) + grid de guias (direita) + mapa toggle no mobile

**Filtros na sidebar:**
- Pesquisa por texto (nome, bio)
- Especialidade: Natureza · História · Mergulho · Gastronomia · Aventura · Pesca · Birdwatching
- Língua: Português · Inglês · Francês · Espanhol · Alemão
- Preço por dia (slider: 0–500 EUR)
- Cidade: São Tomé · Príncipe · Santana · Neves
- Disponibilidade (date picker)

**Ordenação:** Melhor avaliação · Preço crescente · Preço decrescente · Mais recentes

**Cada GuideCard mostra:**
- Foto de perfil (avatar circular) + foto de capa
- Nome + badge "Verificado" (se `license_verified = true`)
- Especialidades (até 3 tags)
- Línguas (ícones de bandeiras)
- Rating (estrelas) + número de reviews
- Preço por dia (ex: "A partir de €80/dia")
- Botão "Ver Perfil"

### 8.3 Perfil do Guia — `app/guides/[id]/page.tsx`

**Secções:**
1. Header com foto, nome, badge verificado, rating, localização
2. Sobre mim (bio em PT e EN se disponível)
3. Especialidades e Línguas (tags coloridas)
4. Serviços disponíveis (grid de ServiceCard)
5. Mapa com pin da localização do guia
6. Avaliações (lista de ReviewCard com estrelas e comentário)
7. Sidebar fixo: preço, botão "Reservar", contactar

### 8.4 Página de Reserva — `app/book/[serviceId]/page.tsx`

Esta é uma página Client Component. Fluxo em 3 steps:

**Step 1 — Detalhes:**
- Resumo do serviço (título, duração, preço por pessoa)
- Selector de data (react-day-picker — desabilitar datas bloqueadas pelo guia)
- Selector de número de pessoas (min/max conforme o serviço)
- Campo de pedidos especiais (textarea)
- Cálculo em tempo real: `total = preço × num_pessoas`

**Step 2 — Pagamento:**
- Resumo da reserva
- Formulário Stripe Elements (CardElement) para pagamento seguro
- Botão "Pagar €XX e Confirmar Reserva"
- Texto informativo: "O seu pagamento é retido em segurança até à conclusão do serviço"

**Step 3 — Confirmação:**
- Mensagem de sucesso
- Número da reserva
- Links para dashboard e mensagens

### 8.5 Dashboard do Turista — `app/dashboard/tourist/page.tsx`

**Tabs:**
- **Reservas activas** — bookings com status pending/confirmed. Cada card mostra: serviço, guia, data, estado, botão "Enviar mensagem"
- **Histórico** — bookings completed/cancelled. Opção de deixar avaliação se ainda não avaliou
- **Mensagens** — lista de conversas activas

### 8.6 Dashboard do Guia — `app/dashboard/guide/page.tsx`

**Sidebar com links para:**
- Visão geral (stats: reservas este mês, ganhos, rating)
- Perfil (editar bio, fotos, especialidades)
- Serviços (listar, criar, editar, desactivar)
- Reservas (gerir: aceitar, recusar, marcar como completo)
- Disponibilidade (calendário para bloquear dias)
- Documentos (upload de licença, BI, certificados)
- Ganhos (histórico de pagamentos recebidos)

**Visão geral — métricas:**
```
[Reservas este mês: 8]  [Ganhos pendentes: €520]  [Ganhos liberados: €1.240]  [Rating: 4.8 ★]
```

### 8.7 Dashboard Admin — `app/dashboard/admin/page.tsx`

**Tabs:**
- **Guias pendentes** — lista de guias com status=pending. Para cada um: ver documentos, aprovar (com botão verde), rejeitar (com modal de razão)
- **Todas as reservas** — tabela filtrável por estado, data, guia
- **Pagamentos** — reservas com `payment_status=held` e serviço completed — botão "Libertar pagamento" para cada uma
- **Analytics** — gráficos Recharts: receita por mês (BarChart), reservas por estado (PieChart), top 5 guias

### 8.8 Mensagens — `app/messages/[bookingId]/page.tsx`

Interface de chat em tempo real (Supabase Realtime):
- Header: foto e nome do interlocutor + info da reserva
- Área de mensagens (scroll infinito, novas mensagens no fundo)
- Input de texto + botão enviar
- Indicador "lido" (is_read)
- Mensagens do utilizador à direita (fundo verde), do outro à esquerda (fundo cinza)

### 8.9 Autenticação — `app/(auth)/`

**Registo `/auth/register`:**
- Nome completo
- Email
- Password (mínimo 8 caracteres)
- **Selector de role:** "Sou turista" / "Sou guia turístico"
- Se seleccionar "guia": mostrar campo extra para número de licença (opcional no registo, obrigatório para activação)
- Após registo como guia → criar registo em `guides` automaticamente com status=pending

**Login `/auth/login`:**
- Email + password
- Link "Esqueci a password" (magic link do Supabase)
- Após login → redirect conforme role: turista→`/dashboard/tourist`, guia→`/dashboard/guide`, admin→`/dashboard/admin`

---

## 9. FUNCIONALIDADES DETALHADAS

### 9.1 Autenticação e Middleware

Criar `middleware.ts` na raiz:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Proteger rotas de dashboard
  if (request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/messages') ||
      request.nextUrl.pathname.startsWith('/book')) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  // Redirecionar utilizadores autenticados da página de auth
  if (request.nextUrl.pathname.startsWith('/auth') && user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/messages/:path*', '/book/:path*', '/auth/:path*'],
}
```

### 9.2 Configuração do Supabase Client

`lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

`lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

### 9.3 API Routes

**`app/api/stripe/create-payment-intent/route.ts`:**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { serviceId, bookingDate, numPeople, specialRequests } = await request.json()

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    // Buscar serviço
    const { data: service } = await supabase
      .from('services')
      .select('*, guide:guides(*)')
      .eq('id', serviceId)
      .single()

    if (!service) return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 })

    const totalPrice = service.price * numPeople
    const commissionRate = 0.15
    const commissionAmount = totalPrice * commissionRate
    const guidePayoutAmount = totalPrice - commissionAmount

    // Criar PaymentIntent (não capturar ainda)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalPrice * 100), // em cêntimos
      currency: 'eur',
      capture_method: 'automatic',
      metadata: {
        serviceId,
        touristId: user.id,
        guideId: service.guide_id,
        bookingDate,
        numPeople: String(numPeople),
      },
    })

    // Criar booking na DB com status pending
    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        tourist_id: user.id,
        guide_id: service.guide_id,
        service_id: serviceId,
        booking_date: bookingDate,
        num_people: numPeople,
        total_price: totalPrice,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        guide_payout_amount: guidePayoutAmount,
        stripe_payment_intent_id: paymentIntent.id,
        payment_status: 'unpaid',
        special_requests: specialRequests,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      bookingId: booking.id,
    })
  } catch (err) {
    console.error('Stripe error:', err)
    return NextResponse.json({ error: 'Erro ao criar pagamento' }, { status: 500 })
  }
}
```

**`app/api/stripe/webhook/route.ts`:**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
// Usar service role para bypassing RLS no webhook
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return NextResponse.json({ error: 'Webhook inválido' }, { status: 400 })
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    await supabase
      .from('bookings')
      .update({
        payment_status: 'held',
        status: 'confirmed',
      })
      .eq('stripe_payment_intent_id', paymentIntent.id)

    // TODO: enviar email de confirmação via Resend
  }

  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    await supabase
      .from('bookings')
      .update({ payment_status: 'unpaid', status: 'cancelled' })
      .eq('stripe_payment_intent_id', paymentIntent.id)
  }

  return NextResponse.json({ received: true })
}

export const config = { api: { bodyParser: false } }
```

**`app/api/admin/approve-guide/route.ts`:**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const { guideId, action, reason } = await request.json()
  // action: 'approve' | 'reject'

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Acção inválida' }, { status: 400 })
  }

  const update = action === 'approve'
    ? { status: 'verified', license_verified: true, rejection_reason: null }
    : { status: 'rejected', rejection_reason: reason }

  const { error } = await supabase
    .from('guides')
    .update(update)
    .eq('id', guideId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // TODO: enviar email ao guia com resultado via Resend

  return NextResponse.json({ success: true })
}
```

### 9.4 Componente Mapa (Mapbox)

`components/guides/GuideMap.tsx`:

```typescript
'use client'
import Map, { Marker, Popup } from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useState } from 'react'
import type { Guide } from '@/types'
import { VerifiedBadge } from './VerifiedBadge'

interface GuideMapProps {
  guides: Guide[]
  onGuideSelect?: (guide: Guide) => void
}

export function GuideMap({ guides, onGuideSelect }: GuideMapProps) {
  const [selectedGuide, setSelectedGuide] = useState(null)

  return (
    
      {guides.map((guide) =>
        guide.location_lat && guide.location_lng ? (
           {
              e.originalEvent.stopPropagation()
              setSelectedGuide(guide)
            }}
          >
            


              {guide.user?.name?.charAt(0) ?? 'G'}
            


          
        ) : null
      )}

      {selectedGuide && selectedGuide.location_lat && selectedGuide.location_lng && (
         setSelectedGuide(null)}
          closeOnClick={false}
        >
          


            


              {selectedGuide.user?.name}
              {selectedGuide.license_verified && }
            


            

{selectedGuide.specialties?.slice(0, 2).join(' · ')}


            

€{selectedGuide.price_per_day}/dia


            
              Ver perfil →
            
          


        
      )}
    
  )
}
```

### 9.5 Badge de Guia Verificado

`components/guides/VerifiedBadge.tsx`:

```typescript
import { CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export function VerifiedBadge({ size = 'md', showLabel = true, className }: VerifiedBadgeProps) {
  const sizes = {
    sm: 'text-xs gap-0.5',
    md: 'text-sm gap-1',
    lg: 'text-base gap-1.5',
  }
  const iconSizes = { sm: 12, md: 14, lg: 18 }

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5',
        sizes[size],
        className
      )}
      title="Guia com licença verificada pela Direcção-Geral do Turismo e Hotelaria de STP"
    >
      <CheckCircle size={iconSizes[size]} className="text-emerald-500" />
      {showLabel && <span>Guia Verificado</span>}
    </span>
  )
}
```

### 9.6 Sistema de Mensagens em Tempo Real

`hooks/useMessages.ts`:

```typescript
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Message } from '@/types'

export function useMessages(bookingId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Carregar mensagens iniciais
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*, sender:users(id, name, avatar_url)')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true })
      setMessages(data ?? [])
      setLoading(false)
    }

    fetchMessages()

    // Subscrever a novas mensagens em tempo real
    const channel = supabase
      .channel(`messages:${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [bookingId])

  const sendMessage = async (content: string, senderId: string, receiverId: string) => {
    await supabase.from('messages').insert({
      booking_id: bookingId,
      sender_id: senderId,
      receiver_id: receiverId,
      content,
    })
  }

  return { messages, loading, sendMessage }
}
```

### 9.7 Emails Transaccionais (Resend)

`lib/resend.ts`:

```typescript
import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendBookingConfirmation({
  touristEmail,
  touristName,
  guideName,
  serviceTitle,
  bookingDate,
  totalPrice,
  bookingId,
}: {
  touristEmail: string
  touristName: string
  guideName: string
  serviceTitle: string
  bookingDate: string
  totalPrice: number
  bookingId: string
}) {
  await resend.emails.send({
    from: 'Rotas do Éden <noreply@rotasdoeden.st>',
    to: touristEmail,
    subject: `Reserva confirmada — ${serviceTitle}`,
    html: `
      


        

Reserva Confirmada! 🌿


        

Olá ${touristName},


        

A tua reserva com ${guideName} foi confirmada com sucesso.


        


          

Serviço: ${serviceTitle}


          

Data: ${new Date(bookingDate).toLocaleDateString('pt-PT')}


          

Total pago: €${totalPrice.toFixed(2)}


          

Nº de reserva: ${bookingId.slice(0, 8).toUpperCase()}


        


        

Podes contactar o teu guia directamente na plataforma.


        
          Ver a minha reserva
        
        


          Rotas do Éden — O teu marketplace de guias turísticos em São Tomé e Príncipe
        


      


    `,
  })
}
```

---

## 10. DESIGN E UI

### 10.1 Paleta de Cores

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primária — verde floresta tropical
        'eden-green': {
          DEFAULT: '#2D6A4F',
          50:  '#F0F7F4',
          100: '#D4EBE1',
          200: '#A9D7C3',
          300: '#74BEA0',
          400: '#4DA07E',
          500: '#2D6A4F',  // principal
          600: '#245640',
          700: '#1B4230',
          800: '#122D21',
          900: '#091911',
        },
        // Secundária — areia / dourado tropical
        'eden-sand': {
          DEFAULT: '#F4A261',
          50:  '#FEF6EF',
          100: '#FDEBD9',
          200: '#FAD4B0',
          300: '#F7B882',

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://rotasdoeden.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ee619e9b-54d6-45d0-8dc4-b4e5b3e37a80).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
