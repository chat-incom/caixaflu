export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Math.abs(value));
};

export const formatMonth = (monthString: string): string => {
  if (!monthString) return '-';
  const [year, month] = monthString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 15);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  const [year, month, day] = dateString.split('-');
  return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)))
    .toLocaleDateString('pt-BR');
};

export const getValueColorClass = (value: number, type: 'text' | 'bg' = 'text'): string => {
  const isNegative = value < 0;
  const isZero = value === 0;
  
  if (type === 'text') {
    return isNegative ? 'text-red-600 font-bold' : isZero ? 'text-gray-500' : 'text-green-600 font-bold';
  }
  return isNegative ? 'bg-red-50' : isZero ? 'bg-gray-50' : 'bg-green-50';
};

export const getValueIcon = (value: number) => {
  if (value < 0) return '📉';
  if (value > 0) return '📈';
  return '➖';
};
