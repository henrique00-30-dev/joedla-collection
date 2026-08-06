import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ProductImage } from '@/src/components/product-image';
import { colors, radii, shadow, spacing } from '@/src/theme';
import { formatCurrency } from '@/src/utils/format';

export type PromotionPreviewMode = 'home' | 'product' | 'cart';
export type PromotionBadgePosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';
export type PromotionBadgeSize = 'small' | 'medium' | 'large';
export type PromotionBadgeShape = 'pill' | 'rounded' | 'square';

type PromotionPreviewProps = {
  mode: PromotionPreviewMode;
  onChangeMode: (mode: PromotionPreviewMode) => void;
  productName: string;
  imageUri: string;
  originalPrice: number;
  promotionalPrice: number;
  discountPercentage: number;
  showBadge: boolean;
  badgeLabel: string;
  badgeColor: string;
  badgePosition: PromotionBadgePosition;
  badgeSize: PromotionBadgeSize;
  badgeShape: PromotionBadgeShape;
  enabled: boolean;
};

export function PromotionPreview({
  mode,
  onChangeMode,
  productName,
  imageUri,
  originalPrice,
  promotionalPrice,
  discountPercentage,
  showBadge,
  badgeLabel,
  badgeColor,
  badgePosition,
  badgeSize,
  badgeShape,
  enabled,
}: PromotionPreviewProps) {
  const previewProps = {
    productName,
    imageUri,
    originalPrice,
    promotionalPrice,
    discountPercentage,
    showBadge,
    badgeLabel,
    badgeColor,
    badgePosition,
    badgeSize,
    badgeShape,
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Pré-visualização</Text>
          <Text style={styles.subtitle}>
            Representação da promoção nos principais pontos da loja.
          </Text>
        </View>

        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Ao vivo</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        <PreviewTab
          icon="home-outline"
          label="Home"
          active={mode === 'home'}
          onPress={() => onChangeMode('home')}
        />
        <PreviewTab
          icon="bag-handle-outline"
          label="Produto"
          active={mode === 'product'}
          onPress={() => onChangeMode('product')}
        />
        <PreviewTab
          icon="cart-outline"
          label="Carrinho"
          active={mode === 'cart'}
          onPress={() => onChangeMode('cart')}
        />
      </View>

      <View style={styles.canvas}>
        {mode === 'home' ? <HomePreview {...previewProps} /> : null}
        {mode === 'product' ? <ProductPreview {...previewProps} /> : null}
        {mode === 'cart' ? <CartPreview {...previewProps} /> : null}
      </View>

      <View style={styles.summary}>
        <SummaryRow
          label="Visualização"
          value={
            mode === 'home'
              ? 'Home'
              : mode === 'product'
                ? 'Produto'
                : 'Carrinho'
          }
        />
        <SummaryRow label="Produto" value={productName || 'Não selecionado'} />
        <SummaryRow
          label="Preço"
          value={
            promotionalPrice > 0
              ? formatCurrency(promotionalPrice)
              : '—'
          }
        />
        <SummaryRow
          label="Selo"
          value={showBadge ? badgeLabel || 'Sem texto' : 'Desativado'}
        />
        <SummaryRow label="Status" value={enabled ? 'Ativa' : 'Inativa'} />
      </View>
    </View>
  );
}

type BasePreviewProps = Omit<
  PromotionPreviewProps,
  'mode' | 'onChangeMode' | 'enabled'
>;

