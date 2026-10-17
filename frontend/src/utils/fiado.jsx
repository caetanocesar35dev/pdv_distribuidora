import { api } from '../services/api';
import { formatMoney } from './format';
import { useConfirm } from '../components/ConfirmDialog';

// Busca a dívida de fiado do cliente. Retorna null se ele não deve nada.
async function buscarDividaFiado(customerId) {
  const customer = await api.get(`/customers/${customerId}`);
  if (!customer || customer.balance <= 0) return null;

  // Pagamentos não são vinculados a pedidos, então considera que quitam os mais antigos primeiro:
  // os pedidos em aberto são os fiados mais recentes cuja soma cobre o saldo devedor.
  const fiados = (customer.sales || [])
    .filter(s => s.paymentMethod === 'CREDIT_STORE' && s.status === 'COMPLETED')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  let acumulado = 0;
  let pedidos = 0;
  for (const sale of fiados) {
    if (acumulado >= customer.balance - 0.0005) break;
    acumulado += sale.total;
    pedidos++;
  }

  return { name: customer.name, balance: customer.balance, pedidos };
}

// Hook: retorna uma função que, se o cliente já possui dívida de fiado, abre o modal
// pedindo confirmação. Resolve true se pode seguir com a venda.
export function useConfirmFiado() {
  const confirm = useConfirm();

  return async (customerId) => {
    const divida = await buscarDividaFiado(customerId);
    if (!divida) return true;

    return confirm({
      title: 'Cliente com fiado em aberto',
      confirmText: 'Sim, prosseguir',
      message: (
        <>
          <p>
            O cliente <strong className="text-white">{divida.name}</strong> já possui{' '}
            <strong className="text-rose-400">R$ {formatMoney(divida.balance)}</strong> em fiado, referente a{' '}
            <strong className="text-white">{divida.pedidos === 1 ? '1 pedido' : `${divida.pedidos} pedidos`}</strong> em aberto.
          </p>
          <p>Tem certeza que deseja prosseguir com esta venda fiado?</p>
        </>
      ),
    });
  };
}
