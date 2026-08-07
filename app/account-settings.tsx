import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AppHeader } from '@/src/components/app-header';
import { Screen } from '@/src/components/screen';
import { Button, Field } from '@/src/components/ui';
import {
  changeCustomerPassword,
  createPrivacyRequest,
  CustomerAddress,
  CustomerCoupon,
  deleteCustomerAddress,
  loadCustomerAddresses,
  loadCustomerCoupons,
  loadPrivacyRequests,
  PrivacyRequest,
  saveCustomerAddress,
} from '@/src/services/customer-account-extras';
import { loadCustomerUser } from '@/src/services/customer';
import { colors, radii, shadow, spacing } from '@/src/theme';
import { formatCurrency, formatDate } from '@/src/utils/format';

const emptyAddress: Omit<CustomerAddress, 'id'> = {
  label: 'Principal', recipientName: '', phone: '', cep: '', street: '', number: '', complement: '',
  neighborhood: '', city: '', state: 'SE', reference: '', isDefault: true,
};

export default function AccountSettingsScreen() {
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const [loading, setLoading] = useState(true);
  const [logged, setLogged] = useState(false);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [coupons, setCoupons] = useState<CustomerCoupon[]>([]);
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [address, setAddress] = useState<Omit<CustomerAddress, 'id'> & { id?: string }>(emptyAddress);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => { void refresh(); }, []);

  async function refresh() {
    setLoading(true);
    try {
      const user = await loadCustomerUser();
      setLogged(Boolean(user));
      if (!user) return;
      const [nextAddresses, nextCoupons, nextRequests] = await Promise.all([
        loadCustomerAddresses(), loadCustomerCoupons(), loadPrivacyRequests(),
      ]);
      setAddresses(nextAddresses);
      setCoupons(nextCoupons);
      setRequests(nextRequests);
    } catch (error) {
      Alert.alert('Conta', error instanceof Error ? error.message : 'Não foi possível carregar.');
    } finally {
      setLoading(false);
    }
  }

  async function saveAddress() {
    if (!address.recipientName.trim() || !address.street.trim() || !address.number.trim() || !address.neighborhood.trim() || !address.city.trim() || address.state.trim().length !== 2) {
      Alert.alert('Endereço incompleto', 'Preencha nome, rua, número, bairro, cidade e UF.');
      return;
    }
    setLoading(true);
    try {
      await saveCustomerAddress(address);
      setAddress(emptyAddress);
      await refresh();
      Alert.alert('Endereço salvo', 'O endereço foi atualizado na sua conta.');
    } catch (error) {
      Alert.alert('Não foi possível salvar', error instanceof Error ? error.message : 'Tente novamente.');
    } finally { setLoading(false); }
  }

  async function removeAddress(id: string) {
    setLoading(true);
    try { await deleteCustomerAddress(id); await refresh(); }
    catch (error) { Alert.alert('Não foi possível excluir', error instanceof Error ? error.message : 'Tente novamente.'); }
    finally { setLoading(false); }
  }

  async function changePassword() {
    if (!currentPassword || !newPassword) return Alert.alert('Senha', 'Informe a senha atual e a nova senha.');
    setLoading(true);
    try {
      await changeCustomerPassword(currentPassword, newPassword);
      setCurrentPassword(''); setNewPassword('');
      Alert.alert('Senha alterada', 'Sua nova senha já está ativa.');
    } catch (error) { Alert.alert('Não foi possível alterar', error instanceof Error ? error.message : 'Tente novamente.'); }
    finally { setLoading(false); }
  }

  async function privacy(type: 'data_export' | 'account_deletion') {
    setLoading(true);
    try {
      await createPrivacyRequest(type);
      await refresh();
      Alert.alert('Solicitação registrada', type === 'data_export' ? 'Seu pedido de acesso aos dados foi registrado.' : 'Seu pedido de exclusão da conta foi registrado para análise segura.');
    } catch (error) { Alert.alert('Não foi possível registrar', error instanceof Error ? error.message : 'Tente novamente.'); }
    finally { setLoading(false); }
  }

  return (
    <Screen>
      <AppHeader compact title="Segurança e privacidade" showBack showStoreHome />
      <ScrollView contentContainerStyle={[styles.content, desktop && styles.desktop]} showsVerticalScrollIndicator>
        {!logged ? (
          <View style={styles.card}><Text style={styles.title}>Entre na sua conta</Text><Text style={styles.muted}>Estas configurações ficam disponíveis somente para clientes autenticados.</Text></View>
        ) : (
          <>
            <Section icon="location-outline" title="Meus endereços" text="Salve endereços para reutilizar em compras futuras." />
            {addresses.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.row}><Text style={styles.title}>{item.label}</Text>{item.isDefault ? <Text style={styles.badge}>Principal</Text> : null}</View>
                <Text style={styles.body}>{item.recipientName} · {item.street}, {item.number}</Text>
                <Text style={styles.muted}>{item.neighborhood} · {item.city}/{item.state} · CEP {item.cep || '—'}</Text>
                <View style={styles.actions}>
                  <Button variant="secondary" onPress={() => setAddress({ ...item })} style={styles.action}>Editar</Button>
                  <Button variant="danger" loading={loading} onPress={() => void removeAddress(item.id)} style={styles.action}>Excluir</Button>
                </View>
              </View>
            ))}
            <View style={styles.card}>
              <Text style={styles.title}>{address.id ? 'Editar endereço' : 'Novo endereço'}</Text>
              <Field label="Nome do destinatário" value={address.recipientName} onChangeText={(v) => setAddress({ ...address, recipientName: v })} />
              <Field label="Telefone" value={address.phone} onChangeText={(v) => setAddress({ ...address, phone: v })} keyboardType="phone-pad" />
              <Field label="CEP" value={address.cep} onChangeText={(v) => setAddress({ ...address, cep: v })} keyboardType="number-pad" maxLength={9} />
              <Field label="Rua" value={address.street} onChangeText={(v) => setAddress({ ...address, street: v })} />
              <Field label="Número" value={address.number} onChangeText={(v) => setAddress({ ...address, number: v })} />
              <Field label="Complemento" value={address.complement} onChangeText={(v) => setAddress({ ...address, complement: v })} />
              <Field label="Bairro" value={address.neighborhood} onChangeText={(v) => setAddress({ ...address, neighborhood: v })} />
              <Field label="Cidade" value={address.city} onChangeText={(v) => setAddress({ ...address, city: v })} />
              <Field label="UF" value={address.state} onChangeText={(v) => setAddress({ ...address, state: v })} autoCapitalize="characters" maxLength={2} />
              <Field label="Ponto de referência" value={address.reference} onChangeText={(v) => setAddress({ ...address, reference: v })} />
              <Button loading={loading} onPress={saveAddress}>Salvar endereço</Button>
            </View>

            <Section icon="ticket-outline" title="Meus cupons" text="Cupons vinculados diretamente à sua conta." />
            <View style={styles.card}>
              {!coupons.length ? <Text style={styles.muted}>Nenhum cupom disponível no momento.</Text> : coupons.map((coupon) => (
                <View key={coupon.id} style={styles.coupon}>
                  <View><Text style={styles.couponCode}>{coupon.code}</Text><Text style={styles.muted}>{coupon.description || 'Cupom Joedla'}</Text></View>
                  <Text style={styles.couponValue}>{coupon.discountType === 'percent' ? `${coupon.discountValue}%` : formatCurrency(coupon.discountValue)}</Text>
                </View>
              ))}
            </View>

            <Section icon="key-outline" title="Alterar senha" text="A senha atual é conferida antes da alteração." />
            <View style={styles.card}>
              <Field label="Senha atual" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry autoCapitalize="none" />
              <Field label="Nova senha" value={newPassword} onChangeText={setNewPassword} secureTextEntry autoCapitalize="none" placeholder="Mínimo 8 caracteres, letras e números" />
              <Button loading={loading} onPress={changePassword}>Alterar senha</Button>
            </View>

            <Section icon="shield-checkmark-outline" title="Privacidade e LGPD" text="Você pode solicitar seus dados ou a exclusão da conta sem tornar seus dados públicos." />
            <View style={styles.card}>
              <Button variant="secondary" loading={loading} onPress={() => void privacy('data_export')}>Solicitar meus dados</Button>
              <Button variant="danger" loading={loading} onPress={() => void privacy('account_deletion')}>Solicitar exclusão da conta</Button>
              {requests.slice(0, 5).map((request) => (
                <View key={request.id} style={styles.request}>
                  <Text style={styles.body}>{request.requestType === 'data_export' ? 'Acesso aos dados' : 'Exclusão da conta'}</Text>
                  <Text style={styles.muted}>{formatDate(request.createdAt)} · {request.status}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function Section({ icon, title, text }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }) {
  return <View style={styles.section}><View style={styles.icon}><Ionicons name={icon} size={21} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.muted}>{text}</Text></View></View>;
}

const styles = StyleSheet.create({
  content: { width: '100%', alignSelf: 'center', padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  desktop: { maxWidth: 900, padding: spacing.xxl },
  section: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', marginTop: spacing.md },
  icon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surfaceWarm, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { color: colors.text, fontSize: 19, fontWeight: '900' },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.large, padding: spacing.lg, gap: spacing.md, ...shadow.card },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  title: { color: colors.text, fontSize: 15, fontWeight: '900' },
  body: { color: colors.text, fontSize: 13, lineHeight: 20 },
  muted: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  badge: { color: colors.success, backgroundColor: colors.successSoft, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, fontSize: 10, fontWeight: '900' },
  actions: { flexDirection: 'row', gap: spacing.sm }, action: { flex: 1 },
  coupon: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  couponCode: { color: colors.primary, fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  couponValue: { color: colors.text, fontSize: 16, fontWeight: '900' },
  request: { paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
});
