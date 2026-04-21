
# Plano — Remover guias fictícios e tornar a plataforma 100% credível

Vou eliminar todos os perfis, serviços e reviews mock e substituir por estados profissionais "em adesão", com foco claro em recrutar guias reais e mostrar credibilidade a investidores.

## 1. Remover dados fictícios

**Apagar / esvaziar:**
- `src/data/mockGuides.ts` — 6 guias inventados (Carlos, João, Ana, Pedro, Maria, Tomás)
- `src/data/mockServices.ts` — tours associados
- `src/data/mockReviews.ts` — avaliações falsas
- `src/data/guidePhotos.ts` — fotos AI/stock dos guias
- Imagens em `src/assets/guide-*.jpg` (deixam de ser referenciadas)

`src/data/mockData.ts` passa a exportar arrays vazios para não partir importações enquanto migramos.

## 2. Página inicial (`/`)

Substituir `FeaturedGuides` por nova secção **`GuidesComingSoon`**:
- Headline: "Estamos a selecionar os primeiros guias locais verificados"
- Subtexto sobre processo de verificação manual
- 3 cards de confiança: "Verificação manual", "Licença DGTH validada", "Experiências autênticas"
- CTA primário: **"Tornar-me Guia Parceiro"** → `/auth?mode=signup&role=guide`
- CTA secundário: "Saber mais" → `/seja-parceiro`

`StatsSection` — remover qualquer número que dependa de guias fictícios; manter apenas dados verificáveis (52.000+ visitantes STP 2025, ilhas, património UNESCO).

`GuideCTA` mantém-se mas com copy reforçada.

## 3. Página `/guides`

Reorganizar completamente. Deixa de ser directório com filtros vazios. Passa a ser **landing de recrutamento + transparência**:

- Hero: "Os primeiros guias parceiros estão em adesão"
- Bloco "Porquê esperamos por guias verificados" — 4 pilares (verificação manual de licença, KYC documental, entrevista, monitorização contínua)
- Bloco "Benefícios para guias parceiros" — visibilidade, reservas com pagamento seguro, suporte, sem captação externa
- Bloco "Processo de candidatura" — 4 passos (registo → KYC → entrevista → activação)
- Bloco "Comissões transparentes" — sem percentagem fixa pública, texto explicando que é comunicada antes da adesão (alinhado com a Política de Comissões já publicada)
- CTA final: "Tornar-me Guia Parceiro"
- Quando houver guias verificados reais no backend, esta página mostra-os automaticamente acima dos blocos informativos (query a `profiles` com role guide e `kyc_status = verified`)

## 4. Nova página `/seja-parceiro`

Landing dedicada para guias, ligada a partir do rodapé ("Seja Parceiro" já existe lá). Conteúdo focado em conversão:
- Proposta de valor
- O que precisas para te candidatares (licença DGTH, documento de identificação, foto profissional)
- FAQ curta
- CTA de registo

## 5. Perfil individual de guia (`/guides/:id`)

- Já não existem guias mock para abrir, portanto a página passa a mostrar estado "Perfil não disponível" com CTA para voltar a `/guides`
- Quando existirem guias reais no backend, a página é alimentada por esses dados
- Remove referências a `mockGuides`, `mockReviews`, `mockServices`

## 6. Booking (`/book/:serviceId`)

- Sem serviços mock, a página mostra estado "Reservas estarão disponíveis assim que os primeiros guias parceiros forem activados"
- Mantém estrutura para quando houver dados reais

## 7. Admin

- `AdminPage` dashboard: KPIs de "reviews" mock removidos; manter apenas contadores reais (guias registados, reservas, KYC pendente — já vêm do backend)
- Secção "Reviews" do admin: deixa de mostrar lista mock; passa a empty state "Sem avaliações ainda — aparecerão aqui após as primeiras reservas concluídas"
- Tabelas de guias/reservas continuam ligadas ao backend real

## 8. Reforço de confiança (transversal)

Adicionar selos/copy em pontos-chave:
- Navbar: pequeno indicador "Plataforma em verificação activa"? — **não**, evita parecer beta. Em vez disso, manter visual premium.
- Footer: já tem secção "Confiança" — adicionar linha "Guias verificados manualmente · Plataforma segura · Experiências locais autênticas"
- Página inicial: bloco de confiança com 3 ícones (shield, check, users)

## 9. Linguagem

Português europeu, tom profissional, sem promessas exageradas. Frases-chave aprovadas:
- "Guias verificados manualmente"
- "Estamos a selecionar os primeiros guias locais verificados"
- "Novos parceiros em adesão"
- "Experiências locais autênticas"

## 10. Ficheiros

**Novos (3):**
- `src/components/home/GuidesComingSoon.tsx`
- `src/pages/SejaParceiroPage.tsx`
- `src/components/home/TrustBlock.tsx`

**Editados (10):**
- `src/data/mockGuides.ts` → array vazio
- `src/data/mockServices.ts` → array vazio
- `src/data/mockReviews.ts` → array vazio
- `src/data/guidePhotos.ts` → mapa vazio
- `src/pages/Index.tsx` → trocar `FeaturedGuides` por `GuidesComingSoon` + `TrustBlock`
- `src/pages/GuidesPage.tsx` → reescrever como landing de recrutamento (mostra guias reais quando existirem)
- `src/pages/GuideProfilePage.tsx` → empty state quando não há guia real
- `src/pages/BookingPage.tsx` → empty state quando não há serviço real
- `src/pages/AdminPage.tsx` → remover lista mock de reviews
- `src/App.tsx` → rota `/seja-parceiro`
- `src/components/layout/Footer.tsx` → linha de confiança + link "Seja Parceiro" aponta para nova página

**Apagados (efectivamente):**
- `src/components/home/FeaturedGuides.tsx` (deixa de ser usado; removo o ficheiro)
- Imports a `mockGuides` em todo o lado

## Resultado esperado

- Zero guias fictícios visíveis em qualquer página pública
- Mensagem clara e profissional sobre processo de adesão
- CTAs fortes para captar guias reais
- Investidores vêem uma plataforma transparente e séria, não preenchida com personagens inventados
- Quando os primeiros guias verificados forem aprovados no admin, aparecem automaticamente em `/` e `/guides` sem mais alterações de código
