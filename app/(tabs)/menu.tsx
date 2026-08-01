import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/src/components/app-header';
import { Screen } from '@/src/components/screen';
import { useStore } from '@/src/context/store-context';
import { colors, radii, shadow, spacing } from '@/src/theme';
import { openStoreWhatsApp } from '@/src/utils/whatsapp';

export default function MenuScreen() {
  const { settings, cloudEnabled, isAdmin } = useStore();

  async function handleWhatsApp() {
    if (!(await openStoreWhatsApp(settings))) {
      Alert.alert(
        'WhatsApp não configurado',
        'Cadastre o número da loja na área administrativa.',
      );
    }
  }

  return (
    <Screen>
      <AppHeader compact title="Menu" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator>
        <View style={styles.brandCard}>
          <Image
            source={require('@/assets/images/joedla-logo.png')}
            contentFit="contain"
            style={styles.logo}
          />
          <Text style={styles.delivery}>{settings.deliveryMessage}</Text>
          <View style={[styles.mode, cloudEnabled ? styles.modeCloud : styles.modeOffline]}>
            <Ionicons
              name={cloudEnabled ? 'cloud-done-outline' : 'cloud-offline-outline'}
              size={15}
              color={cloudEnabled ? colors.success : colors.danger}
            />
            <Text style={[styles.modeText, { color: cloudEnabled ? colors.success : colors.danger }]}>
              {cloudEnabled ? 'Loja online' : 'Conexão indisponível'}
            </Text>
          </View>
        </View>

        <View style={styles.menuCard}>
          <MenuItem
            icon="heart-outline"
            label="Meus favoritos"
            onPress={() => router.push('/favorites')}
          />
          <MenuItem
            icon="help-circle-outline"
            label="Como comprar"
            onPress={() => router.push('/how-to-buy')}
          />
          <MenuItem
            icon="logo-whatsapp"
            label="Falar com a loja"
            onPress={handleWhatsApp}
          />
          <MenuItem
            icon="shield-checkmark-outline"
            label={isAdmin ? 'Abrir painel administrativo' : 'Área administrativa'}
            onPress={() => router.push(isAdmin ? '/admin' : '/admin/login')}
            last
          />
        </View>

        <Text style={styles.version}>Joedla Collection • Versão 1.0.0</Text>
      </ScrollView>
    </Screen>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        !last && styles.menuItemBorder,
        pressed && styles.pressed,
      ]}>
      <View style={styles.menuIcon}>
        <Ionicons name={icon} size={21} color={colors.primary} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={19} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  brandCard: {
    padding: spacing.lg,
    borderRadius: radii.large,
    alignItems: 'center',
    backgroundColor: colors.surface,
    ...shadow,
  },
  logo: {
    width: 190,
    height: 150,
  },
  delivery: {
    marginTop: -8,
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  mode: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modeCloud: {
    backgroundColor: colors.successSoft,
  },
  modeOffline: {
    backgroundColor: colors.dangerSoft,
  },
  modeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  menuCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.large,
    backgroundColor: colors.surface,
  },
  menuItem: {
    minHeight: 66,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pressed: {
    backgroundColor: colors.surfaceWarm,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.small,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },
  menuLabel: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  version: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
  },
});
