import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/src/components/app-header';
import { ProductImage } from '@/src/components/product-image';
import { Screen } from '@/src/components/screen';
import { Button, EmptyState, QuantityStepper } from '@/src/components/ui';
import { useStore } from '@/src/context/store-context';
import { colors, fonts, radii, spacing } from '@/src/theme';
import { formatCurrency } from '@/src/utils/format';

export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { products, favorites, toggleFavorite, addToCart } = useStore();
  const product = products.find((item) => item.id === id);
  const [selectedSize, setSelectedSize] = useState<string>();
  const [selectedColor, setSelectedColor] = useState<string>();
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setSelectedSize(product?.sizes.length === 1 ? product.sizes[0] : undefined);
    setSelectedColor(product?.colors.length === 1 ? product.colors[0] : undefined);
    setQuantity(1);
  }, [product]);

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
  const outOfStock =
    currentProduct.availability === 'ready' && currentProduct.stock <= 0;
  const isCustomOrder =
    currentProduct.availability === 'custom' || outOfStock;

  function handleAddToCart() {
    if (currentProduct.sizes.length && !selectedSize) {
      Alert.alert('Escolha o tamanho', 'Selecione um tamanho antes de continuar.');
      return;
    }
    if (currentProduct.colors.length && !selectedColor) {
      Alert.alert('Escolha a cor', 'Selecione uma cor antes de continuar.');
      return;
    }

    addToCart(
      currentProduct,
      quantity,
      selectedSize,
      selectedColor,
      outOfStock ? 'custom' : undefined,
    );
    Alert.alert(
      isCustomOrder ? 'Encomenda adicionada' : 'Produto adicionado',
      isCustomOrder
        ? 'O item foi colocado no carrinho como encomenda.'
        : 'O item foi colocado no carrinho.',
      [
      { text: 'Continuar comprando' },
      { text: 'Ver carrinho', onPress: () => router.push('/(tabs)/cart') },
      ],
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
        }}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ProductImage uri={product.imageUrls[0]} style={styles.image} />
        <View style={styles.details}>
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
              onSelect={setSelectedSize}
            />
          ) : null}

          {product.colors.length ? (
            <OptionGroup
              label="Cor"
              options={product.colors}
              selected={selectedColor}
              onSelect={setSelectedColor}
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
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>Valor</Text>
          <Text style={styles.footerPrice}>{formatCurrency(product.price * quantity)}</Text>
        </View>
        <Button onPress={handleAddToCart} style={styles.addButton}>
          {isCustomOrder ? 'Encomendar' : 'Adicionar ao carrinho'}
        </Button>
      </View>
    </Screen>
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
            onPress={() => onSelect(option)}
            style={[styles.option, selected === option && styles.optionSelected]}>
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
  image: {
    width: '100%',
    aspectRatio: 1,
  },
  details: {
    padding: spacing.lg,
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
    fontSize: 14,
    fontWeight: '800',
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  option: {
    minWidth: 48,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.small,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  optionText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
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
    minHeight: 84,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.surface,
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
  addButton: {
    minWidth: 205,
  },
});
