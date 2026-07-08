import { Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { 
  Beer, ShoppingCart, DollarSign, Package, History, LogOut, User
} from 'lucide-react';

import Login from './pages/Login';
import PDV from './pages/PDV';
import Caixa from './pages/Caixa';
import Estoque from './pages/Estoque';
import Historico from './pages/Historico';

// Componente para proteção de rotas
function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Layout Base com Sidebar
function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setUserName(user.name || 'Operador');
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const menuItems = [
    { path: '/pdv', label: 'Registrar Venda', icon: ShoppingCart },
    { path: '/caixa', label: 'Controle de Caixa', icon: DollarSign },
    { path: '/estoque', label: 'Estoque / Produtos', icon: Package },
    { path: '/historico', label: 'Histórico de Vendas', icon: History }
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900/60 backdrop-blur-xl border-r border-slate-800 flex flex-col justify-between shrink-0">
        
        {/* Topo / Logo */}
        <div>
          <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800/80">
            <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Beer className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm tracking-tight text-white uppercase">Distribuidora</h2>
              <p className="text-[10px] font-semibold text-amber-500/80 tracking-wide uppercase">Painel de Controle</p>
            </div>
          </div>

          {/* Links do Menu */}
          <nav className="p-4 space-y-1.5">
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3.5 px-4.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                    isActive 
                      ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/10' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-850/60'
                  }`}
                >
                  <Icon className="w-5 h-5 stroke-[1.8]" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Rodapé / Operador & Logout */}
        <div className="p-4 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center gap-3 px-3 py-2 bg-slate-950/40 rounded-xl border border-slate-850">
            <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-slate-450" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{userName}</p>
              <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Operador</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 hover:border-transparent rounded-xl text-xs font-bold transition-all cursor-pointer uppercase tracking-wider"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair do Sistema</span>
          </button>
        </div>

      </aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-slate-950 relative overflow-hidden flex flex-col">
        {/* Background Decorative Gradients */}
        <div className="absolute top-[-30%] right-[-10%] w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[-30%] left-[-10%] w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[140px] pointer-events-none" />
        
        {/* Renderização de Conteúdo */}
        <div className="flex-1 z-10 overflow-hidden">
          <Routes>
            <Route path="/pdv" element={<PDV />} />
            <Route path="/caixa" element={<Caixa />} />
            <Route path="/estoque" element={<Estoque />} />
            <Route path="/historico" element={<Historico />} />
            <Route path="*" element={<Navigate to="/pdv" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route 
        path="/*" 
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        } 
      />
    </Routes>
  );
}
