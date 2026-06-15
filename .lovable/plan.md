## Objetivo
Corrigir apenas imagens problemáticas + acentuar a paleta com um verde-tropical vivo. Sem tocar em fluxos, painel, rotas ou lógica de negócio.

## 1. Hero Carousel (`src/components/home/HeroCarousel.tsx`)
Aprimorar qualidade/autenticidade das 7 fotos:

- **Slide 2 — Ilhéu vulcânico**: gerar nova imagem realista, alta resolução, do Pico Cão Grande (a icónica agulha vulcânica) — model `premium` 1920×1080.
- **Slide 3 — Baía de Santana**: gerar nova foto costeira leste de São Tomé com palmeiras + areia preta vulcânica, alta resolução.
- **Slide 4 — Praia aérea Príncipe**: substituir por imagem aérea autêntica de Praia Banana/Bom Bom, alta resolução.
- **Slide 5 — Praia Banana**: substituir pela versão de maior qualidade (mesma cena, melhor nitidez).
- **Slide 6 — Lagoa Azul (penúltima)**: substituir por foto de maior qualidade do baobá + enseada azul-turquesa.
- Slides 1 e 7 (Praia escondida Príncipe + Ilhéu das Rolas): manter, mas verificar resolução; só substituir se notavelmente granulados.

Todas as novas imagens via `imagegen--generate_image` (premium), 1920×1080, salvas em `src/assets/real/` como `.jpg.asset.json` via `lovable-assets`. Atualizar imports no `HeroCarousel.tsx` mantendo a estrutura atual (lazy/active+next).

## 2. Cards "Descobre São Tomé e Príncipe" (`src/components/home/DescobreStpSection.tsx`)
Corrigir as 4 imagens erradas/baixa qualidade:

- **Pico Cão Grande**: gerar foto fiel da agulha vulcânica emergindo da selva (não usar a atual de "Ilhas Tinhosas").
- **Roças Históricas**: substituir o Clube Santana atual por imagem real de roça histórica (Roça Água Izé/Sundy/Agostinho Neto) — arquitetura colonial em ruína romântica.
- **Praia (Sul)**: gerar versão de alta qualidade de Praia Jalé/Inhame (costa sul).
- **Card "Guia uniformizado"** (em `UniformeSection.tsx` ou similar): gerar/aprimorar foto nítida de guia local com a camisola Rotas do Éden.

## 3. Paleta — verde tropical accent
Em `src/index.css` e `tailwind.config.ts`:
- Adicionar token `--eden-tropical: 152 60% 42%` (verde mais vivo, vibrante).
- Adicionar `--eden-tropical-glow` para gradientes/hover.
- **Não alterar** `--primary` (eden-green continua igual). O accent vivo é aplicado em: CTAs principais (hover state), badges "Verificado", ícones de destaque e gradientes do Hero overlay.
- Atualizar `bg-gradient-primary` / `bg-gradient-hero` para incorporar o tropical sem destruir identidade.

## 4. Performance — garantir que não trava
- Confirmar `loading="lazy"` + `decoding="async"` em todas as `<img>` fora do Hero.
- Hero slide 1: `fetchpriority="high"` e `loading="eager"`; restantes do carrossel: lazy.
- Imagens novas geradas em JPEG (não PNG) para manter peso baixo.

## Fora de scope (confirmado pelo utilizador)
- Painel/dashboard do guia — NÃO mexer agora.
- Funcionalidades de reservas, mensagens, KYC, perfis — não tocar.
- Dados fictícios — não adicionar.

## Resultado
Site visualmente mais autêntico (fotos corretas de STP), verde mais vivo nos destaques, mesma velocidade ou melhor, zero alterações de comportamento.
