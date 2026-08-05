import { ComponentProps, forwardRef } from 'react';
import { TextInput } from 'react-native';

import { Field } from '@/src/components/ui';
import {
  maskBrazilDate,
  maskBrazilPhone,
  maskCep,
  maskCnpj,
  maskCpf,
  maskNonNegativeInteger,
  maskTime,
  sanitizeCurrencyInput,
  sanitizePercentageInput,
} from '@/src/utils/fields';

type FieldKind = 'phone' | 'cpf' | 'cnpj' | 'cep' | 'date' | 'time' | 'currency' | 'percentage' | 'integer';
type Props = Omit<ComponentProps<typeof Field>, 'onChangeText'> & {
  kind: FieldKind;
  onChangeText: (value: string) => void;
};

const settings: Record<FieldKind, {
  keyboardType: ComponentProps<typeof Field>['keyboardType'];
  maxLength: number;
  mask: (value: string) => string;
}> = {
  phone: { keyboardType: 'phone-pad', maxLength: 15, mask: maskBrazilPhone },
  cpf: { keyboardType: 'number-pad', maxLength: 14, mask: maskCpf },
  cnpj: { keyboardType: 'number-pad', maxLength: 18, mask: maskCnpj },
  cep: { keyboardType: 'number-pad', maxLength: 9, mask: maskCep },
  date: { keyboardType: 'number-pad', maxLength: 10, mask: maskBrazilDate },
  time: { keyboardType: 'number-pad', maxLength: 5, mask: maskTime },
  currency: { keyboardType: 'decimal-pad', maxLength: 18, mask: sanitizeCurrencyInput },
  percentage: { keyboardType: 'decimal-pad', maxLength: 6, mask: sanitizePercentageInput },
  integer: { keyboardType: 'number-pad', maxLength: 6, mask: maskNonNegativeInteger },
};

export const StructuredField = forwardRef<TextInput, Props>(function StructuredField(
  { kind, onChangeText, ...props },
  ref,
) {
  const configuration = settings[kind];
  return (
    <Field
      ref={ref}
      {...props}
      keyboardType={props.keyboardType ?? configuration.keyboardType}
      maxLength={props.maxLength ?? configuration.maxLength}
      onChangeText={(value) => onChangeText(configuration.mask(value))}
    />
  );
});
