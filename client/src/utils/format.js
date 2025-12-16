export function formatIndian(amount) {
  if (amount === null || amount === undefined || amount === '') return '-';
  const n = Number(amount);
  if (Number.isNaN(n)) return String(amount);
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export function formatSignedIndian(amount, isPositive) {
  const formatted = formatIndian(amount);
  if (formatted === '-') return formatted;
  return `${isPositive ? '+' : '-'}${formatted}`;
}
