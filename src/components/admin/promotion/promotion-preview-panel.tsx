import { StyleSheet, View } from 'react-native';

import {
  PromotionPreview,
  type PromotionBadgePosition,
  type PromotionBadgeShape,
  type PromotionBadgeSize,
  type PromotionPreviewMode,
} from '@/src/components/admin/promotion-preview';
import { spacing } from '@/src/theme';

type PromotionPreviewPanelProps = {
  mode: PromotionPreviewMode;
  onChangeMode: (mode: PromotionPreviewMode) => void;
  enabled: boolean;
  productName: string;
  imageUri: string;
  originalPrice: number;
  promotionalPrice: number;
  discountPercentage: number;
  showBadge: boolean;
  badgeLabel: string;
  badgeColor: string;
  badgePosition: PromotionBadgePosition;
  badgeSize: PromotionBadgeSize;
  badgeShape: PromotionBadgeShape;
};

export function PromotionPreviewPanel({
  mode,
  onChangeMode,
  enabled,
  productName,
  imageUri,
  originalPrice,
  promotionalPrice,
  discountPercentage,
  showBadge,
  badgeLabel,
  badgeColor,
  badgePosition,
  badgeSize,
  badgeShape,
}: PromotionPreviewPanelProps) {
  return (
    <View style={styles.previewColumn}>
      <View style={styles.previewSticky}>
        <PromotionPreview
          mode={mode}
          onChangeMode={onChangeMode}
          enabled={enabled}
          productName={productName}
          imageUri={imageUri}
          originalPrice={originalPrice}
          promotionalPrice={promotionalPrice}
          discountPercentage={discountPercentage}
          showBadge={showBadge}
          badgeLabel={badgeLabel}
          badgeColor={badgeColor}
          badgePosition={badgePosition}
          badgeSize={badgeSize}
          badgeShape={badgeShape}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  previewColumn: {
    minWidth: 300,
    flex: 0.8,
  },

  previewSticky: {
    gap: spacing.lg,
  },
});
