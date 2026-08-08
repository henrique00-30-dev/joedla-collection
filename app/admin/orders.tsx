import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  AdminFilterChip,
  AdminPage,
  AdminSection,
  AdminStatCard,
  AdminTable,
  AdminTableBadge,
  AdminTableText,
  AdminToolbar,
  type AdminTableColumn,
} from '@/src/components/admin';
import { AdminGuard } from '@/src/components/admin-guard';
import { StatusBadge } from '@/src/components/ui';
import { useStore } from '@/src/context/store-context';
import { spacing } from '@/src/theme';
import type {
  Order,
  OrderStatus,
} from '@/src/types';
import {
  formatCurrency,
  formatDate,
} from '@/src/utils/format';

type Filter = 'all' | 'custom' | OrderStatus;

const filters: {
  value: Filter;
  label: string;
}[] = [
  {
    value: 'all',
    label: 'Todos',
  },
  {
    value: 'custom',
    label: 'Encomendas',
  },
  {
    value: 'pending',
    label: 'Pendentes',
  },
  {
    value: 'confirmed',
    label: 'Confirmados',
  },
  {
    value: 'preparing',
    label: 'Preparando',
  },
  {
    value: 'ready',
    label: 'Prontos',
  },
  {
    value: 'completed',
    label: 'Concluídos',
  },
  {
    value: 'cancelled',
    label: 'Cancelados',
  },
];

