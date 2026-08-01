import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
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
import { Availability, CategorySlug, ProductDraft } from '@/src/types';

export default function ProductFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { products, categories, saveProduct, uploadProductImage } = useStore();
  const existing = products.find((product) => product.id === id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CategorySlug | null>(null);
  const [price, setPrice] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [sizes, setSizes] = useState('');
  const [colorsText, setColorsText] = useState('');
  const [availability, setAvailability] = useState<Availability>('ready');
  const [stock, setStock] = useState('1');
  const [featured, setFeatured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setDescription(existing.description);
    setCategory(existing.category);
    setPrice(existing.price.toFixed(2).replace('.', ','));
    setImages(existing.imageUrls);
    setSizes(existing.sizes.join(', '));
    setColorsText(existing.colors.join(', '));
    setAvailability(existing.availability);
    setStock(String(existing.stock));
    setFeatured(existing.featured);
  }, [existing]);

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permissão necessária',
        'Autorize o acesso às fotos para cadastrar imagens dos produtos.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.85,
    });

    if (result.canceled) return;

    setUploading(true);
    try {
      const asset = result.assets[0];
      const imageUrl = await uploadProductImage(
        asset.uri,
        asset.mimeType ?? 'image/jpeg',
      );
      setImages((current) => [...current, imageUrl]);
    } catch (error) {
      Alert.alert(
        'Não foi possível salvar a foto',
        error instanceof Error ? error.message : 'Tente novamente.',
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    // Bloqueio síncrono: impede dois ou mais cadastros quando o botão é tocado
    // repetidamente antes de o React atualizar o estado `saving`.
    if (savingRef.current) return;

    const parsedPrice = Number(price.replace(/\./g, '').replace(',', '.'));
    const parsedStock = Math.max(0, Number.parseInt(stock || '0', 10) || 0);

    if (name.trim().length < 3) {
      Alert.alert('Nome obrigatório', 'Informe o nome do produto.');
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      Alert.alert('Preço inválido', 'Informe um preço maior que zero.');
      return;
    }
    if (!category) {
      Alert.alert('Categoria obrigatória', 'Escolha em qual categoria o produto deve aparecer.');
      return;
    }

    const splitValues = (value: string) =>
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

    const draft: ProductDraft = {
      id: existing?.id,
      name: name.trim(),
      description: description.trim(),
      category,
      price: parsedPrice,
      imageUrls: images,
      sizes: splitValues(sizes),
      colors: splitValues(colorsText),
      availability,
      stock: availability === 'ready' ? parsedStock : 0,
      featured,
      active: true,
    };

    savingRef.current = true;
    setSaving(true);
    let savedSuccessfully = false;

    try {
      await saveProduct(draft);
      savedSuccessfully = true;

      // Sai da tela imediatamente depois do primeiro salvamento concluído.
      // O bloqueio permanece ativo até a tela ser desmontada.
      router.replace('/admin/products');
      const categoryName = categories.find((item) => item.slug === category)?.name;
      Alert.alert(
        'Produto salvo',
        `O produto foi salvo em ${categoryName ?? 'sua categoria'}.`,
      );
    } catch (error) {
      Alert.alert(
        'Não foi possível salvar',
        error instanceof Error ? error.message : 'Tente novamente.',
      );
    } finally {
      if (!savedSuccessfully) {
        savingRef.current = false;
        setSaving(false);
      }
    }
  }

  return (
    <AdminGuard>
      <Screen edges={['top', 'left', 'right', 'bottom']}>
        <AppHeader
          compact
          title={existing ? 'Editar produto' : 'Cadastrar produto'}
          showBack
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Fotos</Text>
            <Text style={styles.categoryHint}>
              Adicione quantas fotos precisar. A primeira será a capa e as demais aparecerão na galeria do produto.
            </Text>
            <ScrollView
              horizontal
              contentContainerStyle={styles.images}
              showsHorizontalScrollIndicator={false}>
              {images.map((uri, index) => (
                <View key={`${uri}-${index}`} style={styles.imageWrap}>
                  <ProductImage uri={uri} style={styles.image} />
                  <Pressable
                    accessibilityLabel="Remover foto"
                    onPress={() =>
                      setImages((current) => current.filter((_, itemIndex) => itemIndex !== index))
                    }
                    style={styles.removeImage}>
                    <Ionicons name="close" size={17} color={colors.white} />
                  </Pressable>
                  {index === 0 ? (
                    <View style={styles.cover}>
                      <Text style={styles.coverText}>Capa</Text>
                    </View>
                  ) : null}
                </View>
              ))}
              <Pressable disabled={uploading} onPress={pickImage} style={styles.addImage}>
                {uploading ? (
                  <Text style={styles.addImageText}>Enviando...</Text>
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={26} color={colors.primary} />
                    <Text style={styles.addImageText}>Adicionar foto</Text>
                  </>
                )}
              </Pressable>
            </ScrollView>

            <Text style={styles.sectionTitle}>Informações</Text>
            <View style={styles.card}>
              <Field
                label="Nome do produto"
                value={name}
                onChangeText={setName}
                placeholder="Ex.: Conjunto Fitness"
              />
              <Field
                label="Descrição"
                value={description}
                onChangeText={setDescription}
                placeholder="Detalhes, tecido e características"
                multiline
              />
              <Field
                label="Preço"
                value={price}
                onChangeText={setPrice}
                placeholder="0,00"
                keyboardType="decimal-pad"
              />
            </View>

            <Text style={styles.sectionTitle}>Categoria</Text>
            <Text style={styles.categoryHint}>
              Escolha uma categoria antes de salvar. O produto aparecerá somente nela e, se for destaque, também na página inicial.
            </Text>
            <View style={styles.chips}>
              {categories.map((item) => (
                <ChoiceChip
                  key={item.slug}
                  active={category === item.slug}
                  label={item.name}
                  onPress={() => setCategory(item.slug)}
                />
              ))}
            </View>

            <Text style={styles.sectionTitle}>Disponibilidade</Text>
            <View style={styles.chips}>
              <ChoiceChip
                active={availability === 'ready'}
                label="Pronta entrega"
                onPress={() => setAvailability('ready')}
              />
              <ChoiceChip
                active={availability === 'custom'}
                label="Por encomenda"
                onPress={() => setAvailability('custom')}
              />
            </View>

            <View style={styles.card}>
              {availability === 'ready' ? (
                <Field
                  label="Quantidade em estoque"
                  value={stock}
                  onChangeText={setStock}
                  placeholder="0"
                  keyboardType="number-pad"
                />
              ) : (
                <View style={styles.customInfo}>
                  <Ionicons name="time-outline" size={21} color={colors.warning} />
                  <Text style={styles.customInfoText}>
                    O produto aparecerá como encomenda e não exigirá quantidade em estoque.
                  </Text>
                </View>
              )}
              <Field
                label="Tamanhos, separados por vírgula"
                value={sizes}
                onChangeText={setSizes}
                placeholder="P, M, G, GG"
                autoCapitalize="characters"
              />
              <Field
                label="Cores, separadas por vírgula"
                value={colorsText}
                onChangeText={setColorsText}
                placeholder="Preto, Marrom, Rosa"
                autoCapitalize="words"
              />
              <View style={styles.switchRow}>
                <View style={styles.switchText}>
                  <Text style={styles.switchTitle}>Produto em destaque</Text>
                  <Text style={styles.switchDescription}>
                    Mostrar este produto na tela inicial
                  </Text>
                </View>
                <Switch
                  value={featured}
                  onValueChange={setFeatured}
                  trackColor={{ false: colors.border, true: colors.primarySoft }}
                  thumbColor={featured ? colors.primary : colors.white}
                />
              </View>
            </View>
          </ScrollView>
          <View style={styles.footer}>
            <Button loading={saving} onPress={handleSave}>
              Salvar produto
            </Button>
          </View>
        </KeyboardAvoidingView>
      </Screen>
    </AdminGuard>
  );
}

function ChoiceChip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  sectionTitle: {
    marginTop: spacing.sm,
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  categoryHint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  images: {
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  imageWrap: {
    width: 126,
    height: 156,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: radii.medium,
  },
  removeImage: {
    position: 'absolute',
    right: 6,
    top: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
  },
  cover: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  coverText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '900',
  },
  addImage: {
    width: 126,
    height: 156,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primarySoft,
    borderRadius: radii.medium,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceWarm,
  },
  addImageText: {
    maxWidth: 90,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  card: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    gap: spacing.lg,
    backgroundColor: colors.surface,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  chipTextActive: {
    color: colors.white,
  },
  customInfo: {
    padding: spacing.md,
    borderRadius: radii.small,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.warningSoft,
  },
  customInfoText: {
    flex: 1,
    color: colors.warning,
    fontSize: 11,
    lineHeight: 16,
  },
  switchRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  switchText: {
    flex: 1,
    gap: 3,
  },
  switchTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  switchDescription: {
    color: colors.textMuted,
    fontSize: 11,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
