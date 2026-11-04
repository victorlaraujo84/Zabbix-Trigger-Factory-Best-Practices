import React from 'react';
import { Customer, Host, Practice } from '../types';
import { MONITORING_CATEGORIES } from '../data/categories';
import {
  ShieldCheck,
  Server,
  Database,
  Globe,
  Cloud,
  Mail,
  Users,
  Code,
  Network,
  Wifi,
  ShieldAlert,
  Activity,
  Box,
  HardDrive,
  CheckCircle,
  AlertTriangle,
  Wrench,
  Ban,
  ArrowRight,
  Clock,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { ActiveTab } from './Navbar';

interface OverviewViewProps {
  customer: Customer;
  hosts: Host[];
  practices: Practice[];
  onNavigateTab: (tab: ActiveTab) => void;
  onSelectCategoryFilter: (catId: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  customer,
  hosts,
  practices,
  onNavigateTab,
  onSelectCategoryFilter,
}) => {
  // Counts by validation status
  const standardCount = practices.filter((p) => p.validation.status === 'standard_template').length;
  const extendedCount = practices.filter((p) => p.validation.status === 'extended_native').length;
  const customCount = practices.filter((p) => p.validation.status === 'custom_implementation').length;
  const notRecCount = practices.filter((p) => p.validation.status === 'not_recommended').length;

  const getCategoryIcon = (id: string) => {
    switch (id) {
      case 'docker_container':
        return <Box className="w-5 h-5 text-sky-400" />;
      case 'vmware':
      case 'hyperv':
      case 'nutanix':
        return <Server className="w-5 h-5 text-indigo-400" />;
      case 'mssql':
        return <Database className="w-5 h-5 text-rose-400" />;
      case 'mysql':
        return <HardDrive className="w-5 h-5 text-amber-400" />;
      case 'web_server':
        return <Globe className="w-5 h-5 text-cyan-400" />;
      case 'microsoft_365':
        return <Cloud className="w-5 h-5 text-blue-400" />;
      case 'mail_server':
        return <Mail className="w-5 h-5 text-orange-400" />;
      case 'ldap_ad':
        return <Users className="w-5 h-5 text-purple-400" />;
      case 'web_application':
        return <Code className="w-5 h-5 text-teal-400" />;
      case 'network_switch':
        return <Network className="w-5 h-5 text-emerald-400" />;
      case 'access_point':
        return <Wifi className="w-5 h-5 text-fuchsia-400" />;
      case 'firewall':
        return <ShieldAlert className="w-5 h-5 text-red-400" />;
      case 'internet_link':
        return <Activity className="w-5 h-5 text-lime-400" />;
      default:
        return <Server className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Welcome / Context Hero */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/60 font-mono">
                Boas Práticas Homologadas
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Cliente: <strong className="text-slate-100">{customer.customer_name}</strong>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Fábrica de Triggers Zabbix & Validação Oficial de Boas Práticas
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Sistema de engenharia de monitoramento sem conexão direta ao servidor Zabbix. Valida se cada requisito pertence às boas práticas oficiais, calcula histereses e entrega triggers prontas para operação manual no Zabbix Web.
            </p>
          </div>

          <div className="flex flex-wrap lg:flex-nowrap items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigateTab('integrations')}
              className="px-4 py-2.5 text-xs font-semibold text-rose-300 bg-rose-950/70 hover:bg-rose-900 border border-rose-800 rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-rose-400" />
              <span>Buscar por Link (ex: Fortinet)</span>
            </button>
            <button
              onClick={() => onNavigateTab('security')}
              className="px-4 py-2.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-emerald-600 rounded-lg shadow-sm transition-colors flex items-center gap-2"
              title="Overview de Segurança e Conformidade LGPD"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Segurança & LGPD</span>
            </button>
            <button
              onClick={() => onNavigateTab('validator')}
              className="px-4 py-2.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-rose-400" />
              <span>Validar Requisito</span>
            </button>
            <button
              onClick={() => onNavigateTab('factory')}
              className="px-4 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              <span>Gerar Triggers em Lote</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Client Business Rules Context Line */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <span>Horário Crítico: <strong className="text-slate-200">{customer.business_rules.critical_hours}</strong></span>
          </div>
          <div className="flex items-center gap-4">
            <span>CPU Warning: <strong className="text-slate-200">{customer.business_rules.thresholds.cpu_warning}%</strong></span>
            <span>Memória Warning: <strong className="text-slate-200">{customer.business_rules.thresholds.memory_warning}% livre</strong></span>
            <span>Link Warning: <strong className="text-slate-200">{customer.business_rules.thresholds.link_warning_pct}%</strong></span>
            <button
              onClick={() => onNavigateTab('client')}
              className="text-rose-400 hover:underline inline-flex items-center gap-1"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Ajustar Regras</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Stat Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-xs text-slate-400 uppercase tracking-wider block font-semibold">
            Práticas Homologadas
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white tabular-nums">{practices.length}</span>
            <span className="text-xs text-emerald-400 font-medium">13 categorias</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Catálogo completo de monitoramento
          </span>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-xs text-slate-400 uppercase tracking-wider block font-semibold">
            Templates Padrão Zabbix
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">{standardCount}</span>
            <span className="text-xs text-slate-400">práticas</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Nativas dos templates oficiais
          </span>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-xs text-slate-400 uppercase tracking-wider block font-semibold">
            Capacidade Estendida
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-400 tabular-nums">{extendedCount}</span>
            <span className="text-xs text-slate-400">práticas</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Item nativo + ajuste customizado
          </span>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-xs text-slate-400 uppercase tracking-wider block font-semibold">
            Hosts no Cenário
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-cyan-400 tabular-nums">{hosts.length}</span>
            <span className="text-xs text-slate-400">dispositivos</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Servidores, bancos, switches e links
          </span>
        </div>
      </div>

      {/* 13 Categories Matrix */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">
              Catálogo de Tecnologias de Monitoramento
            </h2>
            <p className="text-xs text-slate-400">
              Cada categoria possui conjunto de boas práticas, template oficial Zabbix de referência e validação:
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('catalog')}
            className="text-xs text-rose-400 hover:text-rose-300 font-medium inline-flex items-center gap-1"
          >
            <span>Ver Catálogo Completo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MONITORING_CATEGORIES.map((cat) => {
            const catPractices = practices.filter((p) => p.category === cat.id);
            return (
              <div
                key={cat.id}
                className="p-4 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg">
                      {getCategoryIcon(cat.id)}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">{cat.name}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                      {cat.description}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                  <div className="text-[11px] text-slate-400 font-mono truncate">
                    Template: <strong className="text-slate-200">{cat.official_template_name}</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-400">
                      {catPractices.length} práticas homologadas
                    </span>
                    <button
                      onClick={() => {
                        onSelectCategoryFilter(cat.id);
                        onNavigateTab('catalog');
                      }}
                      className="text-rose-400 hover:underline font-medium inline-flex items-center gap-1"
                    >
                      <span>Explorar</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
