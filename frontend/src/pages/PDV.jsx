import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { 
  Search, Plus, Minus, Trash2, ShoppingCart, 
  DollarSign, CheckCircle2, AlertCircle, Printer, X, CreditCard
} from 'lucide-react';

export default function PDV() {
  const navigate = useNavigate();
  const [cashRegister, setCashRegister] = useState(null);
  const [loadingCash, setLoadingCash] = useState(true);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [codeQuery, setCodeQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('MONEY');
  const [isFinishing, setIsFinishing] = useState(false);
  const [saleResult, setSaleResult] = useState(null);
  const [error, setError] = useState('');
  
  const barcodeInputRef = useRef(null);

  useEffect(() => {
    checkCashRegister();
    loadProducts();
  }, []);

  const checkCashRegister = async () => {
    try {
      setLoadingCash(true);
      const data = await api.get('/cash-register/current');
      setCashRegister(data);
    } catch (err) {
      console.error('Erro ao verificar caixa:', err);
    } finally {
      setLoadingCash(false);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await api.get('/products');
      setProducts(data);
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
    }
  };

  // Foca no input do código de barras ao carregar
  useEffect(() => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [cashRegister]);

  const handleAddByCode = async (e) => {
    if (e) e.preventDefault();
    if (!codeQuery.trim()) return;

    setError('');
    try {
      const product = await api.get(`/products/code/${codeQuery.trim()}`);
      addToCart(product);
      setCodeQuery('');
    } catch (err) {
      setError(err.message || 'Produto não encontrado pelo código');
    }
  };

  const handleAddBySelect = () => {
    if (!selectedProduct) return;
    const product = products.find(p => p.id === Number(selectedProduct));
    if (product) {
      addToCart(product);
      setSelectedProduct('');
    }
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item.product.id === product.id);
    const cartQty = existing ? existing.quantity : 0;

    if (product.stock <= cartQty) {
      setError(`Estoque insuficiente de "${product.name}". Em estoque: ${product.stock}`);
      return;
    }

    if (existing) {
      setCart(cart.map(item => 
        item.product.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
    setError('');
  };

  const updateQuantity = (productId, amount) => {
    const item = cart.find(i => i.product.id === productId);
    if (!item) return;

    const newQty = item.quantity + amount;
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (amount > 0 && item.product.stock < newQty) {
      setError(`Estoque insuficiente de "${item.product.name}". Em estoque: ${item.product.stock}`);
      return;
    }

    setCart(cart.map(i => 
      i.product.id === productId 
        ? { ...i, quantity: newQty }
        : i
    ));
    setError('');
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product.id !== productId));
    setError('');
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  const handleFinishSale = async () => {
    if (cart.length === 0) return;
    setIsFinishing(true);
    setError('');
    
    try {
      const items = cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity
      }));

      const res = await api.post('/sales', {
        paymentMethod,
        items
      });

      setSaleResult(res);
      setCart([]);
      loadProducts(); // Recarregar produtos para atualizar estoque em tela
    } catch (err) {
      setError(err.message || 'Erro ao finalizar venda');
    } finally {
      setIsFinishing(false);
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

  if (loadingCash) {
    return (
      <div className="flex-1 flex justify-center items-center h-[calc(100vh-64px)] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  // Se caixa estiver fechado, exibe aviso bloqueante
  if (!cashRegister) {
    return (
      <div className="flex-1 p-6 md:p-10 max-w-4xl mx-auto flex flex-col justify-center items-center h-[calc(100vh-100px)]">
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Caixa Fechado</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Não é possível registrar vendas no sistema sem antes abrir o caixa diário.
          </p>
          <button
            onClick={() => navigate('/caixa')}
            className="w-full py-3 bg-amber-500 text-slate-950 font-bold rounded-xl hover:bg-amber-400 transition-colors cursor-pointer text-sm shadow-lg shadow-amber-500/10"
          >
            Ir para Controle de Caixa
          </button>
        </div>
      </div>
    );
  }

  // Filtragem de produtos para preenchimento manual rápido
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.code.includes(searchQuery)
  );

  return (
    <div className="flex-1 p-6 font-sans text-white h-[calc(100vh-64px)] flex flex-col gap-6 overflow-hidden">
      {/* Impressão do Comprovante Não-Fiscal (Oculto em tela, exibido no Print) */}
      {saleResult && (
        <div className="hidden print:block print:p-4 text-black bg-white w-[80mm] text-xs font-mono">
          <div className="text-center font-bold text-sm mb-2">DISTRIBUIDORA DE BEBIDAS</div>
          <div className="text-center mb-2">CNPJ: 00.000.000/0001-00</div>
          <div className="border-b border-dashed border-black my-1"></div>
          <div>COMPROVANTE NÃO FISCAL</div>
          <div>Pedido: #{saleResult.id}</div>
          <div>Data/Hora: {new Date(saleResult.createdAt).toLocaleString('pt-BR')}</div>
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
              {saleResult.items.map((item, idx) => (
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
            <span>R$ {saleResult.total.toFixed(2)}</span>
          </div>
          <div>Forma Pgto: {translatePayment(saleResult.paymentMethod)}</div>
          <div className="border-b border-dashed border-black my-2"></div>
          <div className="text-center mt-4">Obrigado pela preferência!</div>
          <div className="text-center text-[8px]">Sistema PDV Distribuidora</div>
        </div>
      )}

      {/* Título e Status */}
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="text-amber-500 w-7 h-7" />
            Ponto de Vendas (PDV)
          </h1>
          <p className="text-slate-400 text-xs mt-1">Registrar nova venda na portaria</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>Caixa Aberto (Operador)</span>
        </div>
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

      {/* Main Grid split */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden min-h-0">
        
        {/* Lado Esquerdo: Carrinho e Inputs (Col-span 2) */}
        <div className="lg:col-span-2 flex flex-col gap-4 overflow-hidden min-h-0">
          
          {/* Inputs de Pesquisa */}
          <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4 shrink-0">
            {/* Input por código de barras */}
            <form onSubmit={handleAddByCode} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={codeQuery}
                  onChange={(e) => setCodeQuery(e.target.value)}
                  placeholder="Código de Barras + Enter"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors text-sm"
                />
              </div>
              <button
                type="submit"
                className="px-5 bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
              >
                Buscar
              </button>
            </form>

            <div className="h-px md:h-auto md:w-px bg-slate-800 my-1 md:my-0"></div>

            {/* Select manual de produtos */}
            <div className="flex-1 flex gap-2">
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 transition-colors text-sm"
              >
                <option value="">Selecionar Produto...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                    {p.name} (Estoque: {p.stock}) - R$ {p.price.toFixed(2)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddBySelect}
                disabled={!selectedProduct}
                className="px-5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-40"
              >
                Adicionar
              </button>
            </div>
          </div>

          {/* Lista de itens no carrinho */}
          <div className="flex-1 bg-slate-900/40 border border-slate-800 rounded-2xl flex flex-col overflow-hidden min-h-0">
            <div className="bg-slate-900/80 px-6 py-4 border-b border-slate-800 flex justify-between items-center shrink-0">
              <h2 className="font-semibold text-sm tracking-wide uppercase text-slate-400">Carrinho de Compras</h2>
              <span className="bg-amber-500/10 text-amber-400 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                {cart.reduce((s, i) => s + i.quantity, 0)} itens
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center text-slate-500 p-8">
                  <ShoppingCart className="w-16 h-16 stroke-[1.5] mb-4 text-slate-700" />
                  <p className="text-sm">Carrinho vazio</p>
                  <p className="text-xs mt-1 text-slate-650">Leia um código de barras ou selecione na lista acima</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.product.id} className="bg-slate-950/60 border border-slate-800/60 p-4 rounded-xl flex items-center justify-between gap-4 hover:border-slate-800 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-white truncate">{item.product.name}</p>
                      <p className="text-slate-500 text-xs mt-1 font-mono">Cód: {item.product.code}</p>
                    </div>

                    <div className="flex items-center gap-6">
                      {/* Subtotal */}
                      <div className="text-right shrink-0">
                        <p className="text-xs text-slate-500">Subtotal</p>
                        <p className="font-bold text-sm text-amber-500 mt-0.5">R$ {(item.product.price * item.quantity).toFixed(2)}</p>
                      </div>

                      {/* Quantidade */}
                      <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1">
                        <button
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-10 text-center font-bold text-sm text-white font-mono">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Botão Remover */}
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-2 text-slate-500 hover:text-red-400 transition-colors cursor-pointer rounded-lg hover:bg-red-500/10"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Lado Direito: Fechamento de Venda (Col-span 1) */}
        <div className="flex flex-col gap-6 overflow-hidden min-h-0">
          
          {/* Painel Total */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shrink-0 shadow-lg">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Valor da Compra</p>
              <h2 className="text-4xl font-extrabold text-white mt-2 tracking-tight">
                R$ {cartTotal.toFixed(2)}
              </h2>
            </div>
            <div className="h-px bg-slate-800 my-4"></div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Itens:</span>
                <span>{cart.reduce((s, i) => s + i.quantity, 0)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Status Caixa:</span>
                <span className="text-emerald-400 font-semibold">Aberto</span>
              </div>
            </div>
          </div>

          {/* Formas de Pagamento e Botão Confirmar */}
          <div className="flex-1 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between min-h-0 overflow-y-auto">
            <div className="space-y-4">
              <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-400">Forma de Pagamento</h3>
              
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'MONEY', label: 'Dinheiro', icon: DollarSign },
                  { id: 'PIX', label: 'PIX', icon: CheckCircle2 },
                  { id: 'DEBIT', label: 'Débito', icon: CreditCard },
                  { id: 'CREDIT', label: 'Crédito', icon: CreditCard }
                ].map(method => {
                  const Icon = method.icon;
                  const isSelected = paymentMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`p-3.5 border rounded-xl flex flex-col items-center gap-2 cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-amber-500 bg-amber-500/10 text-amber-400' 
                          : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Icon className="w-6 h-6 stroke-[1.5]" />
                      <span className="text-xs font-semibold">{method.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-8">
              <button
                onClick={handleFinishSale}
                disabled={cart.length === 0 || isFinishing}
                className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/10 disabled:opacity-40 disabled:cursor-not-allowed text-sm uppercase tracking-wider"
              >
                {isFinishing ? 'Finalizando...' : 'Confirmar Venda (F2)'}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Modal de Comprovante de Sucesso */}
      {saleResult && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 relative">
            <button 
              onClick={() => setSaleResult(null)} 
              className="absolute right-4 top-4 text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-7 h-7 text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-white">Venda Concluída!</h3>
              <p className="text-slate-400 text-xs mt-1">Pedido registrado com sucesso.</p>

              {/* Box de comprovante resumido no modal */}
              <div className="w-full mt-6 bg-slate-950 border border-slate-850 p-4 rounded-xl text-left font-mono text-xs text-slate-300 space-y-2">
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span>Pedido:</span>
                  <span className="text-white font-bold">#{saleResult.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Data/Hora:</span>
                  <span>{new Date(saleResult.createdAt).toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pagamento:</span>
                  <span>{translatePayment(saleResult.paymentMethod)}</span>
                </div>
                <div className="border-b border-slate-800 pb-1"></div>
                <div className="space-y-1">
                  {saleResult.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-slate-450">
                      <span>{item.product.name.substring(0, 20)} x{item.quantity}</span>
                      <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-amber-500 text-sm">
                  <span>Total:</span>
                  <span>R$ {saleResult.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="w-full grid grid-cols-2 gap-3 mt-6">
                <button
                  onClick={printReceipt}
                  className="py-2.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Comprovante
                </button>
                <button
                  onClick={() => setSaleResult(null)}
                  className="py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center cursor-pointer transition-colors"
                >
                  Nova Venda
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
