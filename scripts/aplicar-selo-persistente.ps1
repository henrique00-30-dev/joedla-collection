param(
  [string]$ProjectRoot = (Get-Location).Path
)

$ErrorActionPreference = 'Stop'

function Read-Text([string]$relative) {
  $path = Join-Path $ProjectRoot $relative
  if (-not (Test-Path $path)) {
    throw "Arquivo não encontrado: $relative"
  }
  return [System.IO.File]::ReadAllText($path)
}

function Write-Text([string]$relative, [string]$content) {
  $path = Join-Path $ProjectRoot $relative
  $directory = Split-Path $path -Parent
  New-Item -ItemType Directory -Force -Path $directory | Out-Null

  if (Test-Path $path) {
    $backup = "$path.bak-selo-visual-v2"
    if (-not (Test-Path $backup)) {
      Copy-Item $path $backup -Force
    }
  }

  [System.IO.File]::WriteAllText(
    $path,
    $content,
    [System.Text.UTF8Encoding]::new($false)
  )
}

function Replace-RegexRequired(
  [string]$content,
  [string]$pattern,
  [string]$replacement,
  [string]$description
) {
  $regex = [regex]::new(
    $pattern,
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )

  if (-not $regex.IsMatch($content)) {
    throw "Não foi possível aplicar: $description"
  }

  return $regex.Replace($content, $replacement, 1)
}

function Insert-BeforeRequired(
  [string]$content,
  [string]$marker,
  [string]$addition,
  [string]$description
) {
  if ($content.Contains($addition.Trim())) {
    return $content
  }

  $index = $content.IndexOf($marker)
  if ($index -lt 0) {
    throw "Não foi possível aplicar: $description"
  }

  return $content.Insert($index, $addition)
}

Write-Host "Aplicando persistência e selo responsivo (v2)..." -ForegroundColor Cyan

$packageRoot = Split-Path $PSScriptRoot -Parent

# Migration
$migrationSource = Join-Path $packageRoot 'supabase/migrations/202608060001_product_promotion_badge_visual.sql'
if (-not (Test-Path $migrationSource)) {
  throw "Migration não encontrada no pacote."
}
Write-Text 'supabase/migrations/202608060001_product_promotion_badge_visual.sql' (
  [System.IO.File]::ReadAllText($migrationSource)
)

# Componente compartilhado
$badgeSource = Join-Path $packageRoot 'marketing-badge.tsx'
if (-not (Test-Path $badgeSource)) {
  throw "Componente marketing-badge.tsx não encontrado no pacote."
}
Write-Text 'src/components/marketing-badge.tsx' (
  [System.IO.File]::ReadAllText($badgeSource)
)

# ------------------------------------------------------------------
# src/features/marketing/types.ts
# ------------------------------------------------------------------
$path = 'src/features/marketing/types.ts'
$c = Read-Text $path

if (-not $c.Contains("export type PromotionBadgePosition")) {
  $c = Replace-RegexRequired $c `
    "(export type CampaignBadgeTone\s*=\s*'wine'\s*\|\s*'caramel'\s*\|\s*'dark'\s*\|\s*'success'\s*\|\s*'attention';)" `
    "`$1`r`nexport type PromotionBadgePosition =`r`n  | 'top-left'`r`n  | 'top-right'`r`n  | 'bottom-left'`r`n  | 'bottom-right';`r`nexport type PromotionBadgeSize = 'small' | 'medium' | 'large';`r`nexport type PromotionBadgeShape = 'pill' | 'rounded' | 'square';" `
    'tipos visuais do selo'
}

if (-not $c.Contains("badgePosition: PromotionBadgePosition;")) {
  $c = Replace-RegexRequired $c `
    "(export type ProductPromotion\s*=\s*\{.*?badgeTone\s*:\s*CampaignBadgeTone;)" `
    "`$1`r`n  badgePosition: PromotionBadgePosition;`r`n  badgeSize: PromotionBadgeSize;`r`n  badgeShape: PromotionBadgeShape;" `
    'campos visuais em ProductPromotion'
}

Write-Text $path $c
Write-Host "OK: marketing/types.ts" -ForegroundColor Green

# ------------------------------------------------------------------
# src/types.ts
# ------------------------------------------------------------------
$path = 'src/types.ts'
$c = Read-Text $path

