import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AdminCard, AdminPage, AdminSection, AdminTable, AdminTableBadge, AdminTableText, AdminToolbar, type AdminTableColumn } from '@/src/components/admin';
import { AdminGuard } from '@/src/components/admin-guard';
import { AdminClubCustomer, loadAdminClubCustomers } from '@/src/services/club';
import { colors, spacing } from '@/src/theme';
import { formatCurrency } from '@/src/utils/format';

export default function AdminCustomersScreen() {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<AdminClubCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => void load(search), 220);
    return () => clearTimeout(timer);
  }, [search]);

  async function load(value = search) {
    setLoading(true);
    setError('');
    try {
      setCustomers(await loadAdminClubCustomers(value));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os clientes.');
    } finally {
      setLoading(false);
    }
  }

  const columns: AdminTableColumn<AdminClubCustomer>[] = [
    {
      key: 'customer',
      label: 'Cliente',
      minWidth: 190,
      flex: 1,
      render: (item) => (
        <View style={styles.cellGap}>
          <AdminTableText bold>{item.name}</AdminTableText>
          <AdminTableText muted>{item.whatsapp}</AdminTableText>
        </View>
      ),
    },
    {
      key: 'status',
      label: 'Situação',
      width: 120,
      render: (item) => (
        <AdminTableBadge
          label={Number(item.total_open) > 0 ? 'Em aberto' : 'Sem dívida'}
          tone={Number(item.total_open) > 0 ? 'warning' : 'success'}
        />
      ),
    },
    {
      key: 'open',
      label: 'Em aberto',
      width: 125,
      align: 'right',
      render: (item) => <Text style={Number(item.total_open) > 0 ? styles.debt : styles.ok}>{formatCurrency(Number(item.total_open))}</Text>,
    },
    {
      key: 'points',
      label: 'Pontos',
      width: 100,
      align: 'right',
      render: (item) => <Text style={styles.points}>{Number(item.points).toLocaleString('pt-BR')}</Text>,
    },
  ];

  return (
    <AdminGuard>
      <AdminPage eyebrow="Clientes" title="Ficha dos clientes" description="Pesquise por nome, WhatsApp ou código do pedido e abra a ficha completa.">
        <AdminToolbar searchValue={search} searchPlaceholder="Buscar por nome, WhatsApp ou código do pedido..." onChangeSearch={setSearch} />

        {error ? <AdminCard compact title="Não foi possível carregar" description={error} icon="alert-circle-outline" /> : null}

        <AdminSection title="Clientes" description={`${customers.length} ${customers.length === 1 ? 'cliente encontrado' : 'clientes encontrados'}`}>
          <View style={styles.tableWrap}>
            <RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={colors.primary} colors={[colors.primary]} />
            <AdminTable
              columns={columns}
              data={customers}
              keyExtractor={(item) => item.id}
              onPressRow={(item) => router.push({ pathname: '/admin/customer/[id]', params: { id: item.id } })}
              loading={loading}
              emptyIcon="people-outline"
              emptyTitle="Nenhum cliente encontrado"
              emptyDescription="Clientes entram nesta lista a partir de pedidos concluídos com WhatsApp válido."
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
  points: { color: '#9D5F1D', fontSize: 11, fontWeight: '900' },
});
