# Genesis Core 111-Product Catalog Workflow

This workflow converts your raw supplier product list into:

- branded product names
- suggested retail pricing
- website-ready product data
- Canva-ready PDP copy rows

## 1) What input is needed

Populate `catalog/product-intake-template.csv` with all products (about 111 rows).

Required columns:

- `source_sku`
- `source_name`
- `form`
- `functional_area`
- `category`
- `servings`
- `cost_usd`
- `active_ingredients`
- `primary_benefits`
- `usage`
- `cautions`
- `image_file`

## 2) Run generator

If you have the catalog in raw numbered text format, convert it first:

```bash
node scripts/import-raw-catalog.js catalog/raw-product-catalog.txt catalog/full-product-intake.csv
```

Then generate branded catalog outputs:

```bash
node scripts/build-catalog.js catalog/full-product-intake.csv
```

## 3) Generated outputs

- `catalog/generated-products.json`
: canonical generated product data
- `catalog/generated-products.js`
: browser-ready JS dataset (`window.GENESIS_IMPORTED_PRODUCTS`)
- `catalog/canva-product-pages.csv`
: one row per product with structured PDP copy fields for Canva bulk import
- `catalog/review-queue.csv`
: products needing manual review (missing data, low-confidence fields)

## 4) Manual review checklist

- verify branded names (clinical + premium)
- verify functional category mapping
- validate suggested prices vs margin goals
- ensure ingredient claims are compliant
- confirm image file names

## 5) After you approve

- apply generated products to website dataset:

```bash
node scripts/apply-generated-products.js
```

- this keeps `window.GENESIS_BUNDLES` and replaces `window.GENESIS_PRODUCTS`
- connect real product photos
- produce final PDP content pass per product