if (-not $c.Contains("position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';")) {
  $c = Replace-RegexRequired $c `
    "(marketingBadge\?\s*:\s*\{\s*label\s*:\s*string;\s*tone\s*:\s*'wine'\s*\|\s*'caramel'\s*\|\s*'dark'\s*\|\s*'success'\s*\|\s*'attention';)" `
    "`$1`r`n    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';`r`n    size: 'small' | 'medium' | 'large';`r`n    shape: 'pill' | 'rounded' | 'square';" `
    'marketingBadge responsivo no Product'
}

Write-Text $path $c
Write-Host "OK: src/types.ts" -ForegroundColor Green

# ------------------------------------------------------------------
# src/features/marketing/service.ts
# ------------------------------------------------------------------
$path = 'src/features/marketing/service.ts'
$c = Read-Text $path

if (-not $c.Contains("badge_position: input.badgePosition")) {
  $c = Replace-RegexRequired $c `
    "(badge_tone\s*:\s*input\.badgeTone\s*,)" `
    "`$1`r`n      badge_position: input.badgePosition,`r`n      badge_size: input.badgeSize,`r`n      badge_shape: input.badgeShape," `
    'payload visual do selo'
}

if (-not $c.Contains("badgePosition: row.badge_position")) {
  $c = Replace-RegexRequired $c `
    "(badgeTone\s*:\s*row\.badge_tone\s*,)" `
    "`$1`r`n    badgePosition: row.badge_position ?? 'top-left',`r`n    badgeSize: row.badge_size ?? 'medium',`r`n    badgeShape: row.badge_shape ?? 'pill'," `
    'mapeamento visual da promoção'
}

if (-not $c.Contains("export async function loadActiveProductPromotionVisuals")) {
  $loader = @"

export async function loadActiveProductPromotionVisuals() {
  const client = requireCloud();
  const { data, error } = await client
    .from('product_promotions')
    .select(
      'product_id,enabled,start_at,end_at,show_badge,badge_label,badge_tone,badge_position,badge_size,badge_shape',
    )
    .eq('enabled', true)
    .eq('show_badge', true);

  if (error) {
    if (isMissingMarketingSchema(error)) return [];
    throw error;
  }

  const now = Date.now();

  return ((data ?? []) as Record<string, any>[])
    .filter((row) => {
      const starts = row.start_at ? Date.parse(row.start_at) : null;
      const ends = row.end_at ? Date.parse(row.end_at) : null;
      return (starts === null || starts <= now) &&
        (ends === null || now <= ends);
    })
    .map((row) => ({
      productId: String(row.product_id),
      label: String(row.badge_label ?? 'Promoção'),
      tone: row.badge_tone ?? 'wine',
      position: row.badge_position ?? 'top-left',
      size: row.badge_size ?? 'medium',
      shape: row.badge_shape ?? 'pill',
    }));
}

"@
  $c = Insert-BeforeRequired $c `
    "export async function loadAdminProductPromotion" `
    $loader `
    'loader público dos visuais'
}

Write-Text $path $c
Write-Host "OK: marketing/service.ts" -ForegroundColor Green

# ------------------------------------------------------------------
# src/context/store-context.tsx
# ------------------------------------------------------------------
$path = 'src/context/store-context.tsx'
$c = Read-Text $path

if (-not $c.Contains("loadActiveProductPromotionVisuals")) {
  $c = Replace-RegexRequired $c `
    "import\s*\{\s*loadCatalogPriceResolutions\s*,\s*loadMarketingStorefront\s*\}\s*from\s*'@/src/features/marketing/service';" `
    "import {`r`n  loadActiveProductPromotionVisuals,`r`n  loadCatalogPriceResolutions,`r`n  loadMarketingStorefront,`r`n} from '@/src/features/marketing/service';" `
    'import do loader visual'
}

if (-not $c.Contains("const visualByProduct = new Map")) {
  $c = Replace-RegexRequired $c `
    "const priceResolutions = cloudMarketing\.settings\.pricingEnabled\s*\?\s*await loadCatalogPriceResolutions\(baseProducts\.map\(\(product\) => product\.id\)\)\s*:\s*\[\];\s*const priceByProduct = new Map\(priceResolutions\.map\(\(price\) => \[price\.productId, price\]\)\);" `
    "const [priceResolutions, individualVisuals] = await Promise.all([`r`n      cloudMarketing.settings.pricingEnabled`r`n        ? loadCatalogPriceResolutions(baseProducts.map((product) => product.id))`r`n        : Promise.resolve([]),`r`n      cloudMarketing.settings.pricingEnabled`r`n        ? loadActiveProductPromotionVisuals()`r`n        : Promise.resolve([]),`r`n    ]);`r`n    const priceByProduct = new Map(priceResolutions.map((price) => [price.productId, price]));`r`n    const visualByProduct = new Map(`r`n      individualVisuals.map((visual) => [visual.productId, visual]),`r`n    );" `
    'carregamento paralelo de preço e visual'
}

