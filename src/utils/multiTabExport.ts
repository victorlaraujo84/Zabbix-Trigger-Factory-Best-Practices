import * as XLSX from 'xlsx';
import { Customer, Host, Practice } from '../types';
import { ComplianceSummary } from './complianceAnalytics';

/**
 * Exports the complete monitoring environment and compliance analysis as a formatted 4-tab Excel workbook (.xlsx)
 */
export function exportComprehensiveEnvironmentExcel(
  customer: Customer,
  hosts: Host[],
  practices: Practice[],
  compliance: ComplianceSummary
): void {
  const workbook = XLSX.utils.book_new();

  // ==========================================
  // TAB 1: RESUMO EXECUTIVO & CONFORMIDADE
  // ==========================================
  const summaryRows: any[][] = [
    ['RELATÓRIO EXECUTIVO DE CONFORMIDADE E COBERTURA DE MONITORAMENTO ZABBIX'],
    ['Gerado automaticamente pela Fábrica de Triggers Zabbix 6.0 / 7.0'],
    [''],
    ['INFORMAÇÕES DO CLIENTE & AMBIENTE', ''],
    ['Cliente:', customer.customer_name],
    ['ID do Cliente:', customer.customer_id],
    ['Data da Extração:', new Date().toLocaleString('pt-BR')],
    ['Ambiente Zabbix Alvo:', 'Zabbix 6.0 LTS / 7.0 LTS Oficial'],
    [''],
    ['INDICADORES GLOBAIS DE COBERTURA', 'VALOR'],
    ['Índice Geral de Cobertura de Melhores Práticas:', `${compliance.overallCoveragePct}%`],
    ['Total de Ativos Monitorados (Hosts):', compliance.totalHosts],
    ['Total de Práticas Homologadas no Catálogo:', compliance.totalCatalogPractices],
    ['Práticas Ativas no Parque:', compliance.totalCoveredPractices],
    ['Lacunas de Cobertura Identificadas (Gaps):', compliance.totalCoverageGaps],
    ['Total de Instâncias de Triggers Geradas:', compliance.totalGeneratedTriggers],
    ['Categorias em Plena Conformidade (100%):', compliance.fullyCoveredCategoriesCount],
    ['Categorias com Lacunas de Observabilidade:', compliance.categoriesWithGapsCount],
    [''],
    ['QUADRO COMPARATIVO POR CATEGORIA DE MONITORAMENTO'],
    [
      'Categoria',
      'Código',
      'Edital / Padrão',
      'Ativos Cadastrados',
      'Práticas no Catálogo',
      'Práticas Cobertas',
      'Gaps de Cobertura',
      'Taxa de Cobertura (%)',
      'Triggers no Parque',
      'Status de Conformidade',
    ],
  ];

  compliance.categoryData.forEach((cat) => {
    let statusLabel = 'Crítico (Sem Cobertura)';
    if (cat.coveragePct === 100) statusLabel = 'Conforme (100%)';
    else if (cat.coveragePct >= 70) statusLabel = 'Adequado (Ajustes Menores)';
    else if (cat.coveragePct > 0) statusLabel = 'Parcial (Requer Atenção)';

    summaryRows.push([
      cat.categoryName,
      cat.categoryId,
      cat.editalSection,
      cat.hostCount,
      cat.recommendedCount,
      cat.coveredCount,
      cat.gapCount,
      `${cat.coveragePct}%`,
      cat.totalGeneratedTriggers,
      statusLabel,
    ]);
  });

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet['!cols'] = [
    { wch: 35 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 22 },
    { wch: 20 },
    { wch: 18 },
    { wch: 22 },
    { wch: 20 },
    { wch: 28 },
  ];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo Executivo');

  // ==========================================
  // TAB 2: TRIGGERS HOMOLOGADAS
  // ==========================================
  const triggerHeaders = [
    'Host Alvo',
    'Categoria',
    'Seção Edital',
    'Nome da Trigger',
    'Expressão do Problema (Zabbix 6.0/7.0)',
    'Modo de Recuperação',
    'Expressão de Recuperação (Histerese)',
    'Severidade',
    'Dados Operacionais',
    'Macros de Limite Utilizadas',
    'Tags Zabbix',
    'Ação Recomendada / Memorial Técnico',
  ];

  const triggerRows = compliance.allGeneratedTriggers.map((t) => [
    t.hostname,
    t.category_name,
    t.edital_section,
    t.trigger_name,
    t.expression,
    t.recovery_mode,
    t.recovery_expression || 'Automática (nodata/equal)',
    t.severity,
    t.operational_data,
    t.macros.map((m) => `${m.macro}=${m.value}`).join(' | '),
    t.tags.map((tg) => `${tg.tag}:${tg.value}`).join(' | '),
    t.recommended_action,
  ]);

  const triggersSheet = XLSX.utils.aoa_to_sheet([triggerHeaders, ...triggerRows]);
  triggersSheet['!cols'] = [
    { wch: 25 },
    { wch: 25 },
    { wch: 15 },
    { wch: 45 },
    { wch: 55 },
    { wch: 20 },
    { wch: 45 },
    { wch: 18 },
    { wch: 25 },
    { wch: 35 },
    { wch: 35 },
    { wch: 50 },
  ];
  XLSX.utils.book_append_sheet(workbook, triggersSheet, 'Triggers Homologadas');

  // ==========================================
  // TAB 3: INVENTÁRIO DE HOSTS
  // ==========================================
  const hostHeaders = [
    'ID do Host',
    'Hostname',
    'Nome de Exibição',
    'Tipo / Categoria',
    'Endereço IP / DNS',
    'Criticidade',
    'Modelo de Monitoramento',
    'Triggers Ativas Vinculadas',
    'Total de Recomendações da Categoria',
    'Cobertura do Ativo (%)',
    'Observações do Ativo',
  ];

  const hostRows = hosts.map((h) => {
    const catData = compliance.categoryData.find((c) => c.categoryId === h.host_type);
    const hostTriggers = compliance.allGeneratedTriggers.filter((t) => t.host_id === h.host_id);
    const recCount = catData?.recommendedCount || 0;
    const covPct = recCount > 0 ? Math.min(100, Math.round((hostTriggers.length / recCount) * 100)) : 100;

    return [
      h.host_id,
      h.hostname,
      h.display_name,
      catData?.categoryName || h.host_type,
      h.ip,
      h.criticality.toUpperCase(),
      h.monitoring_model || 'Agent Zabbix',
      hostTriggers.length,
      recCount,
      `${covPct}%`,
      h.notes || 'Sem observações adicionais',
    ];
  });

  const hostsSheet = XLSX.utils.aoa_to_sheet([hostHeaders, ...hostRows]);
  hostsSheet['!cols'] = [
    { wch: 20 },
    { wch: 28 },
    { wch: 28 },
    { wch: 30 },
    { wch: 20 },
    { wch: 18 },
    { wch: 25 },
    { wch: 24 },
    { wch: 30 },
    { wch: 22 },
    { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(workbook, hostsSheet, 'Inventário de Hosts');

  // ==========================================
  // TAB 4: AUDITORIA & GAPS DE COBERTURA
  // ==========================================
  const gapHeaders = [
    'Categoria Afetada',
    'Seção do Edital',
    'ID da Prática Recomendada',
    'Título da Lacuna (Gap de Monitoramento)',
    'Chave do Item Zabbix (Item Key)',
    'Tipo de Coletor Padrão',
    'Função Recomendada',
    'Limiar Padrão',
    'Severidade Recomendada',
    'Risco Operacional da Falta de Monitoramento',
    'Procedimento e Ação Recomendada',
  ];

  const gapRows: any[][] = [];
  compliance.categoryData.forEach((cat) => {
    cat.missingPractices.forEach((p) => {
      gapRows.push([
        cat.categoryName,
        cat.editalSection,
        p.id,
        p.title,
        p.item_key,
        p.item_type,
        p.function,
        `${p.operator} ${p.default_threshold_value}`,
        customer.business_rules.severity_policy[p.severity_param] || 'Average',
        p.rationale,
        p.recommended_action,
      ]);
    });
  });

  if (gapRows.length === 0) {
    gapRows.push([
      'Parabéns!',
      '-',
      '-',
      'Nenhuma lacuna de monitoramento identificada. Todos os hosts cobrem 100% das melhores práticas do catálogo!',
      '-',
      '-',
      '-',
      '-',
      '-',
      'Ambiente em plena observabilidade.',
      'Manter auditorias periódicas.',
    ]);
  }

  const gapsSheet = XLSX.utils.aoa_to_sheet([gapHeaders, ...gapRows]);
  gapsSheet['!cols'] = [
    { wch: 28 },
    { wch: 16 },
    { wch: 22 },
    { wch: 40 },
    { wch: 35 },
    { wch: 20 },
    { wch: 18 },
    { wch: 20 },
    { wch: 22 },
    { wch: 50 },
    { wch: 50 },
  ];
  XLSX.utils.book_append_sheet(workbook, gapsSheet, 'Auditoria de Gaps');

  // Generate and download file
  const safeCustomerName = customer.customer_name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `Conformidade_Monitoramento_${safeCustomerName}_${dateStr}.xlsx`);
}
