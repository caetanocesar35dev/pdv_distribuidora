import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { 
  Coffee, Plus, X, Search, ShoppingCart, Trash2, CheckCircle2, User, CreditCard, DollarSign, Users, AlertCircle 
} from 'lucide-react';

export default function Comandas() {
  const [tabs, setTabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estados de Nova Comanda
  const [isNewTabModalOpen, setIsNewTabModalOpen] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [newTabCustomer, setNewTabCustomer] = useState('');
  
  // Estados de Gerenciamento da Comanda Ativa
  const [activeTab, setActiveTab] = useState(null);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [codeQuery, setCodeQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  
  // Estados de Pagamento
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('MONEY');
  const [discount, setDiscount] = useState('');
  const [isFinishing, setIsFinishing] = useState(false);

  const barcodeInputRef = useRef(null);

  useEffect(() => {
    loadTabs();
    loadProducts();
    loadCustomers();
  }, []);

  const loadTabs = async () => {
    try {
      setLoading(true);
      const data = await api.get('/command-tabs');
      setTabs(data);
    } catch (err) {
      setError('Erro ao carregar as comandas.');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await api.get('/products');
      setProducts(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadCustomers = async () => {
    try {
      const data = await api.get('/customers');
      setCustomers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTab = async (e) => {
    e.preventDefault();
    if (!newTabName.trim()) return;
    try {
      const payload = { name: newTabName.trim() };
      if (newTabCustomer) payload.customerId = Number(newTabCustomer);
      
      const newTab = await api.post('/command-tabs', payload);
      setTabs([{ ...newTab, items: [], customer: customers.find(c => c.id === payload.customerId) }, ...tabs]);
      setIsNewTabModalOpen(false);
      setNewTabName('');
      setNewTabCustomer('');
    } catch (err) {
      setError(err.message || 'Erro ao criar comanda');
    }
  };

  const openTab = async (tab) => {
    try {
      const data = await api.get(`/command-tabs/${tab.id}`);
      setActiveTab(data);
      if (barcodeInputRef.current) barcodeInputRef.current.focus();
    } catch (err) {
      setError('Erro ao abrir detalhes da comanda.');
    }
  };

  const closeActiveTab = () => {
    setActiveTab(null);
    setCodeQuery('');
    setSelectedProduct('');
    setError('');
  };

  const addItemToTab = async (productId, quantity = 1) => {
    try {
      setError('');
      await api.post(`/command-tabs/${activeTab.id}/items`, { productId, quantity });
      // Atualizar a comanda ativa localmente via API para garantir sync exato
      const data = await api.get(`/command-tabs/${activeTab.id}`);
      setActiveTab(data);
      // Atualiza a lista master
      setTabs(tabs.map(t => t.id === activeTab.id ? data : t));
      loadProducts(); // <-- Força a atualização do estoque no Dropdown
    } catch (err) {
      setError(err.message || 'Erro ao adicionar item.');
    }
  };

  const handleAddByCode = async (e) => {
    if (e) e.preventDefault();
    if (!codeQuery.trim()) return;

    try {
      const product = await api.get(`/products/code/${codeQuery.trim()}`);
      await addItemToTab(product.id, 1);
      setCodeQuery('');
      if (barcodeInputRef.current) barcodeInputRef.current.focus();
    } catch (err) {
      setError(err.message || 'Produto não encontrado pelo código');
    }
  };

  const handleAddBySelect = async () => {
    if (!selectedProduct) return;
    await addItemToTab(Number(selectedProduct), 1);
    setSelectedProduct('');
  };

  const removeItem = async (itemId) => {
    try {
      await api.delete(`/command-tabs/${activeTab.id}/items/${itemId}`);
      const data = await api.get(`/command-tabs/${activeTab.id}`);
      setActiveTab(data);
      setTabs(tabs.map(t => t.id === activeTab.id ? data : t));
      loadProducts(); // <-- Força a atualização do estoque no Dropdown
    } catch (err) {
      setError(err.message || 'Erro ao remover item.');
    }
  };

  const calculateTotal = (tab) => {
    if (!tab || !tab.items) return 0;
    return tab.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  };

  const handleFinishTab = async () => {
    if (!activeTab || activeTab.items.length === 0) return;
    setIsFinishing(true);
    setError('');

    try {
      const isFiado = paymentMethod === 'CREDIT_STORE';
      const payload = {
        paymentMethod,
        discount: Number(discount) || undefined
      };
      // Se for fiado e a comanda não tiver cliente amarrado, exige
      if (isFiado && !activeTab.customerId && !newTabCustomer) {
        throw new Error('Para fechar fiado, selecione um cliente.');
      }
      if (isFiado && !activeTab.customerId && newTabCustomer) {
         payload.customerId = Number(newTabCustomer);
      }

      await api.post(`/command-tabs/${activeTab.id}/close`, payload);
      
      // Remove a comanda da lista, fecha os modais
      setTabs(tabs.filter(t => t.id !== activeTab.id));
      setIsPaymentModalOpen(false);
      setActiveTab(null);
      setPaymentMethod('MONEY');
      setDiscount('');
      setNewTabCustomer('');
      
    } catch (err) {
      setError(err.message || 'Erro ao finalizar comanda.');
    } finally {
      setIsFinishing(true); // Ocultar spinner 
      setIsFinishing(false);
    }
  };

  const translatePayment = (method) => {
    const types = {
      MONEY: 'Dinheiro',
      PIX: 'PIX',
      DEBIT: 'Débito',
      CREDIT: 'Crédito',
      CREDIT_STORE: 'Fiado'
    };
    return types[method] || method;
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center h-[calc(100vh-64px)] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 font-sans text-white h-[calc(100vh-64px)] flex flex-col gap-6 overflow-hidden">
      
      {/* Header */}
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Coffee className="text-amber-500 w-7 h-7" />
            Comandas em Aberto
          </h1>
          <p className="text-slate-400 text-xs mt-1">Gerencie o consumo de mesas e clientes no local</p>
        </div>
        <button
          onClick={() => setIsNewTabModalOpen(true)}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-amber-500/10 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Abrir Comanda
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl flex items-center gap-2 text-sm shrink-0">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Grid de Comandas */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {tabs.length === 0 ? (
          <div className="h-full flex flex-col justify-center items-center text-slate-500 p-8 border-2 border-dashed border-slate-800 rounded-2xl">
            <Coffee className="w-16 h-16 stroke-[1] mb-4 text-slate-700" />
            <p className="text-sm font-semibold">Nenhuma comanda aberta</p>
            <p className="text-xs mt-1">Clique no botão acima para abrir uma nova comanda de consumo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tabs.map((tab) => {
              const total = calculateTotal(tab);
              const itemCount = tab.items?.reduce((s, i) => s + i.quantity, 0) || 0;
              return (
                <div 
                  key={tab.id}
                  onClick={() => openTab(tab)}
                  className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 cursor-pointer hover:border-amber-500/50 hover:bg-slate-900/90 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-bl-[100%] transition-transform group-hover:scale-110 pointer-events-none"></div>
                  
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-lg truncate pr-2 text-white group-hover:text-amber-500 transition-colors">{tab.name}</h3>
                    <span className="bg-amber-500/10 text-amber-500 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">#{tab.id}</span>
                  </div>
                  
                  {tab.customer && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
                      <User className="w-3.5 h-3.5" />
                      <span className="truncate">{tab.customer.name}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-end mt-6">
                    <div className="text-xs text-slate-500">
                      {itemCount} {itemCount === 1 ? 'item' : 'itens'}
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-0.5">Total</div>
                      <div className="text-xl font-bold text-white tracking-tight">R$ {total.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: Nova Comanda */}
      {isNewTabModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Coffee className="w-5 h-5 text-amber-500" />
                Nova Comanda
              </h2>
              <button onClick={() => setIsNewTabModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTab} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nome da Comanda (Mesa/Pessoa)</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newTabName}
                  onChange={(e) => setNewTabName(e.target.value)}
                  placeholder="Ex: Mesa 04"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cliente (Opcional - Fiado)</label>
                <select
                  value={newTabCustomer}
                  onChange={(e) => setNewTabCustomer(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                >
                  <option value="">Nenhum</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-all shadow-lg shadow-amber-500/10 cursor-pointer"
                >
                  Criar Comanda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Gerenciar Comanda Ativa */}
      {activeTab && !isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/80 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                  <Coffee className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    {activeTab.name}
                    <span className="text-xs font-medium bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">#{activeTab.id}</span>
                  </h2>
                  {activeTab.customer && (
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <User className="w-3 h-3" /> {activeTab.customer.name}
                    </p>
                  )}
                </div>
              </div>
              <button onClick={closeActiveTab} className="p-2 text-slate-500 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
              {/* Lado Esquerdo: Adicionar Itens e Lista */}
              <div className="flex-1 flex flex-col border-r border-slate-800 overflow-hidden min-h-0">
                {/* Inputs */}
                <div className="p-4 border-b border-slate-800 bg-slate-900/30 shrink-0 space-y-3">
                  <form onSubmit={handleAddByCode} className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                      <input
                        ref={barcodeInputRef}
                        type="text"
                        value={codeQuery}
                        onChange={(e) => setCodeQuery(e.target.value)}
                        placeholder="Cód. Barras + Enter"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-sm"
                      />
                    </div>
                    <button type="submit" className="px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-colors">
                      OK
                    </button>
                  </form>
                  <div className="flex gap-2">
                    <select
                      value={selectedProduct}
                      onChange={(e) => setSelectedProduct(e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 text-sm"
                    >
                      <option value="">Buscar produto na lista...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                          {p.name} (R$ {p.price.toFixed(2)}) - Est: {p.stock}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleAddBySelect}
                      disabled={!selectedProduct}
                      className="px-5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 font-bold rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-40"
                    >
                      Lançar
                    </button>
                  </div>
                </div>

                {/* Lista de Itens */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
                  {activeTab.items.length === 0 ? (
                    <div className="h-full flex flex-col justify-center items-center text-slate-600">
                      <ShoppingCart className="w-12 h-12 mb-3 opacity-20" />
                      <p className="text-sm">Nenhum item consumido ainda.</p>
                    </div>
                  ) : (
                    activeTab.items.map(item => (
                      <div key={item.id} className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between group">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{item.product.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">1x R$ {item.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="font-bold text-amber-500 text-sm shrink-0">R$ {item.price.toFixed(2)}</p>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Remover e devolver ao estoque"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Lado Direito: Totais e Fechamento */}
              <div className="w-full lg:w-80 bg-slate-900/50 flex flex-col shrink-0 min-h-0">
                <div className="flex-1 p-6 flex flex-col justify-end">
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-slate-400 text-sm">
                      <span>Itens Consumidos:</span>
                      <span className="font-bold text-white">{activeTab.items.reduce((s, i) => s + i.quantity, 0)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400 text-sm">
                      <span>Tempo de Mesa:</span>
                      <span className="font-mono text-white">
                        {Math.floor((new Date() - new Date(activeTab.createdAt)) / 60000)} min
                      </span>
                    </div>
                  </div>
                  
                  <div className="border-t border-slate-800 pt-6">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Total a Pagar</p>
                    <h3 className="text-4xl font-black text-white tracking-tight">R$ {calculateTotal(activeTab).toFixed(2)}</h3>
                  </div>
                </div>

                <div className="p-6 pt-0 mt-auto">
                  <button
                    onClick={() => setIsPaymentModalOpen(true)}
                    disabled={activeTab.items.length === 0}
                    className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Fechar Comanda
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: Pagamento / Fechamento Final */}
      {isPaymentModalOpen && activeTab && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h2 className="text-xl font-bold text-white">Pagamento da Comanda</h2>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              
              {/* Resumo Valores */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex justify-between items-center">
                <span className="text-slate-400 font-semibold uppercase text-xs tracking-wider">Total Consumido:</span>
                <span className="text-2xl font-black text-amber-500">R$ {calculateTotal(activeTab).toFixed(2)}</span>
              </div>

              {/* Formas de Pagamento */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Forma de Pagamento</h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'MONEY', label: 'Dinheiro', icon: DollarSign },
                    { id: 'PIX', label: 'PIX', icon: CheckCircle2 },
                    { id: 'DEBIT', label: 'Débito', icon: CreditCard },
                    { id: 'CREDIT', label: 'Crédito', icon: CreditCard },
                    { id: 'CREDIT_STORE', label: 'Fiado', icon: Users }
                  ].map(method => {
                    const Icon = method.icon;
                    const isSelected = paymentMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id)}
                        className={`p-3 border rounded-xl flex flex-col items-center gap-1.5 transition-all ${
                          isSelected
                          ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                          : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[10px] font-semibold">{method.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fiado Setup */}
              {paymentMethod === 'CREDIT_STORE' && (
                <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/30">
                  <label className="block text-xs font-semibold text-amber-400 mb-2 uppercase tracking-wider">
                    Cliente do Fiado <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={newTabCustomer || (activeTab.customer?.id || '')}
                    onChange={(e) => setNewTabCustomer(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Selecione o Cliente...</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Desconto */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Desconto (Opcional - R$)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-6 py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={handleFinishTab}
                disabled={isFinishing || (paymentMethod === 'CREDIT_STORE' && !activeTab.customerId && !newTabCustomer)}
                className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-sm font-black uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                {isFinishing ? 'Processando...' : 'Confirmar Recebimento'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
