import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api';
import { formatMoney, formatPacks } from '../utils/format';
import CustomerSelect from '../components/CustomerSelect';
import {
  BookOpen, Search, Plus, Trash2, AlertCircle, CheckCircle2, Info,
  DollarSign, CreditCard, Users, Calendar, Clock, Minus, Package, ShoppingCart
} from 'lucide-react';

const PAYMENT_METHODS = [
  { id: 'MONEY', label: 'Dinheiro', icon: DollarSign },
  { id: 'PIX', label: 'PIX', icon: CheckCircle2 },
  { id: 'DEBIT', label: 'Débito', icon: CreditCard },
  { id: 'CREDIT', label: 'Crédito', icon: CreditCard },
  { id: 'CREDIT_STORE', label: 'Fiado', icon: Users },
];

const normalize = (text) => (text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const todayInput = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

// Hora usada quando o caderno não tem a hora anotada
const DEFAULT_TIME = '12:00';

// Tela para lançar as vendas antigas anotadas no caderno.
// Não mexe em estoque, caixa nem vasilhames; se for fiado, soma na dívida do cliente.
export default function VendasAntigas() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customerPrices, setCustomerPrices] = useState({});
  const [date, setDate] = useState(todayInput());
  const [time, setTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('MONEY');
  const [items, setItems] = useState([]); // [{ product, quantity }]
  const [isPackSale, setIsPackSale] = useState(false);
  const [discount, setDiscount] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [showProductList, setShowProductList] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [launched, setLaunched] = useState([]); // vendas lançadas nesta sessão
  const productInputRef = useRef(null);

  useEffect(() => {
    Promise.all([api.get('/products'), api.get('/customers')])
      .then(([prods, custs]) => { setProducts(prods); setCustomers(custs); })
      .catch(() => setError('Erro ao carregar produtos e clientes'));
  }, []);

  // Preços especiais do cliente selecionado (sem cliente = portaria)
  useEffect(() => {
    if (!selectedCustomer) {
      setCustomerPrices({});
      return;
    }
    let cancelled = false;
    api.get(`/customers/${selectedCustomer}/prices`)
      .then(prices => { if (!cancelled) setCustomerPrices(Object.fromEntries(prices.map(p => [p.productId, p.price]))); })
      .catch(() => { if (!cancelled) setError('Erro ao carregar os preços especiais do cliente'); });
    return () => { cancelled = true; };
  }, [selectedCustomer]);

  const getUnitPrice = (product) => customerPrices[product.id] ?? product.price;
  const hasSpecialPrice = (product) => customerPrices[product.id] !== undefined && customerPrices[product.id] !== product.price;

  const filteredProducts = useMemo(() => {
    const q = normalize(productQuery.trim());
    return products.filter(p => !q || normalize(p.name).includes(q) || p.code.includes(productQuery.trim())).slice(0, 50);
  }, [products, productQuery]);

  const addProduct = (product) => {
    const packQty = Number(product.packQuantity) || 1;
    const qtyToAdd = isPackSale && packQty > 1 ? packQty : 1;
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: (Number(i.quantity) || 0) + qtyToAdd } : i);
      return [...prev, { product, quantity: qtyToAdd }];
    });
    setProductQuery('');
    setShowProductList(false);
    setError('');
    productInputRef.current?.focus();
  };

  const handleProductKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setShowProductList(true);
      setHighlight(h => Math.min(h + 1, filteredProducts.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProducts[highlight]) addProduct(filteredProducts[highlight]);
    } else if (e.key === 'Escape') {
      setShowProductList(false);
    }
  };

  // Venda antiga não depende do estoque atual, então não há limite de quantidade
  const setQuantity = (productId, value) => {
    if (value !== '' && !/^\d+$/.test(value)) return;
    setItems(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: value === '' ? '' : parseInt(value, 10) } : i));
  };

  const changeQuantity = (productId, amount) => {
    setItems(prev => prev
      .map(i => i.product.id === productId ? { ...i, quantity: (Number(i.quantity) || 0) + amount } : i)
      .filter(i => i.quantity > 0));
  };

  const removeIfEmpty = (productId, value) => {
    if (!(parseInt(value, 10) > 0)) setItems(prev => prev.filter(i => i.product.id !== productId));
  };

  const totalUnits = items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);

  const subtotal = items.reduce((acc, i) => acc + getUnitPrice(i.product) * (Number(i.quantity) || 0), 0);
  const discountValue = Number(discount) || 0;
  const total = subtotal - discountValue;

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!date) return setError('Informe a data da venda.');
    if (date > todayInput()) return setError('A data da venda antiga não pode estar no futuro.');
    if (items.length === 0) return setError('Adicione pelo menos um produto.');
    if (items.some(i => !Number(i.quantity) || Number(i.quantity) <= 0)) return setError('Informe a quantidade de todos os produtos.');
    if (paymentMethod === 'CREDIT_STORE' && !selectedCustomer) return setError('Venda fiado exige cliente.');
    if (discountValue < 0 || discountValue > subtotal) return setError('Desconto inválido.');

    const createdAt = new Date(`${date}T${time || DEFAULT_TIME}:00`);
    if (createdAt.getTime() > Date.now()) return setError('A data/hora da venda antiga não pode estar no futuro.');

    setIsSaving(true);
    try {
      const sale = await api.post('/sales/retroactive', {
        createdAt: createdAt.toISOString(),
        paymentMethod,
        customerId: selectedCustomer ? Number(selectedCustomer) : undefined,
        discount: discountValue > 0 ? discountValue : undefined,
        items: items.map(i => ({ productId: i.product.id, quantity: Number(i.quantity) })),
      });

      const customerName = customers.find(c => c.id === Number(selectedCustomer))?.name;
      setLaunched(prev => [{ ...sale, customerName }, ...prev]);
      setSuccess(`Venda #${sale.id} lançada em ${createdAt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: time ? 'short' : undefined })} — R$ ${formatMoney(sale.total)}.`);

      // Mantém cliente, data e pagamento para agilizar o lançamento da próxima venda do caderno
      setItems([]);
      setDiscount('');
      setTime('');
      productInputRef.current?.focus();
    } catch (err) {
      setError(err.message || 'Erro ao lançar a venda');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 p-6 font-sans text-white h-full overflow-y-auto space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="text-amber-500 w-7 h-7" />
          Lançar Vendas Antigas (Caderno)
        </h1>
        <p className="text-slate-400 text-xs mt-1">Registre as vendas anotadas no caderno para que entrem no histórico e na dashboard.</p>
      </div>

      <div className="bg-sky-500/10 border border-sky-500/30 text-sky-300 p-3 rounded-xl flex items-start gap-2 text-xs">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          Estas vendas <strong>não alteram o estoque atual nem o caixa</strong>. Se a forma de pagamento for <strong>Fiado</strong>,
          o valor é somado à dívida atual do cliente.
        </span>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-xl flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Coluna principal: cliente, data e produtos */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Cliente {paymentMethod === 'CREDIT_STORE' ? <span className="text-red-400">(Obrigatório)</span> : '(Opcional)'}
              </label>
              <CustomerSelect
                customers={customers}
                value={selectedCustomer}
                onChange={setSelectedCustomer}
                placeholder="Digite o nome (vazio = preço de portaria)..."
                className={`py-2.5 bg-slate-950 border ${paymentMethod === 'CREDIT_STORE' && !selectedCustomer ? 'border-red-500/50' : 'border-slate-800'} rounded-xl`}
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5" /> Data
              </label>
              <input
                type="date"
                value={date}
                max={todayInput()}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 scheme-dark"
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5" /> Hora <span className="normal-case font-normal text-slate-500">(opcional)</span>
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 scheme-dark"
              />
            </div>
          </div>

          {/* Produtos */}
          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 pointer-events-none" />
              <input
                ref={productInputRef}
                type="text"
                value={productQuery}
                onChange={(e) => { setProductQuery(e.target.value); setShowProductList(true); setHighlight(0); }}
                onFocus={() => setShowProductList(true)}
                onBlur={() => setTimeout(() => setShowProductList(false), 150)}
                onKeyDown={handleProductKeyDown}
                placeholder="Buscar produto por nome ou código e apertar Enter..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-sm"
              />
              {showProductList && (
                <ul className="absolute z-40 mt-1 w-full max-h-72 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1">
                  {filteredProducts.length === 0 ? (
                    <li className="px-4 py-3 text-sm text-slate-500">Nenhum produto encontrado</li>
                  ) : filteredProducts.map((p, i) => (
                    <li
                      key={p.id}
                      onMouseDown={(e) => { e.preventDefault(); addProduct(p); }}
                      onMouseEnter={() => setHighlight(i)}
                      className={`px-4 py-2 cursor-pointer flex items-center justify-between gap-3 ${i === highlight ? 'bg-amber-500/10' : ''}`}
                    >
                      <span className="text-sm text-white truncate">
                        {p.name}
                        {p.packQuantity > 1 && <span className="text-slate-500 text-xs ml-2">fardo c/ {p.packQuantity}</span>}
                      </span>
                      <span className="text-xs shrink-0">
                        {hasSpecialPrice(p) && <span className="text-emerald-400 mr-1.5">especial</span>}
                        <span className="text-amber-400 font-semibold">R$ {formatMoney(getUnitPrice(p))}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-slate-900/20 border border-slate-800/80 px-4 py-3 rounded-xl flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer text-amber-500 font-semibold text-sm">
                <input
                  type="checkbox"
                  checked={isPackSale}
                  onChange={(e) => setIsPackSale(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900 bg-slate-950"
                />
                Modo de Venda por Lote/Fardo
              </label>
              <span className="text-slate-500 text-xs hidden md:block">(Adiciona o fardo inteiro ao selecionar o produto)</span>
            </div>

            <div className="flex justify-between items-center pt-1">
              <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" /> Itens da venda
              </h3>
              <span className="text-xs font-semibold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full">
                {totalUnits} {totalUnits === 1 ? 'item' : 'itens'}
              </span>
            </div>

            {items.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">Nenhum produto adicionado a esta venda.</p>
            ) : (
              <div className="space-y-3">
                {items.map(item => {
                  const packQty = Number(item.product.packQuantity) || 1;
                  return (
                    <div key={item.product.id} className="bg-slate-950/60 border border-slate-800/60 p-4 rounded-xl flex items-center justify-between gap-4 hover:border-slate-800 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-white truncate">{item.product.name}</p>
                        <p className="text-slate-500 text-xs mt-1 font-mono">Cód: {item.product.code}</p>
                        {packQty > 1 && Number(item.quantity) > 0 && (
                          <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                            <Package className="w-3.5 h-3.5" />
                            <span>{formatPacks(Number(item.quantity), packQty)}</span>
                            <span className="text-amber-500/60 font-normal">(fardo c/ {packQty})</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right shrink-0">
                          <p className="text-xs text-slate-500">Subtotal</p>
                          <p className="font-bold text-sm text-amber-500 mt-0.5">R$ {formatMoney(getUnitPrice(item.product) * (Number(item.quantity) || 0))}</p>
                          {hasSpecialPrice(item.product) ? (
                            <div className="mt-1 flex flex-col items-end gap-0.5">
                              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">Preço especial</span>
                              <span className="text-[11px] text-slate-400">un. R$ {formatMoney(getUnitPrice(item.product))} <span className="line-through text-slate-600">R$ {formatMoney(item.product.price)}</span></span>
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-500 mt-1">un. R$ {formatMoney(item.product.price)}</p>
                          )}
                        </div>

                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1">
                            <button
                              onClick={() => changeQuantity(item.product.id, -1)}
                              className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={item.quantity}
                              onChange={(e) => setQuantity(item.product.id, e.target.value)}
                              onBlur={(e) => removeIfEmpty(item.product.id, e.target.value)}
                              className="w-12 text-center font-bold text-sm text-white font-mono bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-500 rounded"
                            />
                            <button
                              onClick={() => changeQuantity(item.product.id, 1)}
                              className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          {packQty > 1 && (
                            <div className="flex gap-1 w-full mt-1">
                              <button
                                onClick={() => changeQuantity(item.product.id, -packQty)}
                                className="flex-1 text-[10px] bg-red-500/10 text-red-400 hover:bg-red-500/20 py-1 rounded font-semibold text-center transition-colors cursor-pointer"
                              >
                                -1 Fardo
                              </button>
                              <button
                                onClick={() => changeQuantity(item.product.id, packQty)}
                                className="flex-1 text-[10px] bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 py-1 rounded font-semibold text-center transition-colors cursor-pointer"
                              >
                                +1 Fardo ({packQty})
                              </button>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => setItems(prev => prev.filter(i => i.product.id !== item.product.id))}
                          className="p-2 text-slate-500 hover:text-red-400 transition-colors cursor-pointer rounded-lg hover:bg-red-500/10"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Coluna lateral: pagamento e total */}
        <div className="space-y-4">
          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4">
            <div>
              <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-400 mb-3">Forma de Pagamento</h3>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map(m => {
                  const Icon = m.icon;
                  const selected = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`p-3 border rounded-xl flex flex-col items-center gap-1.5 transition-all cursor-pointer ${selected ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-400'}`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px] font-semibold">{m.label}</span>
                    </button>
                  );
                })}
              </div>
              {paymentMethod === 'CREDIT_STORE' && (
                <p className="text-[11px] text-amber-400 mt-2">O total será somado à dívida atual do cliente.</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Desconto (R$)</label>
              <input
                type="number"
                min="0"
                step="0.001"
                value={discount}
                onChange={(e) => setDiscount(e.target.value.replace(',', '.'))}
                placeholder="0,000"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 text-sm"
              />
            </div>

            <div className="border-t border-slate-800 pt-4 space-y-1">
              <div className="flex justify-between text-sm text-slate-400">
                <span>Subtotal</span>
                <span>R$ {formatMoney(subtotal)}</span>
              </div>
              {discountValue > 0 && (
                <div className="flex justify-between text-sm text-emerald-400">
                  <span>Desconto</span>
                  <span>- R$ {formatMoney(discountValue)}</span>
                </div>
              )}
              <div className="flex justify-between items-end pt-1">
                <span className="text-xs text-slate-400 uppercase font-semibold">Total</span>
                <span className="text-3xl font-black text-white">R$ {formatMoney(total)}</span>
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                Data: {date ? new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR') : '-'} {time ? `às ${time}` : `(sem hora — registrada às ${DEFAULT_TIME})`}
              </p>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSaving || items.length === 0}
              className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-sm uppercase tracking-wider"
            >
              <Plus className="w-4 h-4" />
              {isSaving ? 'Lançando...' : 'Lançar Venda Antiga'}
            </button>
          </div>

          {launched.length > 0 && (
            <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl">
              <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-400 mb-3">Lançadas agora ({launched.length})</h3>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {launched.map(s => (
                  <div key={s.id} className="flex justify-between items-center text-sm py-1.5 border-b border-slate-800/60 last:border-0">
                    <div className="min-w-0">
                      <p className="text-white font-mono text-xs">#{s.id} · {new Date(s.createdAt).toLocaleDateString('pt-BR')}</p>
                      <p className="text-slate-500 text-xs truncate">{s.customerName || 'Sem cliente'}</p>
                    </div>
                    <span className="font-semibold text-amber-500 shrink-0">R$ {formatMoney(s.total)}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-3">Para corrigir um lançamento, cancele a venda pelo Histórico de Vendas.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
