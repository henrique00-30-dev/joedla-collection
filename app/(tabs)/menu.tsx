import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Href, router } from 'expo-router';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/src/components/app-header';
import { Screen } from '@/src/components/screen';
import { useStore } from '@/src/context/store-context';
import { colors, fonts, radii, spacing } from '@/src/theme';
import { openStoreWhatsApp } from '@/src/utils/whatsapp';

type MenuOption = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

export default function MenuScreen() {
  const { settings } = useStore();

  async function handleWhatsApp() {
    if (!(await openStoreWhatsApp(settings))) {
      Alert.alert('WhatsApp não configurado', 'O contato da loja ainda não está disponível.');
    }
  }

  async function handleInstagram() {
    const username = settings.instagram.replace(/^@/, '').trim();
    if (!username) {
      Alert.alert('Instagram não configurado', 'O perfil da loja ainda não foi cadastrado.');
      return;
    }
    await Linking.openURL(`https://instagram.com/${username}`);
  }

  const groups: { title: string; items: MenuOption[] }[] = [
    {
      title: 'Comprar',
      items: [
        { icon: 'sparkles-outline', label: 'Novidades', onPress: () => router.replace('/') },
        { icon: 'grid-outline', label: 'Categorias', onPress: () => router.push('/(tabs)/categories') },
        { icon: 'heart-outline', label: 'Favoritos', onPress: () => router.push('/favorites') },
      ],
    },
    {
      title: 'Meus pedidos',
      items: [
        { icon: 'receipt-outline', label: 'Acompanhar pedidos', onPress: () => router.push('/(tabs)/orders') },
        { icon: 'person-circle-outline', label: 'Minha conta (opcional)', onPress: () => router.push('/account' as Href) },
      ],
    },
    {
      title: 'Atendimento',
      items: [
        { icon: 'logo-whatsapp', label: 'Falar com a loja', onPress: handleWhatsApp },
        { icon: 'help-circle-outline', label: 'Entrega, retirada e como comprar', onPress: () => router.push('/how-to-buy') },
      ],
    },
    {
      title: 'Informações',
      items: [
        { icon: 'logo-instagram', label: 'Instagram', onPress: handleInstagram },
        { icon: 'shield-checkmark-outline', label: 'Privacidade e segurança', onPress: () => router.push('/privacy' as Href) },
      ],
    },
  ];

  return (
    <Screen>
      <AppHeader compact title="Menu" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator>
        <View style={styles.brandCard}>
          <Image source={require('@/assets/images/joedla-logo.png')} contentFit="contain" style={styles.logo} />
          <View style={styles.brandCopy}>
            <Text style={styles.brandName}>JOEDLA COLLECTION</Text>
            <Text style={styles.delivery}>{settings.deliveryMessage}</Text>
          </View>
        </View>

        {groups.map((group) => (
          <View key={group.title} style={styles.group}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.menuCard}>
              {group.items.map((item, index) => (
                <MenuItem key={item.label} {...item} last={index === group.items.length - 1} />
              ))}
            </View>
          </View>
        ))}

        <Text style={styles.version}>Joedla Collection • Loja online</Text>
      </ScrollView>
    </Screen>
  );
}

function MenuItem({ icon, label, onPress, last = false }: MenuOption & { last?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.menuItem, !last && styles.menuItemBorder, pressed && styles.pressed]}>
      <View style={styles.menuIcon}>
        <Ionicons name={icon} size={21} color={colors.primary} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={19} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 760, padding: spacing.lg, paddingBottom: spacing.xxl, alignSelf: 'center', gap: spacing.xl },
  brandCard: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.large,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
  },
  logo: { width: 86, height: 86 },
  brandCopy: { flex: 1 },
  brandName: { fontFamily: fonts.display, color: colors.primaryDark, fontSize: 19, fontWeight: '800', letterSpacing: 1.4 },
  delivery: { marginTop: spacing.xs, color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  group: { gap: spacing.sm },
  groupTitle: { paddingHorizontal: spacing.xs, color: colors.primaryDark, fontSize: 12, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  menuCard: { overflow: 'hidden', borderWidth: 1, borderColor: colors.border, borderRadius: radii.large, backgroundColor: colors.surface },
  menuItem: { minHeight: 66, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  pressed: { backgroundColor: colors.surfaceWarm },
  menuIcon: { width: 38, height: 38, borderRadius: radii.small, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceWarm },
  menuLabel: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '700' },
  version: { color: colors.textMuted, fontSize: 11, textAlign: 'center' },
});
