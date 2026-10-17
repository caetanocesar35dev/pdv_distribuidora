import { formatMoney } from './format';

// Largura da bobina da impressora térmica, em mm (58 ou 80). Configurável no frontend/.env (VITE_RECEIPT_WIDTH).
export const RECEIPT_WIDTH = Number(import.meta.env.VITE_RECEIPT_WIDTH) === 80 ? 80 : 58;

// Área útil de impressão e tamanhos de fonte de cada bobina
const LAYOUTS = {
  58: { contentWidth: 48, fontSize: 10, titleSize: 12, totalSize: 12, smallSize: 8 },
  80: { contentWidth: 72, fontSize: 12, titleSize: 14, totalSize: 14, smallSize: 8 },
};
const layout = LAYOUTS[RECEIPT_WIDTH];

export const PAYMENT_LABELS = {
  MONEY: 'Dinheiro',
  PIX: 'PIX',
  DEBIT: 'Cartão de Débito',
  CREDIT: 'Cartão de Crédito',
  CREDIT_STORE: 'Fiado',
};

const escapeHTML = (text) => String(text ?? '').replace(/[&<>"']/g, (ch) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[ch]));

const divider = (margin = 4) => `<hr style="border:none;border-top:1px dashed #000;margin:${margin}px 0;">`;
const row = (left, right, style = '') =>
  `<div style="display:flex;justify-content:space-between;gap:4px;${style}"><span>${left}</span><span style="white-space:nowrap;">${right}</span></div>`;

// Itens: em 58 mm, nome numa linha e "qtd x unit ... total" na seguinte (4 colunas não cabem);
// em 80 mm, tabela com Item / Qtd / Unit / Total.
const itemsHTML = (items) => {
  if (RECEIPT_WIDTH === 58) {
    return items.map(item => `
        <div style="margin:3px 0;">
          <div style="word-break:break-word;">${escapeHTML(item.product?.name)}</div>
          ${row(`${item.quantity} x ${formatMoney(item.price)}`, formatMoney(item.price * item.quantity))}
        </div>`).join('');
  }
  const rows = items.map(item => `
          <tr>
            <td style="padding:2px 0">${escapeHTML((item.product?.name || '').substring(0, 20))}</td>
            <td style="padding:2px 0;text-align:center">${item.quantity}</td>
            <td style="padding:2px 0;text-align:right">R$ ${formatMoney(item.price)}</td>
            <td style="padding:2px 0;text-align:right">R$ ${formatMoney(item.price * item.quantity)}</td>
          </tr>`).join('');
  return `
        <table style="width:100%;font-size:${layout.fontSize - 1}px;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:1px solid #000;">
              <th style="text-align:left;padding:2px 0;">Item</th>
              <th style="text-align:center;padding:2px 0;">Qtd</th>
              <th style="text-align:right;padding:2px 0;">Unit</th>
              <th style="text-align:right;padding:2px 0;">Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`;
};

// Bloco de assinatura do comprovante (linha tracejada + nome do cliente).
// Retorna vazio quando a venda não tem cliente, mantendo o comprovante como está.
export const signatureBlockHTML = (customerName) => {
  if (!customerName) return '';
  return `
        <div style="margin-top:32px;border-top:1px dashed #000;"></div>
        <div style="text-align:center;margin-top:4px;">${escapeHTML(customerName)}</div>
        <div style="text-align:center;font-size:${layout.smallSize + 1}px;">Assinatura do cliente</div>
        ${divider(8)}`;
};

// Monta o HTML do comprovante não fiscal no tamanho da bobina configurada.
// sale: { id, createdAt, items: [{ product: { name }, quantity, price }], discount, total, paymentMethod }
export const buildReceiptHTML = (sale, { customerName, operatorName, reprint = false, canceled = false } = {}) => {
  if (!sale) return '';
  const cnpj = import.meta.env.VITE_COMPANY_CNPJ || '00.000.000/0001-00';
  const date = new Date(sale.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

  return `
      <div style="width:${layout.contentWidth}mm;font-family:monospace;font-size:${layout.fontSize}px;line-height:1.3;color:#000;padding:4px 0;">
        <div style="text-align:center;font-weight:bold;font-size:${layout.titleSize}px;margin-bottom:2px;">DISTRIBUIDORA DE BEBIDAS</div>
        <div style="text-align:center;margin-bottom:4px;">CNPJ: ${escapeHTML(cnpj)}</div>
        ${divider()}
        <div style="text-align:center;font-weight:bold;">${reprint ? 'REIMPRESSÃO DE COMPROVANTE' : 'COMPROVANTE NÃO FISCAL'}</div>
        ${divider()}
        <div>Pedido: #${sale.id}</div>
        <div>Data: ${date}</div>
        ${operatorName ? `<div>Operador: ${escapeHTML(operatorName)}</div>` : ''}
        ${customerName ? `<div style="word-break:break-word;">Cliente: ${escapeHTML(customerName)}</div>` : ''}
        ${canceled ? '<div style="font-weight:bold;">*** VENDA CANCELADA ***</div>' : ''}
        ${divider()}
        ${itemsHTML(sale.items || [])}
        ${divider()}
        ${sale.discount > 0 ? row('Desconto:', `- R$ ${formatMoney(sale.discount)}`) : ''}
        ${row('TOTAL:', `R$ ${formatMoney(sale.total)}`, `font-weight:bold;font-size:${layout.totalSize}px;`)}
        <div>Pgto: ${PAYMENT_LABELS[sale.paymentMethod] || sale.paymentMethod}</div>
        ${divider(8)}
        ${signatureBlockHTML(customerName)}
        <div style="text-align:center;margin-top:4px;">Obrigado pela preferência!</div>
        <div style="text-align:center;font-size:${layout.smallSize}px;">Sistema PDV Distribuidora</div>
      </div>
    `;
};

// Abre uma janela só com o comprovante e manda imprimir no tamanho da bobina
export const printReceiptHTML = (receiptHTML) => {
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) {
    alert('O navegador bloqueou a janela de impressão. Permita pop-ups para este site.');
    return;
  }
  printWindow.document.write(`
      <html>
        <head>
          <title>Comprovante</title>
          <style>
            html, body { margin: 0; padding: 0; }
            body { width: ${RECEIPT_WIDTH}mm; display: flex; justify-content: center; }
            @page { size: ${RECEIPT_WIDTH}mm auto; margin: 0; }
          </style>
        </head>
        <body>${receiptHTML}</body>
      </html>
    `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 300);
};
