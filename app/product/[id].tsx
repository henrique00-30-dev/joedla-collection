import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AppHeader } from '@/src/components/app-header';
import { ProductGrid } from '@/src/components/product-grid';
import { CustomerProductInteractions } from '@/src/components/product/customer-interactions';
import { ProductGallery } from '@/src/components/product/product-gallery';
import { Screen } from '@/src/components/screen';
import { Button, EmptyState, QuantityStepper } from '@/src/components/ui';
import { useStore } from '@/src/context/store-context';
import { recordProductView } from '@/src/services/analytics';
import { recordRecentlyViewed } from '@/src/services/customer';
import { colors, fonts, radii, spacing } from '@/src/theme';
import { formatCurrency } from '@/src/utils/format';

export default function ProductDetailsScreen() {
  const { width } = useWindowDimensions();
  const phone = width < 600;
  const desktop = width >= 900;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { products, favorites, toggleFavorite, addToCart, startDirectCheckout } = useStore();
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
    if (product?.id) {
      void recordProductView(product.id);
      void recordRecentlyViewed(product.id).catch(() => undefined);
    }
  }, [product?.id]);

  const favorite = useMemo(() => (product ? favorites.includes(product.id) : false), [favorites, product]);
  const relatedProducts = useMemo(
    () => product
      ? products.filter((item) => item.active && item.id !== product.id && item.category === product.category).slice(0, 4)
      : [],
    [product, products],
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

  const imageUrls = product.imageUrls.length ? product.imageUrls : [''];
  const outOfStock = product.availability === 'ready' && product.stock <= 0;
  const isCustomOrder = product.availability === 'custom';

  function handleProductAction(destination: 'cart' | 'checkout') {
    if (outOfStock) {
      setActionMessage('Produto indisponível no momento.');
      return;
    }
    if (product.sizes.length && !selectedSize) {
      setActionMessage('Escolha um tamanho antes de continuar.');
      return;
    }
    if (product.colors.length && !selectedColor) {
      setActionMessage('Escolha uma cor antes de continuar.');
      return;
    }

    if (destination === 'checkout') {
      try {
        const buyNow = startDirectCheckout(
          product,
          quantity,
          selectedSize,
          selectedColor,
          isCustomOrder ? 'custom' : undefined,
        );
        router.push({ pathname: '/checkout', params: { buyNow } });
      } catch (error) {
        setActionMessage(error instanceof Error ? error.message : 'Não foi possível iniciar a compra agora.');
      }
      return;
    }

    addToCart(product, quantity, selectedSize, selectedColor, isCustomOrder ? 'custom' : undefined);
    setActionMessage(isCustomOrder ? 'Encomenda adicionada ao carrinho.' : 'Produto adicionado ao carrinho.');
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
          <ProductGallery
            product={product}
            imageUrls={imageUrls}
            selectedImageIndex={selectedImageIndex}
            onSelectImage={setSelectedImageIndex}
          />

          <View style={[styles.details, desktop && styles.detailsDesktop]}>
            <View style={[
              styles.availability,
              isCustomOrder && styles.availabilityCustom,
              outOfStock && styles.availabilityOutOfStock,
            ]}>
              <Text style={[styles.availabilityText, outOfStock && styles.availabilityTextOutOfStock]}>
                {outOfStock ? 'Em falta para pronta entrega' : isCustomOrder ? 'Produto por encomenda' : 'Pronta entrega'}
              </Text>
            </View>

            <Text style={styles.name}>{product.name}</Text>
            <View style={styles.priceRow}>
              {product.originalPrice && product.originalPrice > product.price ? (
                <Text style={styles.originalPrice}>{formatCurrency(product.originalPrice)}</Text>
              ) : null}
              <Text style={styles.price}>{formatCurrency(product.price)}</Text>
            </View>
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

            <View style={[styles.quantityRow, phone && styles.quantityRowPhone]}>
              <View style={styles.quantityCopy}>
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
                maximum={product.availability === 'ready' && !outOfStock ? product.stock : 99}
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
                {isCustomOrder ? 'Prazo da encomenda combinado pelo WhatsApp' : 'Entrega grátis em Rosário do Catete'}
              </Text>
            </View>

            <View style={styles.purchaseNotes}>
              <PurchaseNote icon="resize-outline" title="Tamanhos e medidas" text="Confirme as medidas com a loja se tiver dúvida." />
              <PurchaseNote icon="shirt-outline" title="Cuidados com a peça" text="Siga as orientações da etiqueta para conservar o produto." />
              <PurchaseNote icon="swap-horizontal-outline" title="Trocas e encomendas" text="Condições combinadas diretamente com nosso atendimento." />
            </View>
          </View>
        </View>

        <View style={styles.interactionsSection}>
          <CustomerProductInteractions productId={product.id} outOfStock={outOfStock} />
        </View>

        {relatedProducts.length ? (
          <View style={styles.relatedSection}>
            <Text style={styles.relatedTitle}>Você também pode gostar</Text>
            <Text style={styles.relatedDescription}>Outras peças da mesma categoria</Text>
            <ProductGrid products={relatedProducts} />
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, desktop && styles.footerDesktop]}>
        <View style={styles.footerTotalRow}>
          <Text style={styles.footerLabel}>Valor</Text>
          <Text style={styles.footerPrice}>{formatCurrency(product.price * quantity)}</Text>
        </View>

        {actionMessage ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.actionMessage, actionMessage.includes('adicionad') && styles.actionMessageSuccess]}>
            {actionMessage}
          </Text>
        ) : null}

        <View style={[styles.footerActions, phone && styles.footerActionsPhone]}>
          {outOfStock ? (
            <View style={styles.unavailableBox}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.textMuted} />
              <Text style={styles.unavailableText}>Produto indisponível</Text>
            </View>
          ) : isCustomOrder ? (
            <Button icon="time-outline" onPress={() => handleProductAction('cart')} style={styles.actionButtonSingle}>
              Encomendar
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                icon="bag-add-outline"
                onPress={() => handleProductAction('cart')}
                style={[styles.actionButton, phone && styles.actionButtonPhone]}>
                Adicionar ao carrinho
              </Button>
              <Button
                icon="flash-outline"
                onPress={() => handleProductAction('checkout')}
                style={[styles.actionButton, phone && styles.actionButtonPhone]}>
                Comprar agora
              </Button>
            </>
          )}
        </View>
      </View>
    </Screen>
  );
}

