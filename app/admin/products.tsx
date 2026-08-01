import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AdminGuard } from '@/src/components/admin-guard';
import { AppHeader } from '@/src/components/app-header';
import { ProductImage } from '@/src/components/product-image';
import { Screen } from '@/src/components/screen';
import { SearchBar } from '@/src/components/search-bar';
import { Button } from '@/src/components/ui';
import { useStore } from '@/src/context/store-context';
import { colors, radii, spacing } from '@/src/theme';
import { formatCurrency } from '@/src/utils/format';

export default function AdminProductsScreen() {
  const { products, categories, archiveProduct } = useStore();
  const [query, setQuery] = useState('');
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    return products.filter(
      (product) =>
        product.active &&
        (!normalized || product.name.toLocaleLowerCase('pt-BR').includes(normalized)),
    );
  }, [products, query]);

  function showMessage(title: string, message: string) {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(`${title}\n\n${message}`);
      return;
    }

    Alert.alert(title, message);
  }

  async function removeProduct(id: string) {
    if (deletingProductId) return;

    setDeletingProductId(id);
    try {
      await archiveProduct(id);
      showMessage('Produto excluído', 'O produto foi retirado do catálogo.');
    } catch (error) {
      showMessage(
        'Erro ao excluir',
        error instanceof Error ? error.message : 'Não foi possível excluir o produto.',
      );
    } finally {
      setDeletingProductId(null);
    }
  }

  function confirmArchive(id: string, name: string) {
    if (deletingProductId) return;

    const message = `Deseja excluir "${name}" do catálogo?`;

    // No navegador, o Alert.alert do React Native Web não executa corretamente
    // os callbacks dos botões personalizados. Por isso a confirmação usa a API
    // nativa do navegador quando o site está aberto na web.
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(message)) void removeProduct(id);
      return;
    }

    Alert.alert('Excluir produto', message, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => void removeProduct(id),
      },
    ]);
  }

  return (
    <AdminGuard>
      <Screen>
        <AppHeader compact title="Produtos e estoque" showBack showStoreHome />
        <View style={styles.search}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="Pesquisar produto"
          />
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator>
          <View style={styles.summary}>
            <Text style={styles.summaryValue}>{filtered.length}</Text>
            <Text style={styles.summaryLabel}>produto(s) ativo(s)</Text>
          </View>
          {filtered.map((product) => (
            <View key={product.id} style={styles.card}>
              <ProductImage uri={product.imageUrls[0]} style={styles.image} />
              <View style={styles.info}>
                <Text numberOfLines={2} style={styles.name}>
                  {product.name}
                </Text>
                <Text style={styles.price}>{formatCurrency(product.price)}</Text>
                <View style={styles.tags}>
                  <View style={[styles.tag, styles.tagCategory]}>
                    <Text style={styles.tagText}>
                      {categories.find((item) => item.slug === product.category)?.name ?? product.category}
                    </Text>
                  </View>
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>
                      {product.availability === 'ready'
                        ? product.stock > 0
                          ? `${product.stock} em estoque`
                          : 'Em falta • aceita encomenda'
                        : 'Encomenda'}
                    </Text>
                  </View>
                  {product.featured ? (
                    <View style={[styles.tag, styles.tagFeatured]}>
                      <Text style={styles.tagText}>Destaque</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <View style={styles.actions}>
                <Pressable
                  accessibilityLabel="Editar produto"
                  onPress={() =>
                    router.push({
                      pathname: '/admin/product-form',
                      params: { id: product.id },
                    })
                  }
                  style={styles.action}>
                  <Ionicons name="create-outline" size={21} color={colors.primary} />
                </Pressable>
                <Pressable
                  accessibilityLabel="Excluir produto"
                  disabled={deletingProductId !== null}
                  onPress={() => confirmArchive(product.id, product.name)}
                  style={({ pressed }) => [
                    styles.action,
                    (pressed || deletingProductId !== null) && styles.actionDisabled,
                  ]}>
                  {deletingProductId === product.id ? (
                    <ActivityIndicator size="small" color={colors.danger} />
                  ) : (
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  )}
                </Pressable>
              </View>
            </View>
          ))}
          {!filtered.length ? (
            <Text style={styles.empty}>Nenhum produto encontrado.</Text>
          ) : null}
        </ScrollView>
        <View style={styles.footer}>
          <Button
            icon="add"
            onPress={() => router.push('/admin/product-form')}
            style={styles.addButton}>
            Cadastrar produto
          </Button>
        </View>
      </Screen>
    </AdminGuard>
  );
}

const styles = StyleSheet.create({
  search: {
    padding: spacing.lg,
    paddingBottom: 0,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  summary: {
    padding: spacing.md,
    borderRadius: radii.medium,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    backgroundColor: colors.surfaceWarm,
  },
  summaryValue: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '900',
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  card: {
    minHeight: 116,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  image: {
    width: 82,
    height: 96,
    borderRadius: radii.small,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
  price: {
    marginTop: spacing.xs,
    color: colors.primary,
    fontSize: 15,
    fontWeight: '900',
  },
  tags: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.successSoft,
  },
  tagFeatured: {
    backgroundColor: colors.warningSoft,
  },
  tagCategory: {
    backgroundColor: colors.infoSoft,
  },
  tagText: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
  },
  actions: {
    justifyContent: 'space-between',
  },
  action: {
    width: 34,
    height: 34,
    borderRadius: radii.small,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },
  actionDisabled: {
    opacity: 0.55,
  },
  empty: {
    paddingVertical: 70,
    color: colors.textMuted,
    textAlign: 'center',
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  addButton: {
    alignSelf: 'stretch',
  },
});