if (-not $c.Contains("const individualVisual = visualByProduct.get(product.id)")) {
  $c = Replace-RegexRequired $c `
    "const individualBadge = resolution\?\.individualBadgeLabel && resolution\.individualBadgeTone\s*\?\s*\{ label: resolution\.individualBadgeLabel, tone: resolution\.individualBadgeTone \}\s*:\s*null;\s*const badge = campaignBadge \?\? individualBadge;" `
    "const individualVisual = visualByProduct.get(product.id);`r`n      const individualBadge =`r`n        resolution?.individualBadgeLabel && resolution.individualBadgeTone`r`n          ? {`r`n              label: resolution.individualBadgeLabel,`r`n              tone: resolution.individualBadgeTone,`r`n              position: individualVisual?.position ?? 'top-left',`r`n              size: individualVisual?.size ?? 'medium',`r`n              shape: individualVisual?.shape ?? 'pill',`r`n            }`r`n          : null;`r`n      const badge = campaignBadge`r`n        ? {`r`n            label: campaignBadge.label,`r`n            tone: campaignBadge.tone,`r`n            position: 'top-left' as const,`r`n            size: 'medium' as const,`r`n            shape: 'pill' as const,`r`n          }`r`n        : individualBadge;" `
    'composição do selo individual e campanha'
}

$c = [regex]::Replace(
  $c,
  "marketingBadge:\s*badge\s*\?\s*\{\s*label:\s*badge\.label,\s*tone:\s*badge\.tone\s*\}\s*:\s*undefined,",
  "marketingBadge: badge ?? undefined,",
  [System.Text.RegularExpressions.RegexOptions]::Singleline
)

Write-Text $path $c
Write-Host "OK: store-context.tsx" -ForegroundColor Green

# ------------------------------------------------------------------
# src/components/product-card.tsx
# ------------------------------------------------------------------
$path = 'src/components/product-card.tsx'
$c = Read-Text $path

if (-not $c.Contains("import { MarketingBadge }")) {
  $c = Replace-RegexRequired $c `
    "(import\s+\{\s*ProductImage\s*\}\s+from\s+'@/src/components/product-image';)" `
    "import { MarketingBadge } from '@/src/components/marketing-badge';`r`n`$1" `
    'import do componente do selo'
}

$c = [regex]::Replace(
  $c,
  "\{product\.marketingBadge\s*\?\s*\(\s*<View\s+style=\{\[styles\.marketingBadge,\s*badgeToneStyles\[product\.marketingBadge\.tone\]\]\}>.*?</View>\s*\)\s*:\s*null\}",
  "{product.marketingBadge ? (`r`n          <MarketingBadge badge={product.marketingBadge} />`r`n        ) : null}",
  [System.Text.RegularExpressions.RegexOptions]::Singleline
)

$c = [regex]::Replace(
  $c,
  "\r?\nconst badgeToneStyles = StyleSheet\.create\(\{.*?\}\);\r?\n",
  "`r`n",
  [System.Text.RegularExpressions.RegexOptions]::Singleline
)

$c = [regex]::Replace(
  $c,
  "\r?\n  marketingBadge:\s*\{.*?\r?\n  \},\r?\n  marketingBadgeText:\s*\{.*?\r?\n  \},",
  "",
  [System.Text.RegularExpressions.RegexOptions]::Singleline
)

Write-Text $path $c
Write-Host "OK: product-card.tsx" -ForegroundColor Green

