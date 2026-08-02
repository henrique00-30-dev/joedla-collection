import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AppHeader } from '@/src/components/app-header';
import { ProductImage } from '@/src/components/product-image';
import { Screen } from '@/src/components/screen';
import { Button, EmptyState, QuantityStepper } from '@/src/components/ui';
import { useStore } from '@/src/context/store-context';
import { recordProductView } from '@/src/services/analytics';
import { colors, fonts, radii, spacing } from '@/src/theme';
import { formatCurrency } from '@/src/utils/format';

export default function ProductDetailsScreen() {
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { products, favorites, toggleFavorite, addToCart } = useStore();
  const product = products.find((item) => item.id === id);
  const [selectedSize, setSelectedSize] = useState<string>();
  const [selectedColor, setSelectedColor] = useState<string>();
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    setSelectedSize(product?.sizes.length === 1 ? product.sizes[0] : undefined);
    setSelectedColor(product?.colors.length === 1 ? product.colors[0] : undefined);
    setQuantity(1);
    setSelectedImageIndex(0);
    setActionMessage('');
  }, [product]);

  useEffect(() => {
    if (product?.id) void recordProductView(product.id);
  }, [product?.id]);

  const favorite = useMemo(
    () => (product ? favorites.includes(product.id) : false),
    [favorites, product],
  );

  if (!product) {
    return (
      <Screen>
        <AppHeader compact title="Produto" showBack />
        <EmptyState
          icon="alert-circle-outline"
          title="Produto não encontrado"
          message="Este produto pode ter sido removido do catálogo."
          actionLabel="Voltar ao catálogo"
          onAction={() => router.replace('/(tabs)/categories')}
        />
      </Screen>
    );
  }

  const currentProduct = product;
  const imageUrls = currentProduct.imageUrls.length ? currentProduct.imageUrls : [''];
  const selectedImage = imageUrls[selectedImageIndex] ?? imageUrls[0];
  const outOfStock =
    currentProduct.availability === 'ready' && currentProduct.stock <= 0;
  const isCustomOrder =
    currentProduct.availability === 'custom' || outOfStock;

  function handleProductAction(destination: 'cart' | 'checkout') {
    if (currentProduct.sizes.length && !selectedSize) {
      setActionMessage('Escolha um tamanho antes de continuar.');
      return;
    }
    if (currentProduct.colors.length && !selectedColor) {
      setActionMessage('Escolha uma cor antes de continuar.');
      return;
    }

    addToCart(
      currentProduct,
      quantity,
      selectedSize,
      selectedColor,
      outOfStock ? 'custom' : undefined,
    );
    if (destination === 'checkout') {
      router.push('/checkout');
      return;
    }
    setActionMessage(
      isCustomOrder
        ? 'Encomenda adicionada ao carrinho.'
        : 'Produto adicionado ao carrinho.',
    );
  }

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <AppHeader
        compact
        title="Detalhes do produto"
        showBack
        rightAction={{
          icon: favorite ? 'heart' : 'heart-outline',
          onPress: () => toggleFavorite(product.id),
          label: favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos',
        }}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator>
        <View style={[styles.productLayout, desktop && styles.productLayoutDesktop]}>
          <View style={[styles.galleryColumn, desktop && styles.galleryColumnDesktop]}>
            <ProductImage
              uri={selectedImage}
              contentFit={currentProduct.photoProvisional || currentProduct.photoQuality === 'reduced' ? 'contain' : 'cover'}
              style={styles.image}
            />
            {imageUrls.length > 1 ? (
              <View style={styles.gallery}>
                <View style={styles.galleryHeader}>
                  <Text style={styles.galleryTitle}>Fotos do produto</Text>
                  <Text style={styles.galleryCount}>
                    {selectedImageIndex + 1} de {imageUrls.length}
                  </Text>
                </View>
                <ScrollView
                  horizontal
                  contentContainerStyle={styles.thumbnails}
                  showsHorizontalScrollIndicator>
                  {imageUrls.map((uri, index) => (
                    <Pressable
                      key={`${uri}-${index}`}
                      accessibilityLabel={`Ver foto ${index + 1} de ${imageUrls.length}`}
                      onPress={() => setSelectedImageIndex(index)}
                      style={[
                        styles.thumbnailButton,
                        selectedImageIndex === index && styles.thumbnailButtonActive,
                      ]}>
                      <ProductImage uri={uri} style={styles.thumbnail} />
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </View>
          <View style={[styles.details, desktop && styles.detailsDesktop]}>
          <View
            style={[
              styles.availability,
              product.availability === 'custom' && styles.availabilityCustom,
              outOfStock && styles.availabilityOutOfStock,
            ]}>
            <Text
              style={[
                styles.availabilityText,
                outOfStock && styles.availabilityTextOutOfStock,
              ]}>
              {outOfStock
                ? 'Em falta para pronta entrega'
                : product.availability === 'ready'
                  ? 'Pronta entrega'
                  : 'Produto por encomenda'}
            </Text>
          </View>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.price}>{formatCurrency(product.price)}</Text>
          <Text style={styles.description}>{product.description}</Text>

          {product.sizes.length ? (
            <OptionGroup
              label="Tamanho"
              options={product.sizes}
              selected={selectedSize}
              onSelect={(value) => {
                setSelectedSize(value);
                setActionMessage('');
              }}
            />
          ) : null}

          {product.colors.length ? (
            <OptionGroup
              label="Cor"
              options={product.colors}
              selected={selectedColor}
              onSelect={(value) => {
                setSelectedColor(value);
                setActionMessage('');
              }}
            />
          ) : null}

          <View style={styles.quantityRow}>
            <View>
              <Text style={styles.optionLabel}>Quantidade</Text>
              <Text style={styles.stock}>
                {outOfStock
                  ? 'Disponível para encomenda'
                  : product.availability === 'ready'
                  ? `${product.stock} unidade(s) disponível(is)`
                  : 'Produzido por encomenda'}
              </Text>
            </View>
            <QuantityStepper
              value={quantity}
              maximum={
                product.availability === 'ready' && !outOfStock
                  ? product.stock
                  : 99
              }
              onChange={setQuantity}
            />
          </View>

          <View style={[styles.infoCard, isCustomOrder && styles.customInfoCard]}>
            <Ionicons
              name={isCustomOrder ? 'time-outline' : 'location-outline'}
              size={21}
              color={isCustomOrder ? colors.warning : colors.success}
            />
            <Text style={[styles.infoText, isCustomOrder && styles.customInfoText]}>
              {isCustomOrder
                ? 'Prazo da encomenda combinado pelo WhatsApp'
                : 'Entrega grátis em Rosário do Catete'}
            </Text>
          </View>
          <View style={styles.purchaseNotes}>
            <PurchaseNote icon="resize-outline" title="Tamanhos e medidas" text="Confirme as medidas com a loja se tiver dúvida." />
            <PurchaseNote icon="shirt-outline" title="Cuidados com a peça" text="Siga as orientações da etiqueta para conservar o produto." />
            <PurchaseNote icon="swap-horizontal-outline" title="Trocas e encomendas" text="Condições combinadas diretamente com nosso atendimento." />
          </View>
          </View>
        </View>
      </ScrollView>
      <View style={[styles.footer, desktop && styles.footerDesktop]}>
        <View style={styles.footerTotalRow}>
          <Text style={styles.footerLabel}>Valor</Text>
          <Text style={styles.footerPrice}>{formatCurrency(product.price * quantity)}</Text>
        </View>
        {actionMessage ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[
              styles.actionMessage,
              actionMessage.includes('adicionad') && styles.actionMessageSuccess,
            ]}>
            {actionMessage}
          </Text>
        ) : null}
        <View style={styles.footerActions}>
          <Button
            variant="secondary"
            icon="bag-add-outline"
            onPress={() => handleProductAction('cart')}
            style={styles.actionButton}>
            {isCustomOrder ? 'Encomendar' : 'Adicionar ao carrinho'}
          </Button>
          <Button
            icon="flash-outline"
            onPress={() => handleProductAction('checkout')}
            style={styles.actionButton}>
            Comprar agora
          </Button>
        </View>
      </View>
    </Screen>
  );
}

