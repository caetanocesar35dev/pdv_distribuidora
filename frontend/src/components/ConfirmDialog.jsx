import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

const ConfirmContext = createContext(null);

// Provider que disponibiliza um modal de confirmação estilizado, usado no lugar do window.confirm.
export function ConfirmProvider({ children }) {
  const [options, setOptions] = useState(null);
  const resolverRef = useRef(null);
  const cancelButtonRef = useRef(null);

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setOptions(opts);
    });
  }, []);

  const close = useCallback((result) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  useEffect(() => {
    if (!options) return;
    cancelButtonRef.current?.focus();
    const onKeyDown = (e) => {
      if (e.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [options, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100 flex items-center justify-center p-4"
          onClick={() => close(false)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 flex gap-4">
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-white">{options.title || 'Confirmação'}</h2>
                <div className="text-sm text-slate-400 mt-2 space-y-2">{options.message}</div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 bg-slate-950/40 border-t border-slate-800">
              <button
                type="button"
                ref={cancelButtonRef}
                onClick={() => close(false)}
                className="px-5 py-2.5 rounded-xl text-slate-300 font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {options.cancelText || 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className="px-6 py-2.5 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                {options.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

// Retorna uma função confirm(opts) => Promise<boolean>
export function useConfirm() {
  return useContext(ConfirmContext);
}
