import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Field } from '@/src/components/ui';
import { loadReviewedProductIds, submitVerifiedOrderReview } from '@/src/services/order-reviews';
import { colors, radii, spacing } from '@/src/theme';
import type { Order } from '@/src/types';

export function OrderReviewSection({ order }: { order: Order }) {
  const [reviewedIds, setReviewedIds] = useState<string[]>([]);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const products = useMemo(() => {
    const seen = new Set<string>();
    return order.items.filter((item) => {
      if (seen.has(item.productId)) return false;
      seen.add(item.productId);
      return true;
    });
  }, [order.items]);

  useEffect(() => {
    let active = true;
    void loadReviewedProductIds(order.lookupToken)
      .then((ids) => {
        if (active) setReviewedIds(ids);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [order.lookupToken]);

  function startReview(productId: string) {
    setActiveProductId(productId);
    setRating(5);
    setComment('');
  }

  async function submit(productId: string) {
    if (comment.trim().length < 3) {
      Alert.alert('Avaliação incompleta', 'Escreva um comentário com pelo menos 3 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await submitVerifiedOrderReview({
        lookupToken: order.lookupToken,
        productId,
        rating,
        comment,
      });
      setReviewedIds((current) => [...new Set([...current, productId])]);
      setActiveProductId(null);
      setComment('');
      Alert.alert(
        'Avaliação enviada',
        'Obrigado. Sua avaliação ficará aguardando aprovação da loja antes de aparecer publicamente.',
      );
    } catch (error) {
      Alert.alert(
        'Não foi possível enviar',
        error instanceof Error ? error.message : 'Tente novamente.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.icon}>
          <Ionicons name="star-outline" size={19} color={colors.primary} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Avaliar produtos deste pedido</Text>
          <Text style={styles.subtitle}>
            Somente produtos realmente comprados podem ser avaliados. A publicação passa por moderação.
          </Text>
        </View>
      </View>

      {products.map((item) => {
        const reviewed = reviewedIds.includes(item.productId);
        const active = activeProductId === item.productId;

        return (
          <View key={item.productId} style={styles.productRow}>
            <View style={styles.productTop}>
              <View style={styles.productCopy}>
                <Text style={styles.productName}>{item.productName}</Text>
                <Text style={styles.verifiedLabel}>Compra verificada</Text>
              </View>

              {reviewed ? (
                <View style={styles.doneBadge}>
                  <Ionicons name="checkmark-circle" size={15} color={colors.success} />
                  <Text style={styles.doneText}>Avaliação enviada</Text>
                </View>
              ) : (
                <Button
                  variant="secondary"
                  onPress={() => startReview(item.productId)}
                  style={styles.reviewButton}>
                  Avaliar produto
                </Button>
              )}
            </View>

            {active && !reviewed ? (
              <View style={styles.form}>
                <Text style={styles.formLabel}>Sua nota</Text>
                <View style={styles.stars}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Pressable
                      key={value}
                      accessibilityRole="button"
                      accessibilityLabel={`${value} estrela${value > 1 ? 's' : ''}`}
                      onPress={() => setRating(value)}
                      style={styles.starButton}>
                      <Ionicons
                        name={value <= rating ? 'star' : 'star-outline'}
                        size={28}
                        color="#B47A33"
                      />
                    </Pressable>
                  ))}
                </View>

                <Field
                  label="Seu comentário"
                  value={comment}
                  onChangeText={setComment}
                  multiline
                  maxLength={1200}
                  placeholder="Conte como foi sua experiência com este produto"
                />

                <View style={styles.actions}>
                  <Button
                    variant="secondary"
                    disabled={loading}
                    onPress={() => setActiveProductId(null)}
                    style={styles.action}>
                    Cancelar
                  </Button>
                  <Button
                    loading={loading}
                    onPress={() => void submit(item.productId)}
                    style={styles.action}>
                    Enviar para aprovação
                  </Button>
                </View>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  header: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },
  headerCopy: { minWidth: 0, flex: 1 },
  title: { color: colors.text, fontSize: 14, fontWeight: '900' },
  subtitle: { marginTop: 3, color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  productRow: {
    minWidth: 0,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  productTop: {
    minWidth: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  productCopy: { minWidth: 180, flex: 1 },
  productName: { color: colors.text, fontSize: 13, fontWeight: '800' },
  verifiedLabel: { marginTop: 3, color: colors.success, fontSize: 10, fontWeight: '800' },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: colors.successSoft,
  },
  doneText: { color: colors.success, fontSize: 10, fontWeight: '900' },
  reviewButton: { minWidth: 132, maxWidth: '100%' },
  form: { gap: spacing.md },
  formLabel: { color: colors.text, fontSize: 12, fontWeight: '800' },
  stars: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  starButton: { padding: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { minWidth: 150, flex: 1 },
});
