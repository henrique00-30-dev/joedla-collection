import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
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
  AdminField,
  AdminFormActions,
  AdminFormSection,
  AdminPage,
  AdminSection,
  AdminStatCard,
  AdminTable,
  AdminTableBadge,
  AdminTableText,
  AdminToolbarButton,
  type AdminTableColumn,
} from '@/src/components/admin';
import { AdminGuard } from '@/src/components/admin-guard';
import { ProductImage } from '@/src/components/product-image';
import { useStore } from '@/src/context/store-context';
import { colors, radii, spacing } from '@/src/theme';
import type { Category } from '@/src/types';
import {
  normalizePlainText,
  validatePlainText,
} from '@/src/utils/fields';

type CategoryRow = {
  category: Category;
  productCount: number;
};

export default function AdminCategoriesScreen() {
  const {
    categories,
    products,
    saveCategory,
    archiveCategory,
    uploadProductImage,
  } = useStore();

  const [editing, setEditing] =
    useState<Category | null>(null);

  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] =
    useState(false);

  const [deletingSlug, setDeletingSlug] =
    useState<string | null>(null);

  const [nameError, setNameError] =
    useState('');

  const categoryRows = useMemo<CategoryRow[]>(
    () =>
      categories.map((category) => ({
        category,
        productCount: products.filter(
          (product) =>
            product.active &&
            product.category === category.slug,
        ).length,
      })),
    [categories, products],
  );

  const metrics = useMemo(() => {
    const categoriesWithProducts =
      categoryRows.filter(
        (item) => item.productCount > 0,
      ).length;

    const emptyCategories =
      categoryRows.filter(
        (item) => item.productCount === 0,
      ).length;

    const totalProducts =
      categoryRows.reduce(
        (sum, item) =>
          sum + item.productCount,
        0,
      );

    return {
      total: categoryRows.length,
      withProducts: categoriesWithProducts,
      empty: emptyCategories,
      products: totalProducts,
    };
  }, [categoryRows]);

  function resetForm() {
    setEditing(null);
    setName('');
    setImageUrl('');
    setNameError('');
  }

  function beginEdit(category: Category) {
    setEditing(category);
    setName(category.name);
    setImageUrl(category.imageUrl);
    setNameError('');
  }

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

  async function pickImage() {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      showMessage(
        'Permissão necessária',
        'Autorize o acesso às fotos para escolher a capa.',
      );

      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

    if (result.canceled) {
      return;
    }

    setUploading(true);

    try {
      const asset = result.assets[0];

      const uploadedUrl =
        await uploadProductImage(
          asset.uri,
          asset.mimeType ??
            'image/jpeg',
        );

      setImageUrl(uploadedUrl);
    } catch (error) {
      showMessage(
        'Não foi possível salvar a foto',
        error instanceof Error
          ? error.message
          : 'Tente novamente.',
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    const error = validatePlainText(name, {
      minimum: 2,
      maximum: 80,
    });

    setNameError(error ?? '');

    if (error) {
      showMessage('Nome inválido', error);
      return;
    }

    setSaving(true);

    try {
      await saveCategory({
        slug: editing?.slug,
        name: normalizePlainText(name),
        imageUrl,
      });

      showMessage(
        editing
          ? 'Categoria atualizada'
          : 'Categoria criada',
        'A alteração já está disponível no catálogo e no cadastro de produtos.',
      );

      resetForm();
    } catch (error) {
      showMessage(
        'Não foi possível salvar',
        error instanceof Error
          ? error.message
          : 'Tente novamente.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeCategory(
    category: Category,
  ) {
    if (deletingSlug) {
      return;
    }

    setDeletingSlug(category.slug);

    try {
      await archiveCategory(
        category.slug,
      );

      if (
        editing?.slug === category.slug
      ) {
        resetForm();
      }

      showMessage(
        'Categoria excluída',
        'A categoria foi retirada do catálogo.',
      );
    } catch (error) {
      showMessage(
        'Não foi possível excluir',
        error instanceof Error
          ? error.message
          : 'Tente novamente.',
      );
    } finally {
      setDeletingSlug(null);
    }
  }

  function confirmRemove(
    category: Category,
  ) {
    const count =
      categoryRows.find(
        (item) =>
          item.category.slug ===
          category.slug,
      )?.productCount ?? 0;

    if (count > 0) {
      showMessage(
        'Categoria em uso',
        `Existem ${count} produto(s) ativo(s) nesta categoria. Mova ou exclua esses produtos antes de remover a categoria.`,
      );

      return;
    }

    const message =
      `Deseja excluir a categoria "${category.name}"?`;

    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined'
    ) {
      if (window.confirm(message)) {
        void removeCategory(category);
      }

      return;
    }

    Alert.alert(
      'Excluir categoria',
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
            void removeCategory(
              category,
            ),
        },
      ],
    );
  }

  const columns =
    useMemo<
      AdminTableColumn<CategoryRow>[]
    >(
      () => [
        {
          key: 'category',
          label: 'Categoria',
          minWidth: 250,
          flex: 1,
          render: (item) => (
            <View
              style={
                styles.categoryCell
              }>
              <ProductImage
                uri={
                  item.category.imageUrl
                }
                style={
                  styles.categoryImage
                }
              />

              <View
                style={
                  styles.categoryCopy
                }>
                <AdminTableText bold>
                  {item.category.name}
                </AdminTableText>

                <AdminTableText muted>
                  {item.category.slug}
                </AdminTableText>
              </View>
            </View>
          ),
        },
        {
          key: 'products',
          label: 'Produtos',
          width: 120,
          align: 'center',
          render: (item) => (
            <AdminTableText bold>
              {String(
                item.productCount,
              )}
            </AdminTableText>
          ),
        },
        {
          key: 'status',
          label: 'Situação',
          width: 140,
          align: 'center',
          render: (item) =>
            item.productCount > 0 ? (
              <AdminTableBadge
                label="Em uso"
                tone="success"
              />
            ) : (
              <AdminTableBadge
                label="Sem produtos"
                tone="warning"
              />
            ),
        },
        {
          key: 'actions',
          label: 'Ações',
          width: 115,
          align: 'center',
          render: (item) => (
            <View
              style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Editar ${item.category.name}`}
                onPress={() =>
                  beginEdit(
                    item.category,
                  )
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
                accessibilityLabel={`Excluir ${item.category.name}`}
                disabled={
                  deletingSlug !== null
                }
                onPress={() =>
                  confirmRemove(
                    item.category,
                  )
                }
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.deleteButton,
                  (pressed ||
                    deletingSlug !==
                      null) &&
                    styles.actionPressed,
                ]}>
                {deletingSlug ===
                item.category.slug ? (
                  <ActivityIndicator
                    size="small"
                    color={
                      colors.danger
                    }
                  />
                ) : (
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color={
                      colors.danger
                    }
                  />
                )}
              </Pressable>
            </View>
          ),
        },
      ],
      [
        categoryRows,
        deletingSlug,
        editing,
      ],
    );

  return (
    <AdminGuard>
      <AdminPage
        eyebrow="Gestão de loja"
        title="Categorias"
        description="Organize as seções do catálogo e defina uma imagem de capa para cada categoria.">
        <View style={styles.metrics}>
          <AdminStatCard
            compact
            icon="grid-outline"
            label="Categorias"
            value={String(
              metrics.total,
            )}
            helper="Total cadastrado"
          />

          <AdminStatCard
            compact
            icon="checkmark-circle-outline"
            label="Categorias em uso"
            value={String(
              metrics.withProducts,
            )}
            helper="Com produtos ativos"
            tone="success"
          />

          <AdminStatCard
            compact
            icon="file-tray-outline"
            label="Categorias vazias"
            value={String(
              metrics.empty,
            )}
            helper="Sem produtos ativos"
            tone={
              metrics.empty > 0
                ? 'warning'
                : 'success'
            }
          />

          <AdminStatCard
            compact
            icon="shirt-outline"
            label="Produtos organizados"
            value={String(
              metrics.products,
            )}
            helper="Distribuídos nas categorias"
            tone="info"
          />
        </View>

        <AdminFormSection
          title={
            editing
              ? 'Editar categoria'
              : 'Criar categoria'
          }
          description={
            editing
              ? `Você está editando “${editing.name}”.`
              : 'Cadastre uma nova seção para organizar os produtos da loja.'
          }>
          <View style={styles.formLayout}>
            <View
              style={
                styles.imageColumn
              }>
              {imageUrl ? (
                <ProductImage
                  uri={imageUrl}
                  style={styles.preview}
                />
              ) : (
                <View
                  style={
                    styles.previewEmpty
                  }>
                  <Ionicons
                    name="image-outline"
                    size={28}
                    color={
                      colors.textMuted
                    }
                  />

                  <Text
                    style={
                      styles.previewEmptyText
                    }>
                    Sem capa
                  </Text>
                </View>
              )}

              <Pressable
                accessibilityRole="button"
                disabled={uploading}
                onPress={() =>
                  void pickImage()
                }
                style={({ pressed }) => [
                  styles.imageButton,
                  pressed &&
                    styles.actionPressed,
                ]}>
                {uploading ? (
                  <ActivityIndicator
                    size="small"
                    color="#8B541B"
                  />
                ) : (
                  <Ionicons
                    name="image-outline"
                    size={16}
                    color="#8B541B"
                  />
                )}

                <Text
                  style={
                    styles.imageButtonText
                  }>
                  {uploading
                    ? 'Enviando...'
                    : 'Escolher capa'}
                </Text>
              </Pressable>
            </View>

            <View
              style={styles.formFields}>
              <AdminField
                label="Nome da categoria"
                value={name}
                onChangeText={(value) => {
                  setName(value);

                  if (nameError) {
                    setNameError('');
                  }
                }}
                placeholder="Ex.: Vestidos"
                maxLength={80}
                error={nameError}
                required
                fullWidth
              />

              <AdminField
                label="URL da imagem"
                value={imageUrl}
                onChangeText={
                  setImageUrl
                }
                placeholder="A URL será preenchida ao escolher uma imagem"
                helper="Também é possível informar uma URL manualmente."
                autoCapitalize="none"
                fullWidth
              />
            </View>
          </View>

          <AdminFormActions>
            {editing ? (
              <AdminToolbarButton
                label="Cancelar edição"
                icon="close"
                onPress={resetForm}
              />
            ) : null}

            <AdminToolbarButton
              label={
                editing
                  ? 'Salvar alterações'
                  : 'Criar categoria'
              }
              icon={
                editing
                  ? 'save-outline'
                  : 'add'
              }
              variant="primary"
              disabled={
                saving || uploading
              }
              onPress={() =>
                void handleSave()
              }
            />
          </AdminFormActions>
        </AdminFormSection>

        <AdminSection
          title="Categorias atuais"
          description="Para excluir uma categoria, primeiro mova ou exclua os produtos associados a ela.">
          <AdminTable
            columns={columns}
            data={categoryRows}
            keyExtractor={(item) =>
              item.category.slug
            }
            emptyIcon="grid-outline"
            emptyTitle="Nenhuma categoria cadastrada"
            emptyDescription="Crie a primeira categoria usando o formulário acima."
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

  formLayout: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: spacing.lg,
  },

  imageColumn: {
    width: 150,
    alignItems: 'stretch',
    gap: spacing.sm,
  },

  preview: {
    width: 150,
    height: 150,
    borderRadius: radii.medium,
    backgroundColor: '#F4ECE3',
  },

  previewEmpty: {
    width: 150,
    height: 150,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D8C8B7',
    borderRadius: radii.medium,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: '#F8F3ED',
  },

  previewEmptyText: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },

  imageButton: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: '#D4C0AA',
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: '#F7EEE5',
  },

  imageButtonText: {
    color: '#7D4D1E',
    fontSize: 10,
    fontWeight: '900',
  },

  formFields: {
    minWidth: 260,
    flex: 1,
    gap: spacing.md,
  },

  categoryCell: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  categoryImage: {
    width: 48,
    height: 48,
    borderRadius: radii.small,
    backgroundColor: '#F3ECE5',
  },

  categoryCopy: {
    minWidth: 0,
    flex: 1,
    gap: 2,
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
    borderColor:
      'rgba(188,72,72,0.2)',
    backgroundColor:
      colors.dangerSoft,
  },

  actionPressed: {
    opacity: 0.55,
  },
});