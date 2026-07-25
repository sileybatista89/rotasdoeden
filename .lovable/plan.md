## Objetivo
Elevar a camada visual de "gerado por IA" para "agência premium de turismo", mantendo 100% da arquitetura, rotas, dados, auth, reservas, chat, dashboard e lógica de negócio intactos. Só CSS, componentes de apresentação, imagens e copy mudam.

## 1. Imagens autênticas (prioridade máxima)
Substituir imagens com aspeto de IA pelas 6 fotos reais enviadas pelo utilizador:

- `IMG_3232.jpeg` → Pico Cão Grande (montanha na neblina + pescador em canoa) — substitui `pico-cao-grande-real.jpg` no HeroCarousel e em DescobreStpSection.
- `IMG_3231.jpeg` → Lagoa Azul (baobás + enseada turquesa + farol) — substitui `lagoa-azul-hd.jpg` no Hero.
- `IMG_3229.jpeg` → Bom Bom / Príncipe (passadiço de madeira sobre praia) — substitui `principe-aerial-hd.jpg` no Hero.
- `IMG_3235.jpeg` → Praia com rochas vulcânicas e água turquesa (aérea) — substitui slide "praia escondida Príncipe" no Hero.
- `IMG_3234.jpeg` → Santana (aérea vila costeira) — substitui `santana-coast.jpg` no Hero.
- `IMG_3230.jpeg` → Praia "Deixem-me aqui" (palmeiras + areia + turquesa) — substitui `praia-sul-hd.jpg` em DescobreStpSection e `praia-banana-hd.jpg` no Hero.

Upload via `lovable-assets` a partir de `/mnt/user-uploads/`, criando `.asset.json` em `src/assets/real/`. Manter imports existentes (só troca de URL) — zero mudança estrutural.

Também: auditar `SustentabilidadeSection` (usa `estrada-norte.webp` como floresta) e cards restantes de DescobreStp (`calulu`, `cacau`) — se parecerem IA, marcar para substituição futura mas NÃO gerar novas via IA neste passo (contradiz o pedido do utilizador).

## 2. Remover "delatores de IA" na UI

**TrustBlock (`src/components/home/TrustBlock.tsx`)**: remover numeração decorativa `01/02/03` — substituir por ícones outline consistentes (ShieldCheck, BadgeCheck, MapPin) da família lucide já em uso.

**Glassmorphism / glows / gradientes agressivos**: reduzir em:
- `HeroCarousel` — overlay radial verde tropical suavizado (opacidade 0.35 → 0.18).
- Badges "Verificado", cards com `backdrop-blur` — reduzir blur e ring opacity.
- `--eden-tropical-glow` — dessaturar levemente para evitar aspeto neon.

**Sombras**: unificar para elevação subtil (`shadow-sm` / `shadow-md`) em vez de `shadow-2xl` difuso nos cards de Descobre, Parceiros, Sustentabilidade.

## 3. Cards — padrão Airbnb Experiences

Em `DescobreStpSection`, `ParceirosCarousel`, `GuidesComingSoon`:
- Aspect ratio consistente (`aspect-[4/5]` ou `4/3`, escolher um e aplicar).
- Título forte + descrição curta, sem eyebrow decorativo em cada card.
- Hover: leve zoom da imagem + subida de 2-4px, sem borda colorida a piscar.
- Border-radius uniforme (`rounded-2xl` em todos, sem misturar com `rounded-3xl`).

## 4. Tipografia e hierarquia

Manter Playfair Display + Source Sans 3. Ajustar em `index.css` / componentes:
- Section eyebrows: uppercase, tracking-widest, tamanho reduzido, opacity 0.7.
- H2 de secção: tamanhos mais controlados (`text-3xl md:text-4xl`, não maiores).
- Leading corpo: `leading-relaxed` consistente (1.7).
- Reduzir peso de `font-bold` para `font-semibold` em títulos de card (menos "AI-marketing").

## 5. Copy — tom humano

Rever `src/i18n/translations.ts` (PT primeiro, depois espelhar em outros idiomas apenas nas chaves alteradas):
- Remover superlativos genéricos ("o arquipélago mais bonito de África", "aventura garantida", "paraíso escondido").
- Manter factos: 42 000+ visitantes, 18 dias, licença DGTH, UNESCO 2012, taxa turística €20-30.
- Tom: direto, primeira mão, sem exclamações. Ex: "Duas ilhas no Golfo da Guiné. Floresta primária, praias vazias, roças coloniais em ruína." em vez de "Descobre o paraíso tropical mais autêntico!".

Secções revistas: Hero, StatsSection, DescobreStp (6 cards), Sustentabilidade (4 pilares), Uniforme, HowItWorks, TrustBlock, GuideCTA.

## 6. Paleta — dessaturar

Em `src/index.css`:
- `--eden-tropical`: 152 60% 42% → 152 42% 38% (menos neon).
- `--eden-tropical-glow`: reduzir luminosidade.
- Gradientes hero: substituir radial tropical por overlay preto sutil + vinheta leve, mais editorial.

Primary (`eden-green` #2D6A4F) e sand (#F4A261) mantêm-se.

## 7. Microinterações

- Transições: `duration-300` uniforme (não misturar 200/500/700).
- Botões: hover translate-y-[-1px] + brightness leve, sem ring colorido.
- Loading states: skeletons cinza-claro, sem shimmer arco-íris.

## 8. Mobile / performance

- Confirmar `loading="lazy"` + `decoding="async"` em todas as `<img>` fora do primeiro slide do Hero.
- Reduzir densidade de blur/backdrop-filter em mobile (`md:backdrop-blur-sm` em vez de sempre).
- Padding secções mobile: `py-12` → `py-16` uniforme para respiração.

## Fora de scope (não tocar)
- Routing, App.tsx, hooks, providers, Supabase, edge functions, tipos, RLS.
- Painel admin, dashboard de guia, chat, reservas, checkout.
- Logo, nome da marca, família tipográfica.
- Geração de novas imagens IA (utilizador rejeitou explicitamente).

## Detalhes técnicos
Ficheiros afetados (apresentação apenas):
- `src/assets/real/*.asset.json` (novos pointers para as 6 fotos)
- `src/components/home/HeroCarousel.tsx` (só imports)
- `src/components/home/DescobreStpSection.tsx` (só imports + classes)
- `src/components/home/TrustBlock.tsx` (remover numeração, uniformizar ícones)
- `src/components/home/SustentabilidadeSection.tsx` (sombras/blur)
- `src/components/home/StatsSection.tsx`, `HowItWorks.tsx`, `GuideCTA.tsx`, `UniformeSection.tsx`, `ParceirosCarousel.tsx`, `GuidesComingSoon.tsx` (polish visual + copy)
- `src/i18n/translations.ts` (reescrita de copy, todas as línguas nas chaves tocadas)
- `src/index.css` + `tailwind.config.ts` (tokens dessaturados, sombras)

## Resultado
Mesmo site, mesmas funcionalidades, mesma estrutura — mas com fotografia real de STP, copy mais humano, UI sem tics de IA (numeração decorativa, glassmorphism, glows, sombras difusas) e hierarquia visual afinada ao padrão Airbnb Experiences / GetYourGuide.