# ------------------------------------------------------------------
# app/product/[id].tsx
# ------------------------------------------------------------------
$path = 'app/product/[id].tsx'
$c = Read-Text $path

if (-not $c.Contains("import { MarketingBadge }")) {
  $c = Replace-RegexRequired $c `
    "(import\s+\{\s*ProductGrid\s*\}\s+from\s+'@/src/components/product-grid';)" `
    "import { MarketingBadge } from '@/src/components/marketing-badge';`r`n`$1" `
    'import do selo na página do produto'
}

if (-not $c.Contains("<View style={styles.mainImageWrap}>")) {
  $c = Replace-RegexRequired $c `
    "<ProductImage\s+uri=\{selectedImage\}\s+contentFit=\{currentProduct\.photoProvisional \|\| currentProduct\.photoQuality === 'reduced' \? 'contain' : 'cover'\}\s+style=\{styles\.image\}\s*/>" `
    "<View style={styles.mainImageWrap}>`r`n              <ProductImage`r`n                uri={selectedImage}`r`n                contentFit={currentProduct.photoProvisional || currentProduct.photoQuality === 'reduced' ? 'contain' : 'cover'}`r`n                style={styles.image}`r`n              />`r`n              {product.marketingBadge ? (`r`n                <MarketingBadge badge={product.marketingBadge} />`r`n              ) : null}`r`n            </View>" `
    'selo sobre a imagem principal'
}

$c = [regex]::Replace(
  $c,
  "\{product\.marketingBadge\s*\?\s*\(\s*<View\s+style=\{\[styles\.marketingBadge,\s*badgeToneStyles\[product\.marketingBadge\.tone\]\]\}>.*?</View>\s*\)\s*:\s*null\}",
  "",
  [System.Text.RegularExpressions.RegexOptions]::Singleline
)

$c = [regex]::Replace(
  $c,
  "\r?\nconst badgeToneStyles = StyleSheet\.create\(\{.*?\}\);\r?\n",
  "`r`n",
  [System.Text.RegularExpressions.RegexOptions]::Singleline
)

if (-not $c.Contains("mainImageWrap:")) {
  $c = Replace-RegexRequired $c `
    "(  image:\s*\{\s*width:\s*'100%',)" `
    "  mainImageWrap: {`r`n    position: 'relative',`r`n  },`r`n`$1" `
    'estilo do contêiner da imagem'
}

$c = [regex]::Replace(
  $c,
  "\r?\n  marketingBadge:\s*\{.*?\r?\n  \},\r?\n  marketingBadgeText:\s*\{.*?\r?\n  \},",
  "",
  [System.Text.RegularExpressions.RegexOptions]::Singleline
)

Write-Text $path $c
Write-Host "OK: app/product/[id].tsx" -ForegroundColor Green

# ------------------------------------------------------------------
# app/admin/promotion/[id].tsx
# ------------------------------------------------------------------
$path = 'app/admin/promotion/[id].tsx'
$c = Read-Text $path

if (-not $c.Contains("setBadgePosition(promotion.badgePosition)")) {
  $c = Replace-RegexRequired $c `
    "(setBadgeTone\(promotion\.badgeTone\);)" `
    "`$1`r`n        setBadgePosition(promotion.badgePosition);`r`n        setBadgeSize(promotion.badgeSize);`r`n        setBadgeShape(promotion.badgeShape);" `
    'carregamento visual no editor'
}

if (-not $c.Contains("badgePosition,") -or -not $c.Contains("badgeShape,")) {
  $c = Replace-RegexRequired $c `
    "(badgeTone\s*,\s*\r?\n\s*\}\);)" `
    "badgeTone,`r`n        badgePosition,`r`n        badgeSize,`r`n        badgeShape,`r`n      });" `
    'salvamento visual no editor'
}

Write-Text $path $c
Write-Host "OK: admin/promotion/[id].tsx" -ForegroundColor Green

Write-Host ""
Write-Host "Aplicação concluída." -ForegroundColor Green
Write-Host "Agora execute:" -ForegroundColor Yellow
Write-Host "  cmd /c npx tsc --noEmit"
Write-Host "Depois, se não houver erros:"
Write-Host "  npx supabase db push"
