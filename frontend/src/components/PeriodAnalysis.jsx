import { useEffect, useState } from 'react';
import { CalendarRange, Search, Package, CreditCard, BookOpen, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { api } from '../services/api';
import { formatMoney } from '../utils/format';

const PAYMENT_LABELS = { MONEY: 'Dinheiro', PIX: 'PIX', DEBIT: 'Débito', CREDIT: 'Crédito', CREDIT_STORE: 'Fiado' };

// Data local no formato do <input type="date"> (AAAA-MM-DD)
const toInputDate = (d) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const PRESETS = [
  { id: 'month', label: 'Este mês', range: (now) => [new Date(now.getFullYear(), now.getMonth(), 1), now] },
  { id: 'lastMonth', label: 'Mês passado', range: (now) => [new Date(now.getFullYear(), now.getMonth() - 1, 1), new Date(now.getFullYear(), now.getMonth(), 0)] },
  { id: 'year', label: 'Este ano', range: (now) => [new Date(now.getFullYear(), 0, 1), now] },
  { id: '12m', label: 'Últimos 12 meses', range: (now) => [new Date(now.getFullYear() - 1, now.getMonth(), now.getDate() + 1), now] },
  { id: 'all', label: 'Tudo', range: (now) => [new Date(2000, 0, 1), now] },
];

// Área da dashboard para analisar qualquer período (inclui as vendas antigas lançadas do caderno)
export default function PeriodAnalysis() {
  const [startDate, setStartDate] = useState(() => toInputDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [endDate, setEndDate] = useState(() => toInputDate(new Date()));
  const [activePreset, setActivePreset] = useState('month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const search = async (start = startDate, end = endDate) => {
    if (!start || !end) return setError('Informe a data inicial e a final.');
    if (start > end) return setError('A data inicial não pode ser depois da data final.');
    setError('');
    setLoading(true);
    try {
      // Início e fim do dia no fuso local do navegador
      const startIso = new Date(`${start}T00:00:00`).toISOString();
      const endIso = new Date(`${end}T23:59:59.999`).toISOString();
      const tz = new Date().getTimezoneOffset();
      setData(await api.get(`/dashboard/period?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}&tz=${tz}`));
    } catch (err) {
      setError(err.message || 'Erro ao carregar a análise do período');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyPreset = (preset) => {
    const [s, e] = preset.range(new Date());
    const start = toInputDate(s);
    const end = toInputDate(e);
    setStartDate(start);
    setEndDate(end);
    setActivePreset(preset.id);
    search(start, end);
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-5">
      {/* Filtro */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-amber-500" />
            Análise por Período
          </h2>
          <p className="text-xs text-slate-500 mt-1">Inclui as vendas antigas lançadas do caderno.</p>
        </div>

        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                  activePreset === p.id
                    ? 'bg-amber-500 text-slate-950 border-amber-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <label className="text-[10px] text-slate-500 uppercase font-semibold">
              De
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setActivePreset(null); }}
                className="block mt-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500 scheme-dark"
              />
            </label>
            <label className="text-[10px] text-slate-500 uppercase font-semibold">
              Até
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setActivePreset(null); }}
                className="block mt-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500 scheme-dark"
              />
            </label>
            <button
              type="button"
              onClick={() => search()}
              disabled={loading}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Resumo */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {[
              { label: 'Faturamento', value: `R$ ${formatMoney(data.revenue)}`, color: 'text-white' },
              { label: 'Lucro', value: `R$ ${formatMoney(data.profit)}`, color: 'text-emerald-400' },
              { label: 'Vendas', value: data.count, color: 'text-white', extra: data.retroactiveCount > 0 ? `${data.retroactiveCount} lançadas do caderno` : null },
              { label: 'Ticket médio', value: `R$ ${formatMoney(data.averageTicket)}`, color: 'text-amber-400' },
            ].map(card => (
              <div key={card.label} className="bg-slate-950/50 border border-slate-800/60 rounded-xl p-4">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{card.label}</p>
                <p className={`text-xl font-black mt-1 ${card.color}`}>{card.value}</p>
                {card.extra && (
                  <p className="text-[11px] text-sky-400 mt-1 flex items-center gap-1"><BookOpen className="w-3 h-3" /> {card.extra}</p>
                )}
              </div>
            ))}
          </div>

          {data.count === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">Nenhuma venda no período selecionado.</p>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              {/* Gráfico */}
              <div className="xl:col-span-2 bg-slate-950/30 border border-slate-800/60 rounded-xl p-4 min-h-[320px] flex flex-col">
                <p className="text-xs text-slate-400 font-semibold mb-3">
                  Faturamento e lucro por {data.groupedBy === 'month' ? 'mês' : 'dia'}
                </p>
                <div className="flex-1 min-h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${Math.round(v)}`} />
                      <Tooltip
                        cursor={{ fill: '#1e293b55' }}
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', fontSize: '13px' }}
                        itemStyle={{ color: '#f8fafc' }}
                        formatter={(value, name) => [`R$ ${formatMoney(value)}`, name]}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar name="Faturamento" dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      <Bar name="Lucro" dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Formas de pagamento */}
              <div className="bg-slate-950/30 border border-slate-800/60 rounded-xl p-4">
                <p className="text-xs text-slate-400 font-semibold mb-3 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-amber-500" /> Por forma de pagamento
                </p>
                <div className="space-y-3">
                  {data.byPayment.map(p => {
                    const pct = data.revenue > 0 ? (p.total / data.revenue) * 100 : 0;
                    return (
                      <div key={p.method}>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-300">{PAYMENT_LABELS[p.method] || p.method} <span className="text-slate-500 text-xs">({p.count})</span></span>
                          <span className="font-semibold text-white">R$ {formatMoney(p.total)}</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Produtos mais vendidos */}
              <div className="xl:col-span-3 bg-slate-950/30 border border-slate-800/60 rounded-xl p-4">
                <p className="text-xs text-slate-400 font-semibold mb-3 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-amber-500" /> Produtos mais vendidos no período
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {data.topProducts.map((p, index) => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800/60">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-6 h-6 rounded-md bg-slate-800 text-xs font-bold flex items-center justify-center text-slate-400 shrink-0">
                          {index + 1}º
                        </div>
                        <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="font-bold text-sm text-amber-500">{p.quantity} un.</p>
                        <p className="text-[11px] text-slate-500">R$ {formatMoney(p.revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
