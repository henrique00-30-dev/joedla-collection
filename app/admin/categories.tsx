import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
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
import { Button, Field } from '@/src/components/ui';
import { useStore } from '@/src/context/store-context';
import { colors, radii, spacing } from '@/src/theme';
import { Category } from '@/src/types';
import { normalizePlainText, validatePlainText } from '@/src/utils/fields';

export default function AdminCategoriesScreen() {
  const {
    categories,
    products,
    saveCategory,
    archiveCategory,
    uploadProductImage,
  } = useStore();
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [nameError, setNameError] = useState('');

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
  }

  function showMessage(title: string, message: string) {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(`${title}\n\n${message}`);
      return;
    }
    Alert.alert(title, message);
  }

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showMessage('Permissão necessária', 'Autorize o acesso às fotos para escolher a capa.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled) return;

    setUploading(true);
    try {
      const asset = result.assets[0];
      setImageUrl(await uploadProductImage(asset.uri, asset.mimeType ?? 'image/jpeg'));
    } catch (error) {
      showMessage(
        'Não foi possível salvar a foto',
        error instanceof Error ? error.message : 'Tente novamente.',
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    const error = validatePlainText(name, { minimum: 2, maximum: 80 });
    setNameError(error ?? '');
    if (error) {
      showMessage('Nome inválido', error);
      return;
    }

    setSaving(true);
    try {
      await saveCategory({ slug: editing?.slug, name: normalizePlainText(name), imageUrl });
      showMessage(
        editing ? 'Categoria renomeada' : 'Categoria criada',
        'A alteração já está disponível no catálogo e no cadastro de produtos.',
      );
      resetForm();
    } catch (error) {
      showMessage(
        'Não foi possível salvar',
        error instanceof Error ? error.message : 'Tente novamente.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeCategory(category: Category) {
    if (deletingSlug) return;
    setDeletingSlug(category.slug);
    try {
      await archiveCategory(category.slug);
      if (editing?.slug === category.slug) resetForm();
      showMessage('Categoria excluída', 'A categoria foi retirada do catálogo.');
    } catch (error) {
      showMessage(
        'Não foi possível excluir',
        error instanceof Error ? error.message : 'Tente novamente.',
      );
    } finally {
      setDeletingSlug(null);
    }
  }

  function confirmRemove(category: Category) {
    const message = `Deseja excluir a categoria "${category.name}"?`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(message)) void removeCategory(category);
      return;
    }
    Alert.alert('Excluir categoria', message, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => void removeCategory(category),
      },
    ]);
  }

  return (
    <AdminGuard>
      <Screen>
        <AppHeader compact title="Categorias" showBack showStoreHome />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator>
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              {editing ? 'Renomear categoria' : 'Criar nova categoria'}
            </Text>
            <Field
              label="Nome"
              value={name}
              onChangeText={setName}
              placeholder="Ex.: Acessórios"
              autoCapitalize="words"
              maxLength={80}
              error={nameError}
            />
            <View style={styles.imageRow}>
              {imageUrl ? (
                <ProductImage uri={imageUrl} style={styles.preview} />
              ) : (
                <View style={styles.previewEmpty}>
                  <Ionicons name="image-outline" size={28} color={colors.textMuted} />
                </View>
              )}
              <Button
                variant="secondary"
                icon="camera-outline"
                loading={uploading}
                onPress={pickImage}
                style={styles.imageButton}>
                Escolher capa
              </Button>
            </View>
            <Button loading={saving} onPress={handleSave}>
              {editing ? 'Salvar novo nome' : 'Criar categoria'}
            </Button>
            {editing ? (
              <Button variant="ghost" onPress={resetForm}>
                Cancelar edição
              </Button>
            ) : null}
          </View>

          <Text style={styles.sectionTitle}>Categorias atuais</Text>
          <Text style={styles.helpText}>
            Para excluir uma categoria, primeiro mova ou exclua os produtos que estão nela.
          </Text>
          {categories.map((category) => {
            const count = products.filter(
              (product) => product.active && product.category === category.slug,
            ).length;
            return (
              <View key={category.slug} style={styles.categoryCard}>
                <ProductImage uri={category.imageUrl} style={styles.categoryImage} />
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Text style={styles.categoryCount}>{count} produto(s)</Text>
                </View>
                <Pressable
                  accessibilityLabel={`Renomear ${category.name}`}
                  onPress={() => beginEdit(category)}
                  style={styles.iconButton}>
                  <Ionicons name="create-outline" size={21} color={colors.primary} />
                </Pressable>
                <Pressable
                  accessibilityLabel={`Excluir ${category.name}`}
                  disabled={deletingSlug !== null}
                  onPress={() => confirmRemove(category)}
                  style={styles.iconButton}>
                  {deletingSlug === category.slug ? (
                    <ActivityIndicator size="small" color={colors.danger} />
                  ) : (
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  )}
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      </Screen>
    </AdminGuard>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  formCard: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    gap: spacing.lg,
    backgroundColor: colors.surface,
  },
  formTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  imageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  preview: {
    width: 72,
    height: 72,
    borderRadius: radii.small,
  },
  previewEmpty: {
    width: 72,
    height: 72,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.small,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },
  imageButton: {
    flex: 1,
  },
  sectionTitle: {
    marginTop: spacing.md,
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  helpText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  categoryCard: {
    minHeight: 82,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  categoryImage: {
    width: 62,
    height: 62,
    borderRadius: radii.small,
  },
  categoryInfo: {
    flex: 1,
    gap: 4,
  },
  categoryName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  categoryCount: {
    color: colors.textMuted,
    fontSize: 11,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },
});
