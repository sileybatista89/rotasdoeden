

# Plano de Implementação — Rotas do Éden (Prompts 1-4)

## Estado Actual

O projecto já tem implementado:
- Homepage com hero, stats, guias em destaque, como funciona, CTA
- Página `/guides` com grid de 6 guias e filtros
- Página `/guides/:id` com perfil completo (bio, serviços, reviews, sidebar)
- Página `/book/:serviceId` com fluxo de 3 steps (detalhes, resumo, confirmação) — sem pagamento real
- Fotos geradas para hero e guias
- Mock data com 6 guias, 6 serviços e 6 reviews
- Design system com cores eden-green/eden-sand, fontes Playfair Display/Source Sans 3

## O Que Falta dos Prompts

### Prompt 1 (Perfil do Guia) — ~80% feito
Falta enriquecer:
- Expandir mock data com os dados detalhados dos 6 guias (bios completos, 3 serviços por guia = 18 serviços, 4 reviews por guia = 24 reviews)
- Sidebar de reserva rápida com dropdown de serviços, selector de pessoas e cálculo de preço
- Secção de documentação/licença com card estilizado
- Rating breakdown (barras de progresso por estrela)
- Placeholder de mapa na página de perfil
- Modal de contacto ao guia
- Chips de próximas datas disponíveis

### Prompt 2 (Autenticação) — Requer Lovable Cloud
- Registo multi-step (Turista vs Guia)
- Login com Supabase Auth
- Navbar com estado de autenticação (dropdown com opções por role)
- Protecção de rotas
- Reset de password

### Prompt 3 (Mapa Mapbox) — Requer token Mapbox
- Componente MapView reutilizável
- Toggle lista/mapa na página `/guides`
- Nova secção de mapa na homepage
- Custom markers com fotos e preços
- Popups interactivos

### Prompt 4 (Reserva com Stripe) — Requer Lovable Cloud + Stripe
- Integração Stripe Elements no Step 2
- API route para criar PaymentIntent
- Webhook para confirmar pagamento
- Escrow (capture manual)

## Plano de Implementação

Dado que o projecto é um frontend React/Vite (sem backend), vou focar no que pode ser feito agora sem dependências externas, e identificar o que requer activação de serviços.

### Fase 1 — Enriquecer dados e UI (sem dependências)

**1. Expandir mock data** (mockData.ts)
- 18 serviços (3 por guia) com dados detalhados do Prompt 1/4
- 24 reviews (4 por guia) com dados internacionais do Prompt 1
- Actualizar IDs dos guias para slugs descritivos (carlos-espirito-santo, etc.) ou manter os actuais com dados enriquecidos

**2. Melhorar GuideProfilePage**
- Sidebar de reserva rápida: dropdown de serviços, date picker, selector de pessoas, cálculo de preço em tempo real, taxa de serviço
- Card de licença verificada com estilização premium
- Rating breakdown com barras de progresso
- Chips de próximas datas disponíveis
- Modal de contacto (UI only)
- Placeholder de mapa

**3. Melhorar BookingPage**
- Actualizar para funcionar com os 18 serviços
- Placeholder para Stripe no Step 2 (UI do formulário de cartão sem integração real)

### Fase 2 — Autenticação (requer Lovable Cloud)

**4. Activar Lovable Cloud** para ter Supabase
- Criar tabela de profiles e user_roles
- Implementar registo multi-step (Turista/Guia)
- Login page
- Navbar com estado de autenticação e dropdown por role
- Reset de password

### Fase 3 — Mapa e Pagamentos (requer tokens/keys)

**5. Mapa Mapbox** — requer MAPBOX_TOKEN
- Componente MapView
- Toggle lista/mapa em `/guides`
- Secção de mapa na homepage

**6. Stripe** — requer activação de pagamentos
- Integração Stripe Elements
- Webhooks e PaymentIntent

## Recomendação

Sugiro começar pela **Fase 1** (enriquecer dados e melhorar UI), que pode ser feita imediatamente sem dependências externas. Depois, activar Lovable Cloud para a Fase 2 (autenticação), e por fim configurar Mapbox e Stripe para a Fase 3.

Queres que avance com a Fase 1?

