import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { formatMoney } from '../utils/format';

// Remove acentos e deixa minúsculo para comparar nomes (ex: "José" casa com "jose")
const normalize = (text) => (text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Campo de seleção de cliente com busca: ao digitar o nome (ou telefone), a lista vai sendo filtrada.
// value/onChange usam o id do cliente como string ('' = nenhum), igual ao <select> que ele substitui.
export default function CustomerSelect({ customers, value, onChange, placeholder = 'Buscar cliente...', className = '' }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef(null);
  const listRef = useRef(null);

  const selected = customers.find(c => String(c.id) === String(value));

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return customers;
    const qDigits = query.replace(/\D/g, '');
    return customers.filter(c =>
      normalize(c.name).includes(q) || (qDigits && (c.phone || '').replace(/\D/g, '').includes(qDigits))
    );
  }, [customers, query]);

  // Fecha a lista ao clicar fora do campo
  useEffect(() => {
    const onClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Mantém o item destacado visível ao navegar com as setas
  useEffect(() => {
    listRef.current?.children[highlight]?.scrollIntoView({ block: 'nearest' });
  }, [highlight]);

  const select = (customer) => {
    onChange(customer ? String(customer.id) : '');
    setQuery('');
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight(h => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && filtered[highlight]) {
        e.preventDefault();
        select(filtered[highlight]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
      <input
        type="text"
        value={open ? query : (selected?.name || '')}
        placeholder={open && selected ? selected.name : placeholder}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlight(0); }}
        onFocus={() => { setOpen(true); setHighlight(0); }}
        onKeyDown={handleKeyDown}
        className={`w-full pl-9 pr-9 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors text-sm ${className}`}
      />
      {selected && (
        <button
          type="button"
          onClick={() => select(null)}
          title="Remover cliente"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-500 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {open && (
        <ul
          ref={listRef}
          className="absolute z-40 mt-1 w-full max-h-64 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1"
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-slate-500">Nenhum cliente encontrado</li>
          ) : (
            filtered.map((c, i) => (
              <li
                key={c.id}
                onMouseDown={(e) => { e.preventDefault(); select(c); }}
                onMouseEnter={() => setHighlight(i)}
                className={`px-4 py-2 cursor-pointer flex items-center justify-between gap-3 ${i === highlight ? 'bg-amber-500/10' : ''}`}
              >
                <div className="min-w-0">
                  <p className={`text-sm truncate ${String(c.id) === String(value) ? 'text-amber-400 font-semibold' : 'text-white'}`}>{c.name}</p>
                  {c.phone && <p className="text-xs text-slate-500">{c.phone}</p>}
                </div>
                {c.balance > 0 && (
                  <span className="text-xs font-semibold text-rose-400 shrink-0">Deve R$ {formatMoney(c.balance)}</span>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