function PurchaseNote({ icon, title, text }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }) {
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

function OptionGroup({ label, options, selected, onSelect }: { label: string; options: string[]; selected?: string; onSelect: (value: string) => void }) {
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
            style={({ pressed }) => [styles.option, selected === option && styles.optionSelected, pressed && styles.optionPressed]}>
            <Text style={[styles.optionText, selected === option && styles.optionTextSelected]}>{option}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl },
  productLayout: { width: '100%', minWidth: 0 },
  productLayoutDesktop: { maxWidth: 1180, padding: spacing.xxl, alignSelf: 'center', flexDirection: 'row', alignItems: 'flex-start', gap: 54 },
  details: { minWidth: 0, padding: spacing.lg },
  detailsDesktop: { flex: 1, padding: 0 },
  availability: { alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radii.pill, backgroundColor: colors.successSoft },
  availabilityCustom: { backgroundColor: colors.warningSoft },
  availabilityOutOfStock: { backgroundColor: colors.dangerSoft },
  availabilityText: { color: colors.primaryDark, fontSize: 11, fontWeight: '800' },
  availabilityTextOutOfStock: { color: colors.danger },
  name: { marginTop: spacing.md, fontFamily: fonts.display, color: colors.text, fontSize: 27, lineHeight: 33, fontWeight: '700' },
  priceRow: { marginTop: spacing.sm, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: spacing.sm },
  originalPrice: { color: colors.textMuted, fontSize: 15, textDecorationLine: 'line-through' },
  price: { color: colors.primary, fontSize: 24, fontWeight: '900' },
  description: { marginTop: spacing.lg, color: colors.textMuted, fontSize: 14, lineHeight: 22 },
  optionGroup: { marginTop: spacing.xl, gap: spacing.md },
  optionLabel: { color: colors.text, fontSize: 15, fontWeight: '900' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  option: { minWidth: 58, minHeight: 50, paddingHorizontal: spacing.lg, borderWidth: 2, borderColor: colors.primarySoft, borderRadius: radii.medium, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  optionSelected: { borderColor: colors.primaryDark, backgroundColor: colors.primary },
  optionPressed: { opacity: 0.72 },
  optionText: { color: colors.text, fontSize: 14, fontWeight: '800' },
  optionTextSelected: { color: colors.white },
  quantityRow: { marginTop: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.lg },
  quantityRowPhone: { alignItems: 'flex-start' },
  quantityCopy: { minWidth: 0, flexGrow: 1, flexShrink: 1 },
  stock: { marginTop: 3, color: colors.textMuted, fontSize: 11 },
  infoCard: { marginTop: spacing.xl, padding: spacing.lg, borderRadius: radii.medium, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.successSoft },
  infoText: { minWidth: 0, flex: 1, color: colors.success, fontSize: 13, fontWeight: '700' },
  customInfoCard: { backgroundColor: colors.warningSoft },
  customInfoText: { color: colors.warning },
  purchaseNotes: { marginTop: spacing.xl, borderTopWidth: 1, borderTopColor: colors.border },
  purchaseNote: { minHeight: 70, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  purchaseNoteCopy: { minWidth: 0, flex: 1 },
  purchaseNoteTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  purchaseNoteText: { marginTop: 3, color: colors.textMuted, fontSize: 11, lineHeight: 17 },
  interactionsSection: { width: '100%', maxWidth: 1180, paddingHorizontal: spacing.lg, alignSelf: 'center' },
  relatedSection: { width: '100%', maxWidth: 1180, paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl, alignSelf: 'center' },
  relatedTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 23, fontWeight: '700' },
  relatedDescription: { marginTop: spacing.xs, marginBottom: spacing.lg, color: colors.textMuted, fontSize: 13 },
  footer: { width: '100%', minWidth: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm, backgroundColor: colors.surface },
  footerDesktop: { maxWidth: 1180, paddingHorizontal: spacing.xxl, alignSelf: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radii.large },
  footerTotalRow: { minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  footerLabel: { color: colors.textMuted, fontSize: 11 },
  footerPrice: { flexShrink: 0, color: colors.primary, fontSize: 19, fontWeight: '900' },
  actionMessage: { color: colors.danger, fontSize: 12, lineHeight: 17, fontWeight: '700', textAlign: 'center' },
  actionMessageSuccess: { color: colors.success },
  footerActions: { width: '100%', minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  footerActionsPhone: { flexDirection: 'column' },
  actionButton: { minWidth: 180, flexBasis: 220, flexGrow: 1 },
  actionButtonPhone: { width: '100%', minWidth: 0, flexBasis: 'auto', flexGrow: 0 },
  actionButtonSingle: { width: '100%', minWidth: 0 },
  unavailableBox: { width: '100%', minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radii.medium, backgroundColor: colors.surfaceWarm },
  unavailableText: { color: colors.textMuted, fontSize: 15, fontWeight: '800', textAlign: 'center' },
});