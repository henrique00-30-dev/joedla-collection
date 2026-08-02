import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useStore } from '@/src/context/store-context';
import { colors, fonts, spacing } from '@/src/theme';
import { openStoreWhatsApp } from '@/src/utils/whatsapp';

export function StoreFooter() {
  const { settings } = useStore();
  const { width } = useWindowDimensions();
  const desktop = width >= 760;

  async function openWhatsApp() {
    if (!(await openStoreWhatsApp(settings))) {
      Alert.alert('WhatsApp não configurado', 'O contato da loja ainda não está disponível.');
    }
  }

  return (
    <View style={styles.footer}>
      <View style={[styles.inner, desktop && styles.innerDesktop]}>
        <View style={styles.brandColumn}>
          <Text style={styles.brand}>JOEDLA COLLECTION</Text>
          <Text style={styles.tagline}>Moda escolhida com cuidado para você.</Text>
        </View>
        <View style={styles.column}>
          <Text style={styles.heading}>Comprar</Text>
          <FooterLink label="Categorias" onPress={() => router.push('/(tabs)/categories')} />
          <FooterLink label="Favoritos" onPress={() => router.push('/favorites')} />
          <FooterLink label="Como comprar" onPress={() => router.push('/how-to-buy')} />
        </View>
        <View style={styles.column}>
          <Text style={styles.heading}>Atendimento</Text>
          <FooterLink label="Falar no WhatsApp" onPress={openWhatsApp} icon="logo-whatsapp" />
          <Text style={styles.muted}>{settings.city}</Text>
          <Text style={styles.muted}>{settings.deliveryMessage}</Text>
        </View>
      </View>
      <View style={styles.bottom}>
        <Text style={styles.copyright}>© {new Date().getFullYear()} Joedla Collection</Text>
        <Text style={styles.copyright}>Compra segura e atendimento personalizado</Text>
      </View>
    </View>
  );
}

function FooterLink({
  label,
  onPress,
  icon,
}: {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
      {icon ? <Ionicons name={icon} size={16} color={colors.primarySoft} /> : null}
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  footer: { marginTop: 64, backgroundColor: colors.primaryDark },
  inner: { width: '100%', maxWidth: 1200, padding: spacing.xxl, alignSelf: 'center', gap: spacing.xl },
  innerDesktop: { flexDirection: 'row', justifyContent: 'space-between' },
  brandColumn: { maxWidth: 360, gap: spacing.sm },
  column: { minWidth: 190, gap: spacing.sm },
  brand: { fontFamily: fonts.display, color: colors.white, fontSize: 23, fontWeight: '800', letterSpacing: 2 },
  tagline: { color: '#E9D9C5', fontSize: 13, lineHeight: 21 },
  heading: { marginBottom: spacing.xs, color: colors.white, fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  link: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  linkText: { color: '#F4EADF', fontSize: 13 },
  muted: { color: '#D9C7B5', fontSize: 12, lineHeight: 18 },
  pressed: { opacity: 0.6 },
  bottom: {
    width: '100%',
    maxWidth: 1200,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  copyright: { color: '#CDB9A6', fontSize: 11 },
});
