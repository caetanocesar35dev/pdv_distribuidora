const moneyFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

// Formata valores monetários no padrão brasileiro com 3 casas decimais (ex: 1.088,472)
export const formatMoney = (value) => moneyFormatter.format(Number(value) || 0);

// Converte a quantidade em unidades para fardos/caixas + unidades avulsas (ex: "2 fardos + 3 un.")
export const formatPacks = (quantity, packQuantity) => {
  const packs = Math.floor(quantity / packQuantity);
  const loose = quantity % packQuantity;
  const parts = [];
  if (packs > 0) parts.push(`${packs} ${packs === 1 ? 'fardo' : 'fardos'}`);
  if (loose > 0) parts.push(`${loose} un.`);
  return parts.join(' + ');
};
