import { useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';
import { formatMoney, formatPrice } from '../utils/format';

const normalize = (text) => (text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Lista de clientes com um campo de preço especial para o produto.
// values: { [customerId]: string } — campo vazio = cliente paga o preço de portaria.
export default function CustomerPricesEditor({ customers, values, onChange, standardPrice }) {
  const [query, setQuery] = useState('');
  const [onlyWithPrice, setOnlyWithPrice] = useState(false);

  const hasPrice = (id) => values[id] !== undefined && values[id] !== '';
  const specialCount = customers.filter(c => hasPrice(c.id)).length;

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return customers.filter(c =>
      (!q || normalize(c.name).includes(q)) && (!onlyWithPrice || hasPrice(c.id))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers, query, onlyWithPrice, values]);

  const standard = Number(standardPrice) > 0 ? Number(standardPrice) : null;

  return (
    <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800/80 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-500" />
            Preços especiais por cliente
          </h4>
          <p className="text-[11px] text-slate-500 mt-1">
            Deixe vazio para o cliente pagar o preço de portaria{standard ? ` (R$ ${formatPrice(standard)})` : ''}.
          </p>
        </div>
        {specialCount > 0 && (
          <span className="shrink-0 text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
            {specialCount} com preço especial
          </span>
        )}
      </div>

      {customers.length === 0 ? (
        <p className="text-xs text-slate-500 py-2">Nenhum cliente cadastrado.</p>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar cliente..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors text-sm"
              />
            </div>
            <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer select-none shrink-0">
              <input
                type="checkbox"
                checked={onlyWithPrice}
                onChange={(e) => setOnlyWithPrice(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900"
              />
              Só com preço
            </label>
          </div>

          <div className="divide-y divide-slate-800/60 border border-slate-800/60 rounded-lg">
            {filtered.length === 0 ? (
              <p className="text-xs text-slate-500 px-3 py-3">Nenhum cliente encontrado.</p>
            ) : (
              filtered.map(c => {
                const value = values[c.id] ?? '';
                const isSpecial = value !== '';
                return (
                  <div key={c.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className={`text-sm truncate ${isSpecial ? 'text-amber-400 font-semibold' : 'text-slate-300'}`}>{c.name}</span>
                    <div className="relative shrink-0 w-32">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500">R$</span>
                      <input
                        type="number"
                        step="0.001"
                        min="0.001"
                        value={value}
                        onChange={(e) => onChange(c.id, e.target.value)}
                        placeholder={standard ? formatPrice(standard) : 'Portaria'}
                        className={`w-full pl-8 pr-2 py-1.5 bg-slate-950 border rounded-lg text-sm text-right focus:outline-none focus:border-amber-500 transition-colors placeholder-slate-600 ${isSpecial ? 'border-amber-500/40 text-amber-400' : 'border-slate-800 text-white'}`}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
