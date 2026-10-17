const moneyFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

// Formata valores monetários no padrão brasileiro com 3 casas decimais (ex: 1.088,472)
export const formatMoney = (value) => moneyFormatter.format(Number(value) || 0);
