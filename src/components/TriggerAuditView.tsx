import React, { useState, useMemo, useRef } from 'react';
import {
  parseTriggerInventoryText,
  parseTriggerInventoryExcel,
  RawTriggerRecord,
  SAMPLE_3_COLUMN_INVENTORY,
} from '../utils/triggerInventoryParser';
import {
  auditTriggerEnvironment,
  EnvironmentAuditReport,
  AuditedTriggerItem,
  exportRefinedTriggersCsv,
  exportRefinedTriggersExcel,
  generateExecutiveMarkdownReport,
} from '../utils/environmentAuditEngine';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Download,
  Search,
  Filter,
  Copy,
  Check,
  RotateCcw,
  FileSpreadsheet,
  Code,
  ShieldAlert,
  Sliders,
  Tag,
  ArrowRight,
  Info,
  ChevronDown,
  ChevronUp,
  X,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';

interface TriggerAuditViewProps {
  onNavigateToFactory?: (triggerName: string, expression: string) => void;
}

export const TriggerAuditView: React.FC<TriggerAuditViewProps> = ({ onNavigateToFactory }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial demo data
  const [rawRecords, setRawRecords] = useState<RawTriggerRecord[]>(() => {
    return SAMPLE_3_COLUMN_INVENTORY.map((item, idx) => ({
      id: `demo-${idx}`,
      host: item.host,
      name: item.name,
      expression: item.expression,
      sourceRowNumber: idx + 1,
    }));
  });

  const [fileName, setFileName] = useState<string>('inventario_demonstracao_3colunas.csv');
  const [filterType, setFilterType] = useState<'all' | 'flapping' | 'hardcoded' | 'legacy' | 'hysteresis' | 'clean'>('all');
  const [selectedHostFilter, setSelectedHostFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedTriggerId, setExpandedTriggerId] = useState<string | null>(null);
  const [isManualPasteOpen, setIsManualPasteOpen] = useState(false);
  const [manualText, setManualText] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Drag and Drop & Status feedback
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  } | null>({
    type: 'success',
    title: 'Ambiente de Demonstração Inicial Carregado',
    message: '10 triggers em 3 colunas (Host > Nome > Expressão) prontas para análise. Faça upload do seu arquivo .xlsx, .csv, .json ou .xml a qualquer momento.',
  });

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Run audit engine automatically whenever rawRecords change
  const auditReport: EnvironmentAuditReport = useMemo(() => {
    return auditTriggerEnvironment(rawRecords);
  }, [rawRecords]);

  // Unique hosts for filtering
  const hostList = useMemo(() => {
    return Array.from(new Set(rawRecords.map((r) => r.host.trim()).filter(Boolean)));
  }, [rawRecords]);

  // Filter triggers
  const filteredTriggers = useMemo(() => {
    return auditReport.triggers.filter((t) => {
      // Type filter
      if (filterType === 'flapping' && !t.hasFlappingRisk) return false;
      if (filterType === 'hardcoded' && !t.hasHardcodedValues) return false;
      if (filterType === 'legacy' && !t.isLegacySyntax) return false;
      if (filterType === 'hysteresis' && !t.hasNoHysteresis) return false;
      if (filterType === 'clean' && t.issues.some((i) => i.type !== 'success')) return false;

      // Host filter
      if (selectedHostFilter !== 'all' && t.originalHost !== selectedHostFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.originalHost.toLowerCase().includes(q) ||
          t.originalName.toLowerCase().includes(q) ||
          t.originalExpression.toLowerCase().includes(q) ||
          t.refinedExpression.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [auditReport, filterType, selectedHostFilter, searchQuery]);

  // Unified File Processor (handles both File objects from input or drag-and-drop)
  const processUploadedFile = (file: File) => {
    setIsProcessing(true);
    const isExcel = /\.xlsx?$/i.test(file.name);

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setIsProcessing(false);
        try {
          const buffer = event.target?.result as ArrayBuffer;
          const parsed = parseTriggerInventoryExcel(buffer, file.name);

          if (parsed.success && parsed.records.length > 0) {
            setRawRecords(parsed.records);
            setFileName(file.name);
            setExpandedTriggerId(null);
            setFilterType('all');
            setSelectedHostFilter('all');
            setNotification({
              type: 'success',
              title: `Planilha Excel (${file.name}) Processada`,
              message: `${parsed.records.length} triggers carregadas com sucesso em 3 colunas (Host > Nome > Expressão). A auditoria completa foi calculada abaixo.`,
            });
          } else {
            setNotification({
              type: 'error',
              title: 'Falha ao Analisar Planilha Excel',
              message:
                parsed.warnings.join('\n') ||
                'Nenhuma linha com dados válidos de triggers foi identificada na planilha.',
            });
          }
        } catch (err: any) {
          setNotification({
            type: 'error',
            title: 'Erro na Leitura da Planilha',
            message: err?.message || 'Arquivo corrompido ou formato não suportado.',
          });
        }
      };

      reader.onerror = () => {
        setIsProcessing(false);
        setNotification({
          type: 'error',
          title: 'Erro ao Abrir Arquivo',
          message: 'Não foi possível carregar os bytes da planilha.',
        });
      };

      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        setIsProcessing(false);
        try {
          const content = event.target?.result as string;
          const parsed = parseTriggerInventoryText(content, file.name);

          if (parsed.success && parsed.records.length > 0) {
            setRawRecords(parsed.records);
            setFileName(file.name);
            setExpandedTriggerId(null);
            setFilterType('all');
            setSelectedHostFilter('all');
            setNotification({
              type: 'success',
              title: `Arquivo (${file.name}) Processado com Sucesso`,
              message: `${parsed.records.length} triggers identificadas e analisadas.`,
            });
          } else {
            setNotification({
              type: 'error',
              title: 'Falha ao Processar Arquivo',
              message:
                parsed.warnings.join('\n') ||
                'Não foi possível extrair a trinca (Host > Nome > Expressão) do arquivo fornecido.',
            });
          }
        } catch (err: any) {
          setNotification({
            type: 'error',
            title: 'Erro no Processamento',
            message: err?.message || 'Arquivo mal formatado.',
          });
        }
      };

      reader.onerror = () => {
        setIsProcessing(false);
        setNotification({
          type: 'error',
          title: 'Erro ao Ler Arquivo',
          message: 'Falha na leitura do arquivo de texto.',
        });
      };

      reader.readAsText(file, 'UTF-8');
    }
  };

  // Change handler for standard file input
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
    // Reset value so re-selecting the exact same file fires onChange again
    e.target.value = '';
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  // Handle Direct Paste
  const handleApplyManualText = () => {
    if (!manualText.trim()) return;
    const parsed = parseTriggerInventoryText(manualText, 'entrada_manual.csv');
    if (parsed.success && parsed.records.length > 0) {
      setRawRecords(parsed.records);
      setFileName('entrada_manual.csv');
      setIsManualPasteOpen(false);
      setManualText('');
      setNotification({
        type: 'success',
        title: 'Texto Colado Processado',
        message: `${parsed.records.length} triggers importadas e analisadas com sucesso.`,
      });
    } else {
      setNotification({
        type: 'error',
        title: 'Formato Não Reconhecido',
        message:
          parsed.warnings.join('\n') ||
          'Certifique-se de que cada linha contenha: Host; Nome; Expressão.',
      });
    }
  };

  // Load Demo Data
  const handleLoadDemo = () => {
    setRawRecords(
      SAMPLE_3_COLUMN_INVENTORY.map((item, idx) => ({
        id: `demo-${idx}`,
        host: item.host,
        name: item.name,
        expression: item.expression,
        sourceRowNumber: idx + 1,
      }))
    );
    setFileName('inventario_demonstracao_3colunas.csv');
    setFilterType('all');
    setSelectedHostFilter('all');
    setSearchQuery('');
    setNotification({
      type: 'info',
      title: 'Inventário de Demonstração Restaurado',
      message: '10 triggers carregadas com cenários reais de flapping, hardcoded e sintaxe legada.',
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Hidden File Input with explicit ref */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv,.tsv,.txt,.json,.xml"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Top Banner and Upload Area */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/60 font-mono">
                Modelo 3 Colunas: Host &gt; Nome &gt; Expressão
              </span>
              <span className="text-xs font-mono text-slate-400">
                Auditoria de Qualidade do Monitoramento Zabbix
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-rose-500" />
              Auditoria &amp; Refinamento de Inventário de Triggers
            </h1>
            <p className="text-xs text-slate-400 max-w-3xl">
              Faça upload do inventário de triggers em <strong>Excel (.xlsx / .xls)</strong>, <strong>CSV</strong>, <strong>JSON</strong> ou <strong>XML</strong> no formato <strong>Host &gt; Nome &gt; Expressão</strong>. A auditoria é realizada automaticamente ao subir o arquivo, diagnosticando <em>flapping</em>, valores <em>hardcoded</em>, sintaxe legada 5.0 e gerando expressões refinadas para o Zabbix 6.0/7.0.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Direct Click Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white rounded-lg font-semibold text-xs transition-all cursor-pointer inline-flex items-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Selecionar Arquivo (XLSX / CSV / JSON)</span>
                </>
              )}
            </button>

            {/* Paste Button */}
            <button
              type="button"
              onClick={() => setIsManualPasteOpen(!isManualPasteOpen)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium text-xs transition-colors inline-flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Colar 3 Colunas</span>
            </button>

            {/* Reset to Demo */}
            <button
              type="button"
              onClick={handleLoadDemo}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium text-xs transition-colors inline-flex items-center gap-1.5"
              title="Restaurar dados de exemplo"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Exemplo Demo</span>
            </button>
          </div>
        </div>

        {/* Drag & Drop Visual Dropzone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left ${
            isDragging
              ? 'border-rose-500 bg-rose-950/40 scale-[1.01]'
              : 'border-slate-700 hover:border-slate-500 bg-slate-950/60 hover:bg-slate-950/80'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-xl border ${isDragging ? 'bg-rose-600 text-white border-rose-400' : 'bg-slate-900 border-slate-800 text-rose-400'}`}>
              <FolderOpen className="w-6 h-6" />
            </div>
            <div className="space-y-0.5">
              <span className="text-xs sm:text-sm font-bold text-white block">
                {isDragging ? 'Solte a planilha Excel ou arquivo aqui...' : 'Arraste e solte o arquivo aqui ou clique para procurar'}
              </span>
              <span className="text-[11px] text-slate-400 block font-mono">
                Formatos aceitos: <strong>.xlsx</strong>, <strong>.xls</strong>, <strong>.csv</strong>, <strong>.tsv</strong>, <strong>.json</strong>, <strong>.xml</strong> (Colunas: Host &gt; Nome &gt; Expressão)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-400 font-semibold">
              Excel .xlsx
            </span>
            <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-cyan-400 font-semibold">
              CSV
            </span>
            <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-purple-400 font-semibold">
              JSON/XML
            </span>
          </div>
        </div>

        {/* In-App Notification / Error Banner (Zero window.alert) */}
        {notification && (
          <div
            className={`p-3.5 rounded-lg border text-xs flex items-start justify-between gap-3 animate-in fade-in ${
              notification.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-800 text-emerald-200'
                : notification.type === 'error'
                ? 'bg-rose-950/80 border-rose-800 text-rose-200'
                : 'bg-cyan-950/70 border-cyan-800 text-cyan-200'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
              {notification.type === 'error' && <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
              {notification.type === 'info' && <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />}
              <div className="space-y-0.5">
                <strong className="font-semibold block">{notification.title}</strong>
                <p className="text-[11px] opacity-90 whitespace-pre-line leading-relaxed">
                  {notification.message}
                </p>
              </div>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-white p-1"
              title="Fechar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Manual Paste Collapsible Box */}
        {isManualPasteOpen && (
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                Cole o inventário com as 3 colunas (separadas por ponto-e-vírgula, vírgula ou tabulação):
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Formato: Host; Nome; Expressão
              </span>
            </div>
            <textarea
              rows={4}
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Exemplo:&#10;rj01ora_ptrhucm1_instance; Oracle: FALHA em coletar dados; nodata(/rj01ora_ptrhucm1_instance/oracle.uptime,5m)=1&#10;srv-prod-app01; Alta CPU; last(/srv-prod-app01/system.cpu.util) > 90"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded text-xs font-mono text-white focus:outline-none focus:border-rose-500 placeholder:text-slate-600"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsManualPasteOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyManualText}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded font-semibold text-xs"
              >
                Auditar Texto Colado
              </button>
            </div>
          </div>
        )}

        {/* Current File Metadata */}
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800">
          <span>Arquivo carregado: <strong className="text-white">{fileName}</strong></span>
          <span>{rawRecords.length} triggers auditadas em {hostList.length} ativos monitorados</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Health Score Card */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">Saúde do Ambiente</span>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-2xl font-bold font-mono tabular-nums ${
                auditReport.overallHealthScore >= 80
                  ? 'text-emerald-400'
                  : auditReport.overallHealthScore >= 50
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {auditReport.overallHealthScore}
            </span>
            <span className="text-xs text-slate-500 font-mono">/ 100</span>
          </div>
          <span className="text-[11px] text-slate-400 block truncate">
            {auditReport.overallHealthScore >= 80
              ? 'Ambiente Saudável'
              : auditReport.overallHealthScore >= 50
              ? 'Ajustes Necessários'
              : 'Risco Operacional'}
          </span>
        </div>

        {/* Total Triggers */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">Triggers Auditadas</span>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {auditReport.totalTriggers}
          </div>
          <span className="text-[11px] text-slate-400 block truncate">
            {auditReport.uniqueHostsCount} ativos distintos
          </span>
        </div>

        {/* Flapping Risks */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">Risco de Flapping</span>
          <div className="text-2xl font-bold font-mono text-amber-400 tabular-nums">
            {auditReport.counts.flappingRisks}
          </div>
          <span className="text-[11px] text-slate-400 block truncate">
            last() em métrica volátil
          </span>
        </div>

        {/* Hardcoded Values */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">Valores Hardcoded</span>
          <div className="text-2xl font-bold font-mono text-rose-400 tabular-nums">
            {auditReport.counts.hardcodedThresholds}
          </div>
          <span className="text-[11px] text-slate-400 block truncate">
            Sem macros de template
          </span>
        </div>

        {/* Legacy 5.0 Syntax */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">Sintaxe Legada 5.0</span>
          <div className="text-2xl font-bold font-mono text-purple-400 tabular-nums">
            {auditReport.counts.legacySyntax50}
          </div>
          <span className="text-[11px] text-slate-400 block truncate">
            Formato antigo {'{host:item}'}
          </span>
        </div>

        {/* Clean Compliant */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">Triggers Conformes</span>
          <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {auditReport.counts.cleanCompliant}
          </div>
          <span className="text-[11px] text-slate-400 block truncate">
            Boas práticas atendidas
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Pills (Functional Filter Buttons) */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded font-medium whitespace-nowrap transition-colors ${
              filterType === 'all'
                ? 'bg-rose-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Todas ({auditReport.totalTriggers})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('flapping')}
            className={`px-3 py-1.5 rounded font-medium whitespace-nowrap transition-colors ${
              filterType === 'flapping'
                ? 'bg-amber-600 text-white'
                : 'text-slate-400 hover:text-amber-300'
            }`}
          >
            Flapping ({auditReport.counts.flappingRisks})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('hardcoded')}
            className={`px-3 py-1.5 rounded font-medium whitespace-nowrap transition-colors ${
              filterType === 'hardcoded'
                ? 'bg-rose-700 text-white'
                : 'text-slate-400 hover:text-rose-300'
            }`}
          >
            Hardcoded ({auditReport.counts.hardcodedThresholds})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('legacy')}
            className={`px-3 py-1.5 rounded font-medium whitespace-nowrap transition-colors ${
              filterType === 'legacy'
                ? 'bg-purple-600 text-white'
                : 'text-slate-400 hover:text-purple-300'
            }`}
          >
            Legado 5.0 ({auditReport.counts.legacySyntax50})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('clean')}
            className={`px-3 py-1.5 rounded font-medium whitespace-nowrap transition-colors ${
              filterType === 'clean'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-emerald-300'
            }`}
          >
            Conformes ({auditReport.counts.cleanCompliant})
          </button>
        </div>

        {/* Host Filter & Search */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <select
              value={selectedHostFilter}
              onChange={(e) => setSelectedHostFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
            >
              <option value="all">Todos os Ativos ({hostList.length})</option>
              {hostList.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por host, nome ou item..."
              className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500 placeholder:text-slate-600 w-48 sm:w-64"
            />
          </div>
        </div>
      </div>

      {/* Main Audit Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-rose-400" />
              Inventário Auditado &amp; Comparativo Lado a Lado
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              Exibindo {filteredTriggers.length} de {auditReport.totalTriggers} triggers
            </span>
          </div>

          {/* Export Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => exportRefinedTriggersExcel(auditReport)}
              className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs transition-colors inline-flex items-center gap-1.5 shadow-sm"
              title="Download em planilha nativa do Excel (.xlsx) com aba de triggers e aba de indicadores"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Exportar Excel (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={() => exportRefinedTriggersCsv(auditReport)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium text-xs transition-colors inline-flex items-center gap-1.5"
              title="Download em CSV compatível com Zabbix"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium text-xs transition-colors inline-flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Relatório Executivo</span>
            </button>
          </div>
        </div>

        {filteredTriggers.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Info className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm text-slate-400 font-medium">Nenhuma trigger encontrada para os filtros selecionados.</p>
            <button
              type="button"
              onClick={() => {
                setFilterType('all');
                setSelectedHostFilter('all');
                setSearchQuery('');
              }}
              className="text-xs text-rose-400 hover:underline"
            >
              Limpar todos os filtros
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filteredTriggers.map((t) => {
              const isExpanded = expandedTriggerId === t.id;

              return (
                <div key={t.id} className="p-4 hover:bg-slate-850/40 transition-colors space-y-3">
                  {/* Row Header: Host, Trigger Name, Status */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-300 font-semibold">
                          {t.originalHost}
                        </span>
                        <span className="text-xs font-bold text-white">
                          {t.originalName}
                        </span>
                        {t.isLegacySyntax && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-950 border border-purple-800 text-purple-300 text-[10px] font-mono">
                            Zabbix 5.0 Legado
                          </span>
                        )}
                        {t.hasFlappingRisk && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300 text-[10px] font-mono">
                            Risco Flapping
                          </span>
                        )}
                        {t.hasHardcodedValues && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-300 text-[10px] font-mono">
                            Hardcoded
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                          t.auditScore >= 80
                            ? 'bg-emerald-950 border border-emerald-800 text-emerald-300'
                            : t.auditScore >= 50
                            ? 'bg-amber-950 border border-amber-800 text-amber-300'
                            : 'bg-rose-950 border border-rose-800 text-rose-300'
                        }`}
                      >
                        Score: {t.auditScore}
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandedTriggerId(isExpanded ? null : t.id)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs inline-flex items-center gap-1"
                      >
                        <span>{isExpanded ? 'Ocultar Detalhes' : 'Ver Diagnóstico'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Side-by-Side Expressions Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Original Expression */}
                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-mono text-slate-500 font-semibold">
                          Expressão Original (Upload)
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(t.originalExpression, `orig-${t.id}`)}
                          className="text-slate-400 hover:text-white inline-flex items-center gap-1 text-[11px]"
                        >
                          {copiedKey === `orig-${t.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <code className="text-rose-300 font-mono text-xs block break-all select-all">
                        {t.originalExpression}
                      </code>
                    </div>

                    {/* Refined Zabbix 6.0/7.0 Expression */}
                    <div className="p-3 bg-slate-950 rounded-lg border border-emerald-900/60 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-mono text-emerald-400 font-semibold flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Expressão Refinada (Zabbix 6.0/7.0 com Macros)
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(t.refinedExpression, `ref-${t.id}`)}
                          className="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 text-[11px]"
                        >
                          {copiedKey === `ref-${t.id}` ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Copiada!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                      </div>
                      <code className="text-emerald-300 font-mono text-xs block break-all select-all font-semibold">
                        {t.refinedExpression}
                      </code>
                    </div>
                  </div>

                  {/* Expanded Audit Card: Issues, Recovery Expression, Macros and Tags */}
                  {isExpanded && (
                    <div className="p-4 bg-slate-950/90 rounded-lg border border-slate-800 space-y-3 animate-in fade-in text-xs">
                      {/* Issues List */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-mono text-slate-400 font-semibold block">
                          Diagnóstico &amp; Boas Práticas Zabbix:
                        </span>
                        <div className="space-y-1.5">
                          {t.issues.map((issue, idx) => (
                            <div
                              key={idx}
                              className={`p-2.5 rounded border text-[11px] ${
                                issue.type === 'critical'
                                  ? 'bg-rose-950/40 border-rose-800 text-rose-200'
                                  : issue.type === 'warning'
                                  ? 'bg-amber-950/40 border-amber-800 text-amber-200'
                                  : issue.type === 'success'
                                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                                  : 'bg-slate-900 border-slate-800 text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 font-semibold">
                                <span>[{issue.category}]</span>
                                <span>{issue.message}</span>
                              </div>
                              <p className="mt-0.5 opacity-90 pl-3">
                                <strong>Ação Recomendada:</strong> {issue.recommendation}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Recovery Expression & Metadata Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                        {/* Recovery Expression */}
                        <div className="p-2.5 bg-slate-900 rounded border border-slate-800 space-y-1">
                          <span className="text-[10px] uppercase font-mono text-slate-400 block">
                            Expressão de Recuperação (Histerese):
                          </span>
                          <code className="text-cyan-300 font-mono text-[11px] block select-all">
                            {t.refinedRecoveryExpression || 'Automática (normaliza no retorno da condição)'}
                          </code>
                        </div>

                        {/* Suggested Macros */}
                        <div className="p-2.5 bg-slate-900 rounded border border-slate-800 space-y-1">
                          <span className="text-[10px] uppercase font-mono text-slate-400 block">
                            Macros de Template Recomendadas:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {t.recommendedMacros.length > 0 ? (
                              t.recommendedMacros.map((m, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded font-mono text-[11px] text-rose-300"
                                >
                                  {m.macro} = {m.value}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-500 italic text-[11px]">Nenhuma macro necessária</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Tags & Transfer Action */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 text-[11px] font-mono">Tags Zabbix:</span>
                          <div className="flex flex-wrap gap-1">
                            {t.recommendedTags.map((tg, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.2 bg-slate-900 border border-slate-800 rounded text-[10px] font-mono text-slate-300"
                              >
                                {tg.tag}:{tg.value}
                              </span>
                            ))}
                          </div>
                        </div>

                        {onNavigateToFactory && (
                          <button
                            type="button"
                            onClick={() => onNavigateToFactory(t.refinedName, t.refinedExpression)}
                            className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded font-medium text-xs inline-flex items-center gap-1 self-start sm:self-auto"
                          >
                            <span>Abrir na Fábrica de Triggers</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recommended Global Macros Panel */}
      {auditReport.recommendedTemplateMacros.length > 0 && (
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-rose-400" />
              Consolidação de Macros Globais Recomendadas para Criação nos Templates Zabbix
            </h3>
            <span className="text-xs font-mono text-slate-400">
              Elimina valores hardcoded centralizando o controle no NOC
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {auditReport.recommendedTemplateMacros.map((m, idx) => (
              <div key={idx} className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-rose-400">{m.macro}</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-900 font-mono text-[10px] text-slate-400">
                    {m.usageCount} trigger(s)
                  </span>
                </div>
                <div className="font-mono text-emerald-400 text-xs">
                  Valor padrão: <strong>{m.defaultValue}</strong>
                </div>
                <p className="text-[11px] text-slate-500">{m.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Executive Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-rose-400" />
                Relatório Executivo de Auditoria &amp; Refinamento Zabbix
              </h3>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto font-mono text-xs text-slate-300 whitespace-pre-wrap bg-slate-950 m-4 rounded-xl border border-slate-800 select-all">
              {generateExecutiveMarkdownReport(auditReport)}
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  copyToClipboard(generateExecutiveMarkdownReport(auditReport), 'report-modal');
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
              >
                {copiedKey === 'report-modal' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Relatório Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Texto do Relatório</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob(['\uFEFF' + generateExecutiveMarkdownReport(auditReport)], {
                    type: 'text/markdown;charset=utf-8',
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `relatorio_auditoria_zabbix_${new Date().toISOString().slice(0, 10)}.md`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar Relatório (Markdown)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
