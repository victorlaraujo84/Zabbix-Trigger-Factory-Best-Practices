import React, { useState, useMemo } from 'react';
import { Customer, Host, ZabbixSeverity, GeneratedTrigger } from '../types';
import {
  analyzeCustomTrigger,
  CustomTriggerAnalysisResult,
  DiagnosticIssue,
} from '../utils/customTriggerValidator';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  Copy,
  Check,
  Code,
  Tag,
  Sliders,
  Play,
  RotateCcw,
  Layers,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';

interface CustomTriggerAnalyzerPanelProps {
  customer: Customer;
  hosts: Host[];
  onNavigateToSimulator?: (trigger: GeneratedTrigger) => void;
  onNavigateToIntegrations?: () => void;
}

export const CustomTriggerAnalyzerPanel: React.FC<CustomTriggerAnalyzerPanelProps> = ({
  customer,
  hosts,
  onNavigateToSimulator,
  onNavigateToIntegrations,
}) => {
  // Preset examples for instant testing
  const presets = [
    {
      id: 'oracle-nodata',
      label: 'Oracle: Sem Dados (nodata)',
      name: 'Oracle: FALHA em coletar dados (ou sem dados por 5m)',
      expression: 'nodata(/rj01ora_ptrhucm1_instance/oracle.uptime,5m)=1',
      recovery: '',
      severity: 'Average' as ZabbixSeverity,
      description: 'Exemplo do usuário: Detecção de ausência de coleta sobre a instância Oracle.',
    },
    {
      id: 'cpu-high',
      label: 'CPU: Utilização Elevada',
      name: 'Linux: Alta utilização de CPU acima do limiar por 5m',
      expression: 'min(/srv-prod-app01/system.cpu.util,5m) > 85',
      recovery: 'max(/srv-prod-app01/system.cpu.util,5m) < 70',
      severity: 'High' as ZabbixSeverity,
      description: 'Validação de histerese e prevenção de picos com min/max.',
    },
    {
      id: 'disk-free',
      label: 'Disco: Espaço Crítico',
      name: 'Storage: Espaço livre em disco abaixo de 10%',
      expression: 'last(/srv-db-01/vfs.fs.size[/data,pfree]) < 10',
      recovery: 'last(/srv-db-01/vfs.fs.size[/data,pfree]) > 15',
      severity: 'High' as ZabbixSeverity,
      description: 'Espaço em disco com histerese para evitar flapping.',
    },
    {
      id: 'legacy-50',
      label: 'Exemplo Legado Zabbix 5.0',
      name: 'Alarme Antigo Sintaxe Legada 5.0',
      expression: '{srv-db-01:mysql.status[Threads_connected].last()}>150',
      recovery: '',
      severity: 'Average' as ZabbixSeverity,
      description: 'Demonstra detecção e conversão de sintaxe legada 5.0 para 6.0/7.0.',
    },
  ];

  const [triggerName, setTriggerName] = useState<string>(presets[0].name);
  const [expression, setExpression] = useState<string>(presets[0].expression);
  const [recoveryExpression, setRecoveryExpression] = useState<string>(presets[0].recovery);
  const [severity, setSeverity] = useState<ZabbixSeverity>(presets[0].severity);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const applyPreset = (preset: typeof presets[0]) => {
    setTriggerName(preset.name);
    setExpression(preset.expression);
    setRecoveryExpression(preset.recovery);
    setSeverity(preset.severity);
  };

  const clearForm = () => {
    setTriggerName('');
    setExpression('');
    setRecoveryExpression('');
    setSeverity('Average');
  };

  // Run validation engine
  const analysis: CustomTriggerAnalysisResult = useMemo(() => {
    return analyzeCustomTrigger(triggerName, expression, recoveryExpression, severity);
  }, [triggerName, expression, recoveryExpression, severity]);

  const copyCompleteZabbixBlock = () => {
    const lines = [
      `# Trigger Zabbix 6.0 / 7.0 - Homologação de Boas Práticas`,
      `Nome: ${analysis.optimizedTriggerName || triggerName}`,
      `Severidade: ${severity}`,
      `Expressão do Problema:`,
      analysis.optimizedExpression || expression,
      analysis.recommendedRecoveryExpression ? `Expressão de Recuperação:\n${analysis.recommendedRecoveryExpression}` : `Modo de Recuperação: Normal (quando falso)`,
      `Dados Operacionais: ${analysis.operationalDataSuggestion}`,
      `Tags: ${analysis.recommendedTags.map((t) => `${t.tag}:${t.value}`).join(', ')}`,
      analysis.recommendedMacros.length > 0
        ? `Macros Recomendadas: ${analysis.recommendedMacros.map((m) => `${m.macro} = ${m.value}`).join(' | ')}`
        : '',
    ].filter(Boolean);

    copyToClipboard(lines.join('\n\n'), 'complete-block');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Intro Header */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/60 font-mono">
                Zabbix 6.0+ &amp; 7.0 Ready
              </span>
              <span className="text-xs font-mono text-slate-400">
                Auditoria de Boas Práticas &amp; Sintaxe Oficial
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-rose-500" />
              Analisador &amp; Validador de Trigger Customizada
            </h2>
            <p className="text-xs text-slate-400 max-w-3xl">
              Cole o <strong>nome</strong> e a <strong>expressão</strong> de qualquer trigger Zabbix (como o exemplo do Oracle nodata) para inspecionar conformidade de sintaxe, identificar valores fixos hardcoded, validar prevenção de falsos alarmes e gerar a expressão otimizada com macros.
            </p>
          </div>

          {/* Quick Presets Bar */}
          <div className="space-y-1.5 shrink-0">
            <span className="text-[11px] font-mono text-slate-400 block">Exemplos Rápidos:</span>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-colors font-medium ${
                    expression === p.expression
                      ? 'bg-rose-950/80 border-rose-800 text-rose-300 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title={p.description}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Input Form (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Code className="w-4 h-4 text-rose-400" />
              Dados da Trigger a Avaliar
            </h3>
            <button
              onClick={clearForm}
              className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
              title="Limpar formulário"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar</span>
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* Trigger Name Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-semibold block">
                  Nome da Trigger:
                </label>
                <span className="text-[10px] text-slate-500 font-mono">
                  Padrão Zabbix: [Serviço]: [Problema]
                </span>
              </div>
              <input
                type="text"
                value={triggerName}
                onChange={(e) => setTriggerName(e.target.value)}
                placeholder="Ex: Oracle: FALHA em coletar dados (ou sem dados por 5m)"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-medium focus:outline-none focus:border-rose-500 placeholder:text-slate-600"
              />
            </div>

            {/* Problem Expression Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-semibold block">
                  Expressão do Problema (Zabbix 6.0+ / 7.0): *
                </label>
                <span className="text-[10px] text-rose-400 font-mono">
                  Obrigatório
                </span>
              </div>
              <textarea
                rows={3}
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                placeholder="Ex: nodata(/rj01ora_ptrhucm1_instance/oracle.uptime,5m)=1"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-rose-300 font-mono text-xs focus:outline-none focus:border-rose-500 placeholder:text-slate-600 selection:bg-rose-900"
              />
              <p className="text-[11px] text-slate-500">
                Sintaxe esperada: <code className="text-slate-400 font-mono">função(/host/chave, parâmetros) operador limiar</code>
              </p>
            </div>

            {/* Recovery Expression Input (Optional) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-semibold block">
                  Expressão de Recuperação (Opcional - Histerese):
                </label>
                <span className="text-[10px] text-slate-500 font-mono">
                  Deixe vazio se for padrão
                </span>
              </div>
              <input
                type="text"
                value={recoveryExpression}
                onChange={(e) => setRecoveryExpression(e.target.value)}
                placeholder="Ex: nodata() recupera automaticamente; para CPU ex: max(...) < 70"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-emerald-300 font-mono text-xs focus:outline-none focus:border-rose-500 placeholder:text-slate-600"
              />
            </div>

            {/* Severity Selector */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold block">
                Severidade no Zabbix:
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as ZabbixSeverity)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-medium focus:outline-none focus:border-rose-500"
              >
                <option value="Disaster">Disaster (Desastre / Queda Crítica)</option>
                <option value="High">High (Alta / Indisponibilidade Iminente)</option>
                <option value="Average">Average (Média / Degradação Relevante)</option>
                <option value="Warning">Warning (Aviso / Limiar Preventivo)</option>
                <option value="Information">Information (Informativo)</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={copyCompleteZabbixBlock}
                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold text-xs transition-colors inline-flex items-center justify-center gap-1.5 shadow-sm"
              >
                {copiedKey === 'complete-block' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Bloco Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Bloco para o Zabbix</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Diagnostic & Best Practice Results (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Diagnostic Summary Header Card */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center font-mono font-bold text-lg border ${
                    analysis.score >= 85
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                      : analysis.score >= 60
                      ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                      : 'bg-rose-950/80 text-rose-300 border-rose-800'
                  }`}
                >
                  {analysis.score}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-mono">Nota de Conformidade:</span>
                    <span
                      className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                        analysis.score >= 85
                          ? 'text-emerald-300 bg-emerald-950 border border-emerald-800'
                          : analysis.score >= 60
                          ? 'text-amber-300 bg-amber-950 border border-amber-800'
                          : 'text-rose-300 bg-rose-950 border border-rose-800'
                      }`}
                    >
                      {analysis.score >= 85
                        ? 'Alta Conformidade Zabbix'
                        : analysis.score >= 60
                        ? 'Conforme com Ajustes Recomendados'
                        : 'Requer Correções Críticas'}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white mt-0.5">
                    {analysis.isValidSyntax ? 'Sintaxe Reconhecida com Sucesso' : 'Erro ou Formato Incompatível'}
                  </h3>
                </div>
              </div>

              {/* Status Badge */}
              <div className="text-right">
                {analysis.isValidSyntax && !analysis.isLegacySyntax && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/70 border border-emerald-800 text-emerald-300 font-mono text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Zabbix 6.0/7.0 Válido
                  </span>
                )}
                {analysis.isLegacySyntax && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/70 border border-amber-800 text-amber-300 font-mono text-xs font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    Sintaxe Zabbix 5.0 (Legada)
                  </span>
                )}
                {!analysis.isValidSyntax && !analysis.isLegacySyntax && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-950/70 border border-rose-800 text-rose-300 font-mono text-xs font-semibold">
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    Sintaxe Inválida
                  </span>
                )}
              </div>
            </div>

            {/* Decomposed Components Grid */}
            {analysis.parsedComponents.functionName && (
              <div className="pt-3 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Função Zabbix</span>
                  <strong className="text-rose-400">{analysis.parsedComponents.functionName}()</strong>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Host Alvo</span>
                  <strong className="text-white truncate block">
                    /{analysis.parsedComponents.host}/
                  </strong>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Chave do Item</span>
                  <strong className="text-cyan-300 truncate block">
                    {analysis.parsedComponents.itemKey}
                  </strong>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Parâmetro de Tempo</span>
                  <strong className="text-amber-300">
                    {analysis.parsedComponents.parameters || 'Nenhum'}
                  </strong>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Operador Lógico</span>
                  <strong className="text-purple-300">{analysis.parsedComponents.operator}</strong>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Valor de Limiar</span>
                  <strong className="text-emerald-300">{analysis.parsedComponents.threshold}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Optimized Expression Card */}
          {analysis.optimizedExpression && (
            <div className="p-4 bg-gradient-to-br from-rose-950/30 via-slate-900 to-slate-900 border border-rose-900/50 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                  Expressão Otimizada Sugerida (Boas Práticas Oficiais)
                </span>
                <button
                  onClick={() => copyToClipboard(analysis.optimizedExpression, 'opt-expr')}
                  className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded transition-colors inline-flex items-center gap-1"
                >
                  {copiedKey === 'opt-expr' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Copiada!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copiar Expressão</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-rose-200 select-all overflow-x-auto">
                <code>{analysis.optimizedExpression}</code>
              </div>

              {analysis.optimizedExpression !== expression && (
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Substituiu valores hardcoded por macros de governança.</span>
                  <button
                    onClick={() => setExpression(analysis.optimizedExpression)}
                    className="text-rose-400 hover:text-white underline text-[11px]"
                  >
                    Usar esta expressão no formulário
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Diagnostic Findings List */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
              Auditoria Detalhada de Boas Práticas ({analysis.diagnostics.length} itens)
            </h4>

            <div className="space-y-2.5">
              {analysis.diagnostics.map((diag, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-lg border text-xs space-y-1.5 ${
                    diag.type === 'error'
                      ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                      : diag.type === 'warning'
                      ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                      : diag.type === 'success'
                      ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {diag.type === 'error' && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                    {diag.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
                    {diag.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                    {diag.type === 'info' && <Info className="w-4 h-4 text-cyan-400 shrink-0" />}
                    <strong className="font-semibold text-white">{diag.title}</strong>
                  </div>

                  <p className="text-[11px] leading-relaxed opacity-90 pl-6">
                    {diag.description}
                  </p>

                  {diag.recommendation && (
                    <div className="mt-1 pl-6 pt-1 border-t border-slate-800/60 text-[11px] font-mono text-rose-300">
                      <strong>Recomendação Oficial:</strong> {diag.recommendation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Macros and Tags Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Recommended Macros */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2.5">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-rose-400" />
                Macros Recomendadas ({analysis.recommendedMacros.length})
              </span>

              {analysis.recommendedMacros.length > 0 ? (
                <div className="space-y-2">
                  {analysis.recommendedMacros.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs flex items-center justify-between gap-2"
                    >
                      <div className="font-mono">
                        <span className="text-rose-400 font-semibold">{m.macro}</span>
                        <span className="text-slate-400"> = </span>
                        <span className="text-emerald-400">{m.value}</span>
                        <div className="text-[10px] text-slate-500 font-sans mt-0.5">{m.description}</div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(`${m.macro} = ${m.value}`, `macro-${idx}`)}
                        className="p-1 text-slate-400 hover:text-white"
                        title="Copiar macro"
                      >
                        {copiedKey === `macro-${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  Nenhuma macro adicional requerida para esta expressão.
                </p>
              )}
            </div>

            {/* Recommended Tags */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2.5">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-rose-400" />
                Tags Recomendadas Zabbix ({analysis.recommendedTags.length})
              </span>

              <div className="flex flex-wrap gap-1.5">
                {analysis.recommendedTags.map((tg, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-[11px] font-mono text-cyan-300"
                  >
                    {tg.tag}:{tg.value}
                  </span>
                ))}
              </div>

              <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                <span className="text-slate-500 block">Dados Operacionais Sugeridos:</span>
                <code className="text-white font-mono text-[11px]">{analysis.operationalDataSuggestion}</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
