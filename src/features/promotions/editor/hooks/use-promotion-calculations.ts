import { useMemo } from 'react';

import {
  formatBrlInput,
  parseBrlCents,
} from '@/src/utils/fields';

type PromotionCalculationInput = {
  originalPrice: number;
  promotionalPrice: string;
};

export function usePromotionCalculations({
  originalPrice,
  promotionalPrice,
}: PromotionCalculationInput) {
  const promotionalPriceCents = useMemo(
    () => parseBrlCents(promotionalPrice),
    [promotionalPrice],
  );

  const previewPrice = useMemo(
    () =>
      promotionalPriceCents !== null &&
      promotionalPriceCents > 0
        ? promotionalPriceCents / 100
        : originalPrice,
    [originalPrice, promotionalPriceCents],
  );

  const discountPercentage = useMemo(
    () =>
      originalPrice > 0 && previewPrice < originalPrice
        ? Math.round(
            ((originalPrice - previewPrice) /
              originalPrice) *
              100,
          )
        : 0,
    [originalPrice, previewPrice],
  );

  function calculateDiscountFromPrice(value: string) {
    const priceCents = parseBrlCents(value);
    const originalPriceCents = Math.round(originalPrice * 100);

    if (
      originalPriceCents <= 0 ||
      priceCents === null ||
      priceCents <= 0 ||
      priceCents >= originalPriceCents
    ) {
      return '';
    }

    return String(
      Math.round(
        ((originalPriceCents - priceCents) /
          originalPriceCents) *
          100,
      ),
    );
  }

  function calculatePriceFromDiscount(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 2);

    if (!digits) {
      return {
        discountInput: '',
        promotionalPrice: '',
      };
    }

    const percentage = Math.min(99, Number(digits));

    if (originalPrice <= 0) {
      return {
        discountInput: String(percentage),
        promotionalPrice,
      };
    }

    const calculatedPriceCents = Math.max(
      1,
      Math.round(
        originalPrice * 100 * (1 - percentage / 100),
      ),
    );

    return {
      discountInput: String(percentage),
      promotionalPrice: formatBrlInput(calculatedPriceCents),
    };
  }

  return {
    promotionalPriceCents,
    previewPrice,
    discountPercentage,
    calculateDiscountFromPrice,
    calculatePriceFromDiscount,
  };
}
