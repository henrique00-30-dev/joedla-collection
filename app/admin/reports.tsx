import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AdminPage, AdminSection } from '@/src/components/admin';
import { AdminGuard } from '@/src/components/admin-guard';
import { colors, radii, spacing } from '@/src/theme';

type ReportCard = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
};

const REPORTS: ReportCard[] = [
  {
    title: 'Financeiro',
    description: 'Entradas, saídas, saldo, custos, margem e movimentações do período.',
    icon: 'cash-outline',
    href: '/admin/reports/financial',
  },
  {
    title: 'Pedidos',
    description: 'Consulte pedidos, situação, valores e comprovantes detalhados.',
    icon: 'bag-handle-outline',
    href: '/admin/orders',
  },
  {
    title: 'Clientes',
    description: 'Clientes compradores, total comprado, recebido e valores em aberto.',
    icon: 'people-outline',
    href: '/admin/customers',
  },
  {
    title: 'Clube Joedla',
    description: 'Somente pessoas cadastradas no Clube, pontuação e recompensas.',
    icon: 'star-outline',
    href: '/admin/club',
  },
  {
    title: 'Desempenho',
    description: 'Métricas de acesso, produtos e desempenho comercial já existentes.',
    icon: 'stats-chart-outline',
    href: '/admin/analytics',
  },
  {
    title: 'Produtos e estoque',
    description: 'Abra o catálogo administrativo para consultar disponibilidade e estoque.',
    icon: 'cube-outline',
    href: '/admin/products',
  },
];

export default function AdminReportsScreen() {
  return (
    <AdminGuard>
      <AdminPage
        eyebrow="Relatórios"
        title="Central de relatórios"
        description="Todos os relatórios e consultas ficam concentrados aqui, sem esconder a função dentro de outras abas.">
        <AdminSection
          title="Escolha o relatório"
          description="A estrutura reaproveita as informações que o sistema já registra e leva direto ao detalhe correspondente.">
          <View style={styles.grid}>
            {REPORTS.map((report) => (
              <Pressable
                key={report.title}
                accessibilityRole="button"
                onPress={() => router.push(report.href as never)}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
                <View style={styles.iconWrap}>
                  <Ionicons name={report.icon} size={22} color="#9D5F1D" />
                </View>
                <View style={styles.copy}>
                  <Text style={styles.title}>{report.title}</Text>
                  <Text style={styles.description}>{report.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        </AdminSection>
      </AdminPage>
    </AdminGuard>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: {
    minWidth: 250,
    flexBasis: 320,
    flexGrow: 1,
    minHeight: 104,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  iconWrap: { width: 42, height: 42, flexShrink: 0, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FBF1E6' },
  copy: { minWidth: 0, flex: 1 },
  title: { color: colors.text, fontSize: 12, fontWeight: '900' },
  description: { marginTop: 4, color: colors.textMuted, fontSize: 9, lineHeight: 14 },
  pressed: { opacity: 0.72 },
});
