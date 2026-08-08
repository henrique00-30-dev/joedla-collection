import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AdminGuard } from '@/src/components/admin-guard';
import { Button, Field } from '@/src/components/ui';
import { useStore } from '@/src/context/store-context';
import {
  answerQuestion,
  loadAdminQuestions,
  loadAdminReviews,
  moderateReview,
  ProductQuestion,
  ProductReview,
} from '@/src/services/customer';
import { colors, radii, shadow, spacing } from '@/src/theme';

export default function AdminCommunityScreen() {
  const { products } = useStore();
  const { width } = useWindowDimensions();
  const compact = width < 780;
  const [tab, setTab] = useState<'reviews' | 'questions'>('reviews');
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [questions, setQuestions] = useState<ProductQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [nextReviews, nextQuestions] = await Promise.all([
        loadAdminReviews(),
        loadAdminQuestions(),
      ]);
      setReviews(nextReviews);
      setQuestions(nextQuestions);
    } catch (error) {
      Alert.alert('Moderação', error instanceof Error ? error.message : 'Não foi possível carregar os conteúdos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const pendingReviews = useMemo(() => reviews.filter((item) => item.status === 'pending').length, [reviews]);
  const pendingQuestions = useMemo(() => questions.filter((item) => item.status === 'pending').length, [questions]);

  const productName = (id: string) => products.find((product) => product.id === id)?.name ?? 'Produto';

  async function reviewAction(id: string, status: 'approved' | 'rejected') {
    setLoading(true);
    try {
      await moderateReview(id, status, notes[id] ?? '');
      await refresh();
    } catch (error) {
      Alert.alert('Não foi possível moderar', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function questionAction(id: string, publish: boolean) {
    if (publish && !(answers[id] ?? '').trim()) {
      Alert.alert('Resposta necessária', 'Digite a resposta antes de publicar.');
      return;
    }
    setLoading(true);
    try {
      await answerQuestion(id, answers[id] ?? '', publish);
      await refresh();
    } catch (error) {
      Alert.alert('Não foi possível atualizar', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminGuard>
      <ScrollView style={styles.screen} contentContainerStyle={[styles.content, compact && styles.contentCompact]} showsVerticalScrollIndicator>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Clientes e moderação</Text>
            <Text style={styles.subtitle}>Avaliações e perguntas enviadas pelo site público.</Text>
          </View>
          <Button variant="secondary" loading={loading} onPress={refresh}>Atualizar</Button>
        </View>

        <View style={styles.stats}>
          <Stat icon="star-outline" label="Avaliações pendentes" value={pendingReviews} />
          <Stat icon="chatbubble-ellipses-outline" label="Perguntas pendentes" value={pendingQuestions} />
        </View>

        <View style={styles.tabs}>
          <Pressable onPress={() => setTab('reviews')} style={[styles.tab, tab === 'reviews' && styles.tabActive]}>
            <Text style={[styles.tabText, tab === 'reviews' && styles.tabTextActive]}>Avaliações ({reviews.length})</Text>
          </Pressable>
          <Pressable onPress={() => setTab('questions')} style={[styles.tab, tab === 'questions' && styles.tabActive]}>
            <Text style={[styles.tabText, tab === 'questions' && styles.tabTextActive]}>Perguntas ({questions.length})</Text>
          </Pressable>
        </View>

        {tab === 'reviews' ? (
          <View style={styles.list}>
            {!reviews.length ? <Empty text="Nenhuma avaliação recebida." /> : reviews.map((review) => (
              <View key={review.id} style={[styles.card, review.status === 'pending' && styles.pendingCard]}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.product}>{productName(review.productId)}</Text>
                    <Text style={styles.customer}>{review.displayName}</Text>
                  </View>
                  <Status value={review.status === 'approved' ? 'Aprovada' : review.status === 'rejected' ? 'Rejeitada' : 'Pendente'} status={review.status} />
                </View>

                <View style={styles.reviewMeta}>
                  <Text style={styles.stars}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</Text>
                  {review.verifiedPurchase ? (
                    <View style={styles.verified}><Ionicons name="checkmark-circle" size={14} color={colors.success} /><Text style={styles.verifiedText}>Compra verificada</Text></View>
                  ) : null}
                </View>
                <Text style={styles.body}>{review.comment}</Text>

                {review.status === 'pending' ? (
                  <>
                    <Field label="Observação da moderação (opcional)" value={notes[review.id] ?? ''} onChangeText={(value) => setNotes({ ...notes, [review.id]: value })} maxLength={500} />
                    <View style={[styles.actions, compact && styles.actionsCompact]}>
                      <Button loading={loading} onPress={() => void reviewAction(review.id, 'approved')} style={styles.action}>Aprovar</Button>
                      <Button loading={loading} variant="danger" onPress={() => void reviewAction(review.id, 'rejected')} style={styles.action}>Rejeitar</Button>
                    </View>
                  </>
                ) : review.moderationNote ? <Text style={styles.note}>Observação: {review.moderationNote}</Text> : null}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.list}>
            {!questions.length ? <Empty text="Nenhuma pergunta recebida." /> : questions.map((question) => (
              <View key={question.id} style={[styles.card, question.status === 'pending' && styles.pendingCard]}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.product}>{productName(question.productId)}</Text>
                    <Text style={styles.customer}>{question.displayName}</Text>
                  </View>
                  <Status value={question.status === 'published' ? 'Publicada' : question.status === 'rejected' ? 'Rejeitada' : 'Pendente'} status={question.status} />
                </View>
                <Text style={styles.body}>{question.question}</Text>

                {question.status === 'pending' ? (
                  <>
                    <Field label="Resposta da Joedla" value={answers[question.id] ?? ''} onChangeText={(value) => setAnswers({ ...answers, [question.id]: value })} multiline maxLength={1200} />
                    <View style={[styles.actions, compact && styles.actionsCompact]}>
                      <Button loading={loading} onPress={() => void questionAction(question.id, true)} style={styles.action}>Responder e publicar</Button>
                      <Button loading={loading} variant="danger" onPress={() => void questionAction(question.id, false)} style={styles.action}>Não publicar</Button>
                    </View>
                  </>
                ) : question.answer ? (
                  <View style={styles.answer}><Text style={styles.answerLabel}>Resposta publicada</Text><Text style={styles.body}>{question.answer}</Text></View>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </AdminGuard>
  );
}

function Stat({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: number }) {
  return <View style={styles.stat}><Ionicons name={icon} size={22} color={colors.primary} /><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function Status({ value, status }: { value: string; status: string }) {
  return <View style={[styles.status, status === 'approved' || status === 'published' ? styles.statusOk : status === 'rejected' ? styles.statusBad : styles.statusPending]}><Text style={styles.statusText}>{value}</Text></View>;
}

function Empty({ text }: { text: string }) {
  return <View style={styles.empty}><Ionicons name="file-tray-outline" size={28} color={colors.textMuted} /><Text style={styles.subtitle}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: 1180, alignSelf: 'center', padding: spacing.xxl, gap: spacing.lg },
  contentCompact: { padding: spacing.lg },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  title: { color: colors.text, fontSize: 28, fontWeight: '900' },
  subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 3 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  stat: { flexGrow: 1, flexBasis: 220, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.large, padding: spacing.lg, gap: spacing.xs, ...shadow.card },
  statValue: { color: colors.text, fontSize: 26, fontWeight: '900' },
  statLabel: { color: colors.textMuted, fontSize: 12 },
  tabs: { flexDirection: 'row', padding: 4, borderRadius: radii.medium, backgroundColor: colors.surfaceWarm },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: radii.small },
  tabActive: { backgroundColor: colors.surface },
  tabText: { color: colors.textMuted, fontWeight: '800' },
  tabTextActive: { color: colors.primary },
  list: { gap: spacing.md },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.large, padding: spacing.lg, gap: spacing.md, ...shadow.card },
  pendingCard: { borderColor: '#D9A44C' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  product: { color: colors.text, fontSize: 16, fontWeight: '900' },
  customer: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  reviewMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md },
  stars: { color: '#B47A33', fontSize: 18 },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.successSoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  verifiedText: { color: colors.success, fontSize: 10, fontWeight: '900' },
  body: { color: colors.text, fontSize: 13, lineHeight: 20 },
  note: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: spacing.md },
  actionsCompact: { flexDirection: 'column' },
  action: { flex: 1 },
  status: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusOk: { backgroundColor: colors.successSoft },
  statusBad: { backgroundColor: colors.dangerSoft },
  statusPending: { backgroundColor: colors.warningSoft },
  statusText: { color: colors.text, fontSize: 10, fontWeight: '900' },
  answer: { borderLeftWidth: 3, borderLeftColor: colors.primary, paddingLeft: spacing.md, gap: spacing.xs },
  answerLabel: { color: colors.primary, fontSize: 11, fontWeight: '900' },
  empty: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.sm },
});