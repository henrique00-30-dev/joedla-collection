import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  AdminFilterChip,
  AdminPage,
  AdminSection,
  AdminStatCard,
  AdminTable,
  AdminTableBadge,
  AdminTableText,
  AdminToolbar,
  AdminToolbarButton,
  type AdminTableColumn,
} from '@/src/components/admin';
import { AdminGuard } from '@/src/components/admin-guard';
import { ProductImage } from '@/src/components/product-image';
import { useStore } from '@/src/context/store-context';
import { colors, radii, spacing } from '@/src/theme';
import type { Product } from '@/src/types';
import { formatCurrency } from '@/src/utils/format';

type ProductFilter =
  | 'all'
  | 'ready'
  | 'custom'
  | 'featured'
  | 'out-of-stock';

export default function AdminProductsScreen() {
  const {
    products,
    categories,
    archiveProduct,
  } = useStore();

  const [query, setQuery] = useState('');
  const [filter, setFilter] =
    useState<ProductFilter>('all');

  const [
    deletingProductId,
    setDeletingProductId,
  ] = useState<string | null>(null);

  const activeProducts = useMemo(
    () =>
      products.filter(
        (product) => product.active,
      ),
    [products],
  );

  const metrics = useMemo(() => {
    const readyProducts =
      activeProducts.filter(
        (product) =>
          product.availability === 'ready',
      );

    return {
      total: activeProducts.length,

      stock: readyProducts.reduce(
        (total, product) =>
          total + product.stock,
        0,
      ),

      featured: activeProducts.filter(
        (product) => product.featured,
      ).length,

      outOfStock: readyProducts.filter(
        (product) => product.stock <= 0,
      ).length,
    };
  }, [activeProducts]);

  const filtered = useMemo(() => {
    const normalized = query
      .trim()
      .toLocaleLowerCase('pt-BR');

    return activeProducts.filter(
      (product) => {
        const categoryName =
          categories.find(
            (category) =>
              category.slug ===
              product.category,
          )?.name ?? product.category;

        const matchesSearch =
          !normalized ||
          product.name
            .toLocaleLowerCase('pt-BR')
            .includes(normalized) ||
          product.description
            .toLocaleLowerCase('pt-BR')
            .includes(normalized) ||
          categoryName
            .toLocaleLowerCase('pt-BR')
            .includes(normalized);

        if (!matchesSearch) {
          return false;
        }

        if (filter === 'ready') {
          return (
            product.availability === 'ready'
          );
        }

        if (filter === 'custom') {
          return (
            product.availability === 'custom'
          );
        }

        if (filter === 'featured') {
          return product.featured;
        }

        if (filter === 'out-of-stock') {
          return (
            product.availability ===
              'ready' && product.stock <= 0
          );
        }

        return true;
      },
    );
  }, [
    activeProducts,
    categories,
    filter,
    query,
  ]);

  function showMessage(
    title: string,
    message: string,
  ) {
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined'
    ) {
      window.alert(`${title}\n\n${message}`);
      return;
    }

    Alert.alert(title, message);
  }

  async function removeProduct(id: string) {
    if (deletingProductId) {
      return;
    }

    setDeletingProductId(id);

    try {
      await archiveProduct(id);

      showMessage(
        'Produto excluído',
        'O produto foi retirado do catálogo.',
      );
    } catch (error) {
      showMessage(
        'Erro ao excluir',
        error instanceof Error
          ? error.message
          : 'Não foi possível excluir o produto.',
      );
    } finally {
      setDeletingProductId(null);
    }
  }

  function confirmArchive(
    id: string,
    name: string,
  ) {
    if (deletingProductId) {
      return;
    }

    const message = `Deseja excluir "${name}" do catálogo?`;

    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined'
    ) {
      if (window.confirm(message)) {
        void removeProduct(id);
      }

      return;
    }

    Alert.alert(
      'Excluir produto',
      message,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () =>
            void removeProduct(id),
        },
      ],
    );
  }

  function openProduct(product: Product) {
    router.push({
      pathname: '/admin/product-form',
      params: {
        id: product.id,
      },
    });
  }

  const columns =
    useMemo<AdminTableColumn<Product>[]>(
      () => [
        {
          key: 'product',
          label: 'Produto',
          minWidth: 250,
          flex: 1,
          render: (product) => (
            <View
              style={styles.productCell}>
              <ProductImage
                uri={product.imageUrls[0]}
                style={styles.productImage}
              />

              <View
                style={styles.productCopy}>
                <AdminTableText bold>
                  {product.name}
                </AdminTableText>

                <AdminTableText muted>
                  {categories.find(
                    (category) =>
                      category.slug ===
                      product.category,
                  )?.name ??
                    product.category}
                </AdminTableText>
              </View>
            </View>
          ),
        },
        {
          key: 'price',
          label: 'Preço',
          width: 120,
          align: 'right',
          render: (product) => (
            <View style={styles.priceCell}>
              {product.originalPrice &&
              product.originalPrice >
                product.price ? (
                <Text
                  style={
                    styles.originalPrice
                  }>
                  {formatCurrency(
                    product.originalPrice,
                  )}
                </Text>
              ) : null}

              <AdminTableText bold>
                {formatCurrency(
                  product.price,
                )}
              </AdminTableText>
            </View>
          ),
        },
        {
          key: 'availability',
          label: 'Disponibilidade',
          width: 150,
          render: (product) => {
            if (
              product.availability ===
              'custom'
            ) {
              return (
                <AdminTableBadge
                  label="Encomenda"
                  tone="warning"
                />
              );
            }

            if (product.stock <= 0) {
              return (
                <AdminTableBadge
                  label="Em falta"
                  tone="danger"
                />
              );
            }

            return (
              <AdminTableBadge
                label="Pronta entrega"
                tone="success"
              />
            );
          },
        },
        {
          key: 'stock',
          label: 'Estoque',
          width: 95,
          align: 'center',
          render: (product) => (
            <AdminTableText
              bold={
                product.availability ===
                  'ready' &&
                product.stock <= 0
              }>
              {product.availability ===
              'custom'
                ? '—'
                : String(product.stock)}
            </AdminTableText>
          ),
        },
        {
          key: 'highlight',
          label: 'Destaque',
          width: 105,
          align: 'center',
          render: (product) =>
            product.featured ? (
              <AdminTableBadge
                label="Sim"
                tone="warning"
              />
            ) : (
              <AdminTableText muted>
                Não
              </AdminTableText>
            ),
        },
        {
          key: 'actions',
          label: 'Ações',
          width: 110,
          align: 'center',
          render: (product) => (
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Editar ${product.name}`}
                onPress={() =>
                  openProduct(product)
                }
                style={({ pressed }) => [
                  styles.actionButton,
                  pressed &&
                    styles.actionPressed,
                ]}>
                <Ionicons
                  name="create-outline"
                  size={16}
                  color="#8B541B"
                />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Excluir ${product.name}`}
                disabled={
                  deletingProductId !==
                  null
                }
                onPress={() =>
                  confirmArchive(
                    product.id,
                    product.name,
                  )
                }
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.deleteButton,
                  (pressed ||
                    deletingProductId !==
                      null) &&
                    styles.actionPressed,
                ]}>
                {deletingProductId ===
                product.id ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.danger}
                  />
                ) : (
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color={colors.danger}
                  />
                )}
              </Pressable>
            </View>
          ),
        },
      ],
      [
        categories,
        deletingProductId,
      ],
    );

  return (
    <AdminGuard>
      <AdminPage
        eyebrow="Gestão de loja"
        title="Produtos"
        description="Gerencie o catálogo, preços, estoque, disponibilidade e produtos em destaque."
        actions={
          <AdminToolbarButton
            label="Cadastrar produto"
            icon="add"
            variant="primary"
            onPress={() =>
              router.push(
                '/admin/product-form',
              )
            }
          />
        }>
        <View style={styles.metrics}>
          <AdminStatCard
            compact
            icon="shirt-outline"
            label="Produtos ativos"
            value={String(metrics.total)}
            helper="Itens visíveis no catálogo"
          />

          <AdminStatCard
            compact
            icon="cube-outline"
            label="Unidades em estoque"
            value={String(metrics.stock)}
            helper="Somente pronta entrega"
            tone="success"
          />

          <AdminStatCard
            compact
            icon="star-outline"
            label="Em destaque"
            value={String(
              metrics.featured,
            )}
            helper="Exibidos nas áreas principais"
            tone="warning"
          />

          <AdminStatCard
            compact
            icon="alert-circle-outline"
            label="Produtos em falta"
            value={String(
              metrics.outOfStock,
            )}
            helper="Precisam de reposição"
            tone={
              metrics.outOfStock > 0
                ? 'danger'
                : 'success'
            }
          />
        </View>

        <AdminToolbar
          searchValue={query}
          onChangeSearch={setQuery}
          searchPlaceholder="Pesquisar produto ou categoria..."
          left={
            <>
              <AdminFilterChip
                label="Todos"
                active={filter === 'all'}
                onPress={() =>
                  setFilter('all')
                }
              />

              <AdminFilterChip
                label="Pronta entrega"
                active={
                  filter === 'ready'
                }
                onPress={() =>
                  setFilter('ready')
                }
              />

              <AdminFilterChip
                label="Encomenda"
                active={
                  filter === 'custom'
                }
                onPress={() =>
                  setFilter('custom')
                }
              />

              <AdminFilterChip
                label="Destaques"
                active={
                  filter === 'featured'
                }
                onPress={() =>
                  setFilter('featured')
                }
              />

              <AdminFilterChip
                label="Em falta"
                active={
                  filter ===
                  'out-of-stock'
                }
                onPress={() =>
                  setFilter(
                    'out-of-stock',
                  )
                }
              />
            </>
          }
        />

        <AdminSection
          title="Catálogo"
          description={`${filtered.length} ${
            filtered.length === 1
              ? 'produto encontrado'
              : 'produtos encontrados'
          }`}>
          <AdminTable
            columns={columns}
            data={filtered}
            keyExtractor={(product) =>
              product.id
            }
            emptyIcon="shirt-outline"
            emptyTitle="Nenhum produto encontrado"
            emptyDescription="Altere a pesquisa ou os filtros para localizar outros produtos."
          />
        </AdminSection>
      </AdminPage>
    </AdminGuard>
  );
}

const styles = StyleSheet.create({
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  productCell: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  productImage: {
    width: 46,
    height: 54,
    borderRadius: radii.small,
    backgroundColor: '#F3ECE5',
  },

  productCopy: {
    minWidth: 0,
    flex: 1,
    gap: 2,
  },

  priceCell: {
    alignItems: 'flex-end',
  },

  originalPrice: {
    marginBottom: 2,
    color: colors.textMuted,
    fontSize: 8,
    textDecorationLine:
      'line-through',
  },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  actionButton: {
    width: 31,
    height: 31,
    borderWidth: 1,
    borderColor: '#E0D3C6',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7EEE5',
  },

  deleteButton: {
    borderColor: 'rgba(188,72,72,0.2)',
    backgroundColor: colors.dangerSoft,
  },

  actionPressed: {
    opacity: 0.55,
  },
});