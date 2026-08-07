import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { useStore } from '@/src/context/store-context';
import { colors, fonts, radii, shadow, spacing } from '@/src/theme';
import { openStoreWhatsApp } from '@/src/utils/whatsapp';

function instagramUrl(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const username = raw.replace(/^@/, '').replace(/^instagram\.com\//i, '').replace(/\/$/, '').trim();
  return username ? `https://www.instagram.com/${username}/` : null;
}

export function StoreFooter() {
  const { settings } = useStore();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const tablet = width >= 640 && width < 900;

  async function openWhatsApp() {
    try {
      if (!(await openStoreWhatsApp(settings))) {
        Alert.alert('WhatsApp não configurado', 'O contato da loja ainda não está disponível.');
      }
    } catch {
      Alert.alert('WhatsApp indisponível', 'Não foi possível abrir o WhatsApp agora.');
    }
  }

  async function openInstagram() {
    const url = instagramUrl(settings.instagram);
    if (!url) {
      Alert.alert('Instagram não configurado', 'O perfil da loja ainda não está disponível.');
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Instagram indisponível', 'Não foi possível abrir o Instagram agora.');
    }
  }

  return (
    <View style={styles.footer}>
      <View style={styles.newsletterArea}>
        <View style={[styles.newsletterInner, desktop && styles.newsletterInnerDesktop]}>
          <View style={styles.newsletterCopy}>
            <Text style={styles.newsletterEyebrow}>JOEDLA COLLECTION</Text>
            <Text style={styles.newsletterTitle}>Atendimento próximo, moda escolhida com cuidado.</Text>
            <Text style={styles.newsletterText}>Fale com a loja, tire dúvidas e receba atendimento personalizado pelo WhatsApp.</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Falar com a loja no WhatsApp" onPress={openWhatsApp} style={({ pressed }) => [styles.whatsappButton, pressed && styles.buttonPressed]}>
            <Ionicons name="logo-whatsapp" size={20} color={colors.white} />
            <Text style={styles.whatsappButtonText}>Falar no WhatsApp</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.inner, desktop && styles.innerDesktop, tablet && styles.innerTablet]}>
        <View style={styles.brandColumn}>
          <Pressable accessibilityRole="button" accessibilityLabel="Ir para o início" onPress={() => router.replace('/')} style={({ pressed }) => [styles.brandRow, pressed && styles.pressed]}>
            <Image source={require('@/assets/images/joedla-logo.png')} contentFit="contain" style={styles.logo} />
            <View>
              <Text style={styles.brand}>JOEDLA</Text>
              <Text style={styles.brandCollection}>COLLECTION</Text>
            </View>
          </Pressable>
          <Text style={styles.tagline}>Moda e acessórios selecionados para valorizar cada momento.</Text>
          <View style={styles.socialRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="Abrir Instagram" onPress={openInstagram} style={({ pressed }) => [styles.socialButton, pressed && styles.pressed]}>
              <Ionicons name="logo-instagram" size={19} color={colors.white} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Falar no WhatsApp" onPress={openWhatsApp} style={({ pressed }) => [styles.socialButton, pressed && styles.pressed]}>
              <Ionicons name="logo-whatsapp" size={19} color={colors.white} />
            </Pressable>
          </View>
        </View>

        <View style={styles.linksGrid}>
          <View style={styles.column}>
            <Text style={styles.heading}>Comprar</Text>
            <FooterLink label="Início" onPress={() => router.replace('/')} />
            <FooterLink label="Categorias" onPress={() => router.push('/(tabs)/categories')} />
            <FooterLink label="Favoritos" onPress={() => router.push('/favorites')} />
          </View>
          <View style={styles.column}>
            <Text style={styles.heading}>Ajuda</Text>
            <FooterLink label="Como comprar" onPress={() => router.push('/how-to-buy')} />
            <FooterLink label="Privacidade" onPress={() => router.push('/privacy')} />
          </View>
          <View style={styles.column}>
            <Text style={styles.heading}>Atendimento</Text>
            <FooterLink label="Falar no WhatsApp" onPress={openWhatsApp} icon="logo-whatsapp" />
            {settings.city.trim() ? <InfoRow icon="location-outline" text={settings.city} /> : null}
            {settings.deliveryMessage.trim() ? <InfoRow icon="car-outline" text={settings.deliveryMessage} /> : null}
          </View>
        </View>
      </View>

      <View style={styles.bottom}>
        <Text style={styles.copyright}>© {new Date().getFullYear()} Joedla Collection</Text>
        <Text style={styles.copyright}>Compra segura e atendimento personalizado</Text>
      </View>
    </View>
  );
}

