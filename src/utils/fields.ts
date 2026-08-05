export type BrazilDateParts = {
  day: number;
  month: number;
  year: number;
};

export type TextLimits = {
  minimum?: number;
  maximum: number;
  multiline?: boolean;
};

const UNSAFE_MARKUP = /<\/?[a-z][^>]*>|javascript\s*:|on\w+\s*=/i;

export function digitsOnly(value: string, maximum?: number) {
  const digits = value.replace(/\D/g, '');
  return maximum === undefined ? digits : digits.slice(0, maximum);
}

export function normalizeBrazilPhone(value: string) {
  const digits = digitsOnly(value, 13);
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return digits.slice(2);
  }
  return digits.slice(0, 11);
}

export function maskBrazilPhone(value: string) {
  const digits = normalizeBrazilPhone(value);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function isValidBrazilPhone(value: string, mobileOnly = false) {
  const digits = normalizeBrazilPhone(value);
  if (mobileOnly) return digits.length === 11 && digits[2] === '9';
  return digits.length === 10 || (digits.length === 11 && digits[2] === '9');
}

export function maskCpf(value: string) {
  const digits = digitsOnly(value, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

export function isValidCpf(value: string) {
  const digits = digitsOnly(value);
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  const calculate = (length: number) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(digits[index]) * (length + 1 - index);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return calculate(9) === Number(digits[9]) && calculate(10) === Number(digits[10]);
}

export function maskCnpj(value: string) {
  const digits = digitsOnly(value, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\/\d{4})(\d)/, '$1-$2');
}

export function isValidCnpj(value: string) {
  const digits = digitsOnly(value);
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;
  const calculate = (length: 12 | 13) => {
    const weights = length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((total, weight, index) => total + Number(digits[index]) * weight, 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  return calculate(12) === Number(digits[12]) && calculate(13) === Number(digits[13]);
}

export function maskCep(value: string) {
  const digits = digitsOnly(value, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

export function isValidCep(value: string) {
  return digitsOnly(value).length === 8;
}

export function maskBrazilDate(value: string) {
  const digits = digitsOnly(value, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function parseBrazilDate(value: string): BrazilDateParts | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1) return null;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= daysInMonth ? { day, month, year } : null;
}

export function isValidBrazilDate(value: string) {
  return parseBrazilDate(value) !== null;
}

export function maskTime(value: string) {
  const digits = digitsOnly(value, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
}

export function isValidTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  return Boolean(match && Number(match[1]) <= 23 && Number(match[2]) <= 59);
}

export function sanitizeCurrencyInput(value: string) {
  return value.replace(/[^\d.,]/g, '').slice(0, 18);
}

export function parseBrlCents(value: string): number | null {
  const raw = value.replace(/R\$/gi, '').replace(/\s/g, '').trim();
  if (!raw || /[^\d.,]/.test(raw) || !/\d/.test(raw)) return null;

  const lastDot = raw.lastIndexOf('.');
  const lastComma = raw.lastIndexOf(',');
  let decimalIndex = -1;

  if (lastDot >= 0 && lastComma >= 0) {
    decimalIndex = Math.max(lastDot, lastComma);
  } else {
    const separatorIndex = Math.max(lastDot, lastComma);
    if (separatorIndex >= 0) {
      const separator = raw[separatorIndex];
      const groups = raw.split(separator);
      const decimalLength = raw.length - separatorIndex - 1;
      const thousandsOnly = decimalLength === 3
        && groups.length >= 2
        && groups.slice(1).every((group) => group.length === 3);
      if (!thousandsOnly && decimalLength <= 2) decimalIndex = separatorIndex;
    }
  }

  const integerPart = decimalIndex >= 0 ? raw.slice(0, decimalIndex) : raw;
  const decimalPart = decimalIndex >= 0 ? raw.slice(decimalIndex + 1) : '';
  if (decimalPart.length > 2) return null;
  const integerDigits = integerPart.replace(/[.,]/g, '');
  if (!integerDigits || !/^\d+$/.test(integerDigits) || (decimalPart && !/^\d+$/.test(decimalPart))) return null;
  const cents = Number(integerDigits) * 100 + Number(decimalPart.padEnd(2, '0') || 0);
  return Number.isSafeInteger(cents) ? cents : null;
}

export function formatBrlInput(cents: number) {
  if (!Number.isSafeInteger(cents) || cents < 0) return '';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function sanitizePercentageInput(value: string) {
  const sanitized = value.replace(/[^\d,.]/g, '').replace('.', ',');
  const [integer = '', ...fractionParts] = sanitized.split(',');
  return fractionParts.length
    ? `${integer.slice(0, 3)},${fractionParts.join('').slice(0, 2)}`
    : integer.slice(0, 3);
}

export function parsePercentageBasisPoints(value: string) {
  const normalized = sanitizePercentageInput(value).replace(',', '.');
  if (!normalized) return null;
  const number = Number(normalized);
  if (!Number.isFinite(number) || number < 0 || number > 100) return null;
  return Math.round(number * 100);
}

export function maskNonNegativeInteger(value: string, maximumDigits = 6) {
  return digitsOnly(value, maximumDigits);
}

export function isValidQuantity(value: string, minimum: number, maximum: number) {
  if (!/^\d+$/.test(value)) return false;
  const quantity = Number(value);
  return Number.isSafeInteger(quantity) && quantity >= minimum && quantity <= maximum;
}

export function normalizePlainText(value: string, multiline = false) {
  const withoutControls = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  if (multiline) {
    return withoutControls
      .split(/\r?\n/)
      .map((line) => line.trim())
      .join('\n')
      .trim();
  }
  return withoutControls.replace(/\s+/g, ' ').trim();
}

export function validatePlainText(value: string, limits: TextLimits) {
  const normalized = normalizePlainText(value, limits.multiline);
  if (UNSAFE_MARKUP.test(normalized)) return 'Não use HTML, scripts ou código neste campo.';
  if (limits.minimum !== undefined && normalized.length < limits.minimum) {
    return `Informe pelo menos ${limits.minimum} caracteres.`;
  }
  if (normalized.length > limits.maximum) {
    return `Use no máximo ${limits.maximum} caracteres.`;
  }
  return null;
}

export function normalizeEmail(value: string) {
  return value.trim().toLocaleLowerCase('pt-BR').slice(0, 254);
}

export function isValidEmail(value: string) {
  const normalized = normalizeEmail(value);
  return normalized.length <= 254
    && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized);
}

export function maceioDateTimeToIso(
  dateValue: string,
  timeValue: string,
  boundary: 'start' | 'end',
) {
  const date = parseBrazilDate(dateValue);
  if (!date) throw new Error('Informe uma data válida no formato dia/mês/ano.');
  const fallbackTime = boundary === 'start' ? '00:00' : '23:59';
  const time = timeValue.trim() || fallbackTime;
  if (!isValidTime(time)) throw new Error('Informe um horário válido entre 00:00 e 23:59.');
  const [hour, minute] = time.split(':').map(Number);
  const seconds = boundary === 'end' ? '59.999' : '00.000';
  const iso = `${date.year.toString().padStart(4, '0')}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${seconds}-03:00`;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) throw new Error('Data ou hora inválida.');
  return parsed.toISOString();
}

export function isoToMaceioFields(value: string | null) {
  if (!value) return { date: '', time: '' };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: '', time: '' };
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Maceio',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(parsed);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return {
    date: `${get('day')}/${get('month')}/${get('year')}`,
    time: `${get('hour')}:${get('minute')}`,
  };
}

export function formatMaceioDate(value: string | null) {
  return isoToMaceioFields(value).date;
}