export default function AdminOrdersScreen() {
  const {
    filter: initialFilter,
  } = useLocalSearchParams<{
    filter?: string;
  }>();

  const {
    adminOrders,
    adminLoading,
    refreshAdminOrders,
  } = useStore();

  const refreshAdminOrdersRef = useRef(refreshAdminOrders);

  useEffect(() => {
    refreshAdminOrdersRef.current = refreshAdminOrders;
  }, [refreshAdminOrders]);

  useFocusEffect(
    useCallback(() => {
      void refreshAdminOrdersRef.current().catch((error) => {
        console.warn('Falha ao atualizar pedidos do painel.', error);
      });
    }, []),
  );

  const [filter, setFilter] =
    useState<Filter>(
      initialFilter === 'custom'
        ? 'custom'
        : 'all',
    );

  useEffect(() => {
    if (initialFilter === 'custom') {
      setFilter('custom');
    }
  }, [initialFilter]);

  const metrics = useMemo(() => {
    return {
      total: adminOrders.length,

      pending: adminOrders.filter(
        (order) =>
          order.status === 'pending',
      ).length,

      custom: adminOrders.filter(
        (order) =>
          order.items.some(
            (item) =>
              item.availability ===
              'custom',
          ),
      ).length,

      completed: adminOrders.filter(
        (order) =>
          order.status === 'completed',
      ).length,

      revenue: adminOrders
        .filter(
          (order) =>
            order.status === 'completed',
        )
        .reduce(
          (sum, order) =>
            sum + order.total,
          0,
        ),
    };
  }, [adminOrders]);

  const filtered = useMemo(() => {
    if (filter === 'all') {
      return adminOrders;
    }

    if (filter === 'custom') {
      return adminOrders.filter(
        (order) =>
          order.items.some(
            (item) =>
              item.availability ===
              'custom',
          ),
      );
    }

    return adminOrders.filter(
      (order) =>
        order.status === filter,
    );
  }, [adminOrders, filter]);

  function openOrder(order: Order) {
    router.push({
      pathname: '/admin/order/[id]',
      params: {
        id: order.id,
      },
    });
  }

  const columns =
    useMemo<AdminTableColumn<Order>[]>(
      () => [
        {
          key: 'order',
          label: 'Pedido',
          minWidth: 145,
          render: (order) => (
            <View style={styles.orderCell}>
              <AdminTableText bold>
                {order.publicCode}
              </AdminTableText>

              <AdminTableText muted>
                {formatDate(
                  order.createdAt,
                )}
              </AdminTableText>
            </View>
          ),
        },
        {
          key: 'customer',
          label: 'Cliente',
          minWidth: 180,
          flex: 1,
          render: (order) => (
            <View style={styles.customerCell}>
              <AdminTableText bold>
                {order.customer.name}
              </AdminTableText>

              <AdminTableText muted>
                {order.customer.whatsapp}
              </AdminTableText>
            </View>
          ),
        },
        {
          key: 'items',
          label: 'Itens',
          minWidth: 250,
          flex: 1,
          render: (order) => (
            <View style={styles.itemsCell}>
              <AdminTableText
                numberOfLines={2}>
                {order.items
                  .map(
                    (item) =>
                      `${item.quantity}x ${item.productName}`,
                  )
                  .join(', ')}
              </AdminTableText>

              {order.items.some(
                (item) =>
                  item.availability ===
                  'custom',
              ) ? (
                <View
                  style={
                    styles.customBadgeWrap
                  }>
                  <AdminTableBadge
                    label="Encomenda"
                    tone="warning"
                  />
                </View>
              ) : null}
            </View>
          ),
        },
        {
          key: 'delivery',
          label: 'Entrega',
          width: 125,
          render: (order) => (
            <AdminTableBadge
              label={getDeliveryLabel(
                order.deliveryMethod,
              )}
              tone={
                order.deliveryMethod ===
                'delivery'
                  ? 'success'
                  : order.deliveryMethod ===
                      'pickup'
                    ? 'info'
                    : 'warning'
              }
            />
          ),
        },
        {
          key: 'status',
          label: 'Status',
          width: 140,
          align: 'center',
          render: (order) => (
            <StatusBadge
              status={order.status}
            />
          ),
        },
        {
          key: 'total',
          label: 'Total',
          width: 120,
          align: 'right',
          render: (order) => (
            <Text style={styles.total}>
              {formatCurrency(order.total)}
            </Text>
          ),
        },
      ],
      [],
    );

  return (
    <AdminGuard>
      <AdminPage
        eyebrow="Gestão de loja"
        title="Pedidos"
        description="Acompanhe pedidos, encomendas, pagamentos e andamento das entregas.">
        <View style={styles.metrics}>
          <AdminStatCard
            compact
            icon="receipt-outline"
            label="Total de pedidos"
            value={String(metrics.total)}
            helper="Todos os pedidos recebidos"
          />

          <AdminStatCard
            compact
            icon="time-outline"
            label="Pendentes"
            value={String(
              metrics.pending,
            )}
            helper="Aguardando confirmação"
            tone={
              metrics.pending > 0
                ? 'warning'
                : 'success'
            }
          />

          <AdminStatCard
            compact
            icon="construct-outline"
            label="Encomendas"
            value={String(metrics.custom)}
            helper="Itens sob demanda"
            tone="info"
          />

          <AdminStatCard
            compact
            icon="checkmark-circle-outline"
            label="Concluídos"
            value={String(
              metrics.completed,
            )}
            helper={formatCurrency(
              metrics.revenue,
            )}
            tone="success"
          />
        </View>

        <AdminToolbar
          left={
            <>
              {filters.map((item) => (
                <AdminFilterChip
                  key={item.value}
                  label={item.label}
                  active={
                    filter === item.value
                  }
                  onPress={() =>
                    setFilter(item.value)
                  }
                />
              ))}
            </>
          }
        />

        <AdminSection
          title="Lista de pedidos"
          description={`${filtered.length} ${
            filtered.length === 1
              ? 'pedido encontrado'
              : 'pedidos encontrados'
          }`}>
          <View style={styles.tableWrap}>
            <RefreshControlContainer
              refreshing={adminLoading}
              onRefresh={
                refreshAdminOrders
              }>
              <AdminTable
                columns={columns}
                data={filtered}
                keyExtractor={(order) =>
                  order.id
                }
                onPressRow={openOrder}
                loading={adminLoading}
                emptyIcon="receipt-outline"
                emptyTitle="Nenhum pedido nesta situação"
                emptyDescription="Altere o filtro para visualizar outros pedidos."
              />
            </RefreshControlContainer>
          </View>
        </AdminSection>
      </AdminPage>
    </AdminGuard>
  );
}

function RefreshControlContainer({
  refreshing,
  onRefresh,
  children,
}: {
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.refreshContainer}>
      <RefreshControl
        refreshing={refreshing}
        onRefresh={() =>
          void onRefresh()
        }
        tintColor="#9D5F1D"
        colors={['#9D5F1D']}
      />

      {children}
    </View>
  );
}

function getDeliveryLabel(
  method: Order['deliveryMethod'],
) {
  if (method === 'delivery') {
    return 'Entrega';
  }

  if (method === 'pickup') {
    return 'Retirada';
  }

  return 'Outra cidade';
}

const styles = StyleSheet.create({
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  tableWrap: {
    minWidth: 0,
  },

  refreshContainer: {
    minWidth: 0,
  },

  orderCell: {
    gap: 2,
  },

  customerCell: {
    minWidth: 0,
    gap: 2,
  },

  itemsCell: {
    minWidth: 0,
  },

  customBadgeWrap: {
    marginTop: 5,
    alignSelf: 'flex-start',
  },

  total: {
    color: '#9D5F1D',
    fontSize: 12,
    fontWeight: '900',
  },
});