function PurchaseNote({
  icon,
  title,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.purchaseNote}>
      <Ionicons name={icon} size={19} color={colors.primary} />
      <View style={styles.purchaseNoteCopy}>
        <Text style={styles.purchaseNoteTitle}>{title}</Text>
        <Text style={styles.purchaseNoteText}>{text}</Text>
      </View>
    </View>
  );
}

function OptionGroup({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: string[];
  selected?: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.optionGroup}>
      <Text style={styles.optionLabel}>{label}</Text>
      <View style={styles.options}>
        {options.map((option) => (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected: selected === option }}
            onPress={() => onSelect(option)}
            style={({ pressed }) => [
              styles.option,
              selected === option && styles.optionSelected,
              pressed && styles.optionPressed,
            ]}>
            <Text
              style={[
                styles.optionText,
                selected === option && styles.optionTextSelected,
              ]}>
              {option}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xl,
  },
  productLayout: {
    width: '100%',
  },
  productLayoutDesktop: {
    maxWidth: 1180,
    padding: spacing.xxl,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 54,
  },
  galleryColumn: {
    backgroundColor: colors.surface,
  },
  galleryColumnDesktop: {
    width: '55%',
    overflow: 'hidden',
    borderRadius: radii.large,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.surfaceWarm,
  },
  gallery: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  galleryTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  galleryCount: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  thumbnails: {
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  thumbnailButton: {
    width: 68,
    height: 68,
    padding: 2,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: radii.small,
  },
  thumbnailButtonActive: {
    borderColor: colors.primary,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: radii.small,
  },
  details: {
    padding: spacing.lg,
  },
  detailsDesktop: {
    flex: 1,
    padding: 0,
  },
  availability: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: colors.successSoft,
  },
  availabilityCustom: {
    backgroundColor: colors.warningSoft,
  },
  availabilityOutOfStock: {
    backgroundColor: colors.dangerSoft,
  },
  availabilityText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '800',
  },
  availabilityTextOutOfStock: {
    color: colors.danger,
  },
  name: {
    marginTop: spacing.md,
    fontFamily: fonts.display,
    color: colors.text,
    fontSize: 27,
    lineHeight: 33,
    fontWeight: '700',
  },
  price: {
    marginTop: spacing.sm,
    color: colors.primary,
    fontSize: 24,
    fontWeight: '900',
  },
  description: {
    marginTop: spacing.lg,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  optionGroup: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  optionLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  option: {
    minWidth: 58,
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primarySoft,
    borderRadius: radii.medium,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  optionSelected: {
    borderColor: colors.primaryDark,
    backgroundColor: colors.primary,
  },
  optionPressed: {
    opacity: 0.72,
  },
  optionText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  optionTextSelected: {
    color: colors.white,
  },
  quantityRow: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  stock: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 11,
  },
  infoCard: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radii.medium,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.successSoft,
  },
  infoText: {
    flex: 1,
    color: colors.success,
    fontSize: 13,
    fontWeight: '700',
  },
  customInfoCard: {
    backgroundColor: colors.warningSoft,
  },
  customInfoText: {
    color: colors.warning,
  },
  footer: {
    minHeight: 132,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  footerDesktop: {
    width: '100%',
    maxWidth: 1180,
    minHeight: 112,
    paddingHorizontal: spacing.xxl,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.large,
  },
  footerTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },
  footerPrice: {
    color: colors.primary,
    fontSize: 19,
    fontWeight: '900',
  },
  actionMessage: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  actionMessageSuccess: {
    color: colors.success,
  },
  footerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: spacing.sm,
  },
  purchaseNotes: {
    marginTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  purchaseNote: {
    minHeight: 70,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  purchaseNoteCopy: { flex: 1 },
  purchaseNoteTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  purchaseNoteText: { marginTop: 3, color: colors.textMuted, fontSize: 11, lineHeight: 17 },
});
