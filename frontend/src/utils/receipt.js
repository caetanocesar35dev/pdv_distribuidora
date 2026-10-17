const escapeHTML = (text) => String(text).replace(/[&<>"']/g, (ch) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[ch]));

// Bloco de assinatura do comprovante (linha tracejada + nome do cliente).
// Retorna vazio quando a venda não tem cliente, mantendo o comprovante como está.
export const signatureBlockHTML = (customerName) => {
  if (!customerName) return '';
  return `
        <div style="margin-top:32px;border-top:1px dashed #000;"></div>
        <div style="text-align:center;margin-top:4px;">${escapeHTML(customerName)}</div>
        <div style="text-align:center;font-size:10px;">Assinatura do cliente</div>
        <hr style="border:none;border-top:1px dashed #000;margin:8px 0;">`;
};
