import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Href, router } from 'expo-router';
import { useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppHeader } from '@/src/components/app-header';
import { Screen } from '@/src/components/screen';
import { useStore } from '@/src/context/store-context';
import { colors, fonts, radii, shadow, spacing } from '@/src/theme';
import { openStoreWhatsApp } from '@/src/utils/whatsapp';

type MenuOption = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  onPress: () => void;
};

function instagramUrl(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const username = raw.replace(/^@/, '').replace(/^instagram\.com\//i, '').replace(/\/$/, '').trim();
  if (!username) return null;
  return `https://www.instagram.com/${username}/`;
}

export default function MenuScreen() {
  const { settings } = useStore();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const [channelMessage, setChannelMessage] = useState('');

  async function handleWhatsApp() {
    setChannelMessage('');
    try {
      if (!(await openStoreWhatsApp(settings))) {
        setChannelMessage('O WhatsApp da loja ainda não foi configurado no painel administrativo.');
      }
    } catch {
      setChannelMessage('Não foi possível abrir o WhatsApp agora. Tente novamente ou confira o número cadastrado no painel.');
    }
  }

  async function handleInstagram() {
    setChannelMessage('');
    const url = instagramUrl(settings.instagram);
    if (!url) {
      setChannelMessage('O Instagram da loja ainda não foi configurado no painel administrativo.');
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      setChannelMessage('Não foi possível abrir o Instagram agora. Confira o perfil cadastrado no painel.');
    }
  }

  const groups: { title: string; items: MenuOption[] }[] = [
    {
      title: 'Comprar',
      items: [
        { icon: 'sparkles-outline', label: 'Novidades', description: 'Veja os destaques mais recentes', onPress: () => router.replace('/') },
        { icon: 'grid-outline', label: 'Categorias', description: 'Explore todos os departamentos', onPress: () => router.push('/(tabs)/categories') },
        { icon: 'heart-outline', label: 'Favoritos', description: 'Consulte os produtos que você salvou', onPress: () => router.push('/favorites') },
      ],
    },
    {
      title: 'Minha conta',
      items: [
        { icon: 'receipt-outline', label: 'Acompanhar pedidos', description: 'Consulte o andamento das suas compras', onPress: () => router.push('/(tabs)/orders') },
        { icon: 'person-circle-outline', label: 'Minha conta', description: 'Pedidos, avaliações, pontos e notificações', onPress: () => router.push('/account' as Href) },
        { icon: 'shield-checkmark-outline', label: 'Segurança, endereços e privacidade', description: 'Senha, endereços, cupons e solicitações LGPD', onPress: () => router.push('/account-settings' as Href) },
      ],
    },
    {
      title: 'Atendimento',
      items: [
        { icon: 'logo-whatsapp', label: 'Falar com a loja', description: settings.whatsappNumber.trim() ? 'Atendimento direto pelo WhatsApp' : 'WhatsApp ainda não configurado', onPress: handleWhatsApp },
        { icon: 'help-circle-outline', label: 'Entrega, retirada e como comprar', description: 'Veja as principais orientações', onPress: () => router.push('/how-to-buy') },
      ],
    },
    {
      title: 'Informações',
      items: [
        { icon: 'logo-instagram', label: 'Instagram', description: settings.instagram.trim() ? 'Acompanhe novidades e lançamentos' : 'Instagram ainda não configurado', onPress: handleInstagram },
        { icon: 'document-text-outline', label: 'Política de privacidade', description: 'Saiba como seus dados são protegidos', onPress: () => router.push('/privacy' as Href) },
      ],
    },
  ];

  return (
    <Screen>
      <AppHeader compact title="Menu" showBack showStoreHome />
      <ScrollView contentContainerStyle={[styles.content, desktop && styles.contentDesktop]} showsVerticalScrollIndicator>
        <View style={styles.brandCard}>
          <View style={styles.brandGlow} />
          <Image source={require('@/assets/images/joedla-logo.png')} contentFit="contain" style={styles.logo} />
          <View style={styles.brandCopy}>
            <Text style={styles.brandEyebrow}>JOEDLA COLLECTION</Text>
            <Text style={styles.brandName}>Moda e atendimento em um só lugar</Text>
            {settings.deliveryMessage.trim() ? <Text style={styles.delivery}>{settings.deliveryMessage}</Text> : null}
          </View>
        </View>

        {channelMessage ? (
          <View style={styles.channelNotice}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.channelNoticeText}>{channelMessage}</Text>
          </View>
        ) : null}

        <View style={[styles.groupsGrid, desktop && styles.groupsGridDesktop]}>
          {groups.map((group) => (
            <View key={group.title} style={styles.group}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              <View style={styles.menuCard}>
                {group.items.map((item, index) => <MenuItem key={item.label} {...item} last={index === group.items.length - 1} />)}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.quickActions}>
          <Pressable accessibilityRole="button" onPress={handleWhatsApp} style={({ pressed }) => [styles.quickAction, styles.quickActionWhatsapp, pressed && styles.quickActionPressed]}>
            <Ionicons name="logo-whatsapp" size={20} color={colors.white} />
            <Text style={styles.quickActionText}>WhatsApp</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={handleInstagram} style={({ pressed }) => [styles.quickAction, styles.quickActionInstagram, pressed && styles.quickActionPressed]}>
            <Ionicons name="logo-instagram" size={20} color={colors.white} />
            <Text style={styles.quickActionText}>Instagram</Text>
          </Pressable>
        </View>

        <Text style={styles.version}>Joedla Collection • Loja online</Text>
      </ScrollView>
    </Screen>
  );
}

function MenuItem({ icon, label, description, onPress, last = false }: MenuOption & { last?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.menuItem, !last && styles.menuItemBorder, pressed && styles.pressed]}>
      <View style={styles.menuIcon}><Ionicons name={icon} size={21} color={colors.primary} /></View>
      <View style={styles.menuCopy}>
        <Text style={styles.menuLabel}>{label}</Text>
        {description ? <Text numberOfLines={2} style={styles.menuDescription}>{description}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', padding: spacing.lg, paddingBottom: spacing.xxl, alignSelf: 'center', gap: spacing.xl },
  contentDesktop: { maxWidth: 980, paddingHorizontal: spacing.xxl, paddingTop: spacing.xxl },
  brandCard: { position: 'relative', overflow: 'hidden', minHeight: 170, padding: spacing.xl, borderWidth: 1, borderColor: 'rgba(111,76,56,0.12)', borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: spacing.xl, backgroundColor: '#21150F', ...shadow },
  brandGlow: { position: 'absolute', right: -50, top: -70, width: 210, height: 210, borderRadius: 105, backgroundColor: 'rgba(216,179,106,0.13)' },
  logo: { width: 100, height: 100 },
  brandCopy: { minWidth: 0, flex: 1 },
  brandEyebrow: { color: '#D8B36A', fontSize: 10, fontWeight: '900', letterSpacing: 2.3 },
  brandName: { maxWidth: 520, marginTop: spacing.sm, fontFamily: fonts.display, color: colors.white, fontSize: 25, lineHeight: 31, fontWeight: '800' },
  delivery: { maxWidth: 540, marginTop: spacing.md, color: '#D8C7B8', fontSize: 12, lineHeight: 18 },
  channelNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radii.medium, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceWarm },
  channelNoticeText: { minWidth: 0, flex: 1, color: colors.text, fontSize: 12, lineHeight: 18 },
  groupsGrid: { gap: spacing.xl },
  groupsGridDesktop: { flexDirection: 'row', flexWrap: 'wrap' },
  group: { minWidth: 280, flex: 1, gap: spacing.sm },
  groupTitle: { paddingHorizontal: spacing.xs, color: colors.primaryDark, fontSize: 11, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase' },
  menuCard: { overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(111,76,56,0.12)', borderRadius: 20, backgroundColor: '#FFFEFC', ...shadow },
  menuItem: { minHeight: 78, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  pressed: { backgroundColor: colors.surfaceWarm },
  menuIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceWarm },
  menuCopy: { minWidth: 0, flex: 1 },
  menuLabel: { color: colors.text, fontSize: 14, fontWeight: '900' },
  menuDescription: { marginTop: 3, color: colors.textMuted, fontSize: 10, lineHeight: 15 },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  quickAction: { minWidth: 180, minHeight: 48, flex: 1, borderRadius: radii.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, ...shadow },
  quickActionWhatsapp: { backgroundColor: '#1F7A4D' },
  quickActionInstagram: { backgroundColor: '#8B451C' },
  quickActionPressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  quickActionText: { color: colors.white, fontSize: 12, fontWeight: '900' },
  version: { color: colors.textMuted, fontSize: 10, textAlign: 'center' },
});
