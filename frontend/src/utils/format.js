const moneyFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const priceFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

// Valores em dinheiro (subtotais, totais, caixa, fiado, dashboard): 2 casas (ex: 1.088,47)
export const formatMoney = (value) => moneyFormatter.format(Number(value) || 0);

// Preço unitário de produto (cadastro, preço especial por cliente, "un. R$"): 3 casas (ex: 4,125)
export const formatPrice = (value) => priceFormatter.format(Number(value) || 0);

// Converte a quantidade em unidades para fardos/caixas + unidades avulsas (ex: "2 fardos + 3 un.")
export const formatPacks = (quantity, packQuantity) => {
  const packs = Math.floor(quantity / packQuantity);
  const loose = quantity % packQuantity;
  const parts = [];
  if (packs > 0) parts.push(`${packs} ${packs === 1 ? 'fardo' : 'fardos'}`);
  if (loose > 0) parts.push(`${loose} un.`);
  return parts.join(' + ');
};
