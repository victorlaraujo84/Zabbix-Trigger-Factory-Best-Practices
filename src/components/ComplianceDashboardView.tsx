import React, { useState, useMemo } from 'react';
import { Customer, Host, Practice } from '../types';
import { calculateComplianceAnalytics } from '../utils/complianceAnalytics';
import { exportComprehensiveEnvironmentExcel } from '../utils/multiTabExport';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import {
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Filter,
  Layers,
  ChevronRight,
  Info,
  Server,
  BarChart3,
  Radar as RadarIcon,
} from 'lucide-react';

interface ComplianceDashboardViewProps {
  customer: Customer;
  hosts: Host[];
  practices: Practice[];
  onNavigateToFactoryWithPractice?: (practiceId: string, hostId?: string) => void;
  onNavigateToFactory?: () => void;
}

export const ComplianceDashboardView: React.FC<ComplianceDashboardViewProps> = ({
  customer,
  hosts,
  practices,
  onNavigateToFactoryWithPractice,
  onNavigateToFactory,
}) => {
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Compute compliance metrics
  const compliance = useMemo(() => {
    return calculateComplianceAnalytics(customer, hosts, practices);
  }, [customer, hosts, practices]);

  // Filtered categories for gaps table
  const displayedCategories = useMemo(() => {
    if (selectedCategoryFilter === 'all') {
      return compliance.categoryData.filter((c) => c.gapCount > 0);
    }
    return compliance.categoryData.filter((c) => c.categoryId === selectedCategoryFilter);
  }, [compliance, selectedCategoryFilter]);

  // Handle formatted 4-tab Excel export
  const handleExportExcel = () => {
    exportComprehensiveEnvironmentExcel(customer, hosts, practices, compliance);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  // Custom Dark Mode Tooltip for BarChart
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const ativas = payload[0]?.value || 0;
      const recomendadas = payload[1]?.value || 0;
      const pct = recomendadas > 0 ? Math.round((ativas / recomendadas) * 100) : 100;

      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 font-sans z-50">
          <p className="font-bold text-white border-b border-slate-800 pb-1">{label}</p>
          <div className="flex items-center justify-between gap-4 text-rose-400">
            <span>Triggers Ativas no Parque:</span>
            <strong className="font-mono">{ativas}</strong>
          </div>
          <div className="flex items-center justify-between gap-4 text-blue-400">
            <span>Recomendações do Catálogo:</span>
            <strong className="font-mono">{recomendadas}</strong>
          </div>
          <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800 text-slate-300">
            <span>Aderência à Prática Oficial:</span>
            <strong
              className={`font-mono ${
                pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-rose-400'
              }`}
            >
              {pct}%
            </strong>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner Card */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/60 font-mono">
                Observabilidade &amp; Qualidade
              </span>
              <span className="text-xs font-mono text-slate-400">
                Auditoria de Cobertura contra o Catálogo Oficial
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-rose-500" />
              Painel de Conformidade de Triggers
            </h1>
            <p className="text-xs text-slate-400 max-w-3xl">
              Compare as triggers ativas no parque com as <strong>melhores práticas oficiais do Zabbix</strong> em todas as categorias. Identifique lacunas críticas de monitoramento (*coverage gaps*) e exporte o inventário consolidado em formato <strong>XLSX com 4 abas estruturadas</strong>.
            </p>
          </div>

          {/* Export Action Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportExcel}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white rounded-lg font-semibold text-xs transition-all cursor-pointer inline-flex items-center gap-2 shadow-md hover:shadow-lg"
              title="Download em planilha nativa do Excel (.xlsx) contendo 4 abas completas"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{downloadSuccess ? 'Planilha Gerada!' : 'Exportar Inventário & Conformidade (XLSX 4 Abas)'}</span>
            </button>
          </div>
        </div>

        {/* Client Metadata Strip */}
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800">
          <span>Cliente selecionado: <strong className="text-white">{customer.customer_name}</strong></span>
          <span>{hosts.length} ativos monitorados · {practices.length} práticas no catálogo</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Overall Coverage Pct */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">Cobertura Geral</span>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-2xl sm:text-3xl font-bold font-mono tabular-nums ${
                compliance.overallCoveragePct >= 80
                  ? 'text-emerald-400'
                  : compliance.overallCoveragePct >= 50
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {compliance.overallCoveragePct}%
            </span>
          </div>
          <span className="text-[11px] text-slate-400 block truncate">
            {compliance.totalCoveredPractices} de {compliance.totalCatalogPractices} práticas ativas
          </span>
        </div>

        {/* Total Generated Triggers */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">Triggers no Parque</span>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white tabular-nums">
            {compliance.totalGeneratedTriggers}
          </div>
          <span className="text-[11px] text-slate-400 block truncate">
            Instâncias ativas nos {compliance.totalHosts} hosts
          </span>
        </div>

        {/* Coverage Gaps */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">Lacunas de Cobertura (Gaps)</span>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-rose-400 tabular-nums">
            {compliance.totalCoverageGaps}
          </div>
          <span className="text-[11px] text-slate-400 block truncate">
            Métricas recomendadas sem monitoramento
          </span>
        </div>

        {/* Fully Covered Categories */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">Categorias 100% Conformes</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 tabular-nums">
              {compliance.fullyCoveredCategoriesCount}
            </span>
            <span className="text-xs text-slate-500 font-mono">/ {compliance.categoryData.length}</span>
          </div>
          <span className="text-[11px] text-slate-400 block truncate">
            {compliance.categoriesWithGapsCount} categorias requerem atenção
          </span>
        </div>
      </div>

      {/* Recharts Analytics Section: Bar Chart & Radar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Bar Chart Comparison (8 cols) */}
        <div className="lg:col-span-8 p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-rose-400" />
                Triggers Ativas vs. Recomendações Homologadas por Categoria
              </h2>
              <span className="text-[11px] font-mono text-slate-400">
                Visualização de Disparidade e Aderência
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Barras duplas comparam o total de práticas catalogadas com a quantidade atualmente ativa para os hosts cadastrados.
            </p>
          </div>

          <div className="w-full h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={compliance.categoryData}
                margin={{ top: 10, right: 10, left: -20, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="shortTitle"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomBarTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
                />
                <Bar
                  dataKey="coveredCount"
                  name="Práticas Cobertas no Parque"
                  fill="#f43f5e"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="recommendedCount"
                  name="Total Recomendado no Catálogo"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Radar Chart Balance (4 cols) */}
        <div className="lg:col-span-4 p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <RadarIcon className="w-4 h-4 text-cyan-400" />
                Radar de Equilíbrio de Cobertura
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Avalia a simetria da observabilidade entre as diferentes camadas tecnológicas.
            </p>
          </div>

          <div className="w-full h-72 sm:h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart
                cx="50%"
                cy="50%"
                outerRadius="70%"
                data={compliance.radarData.slice(0, 8)}
              >
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={10} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" fontSize={9} />
                <Radar
                  name="% Cobertura"
                  dataKey="coberturaPct"
                  stroke="#06b6d4"
                  fill="#06b6d4"
                  fillOpacity={0.4}
                />
                <Tooltip
                  formatter={(value: any) => [`${value}% de Cobertura`, 'Conformidade']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Coverage Gaps Action Table Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Lacunas de Cobertura Identificadas (Coverage Gaps)
            </h2>
            <p className="text-xs text-slate-400">
              Práticas homologadas essenciais que ainda não possuem monitoramento configurado no ambiente.
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Filtrar Categoria:</span>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
            >
              <option value="all">Apenas Categorias com Gaps ({compliance.categoriesWithGapsCount})</option>
              {compliance.categoryData.map((c) => (
                <option key={c.categoryId} value={c.categoryId}>
                  {c.categoryName} ({c.gapCount} gap{c.gapCount === 1 ? '' : 's'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category-by-Category Gaps Table */}
        <div className="space-y-4">
          {displayedCategories.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-sm text-slate-300 font-medium">
                Nenhum gap identificado para o filtro selecionado. Todas as melhores práticas estão cobertas!
              </p>
            </div>
          ) : (
            displayedCategories.map((cat) => (
              <div
                key={cat.categoryId}
                className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl space-y-3"
              >
                {/* Category Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-white font-mono bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                      {cat.shortTitle}
                    </span>
                    <span className="text-xs text-slate-300 font-medium">
                      {cat.categoryName}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      (Edital: {cat.editalSection})
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-slate-400">
                      Cobertura: <strong className={cat.coveragePct === 100 ? 'text-emerald-400' : 'text-amber-400'}>{cat.coveragePct}%</strong>
                    </span>
                    <span className="text-rose-400 font-semibold">
                      {cat.gapCount} prática{cat.gapCount === 1 ? '' : 's'} ausente{cat.gapCount === 1 ? '' : 's'}
                    </span>
                    {onNavigateToFactory && cat.hostCount > 0 && (
                      <button
                        onClick={onNavigateToFactory}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-sans inline-flex items-center gap-1 font-semibold transition-colors"
                      >
                        <span>Abrir na Fábrica</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Missing Practices List */}
                {cat.missingPractices.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {cat.missingPractices.map((practice) => {
                      const hostForCategory = hosts.find((h) => h.host_type === cat.categoryId);

                      return (
                        <div
                          key={practice.id}
                          className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg space-y-2 flex flex-col justify-between"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-rose-300">
                                {practice.title}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-[10px] text-slate-400">
                                {practice.item_type}
                              </span>
                            </div>
                            <code className="text-cyan-300 font-mono text-[11px] block truncate">
                              {practice.item_key}
                            </code>
                            <p className="text-[11px] text-slate-400 line-clamp-2">
                              {practice.rationale}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono text-slate-500">
                              Limiar padrão: {practice.operator} {practice.default_threshold_value}
                            </span>
                            {onNavigateToFactoryWithPractice && (
                              <button
                                onClick={() =>
                                  onNavigateToFactoryWithPractice(
                                    practice.id,
                                    hostForCategory?.host_id
                                  )
                                }
                                className="px-2.5 py-1 bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-300 rounded font-medium text-[11px] inline-flex items-center gap-1 transition-colors"
                              >
                                <span>Suprir Lacuna</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-emerald-400 italic">
                    Todos os itens homologados para esta tecnologia estão cobertos com triggers ativas!
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