function HomePreview({
  productName,
  imageUri,
  originalPrice,
  promotionalPrice,
  discountPercentage,
  showBadge,
  badgeLabel,
  badgeColor,
  badgePosition,
  badgeSize,
  badgeShape,
}: BasePreviewProps) {
  return (
    <View style={styles.homeCard}>
      <View style={styles.imageWrap}>
        <ProductImage
          uri={imageUri}
          contentFit="cover"
          style={styles.homeImage}
        />

        <View style={styles.favorite}>
          <Ionicons name="heart-outline" size={21} color={colors.text} />
        </View>

        <View style={styles.availability}>
          <Text style={styles.availabilityText}>Pronta entrega</Text>
        </View>

        <PromotionBadge
          show={showBadge}
          label={badgeLabel}
          color={badgeColor}
          position={badgePosition}
          size={badgeSize}
          shape={badgeShape}
        />
      </View>

      <View style={styles.homeContent}>
        <Text numberOfLines={2} style={styles.homeName}>
          {productName}
        </Text>

        <PriceRow
          originalPrice={originalPrice}
          promotionalPrice={promotionalPrice}
        />

        {discountPercentage > 0 ? (
          <Text style={styles.economy}>
            Economia de {discountPercentage}%
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function ProductPreview({
  productName,
  imageUri,
  originalPrice,
  promotionalPrice,
  discountPercentage,
  showBadge,
  badgeLabel,
  badgeColor,
  badgePosition,
  badgeSize,
  badgeShape,
}: BasePreviewProps) {
  return (
    <View style={styles.productCard}>
      <View style={styles.productImageWrap}>
        <ProductImage
          uri={imageUri}
          contentFit="cover"
          style={styles.productImage}
        />

        <PromotionBadge
          show={showBadge}
          label={badgeLabel}
          color={badgeColor}
          position={badgePosition}
          size={badgeSize}
          shape={badgeShape}
        />
      </View>

      <View style={styles.productContent}>
        <Text style={styles.productEyebrow}>PRONTA ENTREGA</Text>

        <Text numberOfLines={2} style={styles.productName}>
          {productName}
        </Text>

        <PriceRow
          originalPrice={originalPrice}
          promotionalPrice={promotionalPrice}
          large
        />

        {discountPercentage > 0 ? (
          <View style={styles.savingRow}>
            <Ionicons
              name="trending-down-outline"
              size={15}
              color={colors.success}
            />
            <Text style={styles.savingText}>
              Você economiza {discountPercentage}%
            </Text>
          </View>
        ) : null}

        <View style={styles.optionBlock}>
          <Text style={styles.optionLabel}>Tamanho</Text>
          <View style={styles.optionButton}>
            <Text style={styles.optionButtonText}>Único</Text>
          </View>
        </View>

        <View style={styles.buyButton}>
          <Ionicons
            name="bag-add-outline"
            size={17}
            color={colors.white}
          />
          <Text style={styles.buyButtonText}>Adicionar ao carrinho</Text>
        </View>
      </View>
    </View>
  );
}

function CartPreview({
  productName,
  imageUri,
  originalPrice,
  promotionalPrice,
  discountPercentage,
  showBadge,
  badgeLabel,
  badgeColor,
  badgePosition,
  badgeSize,
  badgeShape,
}: BasePreviewProps) {
  return (
    <View style={styles.cartCard}>
      <View style={styles.cartHeader}>
        <Ionicons name="cart-outline" size={20} color={colors.primary} />
        <Text style={styles.cartTitle}>Seu carrinho</Text>
        <View style={styles.cartCount}>
          <Text style={styles.cartCountText}>1</Text>
        </View>
      </View>

      <View style={styles.cartItem}>
        <ProductImage
          uri={imageUri}
          contentFit="cover"
          style={styles.cartImage}
        />

        <View style={styles.cartCopy}>
          <Text numberOfLines={2} style={styles.cartName}>
            {productName}
          </Text>

          <PromotionBadge
            show={showBadge}
            label={badgeLabel}
            color={badgeColor}
            position={badgePosition}
            size={badgeSize}
            shape={badgeShape}
            inline
          />

          <PriceRow
            originalPrice={originalPrice}
            promotionalPrice={promotionalPrice}
          />

          {discountPercentage > 0 ? (
            <Text style={styles.cartEconomy}>
              Economia de {discountPercentage}%
            </Text>
          ) : null}
        </View>

        <View style={styles.quantityBox}>
          <Text style={styles.quantityText}>1</Text>
        </View>
      </View>

      <View style={styles.cartTotal}>
        <Text style={styles.cartTotalLabel}>Total</Text>
        <Text style={styles.cartTotalValue}>
          {formatCurrency(promotionalPrice)}
        </Text>
      </View>

      <View style={styles.checkoutButton}>
        <Text style={styles.checkoutButtonText}>Finalizar compra</Text>
      </View>
    </View>
  );
}

function PromotionBadge({
  show,
  label,
  color,
  position,
  size,
  shape,
  inline = false,
}: {
  show: boolean;
  label: string;
  color: string;
  position: PromotionBadgePosition;
  size: PromotionBadgeSize;
  shape: PromotionBadgeShape;
  inline?: boolean;
}) {
  if (!show || !label.trim()) return null;

  const sizeStyle =
    size === 'small'
      ? styles.badgeSmall
      : size === 'large'
        ? styles.badgeLarge
        : styles.badgeMedium;

  const shapeStyle =
    shape === 'square'
      ? styles.badgeSquare
      : shape === 'rounded'
        ? styles.badgeRounded
        : styles.badgePill;

  const positionStyle = inline
    ? undefined
    : position === 'top-right'
      ? styles.badgeTopRight
      : position === 'bottom-left'
        ? styles.badgeBottomLeft
        : position === 'bottom-right'
          ? styles.badgeBottomRight
          : styles.badgeTopLeft;

  return (
    <View
      style={[
        styles.badgeBase,
        inline && styles.inlineBadge,
        positionStyle,
        sizeStyle,
        shapeStyle,
        { backgroundColor: color },
      ]}>
      <Text
        style={[
          styles.badgeText,
          size === 'small' && styles.badgeTextSmall,
          size === 'large' && styles.badgeTextLarge,
        ]}>
        {label.trim()}
      </Text>
    </View>
  );
}

function PriceRow({
  originalPrice,
  promotionalPrice,
  large = false,
}: {
  originalPrice: number;
  promotionalPrice: number;
  large?: boolean;
}) {
  const discounted =
    originalPrice > 0 && promotionalPrice < originalPrice;

  return (
    <View style={styles.priceRow}>
      {discounted ? (
        <Text style={[styles.originalPrice, large && styles.largeOriginalPrice]}>
          {formatCurrency(originalPrice)}
        </Text>
      ) : null}

      <Text
        style={[
          styles.promotionalPrice,
          large && styles.largePromotionalPrice,
        ]}>
        {formatCurrency(promotionalPrice)}
      </Text>
    </View>
  );
}

function PreviewTab({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tab,
        active && styles.tabActive,
        pressed && styles.pressed,
      ]}>
      <Ionicons
        name={icon}
        size={17}
        color={active ? colors.white : colors.textMuted}
      />
      <Text style={[styles.tabText, active && styles.tabTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.summaryValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.lg,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },

  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },

  subtitle: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 12,
  },

  liveBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.successSoft,
  },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.success,
  },

  liveText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '900',
  },

  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  tab: {
    minHeight: 40,
    flex: 1,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
  },

  tabActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },

  tabText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
  },

  tabTextActive: {
    color: colors.white,
  },

  canvas: {
    minHeight: 420,
    padding: spacing.xl,
    borderRadius: radii.large,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },

  homeCard: {
    width: '100%',
    maxWidth: 330,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    backgroundColor: colors.surface,
    ...shadow,
  },

  imageWrap: {
    position: 'relative',
  },

  homeImage: {
    width: '100%',
    aspectRatio: 1,
  },

  favorite: {
    position: 'absolute',
    right: spacing.sm,
    top: spacing.sm,
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },

  availability: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.sm,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.successSoft,
  },

  availabilityText: {
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: '700',
  },

  badgeBase: {
    maxWidth: '68%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeTopLeft: {
    position: 'absolute',
    left: spacing.sm,
    top: spacing.sm,
  },

  badgeTopRight: {
    position: 'absolute',
    right: spacing.sm,
    top: spacing.sm,
  },

  badgeBottomLeft: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.sm,
  },

  badgeBottomRight: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
  },

  badgeSmall: {
    paddingHorizontal: 7,
    paddingVertical: 4,
  },

  badgeMedium: {
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  badgeLarge: {
    paddingHorizontal: 13,
    paddingVertical: 8,
  },

  badgePill: {
    borderRadius: radii.pill,
  },

  badgeRounded: {
    borderRadius: radii.small,
  },

  badgeSquare: {
    borderRadius: 0,
  },

  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
  },

  badgeTextSmall: {
    fontSize: 8,
  },

  badgeTextLarge: {
    fontSize: 12,
  },

  inlineBadge: {
    position: 'relative',
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },

  homeContent: {
    minHeight: 82,
    padding: spacing.md,
    gap: spacing.xs,
  },

  homeName: {
    minHeight: 36,
    color: colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },

  priceRow: {
    minHeight: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: spacing.xs,
  },

  originalPrice: {
    color: colors.textMuted,
    fontSize: 12,
    textDecorationLine: 'line-through',
  },

  promotionalPrice: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: '800',
  },

  largeOriginalPrice: {
    fontSize: 13,
  },

  largePromotionalPrice: {
    fontSize: 23,
  },

  economy: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '800',
  },

  productCard: {
    width: '100%',
    maxWidth: 390,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.large,
    backgroundColor: colors.surface,
    ...shadow,
  },

  productImageWrap: {
    position: 'relative',
  },

  productImage: {
    width: '100%',
    aspectRatio: 1.15,
  },

  productContent: {
    padding: spacing.lg,
  },

  productEyebrow: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  productName: {
    marginTop: spacing.sm,
    color: colors.text,
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 27,
  },

  savingRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  savingText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '800',
  },

  optionBlock: {
    marginTop: spacing.lg,
  },

  optionLabel: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '900',
  },

  optionButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radii.pill,
  },

  optionButtonText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
  },

  buyButton: {
    marginTop: spacing.lg,
    minHeight: 44,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
  },

  buyButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '900',
  },

  cartCard: {
    width: '100%',
    maxWidth: 410,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.large,
    backgroundColor: colors.surface,
    ...shadow,
  },

  cartHeader: {
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  cartTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },

  cartCount: {
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },

  cartCountText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '900',
  },

  cartItem: {
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },

  cartImage: {
    width: 82,
    height: 92,
    borderRadius: radii.medium,
  },

  cartCopy: {
    flex: 1,
  },

  cartName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },

  cartEconomy: {
    marginTop: 3,
    color: colors.success,
    fontSize: 9,
    fontWeight: '800',
  },

  quantityBox: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.small,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quantityText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
  },

  cartTotal: {
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  cartTotalLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },

  cartTotalValue: {
    color: colors.primary,
    fontSize: 19,
    fontWeight: '900',
  },

  checkoutButton: {
    minHeight: 46,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },

  checkoutButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '900',
  },

  summary: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.large,
    gap: spacing.md,
    backgroundColor: colors.surface,
  },

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },

  summaryLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },

  summaryValue: {
    maxWidth: '62%',
    color: colors.text,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'right',
  },

  pressed: {
    opacity: 0.72,
  },
});
