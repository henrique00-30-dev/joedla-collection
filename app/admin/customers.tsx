import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import {
  AdminCard,
  AdminPage,
  AdminSection,
  AdminTable,
  AdminTableBadge,
  AdminTableText,
  AdminToolbar,
  type AdminTableColumn,
} from '@/src/components/admin';
import { AdminGuard } from '@/src/components/admin-guard';
import {
  AdminStoreCustomer,
  loadAdminStoreCustomers,
} from '@/src/services/admin-finance';
import { colors } from '@/src/theme';
import { maskBrazilPhone } from '@/src/utils/fields';
import { formatCurrency } from '@/src/utils/format';

export default function AdminCustomersScreen() {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<AdminStoreCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => void load(search), 220);
    return () => clearTimeout(timer);
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      void load(search);
    }, [search]),
  );

  async function load(value = search) {
    setLoading(true);
    setError('');
    try {
      setCustomers(await loadAdminStoreCustomers(value));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os clientes.');
    } finally {
      setLoading(false);
    }
  }

  const columns: AdminTableColumn<AdminStoreCustomer>[] = [
    {
      key: 'customer',
      label: 'Cliente',
      minWidth: 190,
      flex: 1,
      render: (item) => (
        <View style={styles.cellGap}>
          <AdminTableText bold>{item.name}</AdminTableText>
          <AdminTableText muted>{maskBrazilPhone(item.whatsapp)}</AdminTableText>
        </View>
      ),
    },
    {
      key: 'orders',
      label: 'Compras',
      width: 90,
      align: 'right',
      render: (item) => <Text style={styles.orders}>{Number(item.total_orders).toLocaleString('pt-BR')}</Text>,
    },
    {
      key: 'open',
      label: 'Em aberto',
      width: 125,
      align: 'right',
      render: (item) => <Text style={Number(item.total_open) > 0 ? styles.debt : styles.ok}>{formatCurrency(Number(item.total_open))}</Text>,
    },
    {
      key: 'club',
      label: 'Clube Joedla',
      width: 125,
      render: (item) => (
        <AdminTableBadge
          label={item.club_member ? 'Cadastrado' : 'Não cadastrado'}
          tone={item.club_member ? 'success' : 'neutral'}
        />
      ),
    },
  ];

  return (
    <AdminGuard>
      <AdminPage
        eyebrow="Clientes"
        title="Clientes da loja"
        description="Aqui aparecem somente pessoas que fizeram compra. O cadastro no Clube Joedla é independente e aparece apenas como identificação.">
        <AdminToolbar
          searchValue={search}
          searchPlaceholder="Buscar por nome, WhatsApp ou código do pedido..."
          onChangeSearch={setSearch}
        />

        {error ? <AdminCard compact title="Não foi possível carregar" description={error} icon="alert-circle-outline" /> : null}

        <AdminSection
          title="Clientes compradores"
          description={`${customers.length} ${customers.length === 1 ? 'cliente encontrado' : 'clientes encontrados'}`}>
          <View style={styles.tableWrap}>
            <RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={colors.primary} colors={[colors.primary]} />
            <AdminTable
              columns={columns}
              data={customers}
              keyExtractor={(item) => item.id}
              onPressRow={(item) => router.push({ pathname: '/admin/customer/[id]', params: { id: item.id } })}
              loading={loading}
              emptyIcon="people-outline"
              emptyTitle="Nenhum cliente comprador encontrado"
              emptyDescription="Assim que uma compra for registrada, o cliente passará a aparecer aqui. Entrar no Clube Joedla não cria um cliente nesta lista."
            />
          </View>
        </AdminSection>
      </AdminPage>
    </AdminGuard>
  );
}

const styles = StyleSheet.create({
  tableWrap: { minWidth: 0 },
  cellGap: { minWidth: 0, gap: 2 },
  debt: { color: '#B43D38', fontSize: 11, fontWeight: '900' },
  ok: { color: '#238657', fontSize: 11, fontWeight: '900' },
  orders: { color: '#9D5F1D', fontSize: 11, fontWeight: '900' },
});
