import React from 'react';
import { Customer } from '../types';
import {
  HelpCircle,
  ChevronDown,
  CheckCircle2,
  Shield,
  Cloud,
  LogIn,
  User,
  LayoutDashboard,
  Layers,
  BookOpen,
  Sparkles,
  CheckSquare,
  Server,
  Sliders,
  Play,
  FileText,
  ClipboardCheck,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type ActiveTab =
  | 'overview'
  | 'compliance'
  | 'integrations'
  | 'catalog'
  | 'factory'
  | 'audit'
  | 'validator'
  | 'hosts'
  | 'client'
  | 'simulator'
  | 'security'
  | 'docs';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  customers: Customer[];
  activeCustomer?: Customer | null;
  onSelectCustomer: (cust: Customer) => void;
  onOpenGuidance: () => void;
  onOpenLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  customers,
  activeCustomer,
  onSelectCustomer,
  onOpenGuidance,
  onOpenLogin,
}) => {
  const { user } = useAuth();
  const [customerDropdownOpen, setCustomerDropdownOpen] = React.useState(false);

  const navItems: Array<{ id: ActiveTab; label: string; icon: React.ElementType }> = [
    { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'compliance', label: 'Painel de Conformidade', icon: BarChart3 },
    { id: 'integrations', label: 'Integrações', icon: Layers },
    { id: 'catalog', label: 'Catálogo', icon: BookOpen },
    { id: 'factory', label: 'Fábrica de Triggers', icon: Sparkles },
    { id: 'audit', label: 'Auditoria & Refinamento', icon: ClipboardCheck },
    { id: 'validator', label: 'Validador Oficial', icon: CheckSquare },
    { id: 'hosts', label: 'Inventário de Hosts', icon: Server },
    { id: 'client', label: 'Regras do Cliente', icon: Sliders },
    { id: 'simulator', label: 'Simulador', icon: Play },
    { id: 'security', label: 'Segurança & LGPD', icon: Shield },
    { id: 'docs', label: 'Memorial Técnico', icon: FileText },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/95 backdrop-blur-md border-b border-slate-800 shadow-md">
      {/* Primary Top Bar: Brand, Customer Selector and ALWAYS VISIBLE Auth/Actions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-3">
          {/* Brand & Customer Selector */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-rose-500/20 shrink-0" />
              <span className="text-sm sm:text-base font-bold tracking-tight text-white whitespace-nowrap">
                Zabbix Trigger Factory
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-800/60 text-[10px] font-mono text-rose-300">
                Oficial
              </span>
            </div>

            {/* Customer Dropdown */}
            <div className="relative">
              <button
                onClick={() => setCustomerDropdownOpen(!customerDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg transition-colors"
                title="Trocar cliente ativo"
              >
                <span className="text-slate-400 hidden xs:inline">Cliente:</span>
                <strong className="text-rose-400 max-w-[120px] sm:max-w-[160px] truncate block">
                  {activeCustomer ? activeCustomer.customer_name : 'Nenhum'}
                </strong>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {customerDropdownOpen && (
                <div className="absolute left-0 sm:left-auto sm:right-0 mt-1.5 w-60 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Clientes Cadastrados ({customers.length})
                  </div>
                  {customers.map((c) => (
                    <button
                      key={c.customer_id}
                      onClick={() => {
                        onSelectCustomer(c);
                        setCustomerDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs text-left text-slate-200 hover:bg-slate-800 transition-colors"
                    >
                      <span className="font-medium truncate">{c.customer_name}</span>
                      {activeCustomer && c.customer_id === activeCustomer.customer_id && (
                        <CheckCircle2 className="w-4 h-4 text-rose-500 shrink-0" />
                      )}
                    </button>
                  ))}
                  {customers.length === 0 && (
                    <div className="px-3 py-2 text-xs text-slate-500 italic">
                      Nenhum cliente cadastrado.
                    </div>
                  )}
                  <div className="border-t border-slate-800 my-1 pt-1">
                    <button
                      onClick={() => {
                        setActiveTab('client');
                        setCustomerDropdownOpen(false);
                      }}
                      className="w-full px-3 py-1.5 text-xs text-left text-rose-400 hover:bg-slate-800 transition-colors"
                    >
                      + Gerenciar Regras de Clientes
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Area: ALWAYS VISIBLE Google Login / User Profile & Guia */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Google Auth / Cloud Sync Status Button */}
            {user ? (
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 border border-emerald-500/40 hover:border-emerald-500 rounded-lg text-xs transition-colors shrink-0 shadow-sm"
                title={`Conectado como ${user.email}. Clique para gerenciar conta e LGPD.`}
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Avatar'}
                    className="w-5 h-5 rounded-full object-cover border border-emerald-500"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center">
                    {user.displayName?.[0] || 'U'}
                  </div>
                )}
                <div className="text-left hidden sm:block">
                  <div className="text-white font-semibold text-[11px] leading-tight max-w-[120px] truncate">
                    {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
                  </div>
                  <div className="text-[9px] text-emerald-400 font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Nuvem Ativa
                  </div>
                </div>
              </button>
            ) : (
              <button
                onClick={onOpenLogin}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 border border-rose-500 rounded-lg shadow-sm hover:shadow-rose-600/20 transition-all whitespace-nowrap shrink-0 animate-pulse"
                title="Fazer Login com Google para salvar dados no banco de dados e LGPD"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="font-bold">Login Google</span>
              </button>
            )}

            {/* Quick Guidance Button */}
            <button
              onClick={onOpenGuidance}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
              title="Abrir memorial de instruções e checklist do edital"
            >
              <HelpCircle className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden md:inline">Guia Zabbix</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Bar: Clean, Organized Tabs Strip */}
      <div className="w-full bg-slate-900/80 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-1 overflow-x-auto py-1.5 scrollbar-thin scrollbar-thumb-slate-800">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-rose-600 text-white font-semibold shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
