import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useForm } from 'react-hook-form';
import { 
  Package, Plus, Edit3, Trash2, ArrowUpRight, Search, 
  X, AlertTriangle, ArrowUpDown, RefreshCw
} from 'lucide-react';

export default function Estoque() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modais
  const [activeModal, setActiveModal] = useState(null); // 'create' | 'edit' | 'entry'
  const [selectedProduct, setSelectedProduct] = useState(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await api.get('/products');
      setProducts(data);
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (data) => {
    setError('');
    setSuccess('');
    try {
      await api.post('/products', {
        name: data.name,
        price: parseFloat(data.price),
        stock: parseInt(data.stock) || 0
      });
      setSuccess(`Produto "${data.name}" criado com sucesso!`);
      loadProducts();
      closeModal();
    } catch (err) {
      setError(err.message || 'Erro ao criar produto');
    }
  };

  const handleEditProduct = async (data) => {
    setError('');
    setSuccess('');
    try {
      await api.patch(`/products/${selectedProduct.id}`, {
        name: data.name,
        price: parseFloat(data.price)
      });
      setSuccess(`Produto "${data.name}" atualizado com sucesso!`);
      loadProducts();
      closeModal();
    } catch (err) {
      setError(err.message || 'Erro ao editar produto');
    }
  };

  const handleStockEntry = async (data) => {
    setError('');
    setSuccess('');
    try {
      await api.post(`/products/${selectedProduct.id}/entry`, {
        quantity: parseInt(data.quantity)
      });
      setSuccess(`Entrada de estoque para "${selectedProduct.name}" registrada!`);
      loadProducts();
      closeModal();
    } catch (err) {
      setError(err.message || 'Erro ao registrar entrada de estoque');
    }
  };

  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`Tem certeza que deseja excluir o produto "${name}"?`)) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/products/${id}`);
      setSuccess(`Produto "${name}" removido com sucesso.`);
      loadProducts();
    } catch (err) {
      setError(err.message || 'Não foi possível excluir o produto');
    }
  };

  const openModal = (type, product = null) => {
    setSelectedProduct(product);
    setActiveModal(type);
    reset();

    if (type === 'edit' && product) {
      setValue('name', product.name);
      setValue('price', product.price);
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedProduct(null);
    reset();
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.code.includes(searchQuery)
  );

  return (
    <div className="flex-1 p-6 font-sans text-white h-[calc(100vh-64px)] overflow-y-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="text-amber-500 w-7 h-7" />
            Controle de Estoque
          </h1>
          <p className="text-slate-400 text-xs mt-1">Gerencie mercadorias e entradas de produtos</p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => openModal('create')}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 shadow-lg shadow-amber-500/10"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Novo Produto
          </button>
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
          <ArrowUpRight className="w-5 h-5 shrink-0" />
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
            placeholder="Pesquisar por nome ou código..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-white placeholder-slate-650 focus:outline-none focus:border-amber-500 transition-colors text-sm"
          />
        </div>
        <button
          onClick={loadProducts}
          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
          title="Recarregar"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Tabela de Produtos */}
      <div className="max-w-6xl mx-auto bg-slate-900/20 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 flex justify-center items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Código</th>
                  <th className="px-6 py-4">Produto</th>
                  <th className="px-6 py-4 text-right">Preço Venda</th>
                  <th className="px-6 py-4 text-center">Quantidade</th>
                  <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                      Nenhum produto cadastrado ou correspondente à pesquisa.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const isLowStock = product.stock <= 5;
                    const isOut = product.stock === 0;
                    return (
                      <tr key={product.id} className="hover:bg-slate-900/10 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-slate-450">{product.code}</td>
                        <td className="px-6 py-4 font-semibold text-white">{product.name}</td>
                        <td className="px-6 py-4 text-right font-bold text-amber-500">R$ {product.price.toFixed(2)}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            isOut 
                              ? 'bg-red-500/10 text-red-500' 
                              : isLowStock 
                                ? 'bg-amber-500/10 text-amber-400' 
                                : 'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {product.stock} {product.stock === 1 ? 'unidade' : 'unidades'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center items-center gap-2">
                            <button
                              onClick={() => openModal('entry', product)}
                              className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Registrar Entrada (Entrada de Mercadoria)"
                            >
                              <ArrowUpRight className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openModal('edit', product)}
                              className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Editar Produto"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id, product.name)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Excluir Produto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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

      {/* MODAL: Cadastrar Produto */}
      {activeModal === 'create' && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 relative">
            <button onClick={closeModal} className="absolute right-4 top-4 text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-800">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-6">Cadastrar Novo Produto</h3>

            <form onSubmit={handleSubmit(handleCreateProduct)} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Nome do Produto</label>
                <input
                  type="text"
                  {...register('name', { required: 'Nome do produto é obrigatório' })}
                  placeholder="Ex: Cerveja Brahma Lata 350ml"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-650 focus:outline-none focus:border-amber-500 transition-colors text-sm"
                />
                {errors.name && <span className="text-red-400 text-xs mt-1 block">{errors.name.message}</span>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Preço de Venda (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('price', { required: 'Preço é obrigatório', min: { value: 0.01, message: 'Preço deve ser maior que zero' } })}
                    placeholder="4.50"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-650 focus:outline-none focus:border-amber-500 transition-colors text-sm"
                  />
                  {errors.price && <span className="text-red-400 text-xs mt-1 block">{errors.price.message}</span>}
                </div>

                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Estoque Inicial (Unid.)</label>
                  <input
                    type="number"
                    {...register('stock')}
                    placeholder="120"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-655 focus:outline-none focus:border-amber-500 transition-colors text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cadastrar Produto
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Editar Produto */}
      {activeModal === 'edit' && selectedProduct && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 relative">
            <button onClick={closeModal} className="absolute right-4 top-4 text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-800">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-6">Editar Produto</h3>

            <form onSubmit={handleSubmit(handleEditProduct)} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Nome do Produto</label>
                <input
                  type="text"
                  {...register('name', { required: 'Nome do produto é obrigatório' })}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 transition-colors text-sm"
                />
                {errors.name && <span className="text-red-400 text-xs mt-1 block">{errors.name.message}</span>}
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Preço de Venda (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('price', { required: 'Preço é obrigatório', min: { value: 0.01, message: 'Preço deve ser maior que zero' } })}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 transition-colors text-sm"
                />
                {errors.price && <span className="text-red-400 text-xs mt-1 block">{errors.price.message}</span>}
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Salvar Alterações
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Entrada de Estoque (Mercadoria) */}
      {activeModal === 'entry' && selectedProduct && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 relative">
            <button onClick={closeModal} className="absolute right-4 top-4 text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-800">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-2">Entrada de Mercadoria</h3>
            <p className="text-slate-400 text-xs mb-6">Adicionar produtos ao estoque de: <span className="text-white font-semibold">{selectedProduct.name}</span></p>

            <form onSubmit={handleSubmit(handleStockEntry)} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Quantidade a Adicionar (Unidades)</label>
                <input
                  type="number"
                  {...register('quantity', { required: 'Defina a quantidade de entrada', min: { value: 1, message: 'A quantidade deve ser de no mínimo 1 unidade' } })}
                  placeholder="Ex: 24 (um fardo)"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-655 focus:outline-none focus:border-amber-500 transition-colors text-sm"
                />
                {errors.quantity && <span className="text-red-400 text-xs mt-1 block">{errors.quantity.message}</span>}
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-lg text-xs space-y-1">
                <div className="flex justify-between text-slate-500">
                  <span>Estoque atual:</span>
                  <span className="text-slate-350">{selectedProduct.stock} unidades</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Código do produto:</span>
                  <span className="font-mono text-slate-350">{selectedProduct.code}</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Confirmar Entrada
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
