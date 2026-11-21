const moedaBRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const numeroBR = new Intl.NumberFormat('pt-BR');

const dataBR = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
});

const dataHoraBR = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

export function toNumber(value: number | string | null | undefined) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const raw = String(value ?? '').trim();
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw;

  const numberValue = Number(normalized || 0);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

export function formatCurrency(value: number | string | null | undefined) {
  return moedaBRL.format(toNumber(value));
}

export function formatNumber(value: number | string | null | undefined) {
  return numeroBR.format(toNumber(value));
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return '-';

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return dataBR.format(date);
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return '-';

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return dataHoraBR.format(date);
}

export function onlyDigits(value: string | number | null | undefined) {
  return String(value ?? '').replace(/\D/g, '');
}

export function formatCpfCnpj(value: string | number | null | undefined) {
  const digits = onlyDigits(value);

  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  if (digits.length === 14) {
    return digits.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      '$1.$2.$3/$4-$5',
    );
  }

  return String(value ?? '-').trim() || '-';
}

export function formatPhone(value: string | number | null | undefined) {
  const digits = onlyDigits(value);

  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }

  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }

  return String(value ?? '-').trim() || '-';
}

export function truncateText(value: string | null | undefined, limit = 80) {
  const text = String(value ?? '').trim();

  if (text.length <= limit) {
    return text;
  }

  return `${text.slice(0, Math.max(0, limit - 1)).trim()}…`;
}

export function formatBoolean(
  value: boolean | null | undefined,
  labels = { yes: 'Sim', no: 'Não' },
) {
  return value ? labels.yes : labels.no;
}
