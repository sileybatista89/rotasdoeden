

## Improve Legal Pages Typography & Readability

Update `src/pages/legal/LegalLayout.tsx` (used by all legal pages: Termos, Privacidade, Reservas, Antifraude, Comunidade, Guias, Parcerias) to enhance text size, spacing, and reading comfort while preserving the premium look.

### Changes

**1. Body text (paragraphs & list items)**
- Mobile: `text-base` (16px)
- Desktop: `text-[17px]` (17px)
- Line height: `leading-[1.7]` on the content wrapper

**2. Headings**
- Page title (h1): `text-3xl md:text-[32px]` → keep mobile feel, lock 32px desktop
- Section titles (h2): `text-xl md:text-[22px]` → 22px desktop
- Subsection (h3): bump from `text-base` to `text-lg` (18px) for better hierarchy

**3. Spacing**
- Paragraph gap: `space-y-4` → `space-y-5` inside each section
- Section gap: `space-y-10` → `space-y-12` between sections
- List item spacing: `space-y-1.5` → `space-y-2.5`
- Content container: add `lg:pl-2` and widen `max-w-3xl` → `max-w-[720px]` for optimal line length (~70 chars)
- Heading bottom margin: `mb-4 pb-2` → `mb-5 pb-3`

**4. Intro paragraph (hero)**
- Bump from `text-sm md:text-base` → `text-base md:text-lg` with `leading-relaxed`

**5. Sidebar TOC links**
- Slight bump from `text-xs` → `text-[13px]` for legibility

**6. Contact footer block**
- `text-sm` → `text-base` with more padding (`p-5` → `p-6`)

### Files Modified
- `src/pages/legal/LegalLayout.tsx` (single file — applies to all 7 legal pages)

### Out of Scope
- No color, font-family, or layout structure changes
- No changes to legal content data
- No changes to Navbar/Footer

