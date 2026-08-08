import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AdminPage, AdminSection } from '@/src/components/admin';
import { AdminGuard } from '@/src/components/admin-guard';
import { colors, radii, spacing } from '@/src/theme';

type ReportCard = { title:string; description:string; icon:keyof typeof Ionicons.glyphMap; href:string };
const REPORTS: ReportCard[] = [
  { title:'Financeiro', description:'Entradas, saídas, saldo, custos, margem e movimentações. Exporta CSV e PDF.', icon:'cash-outline', href:'/admin/reports/financial' },
  { title:'Pedidos', description:'Pedidos, clientes, situação, valores, descontos e benefícios. Exporta CSV e PDF.', icon:'bag-handle-outline', href:'/admin/reports/data?kind=orders' },
  { title:'Clientes', description:'Compras, total comprado, recebido, valores em aberto e Clube. Exporta CSV e PDF.', icon:'people-outline', href:'/admin/reports/data?kind=customers' },
  { title:'Clube Joedla', description:'Pessoas cadastradas, pontos, total comprado e valores em aberto. Exporta CSV e PDF.', icon:'star-outline', href:'/admin/reports/data?kind=club' },
  { title:'Desempenho', description:'Visitantes, acessos, visualizações, pedidos e ranking dos últimos 30 dias. Exporta CSV e PDF.', icon:'stats-chart-outline', href:'/admin/reports/data?kind=analytics' },
  { title:'Produtos e estoque', description:'Produtos, categorias, preços, estoque, disponibilidade e situação. Exporta CSV e PDF.', icon:'cube-outline', href:'/admin/reports/data?kind=products' },
];
export default function AdminReportsScreen(){return <AdminGuard><AdminPage eyebrow="Relatórios" title="Central de relatórios" description="Relatórios próprios para consulta, download em Excel (CSV) e impressão ou salvamento em PDF."><AdminSection title="Escolha o relatório" description="Cada opção abaixo abre um relatório exportável; não redireciona mais para as telas operacionais do painel."><View style={styles.grid}>{REPORTS.map((report)=><Pressable key={report.title} accessibilityRole="button" onPress={()=>router.push(report.href as never)} style={({pressed})=>[styles.card,pressed&&styles.pressed]}><View style={styles.iconWrap}><Ionicons name={report.icon} size={22} color="#9D5F1D"/></View><View style={styles.copy}><Text style={styles.title}>{report.title}</Text><Text style={styles.description}>{report.description}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.textMuted}/></Pressable>)}</View></AdminSection></AdminPage></AdminGuard>}
const styles=StyleSheet.create({grid:{flexDirection:'row',flexWrap:'wrap',gap:spacing.md},card:{minWidth:250,flexBasis:320,flexGrow:1,minHeight:104,padding:spacing.md,borderWidth:1,borderColor:colors.border,borderRadius:radii.medium,flexDirection:'row',alignItems:'center',gap:spacing.md,backgroundColor:colors.surface},iconWrap:{width:42,height:42,flexShrink:0,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:'#FBF1E6'},copy:{minWidth:0,flex:1},title:{color:colors.text,fontSize:12,fontWeight:'900'},description:{marginTop:4,color:colors.textMuted,fontSize:9,lineHeight:14},pressed:{opacity:.72}});