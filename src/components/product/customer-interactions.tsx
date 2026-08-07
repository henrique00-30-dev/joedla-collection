import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Field } from '@/src/components/ui';
import {
  createProductQuestion,
  createProductReview,
  loadCustomerUser,
  loadProductQuestions,
  loadProductReviews,
  ProductQuestion,
  ProductReview,
  reportReview,
  subscribeStockNotification,
} from '@/src/services/customer';
import { colors, radii, spacing } from '@/src/theme';

export function CustomerProductInteractions({
  productId,
  outOfStock,
}: {
  productId: string;
  outOfStock: boolean;
}) {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [questions, setQuestions] = useState<ProductQuestion[]>([]);
  const [logged, setLogged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [question, setQuestion] = useState('');

  useEffect(() => {
    void refresh();
  }, [productId]);

  async function refresh() {
    try {
      const [nextReviews, nextQuestions, user] = await Promise.all([
        loadProductReviews(productId),
        loadProductQuestions(productId),
        loadCustomerUser(),
      ]);
      setReviews(nextReviews);
      setQuestions(nextQuestions);
      setLogged(Boolean(user));
    } catch {
      // A página do produto continua utilizável mesmo se a área social estiver indisponível.
    }
  }

  const average = useMemo(() => {
    if (!reviews.length) return 0;
    return reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length;
  }, [reviews]);

  function requireLogin() {
    Alert.alert(
      'Entre na sua conta',
      'Para avaliar, perguntar ou pedir aviso de estoque, entre na sua conta.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Minha conta', onPress: () => router.push('/account') },
      ],
    );
  }

  async function sendReview() {
    if (!logged) return requireLogin();
    if (comment.trim().length < 3) {
      Alert.alert('Avaliação incompleta', 'Escreva um comentário sobre o produto.');
      return;
    }
    setLoading(true);
    try {
      await createProductReview(productId, rating, comment);
      setComment('');
      setRating(5);
      Alert.alert('Avaliação enviada', 'Ela ficará aguardando aprovação antes de aparecer publicamente.');
    } catch (error) {
      Alert.alert('Não foi possível enviar', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function sendQuestion() {
    if (!logged) return requireLogin();
    if (question.trim().length < 3) {
      Alert.alert('Pergunta incompleta', 'Digite sua pergunta sobre o produto.');
      return;
    }
    setLoading(true);
    try {
      await createProductQuestion(productId, question);
      setQuestion('');
      Alert.alert('Pergunta enviada', 'A loja poderá responder e publicar a pergunta no produto.');
    } catch (error) {
      Alert.alert('Não foi possível enviar', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function notifyStock() {
    if (!logged) return requireLogin();
    setLoading(true);
    try {
      await subscribeStockNotification(productId);
      Alert.alert('Aviso ativado', 'Quando o produto voltar ao estoque, o aviso aparecerá na sua conta.');
    } catch (error) {
      Alert.alert('Não foi possível ativar', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function report(id: string) {
    if (!logged) return requireLogin();
    try {
      await reportReview(id, 'Conteúdo sinalizado pelo cliente para revisão do administrador.');
      Alert.alert('Obrigado', 'A avaliação foi encaminhada para análise da loja.');
    } catch (error) {
      Alert.alert('Não foi possível denunciar', error instanceof Error ? error.message : 'Tente novamente.');
    }
  }

  return (
    <View style={styles.container}>
      {outOfStock ? (
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Ionicons name="notifications-outline" size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Avise-me quando chegar</Text>
              <Text style={styles.subtitle}>Salve um aviso vinculado à sua conta.</Text>
            </View>
          </View>
          <Button loading={loading} variant="secondary" onPress={notifyStock}>Quero ser avisado</Button>
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Ionicons name="star-outline" size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Avaliações de clientes</Text>
            <Text style={styles.subtitle}>
              {reviews.length ? `${average.toFixed(1)} de 5 · ${reviews.length} avaliação(ões)` : 'Ainda não há avaliações publicadas.'}
            </Text>
          </View>
        </View>

        {reviews.map((review) => (
          <View key={review.id} style={styles.entry}>
            <View style={styles.entryTop}>
              <View>
                <Text style={styles.entryName}>{review.displayName}</Text>
                <Text style={styles.stars}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</Text>
              </View>
              {review.verifiedPurchase ? (
                <View style={styles.verified}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                  <Text style={styles.verifiedText}>Compra verificada</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.entryText}>{review.comment}</Text>
            <Pressable onPress={() => void report(review.id)}><Text style={styles.report}>Denunciar conteúdo</Text></Pressable>
          </View>
        ))}

        <View style={styles.formBox}>
          <Text style={styles.formTitle}>Avaliar este produto</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Pressable key={value} onPress={() => setRating(value)} accessibilityLabel={`${value} estrela(s)`}>
                <Ionicons name={value <= rating ? 'star' : 'star-outline'} size={30} color="#B47A33" />
              </Pressable>
            ))}
          </View>
          <Field label="Seu comentário" value={comment} onChangeText={setComment} multiline placeholder="Conte como foi sua experiência com este produto" maxLength={1200} />
          <Button loading={loading} onPress={sendReview}>{logged ? 'Enviar para aprovação' : 'Entrar para avaliar'}</Button>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Perguntas sobre o produto</Text>
            <Text style={styles.subtitle}>Perguntas e respostas publicadas pela loja.</Text>
          </View>
        </View>

        {questions.map((item) => (
          <View key={item.id} style={styles.entry}>
            <Text style={styles.entryName}>{item.displayName}</Text>
            <Text style={styles.entryText}>{item.question}</Text>
            {item.answer ? (
              <View style={styles.answerBox}>
                <Text style={styles.answerLabel}>Joedla Collection</Text>
                <Text style={styles.entryText}>{item.answer}</Text>
              </View>
            ) : null}
          </View>
        ))}

        <View style={styles.formBox}>
          <Field label="Sua pergunta" value={question} onChangeText={setQuestion} multiline placeholder="Tire uma dúvida sobre tamanho, tecido, cor ou disponibilidade" maxLength={800} />
          <Button loading={loading} variant="secondary" onPress={sendQuestion}>{logged ? 'Enviar pergunta' : 'Entrar para perguntar'}</Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', gap: spacing.lg, marginTop: spacing.xl },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.large, padding: spacing.lg, gap: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { color: colors.text, fontSize: 18, fontWeight: '900' },
  subtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 2 },
  entry: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md, gap: spacing.xs },
  entryTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  entryName: { color: colors.text, fontWeight: '800', fontSize: 13 },
  stars: { color: '#B47A33', fontSize: 15, marginTop: 2 },
  entryText: { color: colors.text, fontSize: 13, lineHeight: 20 },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.successSoft, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 },
  verifiedText: { color: colors.success, fontSize: 10, fontWeight: '800' },
  report: { color: colors.textMuted, fontSize: 11, textDecorationLine: 'underline', alignSelf: 'flex-start' },
  formBox: { backgroundColor: colors.background, borderRadius: radii.medium, padding: spacing.md, gap: spacing.md },
  formTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  ratingRow: { flexDirection: 'row', gap: spacing.xs },
  answerBox: { borderLeftWidth: 3, borderLeftColor: colors.primary, paddingLeft: spacing.md, marginTop: spacing.xs, gap: 3 },
  answerLabel: { color: colors.primary, fontSize: 11, fontWeight: '900' },
});
