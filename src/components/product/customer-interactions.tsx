import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { loadProductReviews, ProductReview } from '@/src/services/customer';
import { colors, radii, spacing } from '@/src/theme';

export function CustomerProductInteractions({
  productId,
  outOfStock: _outOfStock,
}: {
  productId: string;
  outOfStock: boolean;
}) {
  const [reviews, setReviews] = useState<ProductReview[]>([]);

  useEffect(() => {
    let active = true;
    void loadProductReviews(productId)
      .then((items) => {
        if (active) setReviews(items);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [productId]);

  const average = useMemo(() => {
    if (!reviews.length) return 0;
    return reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length;
  }, [reviews]);

  if (!reviews.length) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.icon}>
          <Ionicons name="star" size={20} color="#B47A33" />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Avaliações de clientes</Text>
          <Text style={styles.subtitle}>
            {average.toFixed(1)} de 5 · {reviews.length} avaliação{reviews.length === 1 ? '' : 'ões'} aprovada{reviews.length === 1 ? '' : 's'}
          </Text>
        </View>
      </View>

      {reviews.map((review) => (
        <View key={review.id} style={styles.review}>
          <View style={styles.reviewTop}>
            <View style={styles.reviewCopy}>
              <Text style={styles.customer}>{review.displayName}</Text>
              <Text style={styles.stars}>
                {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
              </Text>
            </View>
            {review.verifiedPurchase ? (
              <View style={styles.verified}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <Text style={styles.verifiedText}>Compra verificada</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.comment}>{review.comment}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.large,
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  header: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },
  headerCopy: { minWidth: 0, flex: 1 },
  title: { color: colors.text, fontSize: 18, fontWeight: '900' },
  subtitle: { marginTop: 2, color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  review: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  reviewTop: {
    minWidth: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  reviewCopy: { minWidth: 0, flex: 1 },
  customer: { color: colors.text, fontSize: 13, fontWeight: '800' },
  stars: { marginTop: 2, color: '#B47A33', fontSize: 15 },
  verified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.successSoft,
  },
  verifiedText: { color: colors.success, fontSize: 10, fontWeight: '800' },
  comment: { color: colors.text, fontSize: 13, lineHeight: 20 },
});
