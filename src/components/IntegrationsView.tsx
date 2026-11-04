import React, { useState, useMemo } from 'react';
import { Customer, Host, Practice, ZabbixSeverity, ZabbixVersion } from '../types';
import {
  ZABBIX_OFFICIAL_INTEGRATIONS,
  resolveIntegrationFromUrl,
  convertIntegrationTriggersToPractices,
} from '../data/zabbixIntegrations';
import {
  Search,
  ExternalLink,
  CheckCircle2,
  Copy,
  Download,
  PlusCircle,
  Shield,
  Layers,
  Sparkles,
  ArrowRight,
  Info,
  Server,
  Zap,
  Code2,
  RefreshCw,
  Sliders,
  Check,
} from 'lucide-react';

interface IntegrationsViewProps {
  customer: Customer;
  hosts: Host[];
  onImportPractices: (newPractices: Practice[]) => void;
  onNavigateToFactoryWithPractice: (practice: Practice) => void;
}

export const IntegrationsView: React.FC<IntegrationsViewProps> = ({
  customer,
  hosts,
  onImportPractices,
  onNavigateToFactoryWithPractice,
}) => {
  const [inputUrl, setInputUrl] = useState<string>('https://www.zabbix.com/br/integrations/fortinet');
  const [activeZabbixVersion, setActiveZabbixVersion] = useState<ZabbixVersion>('7.0');
  const [copiedTriggerId, setCopiedTriggerId] = useState<string | null>(null);
  const [importNotification, setImportNotification] = useState<string | null>(null);
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState<string>('all');
  const [expandedTriggerId, setExpandedTriggerId] = useState<string | null>(null);

  // Resolve current integration based on inputUrl and activeZabbixVersion
  const currentIntegration = useMemo(() => {
    return resolveIntegrationFromUrl(inputUrl, activeZabbixVersion);
  }, [inputUrl, activeZabbixVersion]);

  // Quick preset links
  const presetExamples = [
    { label: 'Fortinet FortiGate (Firewall)', url: 'https://www.zabbix.com/br/integrations/fortinet' },
    { label: 'Cisco IOS (Switch / Router)', url: 'https://www.zabbix.com/integrations/cisco' },
    { label: 'Palo Alto PAN-OS (Firewall)', url: 'https://www.zabbix.com/integrations/palo_alto' },
    { label: 'MikroTik RouterOS', url: 'https://www.zabbix.com/integrations/mikrotik' },
    { label: 'VMware vSphere (ESXi / vCenter)', url: 'https://www.zabbix.com/integrations/vmware' },
    { label: 'PostgreSQL Database', url: 'https://www.zabbix.com/integrations/postgresql' },
    { label: 'Dell PowerEdge iDRAC', url: 'https://www.zabbix.com/integrations/dell' },
    { label: 'Aruba Wi-Fi (Instant AP)', url: 'https://www.zabbix.com/integrations/aruba' },
  ];

  // Filter triggers
  const filteredTriggers = useMemo(() => {
    if (selectedSeverityFilter === 'all') return currentIntegration.triggers;
    return currentIntegration.triggers.filter((t) => t.severity === selectedSeverityFilter);
  }, [currentIntegration, selectedSeverityFilter]);

  const handleCopyExpression = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTriggerId(id);
    setTimeout(() => setCopiedTriggerId(null), 2000);
  };

  const handleImportAllToCatalog = () => {
    const practices = convertIntegrationTriggersToPractices(currentIntegration);
    onImportPractices(practices);
    setImportNotification(
      `${practices.length} modelos de triggers da integração "${currentIntegration.title}" foram importados para o seu Catálogo de Práticas e Fábrica de Triggers!`
    );
    setTimeout(() => setImportNotification(null), 5000);
  };

  const handleExportYamlTemplate = () => {
    const yamlHeader = [
      `zabbix_export:`,
      `  version: "${activeZabbixVersion}"`,
      `  template_groups:`,
      `    - uuid: "${Math.random().toString(36).substring(2, 15)}"`,
      `      name: "Templates/${currentIntegration.vendor}"`,
      `  templates:`,
      `    - uuid: "${Math.random().toString(36).substring(2, 15)}"`,
      `      template: "${currentIntegration.official_template_name.replace(/\s+/g, '_')}"`,
      `      name: "${currentIntegration.official_template_name}"`,
      `      description: "Template oficial homologado para ${currentIntegration.asset_type}. Coleta via ${currentIntegration.collection_method}."`,
      `      groups:`,
      `        - name: "Templates/${currentIntegration.vendor}"`,
      `      macros:`,
    ];

    currentIntegration.macros.forEach((m) => {
      yamlHeader.push(`        - macro: "${m.macro}"`);
      yamlHeader.push(`          value: "${m.value}"`);
      yamlHeader.push(`          description: "${m.description}"`);
    });

    yamlHeader.push(`      discovery_rules:`);
    currentIntegration.lld_rules.forEach((lld) => {
      yamlHeader.push(`        - name: "${lld.name}"`);
      yamlHeader.push(`          key: "${lld.key}"`);
      yamlHeader.push(`          type: SNMP_AGENT`);
      yamlHeader.push(`          trigger_prototypes:`);
    });

    yamlHeader.push(`      triggers:`);
    currentIntegration.triggers
      .filter((t) => !t.is_prototype)
      .forEach((t) => {
        const expr =
          activeZabbixVersion === '5.0' ? t.expression_legacy : t.expression_modern;
        yamlHeader.push(`        - uuid: "${Math.random().toString(36).substring(2, 15)}"`);
        yamlHeader.push(`          expression: '${expr}'`);
        yamlHeader.push(`          name: "${t.name}"`);
        yamlHeader.push(`          priority: "${t.severity.toUpperCase()}"`);
        yamlHeader.push(`          description: "${t.description}"`);
        if (t.recovery_expression_modern && activeZabbixVersion !== '5.0') {
          yamlHeader.push(`          recovery_mode: "EXPRESSION"`);
          yamlHeader.push(`          recovery_expression: '${t.recovery_expression_modern}'`);
        }
      });

    const yamlString = yamlHeader.join('\n');
    const blob = new Blob([yamlString], { type: 'text/yaml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `template_${currentIntegration.slug}_zabbix_${activeZabbixVersion}.yaml`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSeverityBadgeClass = (severity: ZabbixSeverity) => {
    switch (severity) {
      case 'Disaster':
        return 'bg-red-950 text-red-300 border-red-800';
      case 'High':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      case 'Average':
        return 'bg-orange-950 text-orange-300 border-orange-800';
      case 'Warning':
        return 'bg-yellow-950 text-yellow-300 border-yellow-800';
      default:
        return 'bg-blue-950 text-blue-300 border-blue-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-900 to-rose-950/40 border border-slate-800 rounded-2xl relative overflow-hidden">
        <div className="max-w-3xl space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              Zabbix Integrations Explorer
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Compatibilidade Multi-Versão (5.0 / 6.0 / 6.4 / 7.0 LTS)
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Busca de Modelos de Triggers por Link de Integração
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Insira o link oficial de qualquer integração do portal Zabbix (ex:{' '}
            <strong className="text-rose-300 font-mono">https://www.zabbix.com/br/integrations/fortinet</strong>) ou
            repositório Git para carregar automaticamente os modelos de triggers, regras de descoberta LLD, macros e
            expressões compatíveis com a versão do Zabbix do seu ambiente.
          </p>
        </div>
      </div>

      {/* URL Input & Controls Section */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
            Link da Integração ou Nome do Fabricante / Ativo:
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="Ex: https://www.zabbix.com/br/integrations/fortinet ou digite: cisco, palo_alto, vmware..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono transition-colors"
              />
            </div>

            <button
              onClick={() => {
                // Trigger quick refresh
                setInputUrl(inputUrl.trim());
              }}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Buscar Modelos</span>
            </button>
          </div>
        </div>

        {/* Quick Example Presets */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] text-slate-400 font-medium block">
            Exemplos Rápidos de Integrações Oficiais (clique para carregar):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {presetExamples.map((preset) => {
              const isActive = inputUrl.toLowerCase().includes(preset.url.split('/').pop() || '');
              return (
                <button
                  key={preset.label}
                  onClick={() => setInputUrl(preset.url)}
                  className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-rose-950 text-rose-300 border border-rose-800 font-medium'
                      : 'bg-slate-950 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span>{preset.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Zabbix Version Compatibility Selector */}
        <div className="pt-3 border-t border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-rose-400" />
            <span className="text-xs font-semibold text-slate-200">
              Versão Alvo do Zabbix para Geração das Triggers:
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {(['7.0', '6.4', '6.0', '5.0'] as ZabbixVersion[]).map((ver) => {
              const isSelected = activeZabbixVersion === ver;
              return (
                <button
                  key={ver}
                  onClick={() => setActiveZabbixVersion(ver)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium font-mono transition-colors flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-rose-600 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <span>Zabbix {ver}</span>
                  {ver === '7.0' && <span className="text-[10px] opacity-80">(LTS / Atual)</span>}
                  {ver === '6.0' && <span className="text-[10px] opacity-80">(LTS)</span>}
                  {ver === '5.0' && <span className="text-[10px] opacity-80">(Legado)</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Version Compatibility Notice */}
        <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg flex items-start gap-2.5 text-xs text-slate-300">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-white">
              Sintaxe Zabbix {activeZabbixVersion}:{' '}
            </span>
            <span>{currentIntegration.version_compatibility_notes[activeZabbixVersion]}</span>
            <span className="text-slate-400 block text-[11px] mt-0.5">
              {activeZabbixVersion === '5.0'
                ? 'Modo Legado ativo: Triggers geradas no formato {HOST:item.func()}. Note que a sintaxe moderna unificada /host/item é padrão a partir do Zabbix 5.4 e 6.0+.'
                : 'Modo Moderno ativo: Triggers geradas com sintaxe unificada func(/host/item,period) com suporte total a histerese de recuperação.'}
            </span>
          </div>
        </div>
      </div>

      {/* Import Notification Toast */}
      {importNotification && (
        <div className="p-4 bg-emerald-950/90 border border-emerald-800 text-emerald-200 rounded-xl flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-xs sm:text-sm font-medium">{importNotification}</span>
          </div>
          <button
            onClick={() => setImportNotification(null)}
            className="text-xs text-emerald-300 hover:text-white underline font-mono shrink-0"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Integration Overview Card */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-rose-950 text-rose-300 border border-rose-800 font-mono">
                {currentIntegration.vendor}
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-300 font-medium">
                Template: <strong className="text-white font-mono">{currentIntegration.official_template_name}</strong>
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Compatível com Zabbix {activeZabbixVersion}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-rose-500" />
              {currentIntegration.title}
            </h2>

            <p className="text-xs text-slate-300">
              <strong className="text-slate-400">Ativos Suportados:</strong> {currentIntegration.asset_type}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleImportAllToCatalog}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Importar para Minha Fábrica</span>
            </button>

            <button
              onClick={handleExportYamlTemplate}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4 text-slate-300" />
              <span>Exportar YAML ({activeZabbixVersion})</span>
            </button>

            <a
              href={currentIntegration.official_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <span>Ver no Zabbix</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>
        </div>

        {/* Discovery Rules & Macros Strip */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* LLD Rules */}
          <div className="p-3.5 bg-slate-950 border border-slate-850 rounded-lg space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-slate-200 font-mono uppercase tracking-wider text-[11px]">
              <Layers className="w-3.5 h-3.5 text-rose-400" />
              <span>Regras de Descoberta Automática (LLD):</span>
            </div>
            <div className="space-y-1.5">
              {currentIntegration.lld_rules.map((rule) => (
                <div key={rule.key} className="flex items-start justify-between gap-2 border-b border-slate-900 pb-1">
                  <div>
                    <span className="font-medium text-slate-200 block">{rule.name}</span>
                    <span className="text-[11px] text-slate-400">{rule.description}</span>
                  </div>
                  <span className="font-mono text-[10px] text-rose-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 shrink-0">
                    {rule.key}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Macros */}
          <div className="p-3.5 bg-slate-950 border border-slate-850 rounded-lg space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-slate-200 font-mono uppercase tracking-wider text-[11px]">
              <Code2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Macros Padronizadas do Template ({currentIntegration.macros.length}):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
              {currentIntegration.macros.map((m) => (
                <div key={m.macro} className="p-1.5 bg-slate-900/60 rounded border border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-semibold text-white">{m.macro}</span>
                    <span className="font-mono text-[10px] text-emerald-400">{m.value}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 line-clamp-1">{m.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Trigger Models List Header & Filter */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Modelos de Triggers Homologados para este Ativo ({filteredTriggers.length})
            </h3>
            <p className="text-xs text-slate-400">
              Expressões formatadas de acordo com as especificações do Zabbix {activeZabbixVersion}, com histerese
              antioscilação e explicação em linguagem acessível:
            </p>
          </div>

          {/* Severity filter pills */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
            {['all', 'Disaster', 'High', 'Average', 'Warning'].map((sev) => {
              const isSelected = selectedSeverityFilter === sev;
              return (
                <button
                  key={sev}
                  onClick={() => setSelectedSeverityFilter(sev)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    isSelected
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sev === 'all' ? 'Todas' : sev}
                </button>
              );
            })}
          </div>
        </div>

        {/* Triggers Cards */}
        <div className="space-y-3">
          {filteredTriggers.map((trig) => {
            const isExpanded = expandedTriggerId === trig.id;
            const expressionToDisplay =
              activeZabbixVersion === '5.0' ? trig.expression_legacy : trig.expression_modern;
            const recoveryToDisplay =
              activeZabbixVersion === '5.0'
                ? trig.recovery_expression_legacy
                : trig.recovery_expression_modern;

            return (
              <div
                key={trig.id}
                className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3 hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded border font-mono ${getSeverityBadgeClass(
                          trig.severity
                        )}`}
                      >
                        {trig.severity}
                      </span>
                      {trig.is_prototype && (
                        <span className="text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800 px-1.5 py-0.5 rounded">
                          LLD Prototype ({trig.discovery_rule})
                        </span>
                      )}
                      <span className="text-xs font-mono text-slate-400">
                        Item: <strong className="text-slate-200">{trig.item_key}</strong> ({trig.item_type})
                      </span>
                    </div>

                    <h4 className="text-sm sm:text-base font-semibold text-white">
                      {trig.name}
                    </h4>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {trig.description}
                    </p>
                  </div>

                  {/* Actions for this Trigger */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleCopyExpression(expressionToDisplay, trig.id)}
                      className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
                      title="Copiar Expressão de Problema"
                    >
                      {copiedTriggerId === trig.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Copiar Expressão</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        const practices = convertIntegrationTriggersToPractices(currentIntegration);
                        const matchPractice = practices.find((p) => p.id.includes(trig.id)) || practices[0];
                        onImportPractices([matchPractice]);
                        onNavigateToFactoryWithPractice(matchPractice);
                      }}
                      className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-md text-xs font-medium flex items-center gap-1 transition-colors"
                      title="Abrir e gerar na Fábrica de Triggers com host do cliente"
                    >
                      <span>Aplicar no Host</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expression Display Box */}
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-850 space-y-2 font-mono text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 block font-sans font-semibold mb-1">
                      Expressão de Problema (Zabbix {activeZabbixVersion}):
                    </span>
                    <code className="text-rose-300 break-all select-all font-semibold">
                      {expressionToDisplay}
                    </code>
                  </div>

                  {recoveryToDisplay && (
                    <div className="pt-2 border-t border-slate-900">
                      <span className="text-[11px] text-emerald-400 block font-sans font-semibold mb-1">
                        Expressão de Recuperação (Histerese Antioscilação):
                      </span>
                      <code className="text-emerald-300 break-all select-all">
                        {recoveryToDisplay}
                      </code>
                    </div>
                  )}
                </div>

                {/* Accessible Explanation Strip */}
                <div className="border-t border-slate-850 pt-2.5">
                  <button
                    onClick={() => setExpandedTriggerId(isExpanded ? null : trig.id)}
                    className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 font-medium transition-colors"
                  >
                    <span>{isExpanded ? 'Ocultar' : 'Ver'} Explicação Operacional (4 Pilares)</span>
                    <span className="text-[10px] text-slate-500">
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="mt-3 p-3 bg-slate-950/70 border border-slate-800 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs animate-in fade-in duration-150">
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider block font-mono">
                          1. O que Monitora
                        </span>
                        <p className="text-slate-300 leading-relaxed">
                          {trig.accessible_explanation.what_monitors}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block font-mono">
                          2. Quando Dispara
                        </span>
                        <p className="text-slate-300 leading-relaxed">
                          {trig.accessible_explanation.when_triggers}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider block font-mono">
                          3. Impacto Operacional / Negócio
                        </span>
                        <p className="text-slate-300 leading-relaxed">
                          {trig.accessible_explanation.business_impact}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block font-mono">
                          4. Condição de Recuperação
                        </span>
                        <p className="text-slate-300 leading-relaxed">
                          {trig.accessible_explanation.recovery_condition}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
