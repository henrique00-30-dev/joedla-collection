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
  const phone = width < 600;
  const tablet = width >= 600 && width < 1024;
  const desktop = width >= 1024;
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
      title: 'Pedidos',
      items: [
        { icon: 'receipt-outline', label: 'Acompanhar pedidos', description: 'Consulte o andamento das suas compras', onPress: () => router.push('/(tabs)/orders') },
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
      <ScrollView
        contentContainerStyle={[
          styles.content,
          tablet && styles.contentTablet,
          desktop && styles.contentDesktop,
          phone && styles.contentPhone,
        ]}
        showsVerticalScrollIndicator>
        <View style={[styles.brandCard, phone && styles.brandCardPhone]}>
          <View style={styles.brandGlow} />
          <Image source={require('@/assets/images/joedla-logo.png')} contentFit="contain" style={[styles.logo, phone && styles.logoPhone]} />
          <View style={styles.brandCopy}>
            <Text style={styles.brandEyebrow}>JOEDLA COLLECTION</Text>
            <Text style={[styles.brandName, phone && styles.brandNamePhone]}>Moda e atendimento em um só lugar</Text>
            {settings.deliveryMessage.trim() ? <Text style={styles.delivery}>{settings.deliveryMessage}</Text> : null}
          </View>
        </View>

        {channelMessage ? (
          <View style={styles.channelNotice}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <Text style={styles.channelNoticeText}>{channelMessage}</Text>
          </View>
        ) : null}

        <View style={[styles.groupsGrid, tablet && styles.groupsGridTablet, desktop && styles.groupsGridDesktop]}>
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
        </View>

        <View style={[styles.quickActions, phone && styles.quickActionsPhone]}>
          <Pressable accessibilityRole="button" onPress={handleWhatsApp} style={({ pressed }) => [styles.quickAction, phone && styles.quickActionPhone, styles.quickActionWhatsapp, pressed && styles.quickActionPressed]}>
            <Ionicons name="logo-whatsapp" size={19} color={colors.white} />
            <Text style={styles.quickActionText}>WhatsApp</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={handleInstagram} style={({ pressed }) => [styles.quickAction, phone && styles.quickActionPhone, styles.quickActionInstagram, pressed && styles.quickActionPressed]}>
            <Ionicons name="logo-instagram" size={19} color={colors.white} />
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
      <View style={styles.menuIcon}><Ionicons name={icon} size={19} color={colors.primary} /></View>
      <View style={styles.menuCopy}>
        <Text style={styles.menuLabel}>{label}</Text>
        {description ? <Text numberOfLines={2} style={styles.menuDescription}>{description}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', minWidth: 0, padding: spacing.lg, paddingBottom: spacing.xxl, alignSelf: 'center', gap: spacing.lg },
  contentPhone: { paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: spacing.md },
  contentTablet: { maxWidth: 900, paddingHorizontal: spacing.xl },
  contentDesktop: { maxWidth: 980, paddingHorizontal: spacing.xxl, paddingTop: spacing.xl },
  brandCard: { position: 'relative', overflow: 'hidden', minHeight: 142, padding: spacing.lg, borderWidth: 1, borderColor: 'rgba(111,76,56,0.12)', borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: spacing.lg, backgroundColor: '#21150F', ...shadow },
  brandCardPhone: { minHeight: 0, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  brandGlow: { position: 'absolute', right: -50, top: -70, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(216,179,106,0.13)' },
  logo: { width: 82, height: 82, flexShrink: 0 },
  logoPhone: { width: 58, height: 58 },
  brandCopy: { minWidth: 0, flex: 1 },
  brandEyebrow: { color: '#D8B36A', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  brandName: { maxWidth: 520, marginTop: 4, fontFamily: fonts.display, color: colors.white, fontSize: 22, lineHeight: 27, fontWeight: '800' },
  brandNamePhone: { fontSize: 17, lineHeight: 21 },
  delivery: { maxWidth: 540, marginTop: 5, color: '#D8C7B8', fontSize: 11, lineHeight: 16 },
  channelNotice: { maxWidth: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.sm, borderRadius: radii.medium, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceWarm },
  channelNoticeText: { minWidth: 0, flex: 1, color: colors.text, fontSize: 11, lineHeight: 16 },
  groupsGrid: { minWidth: 0, gap: spacing.md },
  groupsGridTablet: { flexDirection: 'row', flexWrap: 'wrap' },
  groupsGridDesktop: { flexDirection: 'row', flexWrap: 'wrap' },
  group: { minWidth: 0, flexBasis: 280, flexGrow: 1, flexShrink: 1, gap: 5 },
  groupTitle: { paddingHorizontal: 3, color: colors.primaryDark, fontSize: 10, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  menuCard: { overflow: 'hidden', minWidth: 0, borderWidth: 1, borderColor: 'rgba(111,76,56,0.12)', borderRadius: 16, backgroundColor: '#FFFEFC', ...shadow },
  menuItem: { minWidth: 0, minHeight: 62, paddingHorizontal: spacing.md, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  pressed: { backgroundColor: colors.surfaceWarm },
  menuIcon: { width: 36, height: 36, flexShrink: 0, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceWarm },
  menuCopy: { minWidth: 0, flex: 1 },
  menuLabel: { color: colors.text, fontSize: 13, lineHeight: 17, fontWeight: '900', flexShrink: 1 },
  menuDescription: { marginTop: 1, color: colors.textMuted, fontSize: 9.5, lineHeight: 13 },
  quickActions: { minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quickActionsPhone: { flexDirection: 'row' },
  quickAction: { minWidth: 0, minHeight: 44, flexBasis: 150, flexGrow: 1, flexShrink: 1, borderRadius: radii.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, ...shadow },
  quickActionPhone: { flexBasis: 0, flexGrow: 1 },
  quickActionWhatsapp: { backgroundColor: '#1F7A4D' },
  quickActionInstagram: { backgroundColor: '#8B451C' },
  quickActionPressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  quickActionText: { color: colors.white, fontSize: 11, fontWeight: '900' },
  version: { marginTop: 2, color: colors.textMuted, fontSize: 9, textAlign: 'center' },
});
