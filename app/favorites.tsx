import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppHeader } from '@/src/components/app-header';
import { ProductGrid } from '@/src/components/product-grid';
import { Screen } from '@/src/components/screen';
import { EmptyState } from '@/src/components/ui';
import { useStore } from '@/src/context/store-context';
import { colors, fonts, radii, shadow, spacing } from '@/src/theme';

export default function FavoritesScreen() {
  const { products, favorites } = useStore();
  const { width } = useWindowDimensions();

  const desktop = width >= 900;

  const favoriteProducts = products.filter((product) =>
    favorites.includes(product.id),
  );

  return (
    <Screen>
      <AppHeader
        compact
        title="Meus favoritos"
        showBack
        showStoreHome
      />

      {!favoriteProducts.length ? (
        <EmptyState
          icon="heart-outline"
          title="Nenhum favorito"
          message="Toque no coração dos produtos que você mais gostou."
          actionLabel="Ver produtos"
          onAction={() =>
            router.replace('/(tabs)/categories')
          }
        />
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            desktop && styles.contentDesktop,
          ]}
          showsVerticalScrollIndicator>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>
                SUA SELEÇÃO
              </Text>

              <Text style={styles.title}>
                Produtos que você salvou
              </Text>

              <Text style={styles.subtitle}>
                Reunimos aqui os itens marcados com coração para
                você comparar e decidir com calma.
              </Text>
            </View>

            <View style={styles.counter}>
              <View style={styles.counterIcon}>
                <Ionicons
                  name="heart"
                  size={18}
                  color={colors.danger}
                />
              </View>

              <View>
                <Text style={styles.counterValue}>
                  {favoriteProducts.length}
                </Text>

                <Text style={styles.counterLabel}>
                  {favoriteProducts.length === 1
                    ? 'produto salvo'
                    : 'produtos salvos'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.notice}>
            <Ionicons
              name="sparkles-outline"
              size={20}
              color={colors.primary}
            />

            <Text style={styles.noticeText}>
              Os preços e a disponibilidade podem mudar. Abra o
              produto para conferir os detalhes atualizados.
            </Text>
          </View>

          <ProductGrid products={favoriteProducts} />
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },

  contentDesktop: {
    maxWidth: 1180,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    alignSelf: 'center',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },

  headerCopy: {
    minWidth: 260,
    flex: 1,
  },

  eyebrow: {
    color: '#9D6A2F',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2.4,
  },

  title: {
    marginTop: spacing.xs,
    fontFamily: fonts.display,
    color: colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
  },

  subtitle: {
    maxWidth: 600,
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },

  counter: {
    minWidth: 180,
    minHeight: 74,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(111,76,56,0.12)',
    borderRadius: radii.large,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFFEFC',
    ...shadow,
  },

  counterIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerSoft,
  },

  counterValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },

  counterLabel: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 10,
  },

  notice: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(157,106,47,0.16)',
    borderRadius: radii.large,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFF8EC',
  },

  noticeText: {
    minWidth: 0,
    flex: 1,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 17,
  },
});