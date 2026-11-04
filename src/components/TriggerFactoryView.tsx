import React, { useState, useMemo } from 'react';
import { Customer, Host, Practice, GeneratedTrigger } from '../types';
import { generateTrigger } from '../utils/triggerGenerator';
import { TriggerExplanationPopover } from './TriggerExplanationPopover';
import {
  Copy,
  Check,
  HelpCircle,
  CheckSquare,
  Square,
  Layers,
  Sparkles,
  SlidersHorizontal,
  Download,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Play,
} from 'lucide-react';
import { MONITORING_CATEGORIES } from '../data/categories';
import { CustomTriggerAnalyzerPanel } from './CustomTriggerAnalyzerPanel';

interface TriggerFactoryViewProps {
  customer: Customer;
  hosts: Host[];
  practices: Practice[];
  selectedHostId: string;
  setSelectedHostId: (id: string) => void;
  onOpenGuidanceWithTrigger: (trigger: GeneratedTrigger) => void;
  preselectedPracticeId?: string | null;
  onNavigateToIntegrations?: () => void;
  onNavigateToSimulator?: (trigger: GeneratedTrigger) => void;
}

export const TriggerFactoryView: React.FC<TriggerFactoryViewProps> = ({
  customer,
  hosts,
  practices,
  selectedHostId,
  setSelectedHostId,
  onOpenGuidanceWithTrigger,
  preselectedPracticeId,
  onNavigateToIntegrations,
  onNavigateToSimulator,
}) => {
  const [useTemplateMacro, setUseTemplateMacro] = useState(false);
  const [includeCriticalHours, setIncludeCriticalHours] = useState(false);
  const [selectedPracticeIds, setSelectedPracticeIds] = useState<string[]>(() => {
    if (preselectedPracticeId) return [preselectedPracticeId];
    return [];
  });
  const [copiedTriggerId, setCopiedTriggerId] = useState<string | null>(null);
  const [copiedBatch, setCopiedBatch] = useState(false);
  const [filterScope, setFilterScope] = useState<'matching_category' | 'all'>('matching_category');
  const [factoryMode, setFactoryMode] = useState<'host_generator' | 'custom_analyzer'>('custom_analyzer');

  const currentHost = useMemo(() => {
    return hosts.find((h) => h.host_id === selectedHostId) || hosts[0];
  }, [hosts, selectedHostId]);

  // Set default selection when host changes
  React.useEffect(() => {
    if (currentHost && selectedPracticeIds.length === 0) {
      const match = practices
        .filter((p) => p.category === currentHost.host_type)
        .map((p) => p.id);
      if (match.length > 0) {
        setSelectedPracticeIds(match);
      }
    }
  }, [currentHost, practices]);

  const availablePractices = useMemo(() => {
    if (filterScope === 'matching_category' && currentHost) {
      return practices.filter((p) => p.category === currentHost.host_type);
    }
    return practices;
  }, [filterScope, currentHost, practices]);

  // Generate triggers for selected practices
  const generatedTriggers = useMemo(() => {
    if (!currentHost) return [];
    return practices
      .filter((p) => selectedPracticeIds.includes(p.id))
      .map((p) =>
        generateTrigger(p, currentHost, customer, {
          useTemplateMacro,
          includeCriticalHoursCondition: includeCriticalHours,
        })
      );
  }, [currentHost, practices, selectedPracticeIds, customer, useTemplateMacro, includeCriticalHours]);

  const toggleSelectPractice = (practiceId: string) => {
    setSelectedPracticeIds((prev) =>
      prev.includes(practiceId) ? prev.filter((id) => id !== practiceId) : [...prev, practiceId]
    );
  };

  const selectAll = () => {
    setSelectedPracticeIds(availablePractices.map((p) => p.id));
  };

  const deselectAll = () => {
    setSelectedPracticeIds([]);
  };

  const copyField = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTriggerId(id);
    setTimeout(() => setCopiedTriggerId(null), 2000);
  };

  const copyFullTriggerBlock = (t: GeneratedTrigger) => {
    const block = [
      `=== ZABBIX TRIGGER: ${t.trigger_name} ===`,
      `Host: ${t.hostname}`,
      `Severidade: ${t.severity}`,
      `Expressão do Problema:`,
      t.expression,
      t.recovery_expression ? `Expressão de Recuperação:\n${t.recovery_expression}` : `Modo de Recuperação: Expressão Normal (quando falso)`,
      `Dados Operacionais: ${t.operational_data}`,
      `Tags: ${t.tags.map((x) => `${x.tag}:${x.value}`).join(', ')}`,
      `Macros Recomendadas: ${t.macros.map((m) => `${m.macro} = ${m.value}`).join(' | ')}`,
      `Descrição:`,
      t.description,
    ].join('\n\n');

    copyField(block, `${t.id}-block`);
  };

  const copyBatchAll = () => {
    if (generatedTriggers.length === 0) return;
    const allText = generatedTriggers
      .map((t, idx) => {
        return [
          `# ${idx + 1}. ${t.trigger_name}`,
          `- Severidade: ${t.severity}`,
          `- Expressão Problema: ${t.expression}`,
          t.recovery_expression ? `- Expressão Recuperação: ${t.recovery_expression}` : `- Recuperação: Padrão (Normal)`,
          `- Dados Operacionais: ${t.operational_data}`,
          `- Tags: ${t.tags.map((tg) => `${tg.tag}:${tg.value}`).join(', ')}`,
          `- Descrição:\n${t.description}`,
          '------------------------------------------------------------',
        ].join('\n');
      })
      .join('\n\n');

    navigator.clipboard.writeText(allText);
    setCopiedBatch(true);
    setTimeout(() => setCopiedBatch(false), 2000);
  };

  const handleExportTriggersCsv = () => {
    if (generatedTriggers.length === 0) return;
    const rows = [
      [
        'Host',
        'Nome da Trigger',
        'Severidade',
        'Expressao do Problema (com Valores)',
        'Expressao de Recuperacao',
        'Macro Zabbix',
        'Valor do Limiar',
        'Unidade',
        'Item Key',
        'Dados Operacionais',
        'Tags',
        'Acao Recomendada',
      ],
    ];

    generatedTriggers.forEach((t) => {
      const macroItem = t.macros[0];
      rows.push([
        t.hostname,
        t.trigger_name,
        t.severity,
        t.expression,
        t.recovery_expression || 'Normal (quando falso)',
        macroItem?.macro || '',
        `${macroItem?.value ?? ''}`,
        macroItem?.macro || '',
        t.item_key,
        t.operational_data,
        t.tags.map((x) => `${x.tag}:${x.value}`).join(' | '),
        t.recommended_action,
      ]);
    });

    const csvContent = rows
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `triggers_${currentHost?.hostname || 'host'}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const currentHostCategory = MONITORING_CATEGORIES.find((c) => c.id === currentHost?.host_type);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Mode Switcher Toggle: Host Generator vs Custom Analyzer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800">
          <button
            onClick={() => setFactoryMode('custom_analyzer')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
              factoryMode === 'custom_analyzer'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Analisador &amp; Validador de Trigger Customizada</span>
          </button>
          <button
            onClick={() => setFactoryMode('host_generator')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
              factoryMode === 'host_generator'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Gerador por Host &amp; Práticas</span>
          </button>
        </div>

        <div className="text-xs text-slate-400 font-mono px-2 hidden sm:block">
          {factoryMode === 'custom_analyzer'
            ? 'Validação imediata de sintaxe Zabbix 6.0/7.0 com painel lateral dinâmico'
            : `Host selecionado: ${currentHost?.hostname || 'Nenhum'}`}
        </div>
      </div>

      {factoryMode === 'custom_analyzer' ? (
        <CustomTriggerAnalyzerPanel
          customer={customer}
          hosts={hosts}
          onNavigateToSimulator={onNavigateToSimulator}
          onNavigateToIntegrations={onNavigateToIntegrations}
        />
      ) : (
        <>
          {/* Integration Hub Link Banner */}
      {onNavigateToIntegrations && (
        <div className="p-3.5 bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border border-rose-900/50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">
              <Sparkles className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <span className="font-semibold text-white block">
                Quer buscar modelos específicos inserindo o link da integração (ex: Fortinet, Cisco, Palo Alto, VMware)?
              </span>
              <span className="text-slate-400 text-[11px]">
                Cole o link oficial do Zabbix para inspecionar triggers por versão e importá-las diretamente para o seu host.
              </span>
            </div>
          </div>
          <button
            onClick={onNavigateToIntegrations}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold flex items-center justify-center gap-1.5 shrink-0 transition-colors shadow-sm"
          >
            <span>Buscar Modelos por Link</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Configuration Header Card */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/60 font-mono">
              Fábrica de Expressões Zabbix 6.0+ / 7.0
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white">
              Geração de Triggers para o Host Selecionado
            </h2>
            <p className="text-xs text-slate-400">
              Personalize o alvo, macros de limite do cliente e copie campo a campo para a interface web do Zabbix.
            </p>
          </div>

          {/* Host Selector */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400 block">Host Alvo:</label>
              <select
                value={selectedHostId}
                onChange={(e) => setSelectedHostId(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500 font-medium"
              >
                {hosts.map((h) => (
                  <option key={h.host_id} value={h.host_id}>
                    {h.hostname} ({h.display_name}) - {h.ip}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Options Row */}
        <div className="pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {/* Target Mode Toggle */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
            <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
              Alvo na Expressão Zabbix
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setUseTemplateMacro(false)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  !useTemplateMacro
                    ? 'bg-slate-800 text-rose-400 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Hostname Real (/{currentHost?.hostname || 'HOST'}/...)
              </button>
              <button
                onClick={() => setUseTemplateMacro(true)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  useTemplateMacro
                    ? 'bg-slate-800 text-rose-400 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Template LLD (/{'{HOST.HOST}'}/...)
              </button>
            </div>
          </div>

          {/* Critical Hours Constraint Toggle */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
            <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
              Horário Crítico ({customer.business_rules.critical_hours})
            </span>
            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={includeCriticalHours}
                onChange={(e) => setIncludeCriticalHours(e.target.checked)}
                className="rounded border-slate-700 text-rose-500 focus:ring-0 bg-slate-900"
              />
              <span>Anexar condição time() na expressão</span>
            </label>
          </div>

          {/* Scope Filter */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
            <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
              Práticas Disponíveis
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterScope('matching_category')}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  filterScope === 'matching_category'
                    ? 'bg-slate-800 text-rose-400 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Categoria ({currentHostCategory?.short_title || 'Host'})
              </button>
              <button
                onClick={() => setFilterScope('all')}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  filterScope === 'all'
                    ? 'bg-slate-800 text-rose-400 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Todas ({practices.length})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Practices Selection Bar & Batch Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3.5 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-300 font-medium">
            Selecionadas: <strong>{selectedPracticeIds.length}</strong> de {availablePractices.length} práticas
          </span>
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={selectAll}
              className="px-2 py-0.5 text-rose-400 hover:bg-slate-800 rounded transition-colors"
            >
              Selecionar Todas
            </button>
            <span className="text-slate-600">·</span>
            <button
              onClick={deselectAll}
              className="px-2 py-0.5 text-slate-400 hover:bg-slate-800 rounded transition-colors"
            >
              Limpar Seleção
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportTriggersCsv}
            disabled={generatedTriggers.length === 0}
            className="px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/60 disabled:opacity-50 rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-sm"
            title="Baixar planilha CSV com as triggers geradas e seus valores de limiar"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exportar Triggers (CSV)</span>
          </button>

          <button
            onClick={copyBatchAll}
            disabled={generatedTriggers.length === 0}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-lg transition-colors inline-flex items-center gap-1.5"
          >
            {copiedBatch ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Triggers Copiadas!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Lote Completo ({generatedTriggers.length})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Available Practices Checkboxes List (Accordion/Pills) */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
          Selecione as Práticas a Ativar no Host {currentHost?.hostname}
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {availablePractices.map((p) => {
            const isChecked = selectedPracticeIds.includes(p.id);
            return (
              <div
                key={p.id}
                onClick={() => toggleSelectPractice(p.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                  isChecked
                    ? 'bg-slate-950 border-rose-600/70 text-white shadow-sm'
                    : 'bg-slate-950/50 border-slate-850 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="mt-0.5">
                  {isChecked ? (
                    <CheckSquare className="w-4 h-4 text-rose-500" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-600" />
                  )}
                </div>
                <div className="space-y-0.5 overflow-hidden">
                  <div className="text-xs font-medium truncate">{p.title}</div>
                  <div className="text-[10px] font-mono text-slate-500 truncate">
                    {p.item_key}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Generated Trigger Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            Triggers Geradas Prontas para Copiar: <strong>{generatedTriggers.length}</strong>
          </span>
        </div>

        {generatedTriggers.length === 0 ? (
          <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl text-slate-400 text-xs">
            Nenhuma prática selecionada. Marque uma ou mais práticas acima para gerar as expressões de trigger.
          </div>
        ) : (
          generatedTriggers.map((t) => (
            <div
              key={t.id}
              className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4 hover:border-slate-700 transition-colors"
            >
              {/* Trigger Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
                      Host: <strong>{t.hostname}</strong>
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                        t.severity === 'Disaster'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : t.severity === 'High'
                          ? 'bg-orange-950 text-orange-300 border border-orange-800'
                          : t.severity === 'Average'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-yellow-950 text-yellow-300 border border-yellow-800'
                      }`}
                    >
                      {t.severity}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-white">
                    {t.trigger_name}
                  </h3>
                  <div className="pt-1">
                    <TriggerExplanationPopover
                      explanation={t.accessible_explanation}
                      triggerName={t.trigger_name}
                      severity={t.severity}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                  {onNavigateToSimulator && (
                    <button
                      onClick={() => onNavigateToSimulator(t)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-rose-500 rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-sm group"
                      title="Testar e simular valores desta trigger no Simulador Zabbix"
                    >
                      <Play className="w-3.5 h-3.5 text-rose-400 group-hover:text-rose-300 fill-rose-500/20" />
                      <span>Simular no Zabbix</span>
                    </button>
                  )}
                  <button
                    onClick={() => onOpenGuidanceWithTrigger(t)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors inline-flex items-center gap-1.5"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Onde colar no Zabbix?</span>
                  </button>
                  <button
                    onClick={() => copyFullTriggerBlock(t)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm transition-colors inline-flex items-center gap-1.5"
                  >
                    {copiedTriggerId === `${t.id}-block` ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Bloco</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Accessible Explanation Box (O que monitora, quando alarma e o que quer dizer) */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 font-mono uppercase tracking-wider">
                  <HelpCircle className="w-4 h-4" />
                  <span>Explicação Acessível do Alarme (Para Operadores e Gestores)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-900/80 border border-slate-850 rounded-lg space-y-1">
                    <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">
                      🎯 O Que Monitora?
                    </span>
                    <p className="text-slate-200 leading-relaxed">
                      {t.accessible_explanation.what_monitors}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-900/80 border border-slate-850 rounded-lg space-y-1">
                    <span className="text-amber-400 font-semibold block text-[11px] uppercase tracking-wider">
                      ⚠️ Quando Vai Alarmar?
                    </span>
                    <p className="text-slate-200 leading-relaxed">
                      {t.accessible_explanation.when_triggers}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-900/80 border border-slate-850 rounded-lg space-y-1">
                    <span className="text-rose-400 font-semibold block text-[11px] uppercase tracking-wider">
                      💡 O Que Quer Dizer na Prática?
                    </span>
                    <p className="text-slate-200 leading-relaxed">
                      {t.accessible_explanation.business_impact}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-900/80 border border-slate-850 rounded-lg space-y-1">
                    <span className="text-emerald-400 font-semibold block text-[11px] uppercase tracking-wider">
                      🔄 Quando Vai Normalizar (Recuperar)?
                    </span>
                    <p className="text-slate-200 leading-relaxed">
                      {t.accessible_explanation.recovery_condition}
                    </p>
                  </div>
                </div>
              </div>

              {/* Expression Fields Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
                {/* Problem Expression */}
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                      Expressão do Problema (Zabbix Expression)
                    </span>
                    <button
                      onClick={() => copyField(t.expression, `${t.id}-expr`)}
                      className="text-slate-400 hover:text-white text-[11px] inline-flex items-center gap-1"
                    >
                      {copiedTriggerId === `${t.id}-expr` ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copiada</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar Expressão</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded font-mono text-xs text-amber-300 break-all select-all">
                    {t.expression}
                  </div>
                </div>

                {/* Recovery Expression */}
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                      Expressão de Recuperação (Histerese)
                    </span>
                    {t.recovery_expression && (
                      <button
                        onClick={() => copyField(t.recovery_expression, `${t.id}-recexpr`)}
                        className="text-slate-400 hover:text-white text-[11px] inline-flex items-center gap-1"
                      >
                        {copiedTriggerId === `${t.id}-recexpr` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copiada</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copiar Recuperação</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  {t.recovery_expression ? (
                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded font-mono text-xs text-emerald-300 break-all select-all">
                      {t.recovery_expression}
                    </div>
                  ) : (
                    <div className="p-2.5 bg-slate-900/60 border border-slate-850 rounded text-slate-500 italic text-xs">
                      Modo normal: evento recupera quando a expressão do problema retornar FALSO.
                    </div>
                  )}
                </div>
              </div>

              {/* Operational Data & Tags */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-400">Dados Operacionais:</span>
                    <button
                      onClick={() => copyField(t.operational_data, `${t.id}-op`)}
                      className="text-slate-400 hover:text-white text-[10px]"
                    >
                      {copiedTriggerId === `${t.id}-op` ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                  <code className="text-cyan-300 font-mono text-xs block select-all">
                    {t.operational_data}
                  </code>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                  <span className="text-[11px] font-mono text-slate-400 block">Tags do Zabbix:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {t.tags.map((tg, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded font-mono text-[11px] text-slate-300"
                      >
                        {tg.tag}:{tg.value}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Technical Description preview */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400">
                    Descrição Técnica (Memorial Operacional & Procedimento):
                  </span>
                  <button
                    onClick={() => copyField(t.description, `${t.id}-desc`)}
                    className="text-slate-400 hover:text-white text-[11px] inline-flex items-center gap-1"
                  >
                    {copiedTriggerId === `${t.id}-desc` ? 'Copiada!' : 'Copiar Descrição'}
                  </button>
                </div>
                <pre className="p-2 bg-slate-900 rounded font-mono text-[11px] text-slate-300 whitespace-pre-wrap max-h-28 overflow-y-auto">
                  {t.description}
                </pre>
              </div>
            </div>
          ))
        )}
      </div>
          </>
        )}
    </div>
  );
};
