import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  History, Search, Printer, XSquare, AlertTriangle, CheckCircle2, 
  Calendar, Info, X, ChevronRight
} from 'lucide-react';

export default function Historico() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Detalhes e reimpressão
  const [selectedSale, setSelectedSale] = useState(null);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      setLoading(true);
      const data = await api.get('/sales');
      setSales(data);
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar histórico de vendas');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSale = async (id) => {
    if (!window.confirm(`Tem certeza que deseja cancelar a venda #${id}? Os produtos voltarão ao estoque e o estorno será registrado no caixa.`)) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      await api.post(`/sales/${id}/cancel`);
      setSuccess(`Venda #${id} cancelada com sucesso.`);
      loadSales();
      if (selectedSale && selectedSale.id === id) {
        setSelectedSale(null);
      }
    } catch (err) {
      setError(err.message || 'Erro ao cancelar venda');
    }
  };

  const printReceipt = () => {
    window.print();
  };

  const translatePayment = (method) => {
    const types = {
      MONEY: 'Dinheiro',
      PIX: 'PIX',
      DEBIT: 'Cartão de Débito',
      CREDIT: 'Cartão de Crédito'
    };
    return types[method] || method;
  };

  const translateStatus = (status) => {
    const statuses = {
      COMPLETED: { label: 'Concluída', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
      CANCELED: { label: 'Cancelada', class: 'bg-red-500/10 text-red-400 border-red-500/20' }
    };
    return statuses[status] || { label: status, class: 'bg-slate-800 text-slate-400' };
  };

  const filteredSales = sales.filter(s =>
    s.id.toString().includes(searchQuery) ||
    s.paymentMethod.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 p-6 font-sans text-white h-[calc(100vh-64px)] overflow-y-auto space-y-6">
      
      {/* Impressão do Comprovante Não-Fiscal (Oculto em tela, exibido no Print) */}
      {selectedSale && (
        <div className="hidden print:block print:p-4 text-black bg-white w-[80mm] text-xs font-mono">
          <div className="text-center font-bold text-sm mb-2">DISTRIBUIDORA DE BEBIDAS</div>
          <div className="text-center mb-2">CNPJ: 00.000.000/0001-00</div>
          <div className="border-b border-dashed border-black my-1"></div>
          <div className="text-center font-bold">REIMPRESSÃO DE COMPROVANTE</div>
          <div className="border-b border-dashed border-black my-1"></div>
          <div>Pedido: #{selectedSale.id}</div>
          <div>Data/Hora: {new Date(selectedSale.createdAt).toLocaleString('pt-BR')}</div>
          <div>Status: {selectedSale.status === 'CANCELED' ? 'CANCELADO' : 'CONCLUÍDO'}</div>
          <div className="border-b border-dashed border-black my-1"></div>
          
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-black">
                <th className="py-1">Item</th>
                <th className="py-1 text-center">Qtd</th>
                <th className="py-1 text-right">Unit</th>
                <th className="py-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {selectedSale.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-1">{item.product.name.substring(0, 18)}</td>
                  <td className="py-1 text-center">{item.quantity}</td>
                  <td className="py-1 text-right">R$ {item.price.toFixed(2)}</td>
                  <td className="py-1 text-right">R$ {(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-b border-dashed border-black my-1"></div>
          <div className="flex justify-between font-bold text-sm">
            <span>TOTAL:</span>
            <span>R$ {selectedSale.total.toFixed(2)}</span>
          </div>
          <div>Forma Pgto: {translatePayment(selectedSale.paymentMethod)}</div>
          <div className="border-b border-dashed border-black my-2"></div>
          <div className="text-center mt-4">Comprovante de Venda Não Fiscal</div>
          <div className="text-center text-[8px]">Sistema PDV Distribuidora</div>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="text-amber-500 w-7 h-7" />
            Histórico de Vendas
          </h1>
          <p className="text-slate-400 text-xs mt-1">Consulte vendas realizadas, reimprima comprovantes e efetue estornos</p>
        </div>
      </div>

      {/* Alertas */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-center gap-2 text-sm max-w-6xl mx-auto">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl flex items-center gap-2 text-sm max-w-6xl mx-auto">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Barra de Busca */}
      <div className="max-w-6xl mx-auto bg-slate-900/40 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar por número do pedido ou forma de pagamento..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-white placeholder-slate-650 focus:outline-none focus:border-amber-500 transition-colors text-sm"
          />
        </div>
      </div>

      {/* Grid de Lista e Detalhes */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Lista de Vendas (Col-span 2) */}
        <div className="lg:col-span-2 bg-slate-900/20 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="py-20 flex justify-center items-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="px-6 py-4">Pedido</th>
                    <th className="px-6 py-4">Data/Hora</th>
                    <th className="px-6 py-4 text-right">Total</th>
                    <th className="px-6 py-4 text-center">Pagamento</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                        Nenhuma venda registrada ou correspondente à pesquisa.
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map((sale) => {
                      const status = translateStatus(sale.status);
                      const isSelected = selectedSale?.id === sale.id;
                      return (
                        <tr 
                          key={sale.id} 
                          onClick={() => setSelectedSale(sale)}
                          className={`cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-amber-500/5 hover:bg-amber-500/10 border-l-2 border-l-amber-500' 
                              : 'hover:bg-slate-900/10'
                          }`}
                        >
                          <td className="px-6 py-4 font-mono font-bold text-white">#{sale.id}</td>
                          <td className="px-6 py-4 text-xs text-slate-400">
                            {new Date(sale.createdAt).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-amber-550">R$ {sale.total.toFixed(2)}</td>
                          <td className="px-6 py-4 text-center text-slate-300 font-semibold">{translatePayment(sale.paymentMethod)}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2.5 py-0.5 border rounded-full text-[10px] font-bold ${status.class}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-center items-center" onClick={(e) => e.stopPropagation()}>
                              <ChevronRight className="w-5 h-5 text-slate-600" />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Lado Direito: Detalhes do Pedido */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-xl sticky top-6">
          {!selectedSale ? (
            <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
              <Info className="w-12 h-12 stroke-[1.5] text-slate-700" />
              <p className="text-sm">Selecione uma venda para ver os detalhes</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Detalhes do Pedido #{selectedSale.id}</h3>
                  <p className="text-slate-500 text-xs mt-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(selectedSale.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedSale(null)}
                  className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Itens */}
              <div className="space-y-3">
                <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-400">Produtos Vendidos</h4>
                <div className="space-y-2 bg-slate-950/60 border border-slate-850 p-4 rounded-xl divide-y divide-slate-900">
                  {selectedSale.items.map((item, idx) => (
                    <div key={idx} className={`flex justify-between py-2 ${idx === 0 ? 'pt-0' : ''}`}>
                      <div className="min-w-0 flex-1 pr-3">
                        <p className="text-sm font-medium text-white truncate">{item.product.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {item.quantity} x R$ {item.price.toFixed(2)}
                        </p>
                      </div>
                      <span className="font-mono text-sm font-semibold text-white shrink-0 mt-0.5">
                        R$ {(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="pt-3 flex justify-between font-bold text-amber-500 text-sm border-t border-slate-800">
                    <span>Total do Pedido:</span>
                    <span>R$ {selectedSale.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Informações Extras */}
              <div className="grid grid-cols-2 gap-4 bg-slate-950/40 p-4 border border-slate-850 rounded-xl text-xs">
                <div>
                  <span className="text-slate-500 block">Forma Pgto</span>
                  <span className="font-bold text-slate-200 mt-0.5 block">{translatePayment(selectedSale.paymentMethod)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Status da Venda</span>
                  <span className={`font-bold mt-0.5 block ${selectedSale.status === 'CANCELED' ? 'text-red-400' : 'text-emerald-400'}`}>
                    {selectedSale.status === 'CANCELED' ? 'Cancelado' : 'Concluído'}
                  </span>
                </div>
              </div>

              {/* Ações */}
              <div className="space-y-3">
                <button
                  onClick={printReceipt}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Printer className="w-4.5 h-4.5" />
                  Imprimir Comprovante (Reimpressão)
                </button>

                {selectedSale.status !== 'CANCELED' && (
                  <button
                    onClick={() => handleCancelSale(selectedSale.id)}
                    className="w-full py-3 bg-red-500/10 hover:bg-red-500 border border-red-500/20 hover:border-transparent text-red-400 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <XSquare className="w-4.5 h-4.5" />
                    Cancelar Pedido (Estornar)
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
