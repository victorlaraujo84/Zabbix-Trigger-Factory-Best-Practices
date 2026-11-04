import React, { useState } from 'react';
import { Practice, HostTypeId, ValidationStatus } from '../types';
import { MONITORING_CATEGORIES } from '../data/categories';
import {
  Search,
  CheckCircle,
  AlertTriangle,
  Wrench,
  Ban,
  ArrowRight,
  Filter,
  Check,
  Copy,
  Sparkles,
} from 'lucide-react';
import { ActiveTab } from './Navbar';

interface CatalogViewProps {
  practices: Practice[];
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  onNavigateToFactoryWithPractice: (practice: Practice) => void;
  onNavigateToIntegrations?: () => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({
  practices,
  selectedCategory,
  setSelectedCategory,
  onNavigateToFactoryWithPractice,
  onNavigateToIntegrations,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredPractices = practices.filter((p) => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesStatus = statusFilter === 'all' || p.validation.status === statusFilter;
    const matchesSearch =
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.item_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.edital_section && p.edital_section.includes(searchTerm)) ||
      p.rationale.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesCategory && matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: ValidationStatus) => {
    switch (status) {
      case 'standard_template':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
            <CheckCircle className="w-3 h-3" />
            Template Padrão
          </span>
        );
      case 'extended_native':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400">
            <AlertTriangle className="w-3 h-3" />
            Capacidade Estendida
          </span>
        );
      case 'custom_implementation':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-400">
            <Wrench className="w-3 h-3" />
            Implementação Customizada
          </span>
        );
      case 'not_recommended':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400">
            <Ban className="w-3 h-3" />
            Não é Boa Prática
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Filter and Search Bar */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por prática, item key Zabbix (ex: fortinet.sessions, vmware.datastore)..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          {onNavigateToIntegrations && (
            <button
              onClick={onNavigateToIntegrations}
              className="px-3 py-2 bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0"
              title="Buscar modelos por link da integração (ex: https://www.zabbix.com/br/integrations/fortinet)"
            >
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              <span>Buscar por Link Oficial Zabbix</span>
            </button>
          )}

          {/* Validation Status Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg overflow-x-auto shrink-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                statusFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter('standard_template')}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                statusFilter === 'standard_template' ? 'bg-slate-800 text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Padrão
            </button>
            <button
              onClick={() => setStatusFilter('extended_native')}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                statusFilter === 'extended_native' ? 'bg-slate-800 text-amber-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Estendida
            </button>
            <button
              onClick={() => setStatusFilter('custom_implementation')}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                statusFilter === 'custom_implementation' ? 'bg-slate-800 text-sky-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Customizada
            </button>
            <button
              onClick={() => setStatusFilter('not_recommended')}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                statusFilter === 'not_recommended' ? 'bg-slate-800 text-rose-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Não Recomendado
            </button>
          </div>
        </div>

        {/* Categories Horizontal Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-rose-950/70 border-rose-700 text-rose-200 font-semibold'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Todas as 13 Categorias ({practices.length})
          </button>
          {MONITORING_CATEGORIES.map((cat) => {
            const count = practices.filter((p) => p.category === cat.id).length;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-rose-950/70 border-rose-700 text-rose-200 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{cat.short_title}</span>
                <span className="text-[10px] font-mono text-slate-500">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Practices List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            Exibindo <strong>{filteredPractices.length}</strong> práticas homologadas
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filteredPractices.map((practice) => {
            const cat = MONITORING_CATEGORIES.find((c) => c.id === practice.category);
            return (
              <div
                key={practice.id}
                className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4 hover:border-slate-700 transition-colors"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-slate-400 px-2 py-0.5 bg-slate-950 rounded border border-slate-850">
                        {cat?.name || practice.category}
                      </span>
                      {getStatusBadge(practice.validation.status)}
                    </div>
                    <h3 className="text-sm sm:text-base font-semibold text-white">
                      {practice.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onNavigateToFactoryWithPractice(practice)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm transition-colors inline-flex items-center gap-1.5"
                    >
                      <span>Gerar Trigger</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Key Technical Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  {/* Item Key */}
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-mono text-[11px]">Zabbix Item Key:</span>
                      <button
                        onClick={() => handleCopyKey(practice.item_key)}
                        className="text-slate-400 hover:text-white"
                        title="Copiar Item Key"
                      >
                        {copiedKey === practice.item_key ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                    <code className="text-amber-300 font-mono text-[11px] block break-all select-all">
                      {practice.item_key}
                    </code>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Tipo: {practice.item_type} · Função: {practice.function}
                      {practice.evaluation_period ? `(${practice.evaluation_period})` : ''}
                    </div>
                  </div>

                  {/* Limiar & Histerese */}
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                    <span className="text-slate-400 font-mono text-[11px]">Regra de Disparo & Histerese:</span>
                    <div className="text-slate-200 font-mono text-xs">
                      Problema: {practice.function} {practice.operator} <strong>{practice.macro_name}</strong>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {practice.recovery
                        ? `Recuperação: ${practice.recovery.function} ${practice.recovery.operator} (${practice.recovery.delta_expr || practice.default_threshold_value})`
                        : 'Recuperação: Automática quando falso'}
                    </div>
                  </div>

                  {/* Template Oficial */}
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                    <span className="text-slate-400 font-mono text-[11px]">Template Oficial de Referência:</span>
                    <div className="text-emerald-400 font-mono text-xs font-semibold truncate">
                      {practice.validation.official_template || cat?.official_template_name || 'Zabbix Standard'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Severidade: <strong className="text-slate-200">{practice.severity_param}</strong>
                    </div>
                  </div>
                </div>

                {/* Accessible Explanation Box */}
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-400 font-mono uppercase tracking-wider">
                    <span>💡 O Que Monitora & Quando Alarma (Linguagem Acessível):</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                    <div>
                      <strong className="text-slate-200">🎯 O que monitora: </strong>
                      Mede a integridade de {practice.title} através da chave [{practice.item_key}].
                    </div>
                    <div>
                      <strong className="text-amber-300">⚠️ Quando vai alarmar: </strong>
                      Dispara quando o valor for {practice.operator === '>' ? 'maior que' : practice.operator === '<' ? 'menor que' : practice.operator === '=' ? 'igual a' : 'diferente de'} {practice.macro_name} ({practice.default_threshold_value}{practice.unit || ''}){practice.evaluation_period ? ` sustentado por ${practice.evaluation_period}` : ''}.
                    </div>
                  </div>
                </div>

                {/* Justificativa & Ação */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="space-y-1">
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                      Justificativa Técnica
                    </span>
                    <p className="text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded border border-slate-850">
                      {practice.rationale}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                      Ação Operacional Recomendada
                    </span>
                    <p className="text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded border border-slate-850">
                      {practice.recommended_action}
                    </p>
                  </div>
                </div>

                {/* Limitations / Alternative Tool if applicable */}
                {practice.validation.limitations && (
                  <div className="text-xs text-amber-300/90 bg-amber-950/30 border border-amber-800/40 p-2.5 rounded-lg font-mono">
                    <strong>Nota de Implementação:</strong> {practice.validation.limitations}
                  </div>
                )}
                {practice.validation.recommended_alternative_tool && (
                  <div className="text-xs text-rose-300/90 bg-rose-950/30 border border-rose-800/40 p-2.5 rounded-lg font-mono">
                    <strong>Ferramenta Especializada Recomendada:</strong> {practice.validation.recommended_alternative_tool}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
