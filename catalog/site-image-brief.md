# Genesis Core Image Requirements

## 1) Mandatory brand assets
- `assets/logo-dark.svg` (already provided)
- `assets/logo-light.svg` (already provided)
- `assets/favicon.svg` (and PNG fallback)
- `assets/og-cover.jpg` (Open Graph share image, 1200x630)

## 2) Catalog product images (111 products)
Full per-product list is in `catalog/image-requirements.csv`.

Required per product (4 files each):
1. `primary.avif` (front packshot)
2. `lifestyle.avif` (context shot)
3. `supplement-facts.avif` (facts panel, readable)
4. `label-closeup.avif` (ingredient/quality close detail)

Total product files needed: `444` images.

## 3) Collection / category hero imagery
- `assets/collections/foundational-hero.avif`
- `assets/collections/focus-hero.avif`
- `assets/collections/recovery-hero.avif`
- `assets/collections/performance-hero.avif`
- `assets/collections/energy-hero.avif`
- `assets/collections/immunity-hero.avif`
- `assets/collections/sleep-hero.avif`

## 4) Trust + quality visuals
- `assets/quality/lab-environment.avif`
- `assets/quality/testing-workflow.avif`
- `assets/quality/coa-sample.avif`
- `assets/quality/traceability-detail.avif`

## 5) Brand story visuals
- `assets/about/joe-hart-portrait.avif`
- `assets/about/founder-workspace.avif`
- `assets/about/brand-detail.avif`

## 6) Optional conversion boosters
- `assets/home/hero-premium.avif`
- `assets/home/cta-background.avif`
- `assets/science/data-visual.avif`

## 7) Technical delivery spec
- Preferred: `AVIF` with fallback `WEBP` for key assets.
- Product primary image target: 1200x1200.
- Lifestyle target: 1600x1200.
- Supplement facts target: 1500x2000 (high readability).
- Label closeup target: 1200x1200.
- Use neutral background, consistent lighting, no hard shadows.

## 8) AI generation prompts (non-product)
- Prompt pack file: `catalog/ai-image-prompts.md`
- Scope: Home, Science, Quality, About, Contact, Quiz, Logistics, B2B, OG cover, and policy/support visuals.