function FooterLink({ label, onPress, icon }: { label: string; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}>
      {icon ? <Ionicons name={icon} size={16} color="#D8B36A" /> : null}
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  );
}

function InfoRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return <View style={styles.infoRow}><Ionicons name={icon} size={16} color="#D8B36A" /><Text style={styles.muted}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  footer: { marginTop: 72, backgroundColor: '#21150F' },
  newsletterArea: { paddingHorizontal: spacing.lg, backgroundColor: '#F3E7D7' },
  newsletterInner: { width: '100%', maxWidth: 1200, minHeight: 230, paddingVertical: spacing.xxl, alignSelf: 'center', gap: spacing.xl },
  newsletterInnerDesktop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  newsletterCopy: { maxWidth: 680 },
  newsletterEyebrow: { color: '#9D6A2F', fontSize: 10, fontWeight: '900', letterSpacing: 2.4 },
  newsletterTitle: { marginTop: spacing.sm, fontFamily: fonts.display, color: '#2E1B12', fontSize: 30, lineHeight: 37, fontWeight: '800' },
  newsletterText: { maxWidth: 620, marginTop: spacing.md, color: '#735A4B', fontSize: 13, lineHeight: 20 },
  whatsappButton: { minHeight: 52, paddingHorizontal: spacing.xl, borderRadius: radii.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: '#1F7A4D', ...shadow },
  whatsappButtonText: { color: colors.white, fontSize: 13, fontWeight: '900' },
  buttonPressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  inner: { width: '100%', maxWidth: 1200, paddingHorizontal: spacing.xxl, paddingVertical: 54, alignSelf: 'center', gap: spacing.xxl },
  innerDesktop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  innerTablet: { flexDirection: 'row', flexWrap: 'wrap' },
  brandColumn: { maxWidth: 360, gap: spacing.md },
  brandRow: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  logo: { width: 68, height: 68 },
  brand: { fontFamily: fonts.display, color: colors.white, fontSize: 25, fontWeight: '800', letterSpacing: 2.5 },
  brandCollection: { marginTop: -2, color: '#CDB9A6', fontSize: 9, fontWeight: '700', letterSpacing: 4.2 },
  tagline: { color: '#E5D4C4', fontSize: 13, lineHeight: 21 },
  socialRow: { flexDirection: 'row', gap: spacing.sm },
  socialButton: { width: 40, height: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  linksGrid: { minWidth: 0, flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: spacing.xxl },
  column: { minWidth: 175, gap: spacing.sm },
  heading: { marginBottom: spacing.xs, color: colors.white, fontSize: 12, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  link: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  linkPressed: { opacity: 0.64, transform: [{ translateX: 2 }] },
  linkText: { color: '#F4EADF', fontSize: 13 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  muted: { maxWidth: 210, flex: 1, color: '#CDB9A6', fontSize: 12, lineHeight: 18 },
  pressed: { opacity: 0.66 },
  bottom: { width: '100%', maxWidth: 1200, paddingHorizontal: spacing.xxl, paddingVertical: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.14)', alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm },
  copyright: { color: '#A9907D', fontSize: 10 },
});
