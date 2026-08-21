import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Users, Plus, Search, AlertTriangle, CheckCircle2, DollarSign, Edit
} from 'lucide-react';

export default function Clientes() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: null, name: '', phone: '' });

  // Modal Pay State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payData, setPayData] = useState({ id: null, name: '', balance: 0, amount: '', paymentMethod: 'PIX' });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await api.get('/customers');
      setCustomers(data);
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (customer = null) => {
    if (customer) {
      setFormData({ id: customer.id, name: customer.name, phone: customer.phone || '' });
    } else {
      setFormData({ id: null, name: '', phone: '' });
    }
    setError('');
    setSuccess('');
    setIsModalOpen(true);
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (formData.id) {
        await api.put(`/customers/${formData.id}`, { name: formData.name, phone: formData.phone });
        setSuccess('Cliente atualizado com sucesso!');
      } else {
        await api.post('/customers', { name: formData.name, phone: formData.phone });
        setSuccess('Cliente criado com sucesso!');
      }
      setIsModalOpen(false);
      loadCustomers();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Erro ao salvar cliente');
    }
  };

  const handleOpenPayModal = (customer) => {
    setPayData({ id: customer.id, name: customer.name, balance: customer.balance, amount: customer.balance, paymentMethod: 'PIX' });
    setError('');
    setSuccess('');
    setIsPayModalOpen(true);
  };

  const handlePayDebt = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const amount = parseFloat(payData.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Valor inválido');
      }

      await api.post(`/customers/${payData.id}/pay`, {
        amount,
        paymentMethod: payData.paymentMethod
      });
      setSuccess('Pagamento registrado com sucesso!');
      setIsPayModalOpen(false);
      loadCustomers();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Erro ao registrar pagamento');
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalDebt = customers.reduce((acc, c) => acc + c.balance, 0);

  return (
    <div className="flex-1 p-6 font-sans text-white h-[calc(100vh-64px)] overflow-y-auto space-y-6">
      
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="text-amber-500 w-7 h-7" />
            Clientes (Fiado)
          </h1>
          <p className="text-slate-400 text-xs mt-1">Gerencie clientes, limite de crédito e contas a receber</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          Novo Cliente
        </button>
      </div>

      {/* Alertas */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-center gap-2 text-sm max-w-5xl mx-auto">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl flex items-center gap-2 text-sm max-w-5xl mx-auto">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Resumo */}
      <div className="max-w-5xl mx-auto flex gap-4">
        <div className="flex-1 bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 uppercase font-bold tracking-wider block mb-1">Total a Receber (Fiado)</span>
            <span className="text-2xl font-black text-rose-400">R$ {totalDebt.toFixed(2)}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-rose-400" />
          </div>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="max-w-5xl mx-auto bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col gap-5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar por nome do cliente..."
            className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-650 focus:outline-none focus:border-amber-500 transition-all text-sm shadow-inner"
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800">
                <th className="py-4 px-6 font-semibold text-sm text-slate-300">Cliente</th>
                <th className="py-4 px-6 font-semibold text-sm text-slate-300">Telefone</th>
                <th className="py-4 px-6 font-semibold text-sm text-slate-300">Saldo Devedor</th>
                <th className="py-4 px-6 font-semibold text-sm text-slate-300 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 px-6 font-medium text-white">{customer.name}</td>
                    <td className="py-3 px-6 text-slate-400">{customer.phone || '-'}</td>
                    <td className="py-3 px-6">
                      <span className={`font-bold ${customer.balance > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                        R$ {customer.balance.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-6 flex justify-end gap-2">
                      <button
                        onClick={() => handleOpenModal(customer)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-500 rounded-lg transition-colors"
                        title="Editar Cliente"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {customer.balance > 0 && (
                        <button
                          onClick={() => handleOpenPayModal(customer)}
                          className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold rounded-lg transition-colors text-xs flex items-center gap-1"
                        >
                          <DollarSign className="w-4 h-4" />
                          Receber
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Cadastro/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4">{formData.id ? 'Editar Cliente' : 'Novo Cliente'}</h2>
            
            <form onSubmit={handleSaveCustomer} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Nome do Cliente</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 transition-all text-sm"
                  placeholder="Ex: Bar do Zé"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Telefone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 transition-all text-sm"
                  placeholder="(00) 00000-0000"
                />
              </div>
              
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-all"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pagamento (Receber Fiado) */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-1 flex items-center gap-2 text-emerald-400">
              <DollarSign className="w-5 h-5" />
              Receber Fiado
            </h2>
            <p className="text-slate-400 text-xs mb-4">
              Cliente: <strong className="text-white">{payData.name}</strong> • Dívida Total: <strong className="text-rose-400">R$ {payData.balance.toFixed(2)}</strong>
            </p>
            
            <form onSubmit={handlePayDebt} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Valor a Pagar (R$)</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={payData.balance}
                  value={payData.amount}
                  onChange={e => setPayData({...payData, amount: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 transition-all text-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Forma de Pagamento</label>
                <select
                  value={payData.paymentMethod}
                  onChange={e => setPayData({...payData, paymentMethod: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 transition-all text-sm"
                >
                  <option value="MONEY">Dinheiro</option>
                  <option value="PIX">PIX</option>
                  <option value="DEBIT">Cartão de Débito</option>
                  <option value="CREDIT">Cartão de Crédito</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">Este valor entrará no caixa aberto atualmente.</p>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-all"
                >
                  Confirmar Pagamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
