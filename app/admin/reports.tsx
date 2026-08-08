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
    description: 'Entradas, saídas, saldo, margem e movimentações do período.',
    icon: 'cash-outline',
    href: '/admin/reports/financial',
  },
  {
    title: 'Pedidos',
    description: 'Pedidos, faturamento, ticket médio, status, pagamentos e produtos vendidos.',
    icon: 'bag-handle-outline',
    href: '/admin/reports/data?kind=orders',
  },
  {
    title: 'Produtos e Estoques',
    description: 'Produtos, categorias, valor e distribuição do estoque, itens baixos e indisponíveis.',
    icon: 'cube-outline',
    href: '/admin/reports/data?kind=products',
  },
];

export default function AdminReportsScreen() {
  return (
    <AdminGuard>
      <AdminPage
        eyebrow="Relatórios"
        title="Central de relatórios"
        description="Selecione um relatório para visualizar indicadores, gráficos e exportar os dados.">
        <AdminSection
          title="Escolha o relatório"
          description="Os relatórios usam somente informações que o sistema já registra.">
          <View style={styles.grid}>
            {REPORTS.map((report) => (
              <Pressable
                key={report.title}
                accessibilityRole="button"
                onPress={() => router.push(report.href as never)}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
                <View style={styles.iconWrap}>
                  <Ionicons name={report.icon} size={24} color="#9D5F1D" />
                </View>
                <View style={styles.copy}>
                  <Text style={styles.title}>{report.title}</Text>
                  <Text style={styles.description}>{report.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
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
    minHeight: 112,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.large,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  iconWrap: {
    width: 48,
    height: 48,
    flexShrink: 0,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FBF1E6',
  },
  copy: { minWidth: 0, flex: 1 },
  title: { color: colors.text, fontSize: 14, fontWeight: '900' },
  description: { marginTop: 5, color: colors.textMuted, fontSize: 10, lineHeight: 15 },
  pressed: { opacity: 0.72 },
});
