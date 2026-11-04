import { RawTriggerRecord } from './triggerInventoryParser';
import { ZabbixSeverity } from '../types';
import * as XLSX from 'xlsx';

export interface AuditedTriggerItem {
  id: string;
  sourceRowNumber?: number;
  originalHost: string;
  originalName: string;
  originalExpression: string;

  // Analysis flags
  isLegacySyntax: boolean;
  hasFlappingRisk: boolean;
  hasHardcodedValues: boolean;
  hasNoHysteresis: boolean;
  isValidSyntax: boolean;

  // Specific issues
  issues: Array<{
    type: 'critical' | 'warning' | 'info' | 'success';
    category: 'Sintaxe' | 'Flapping' | 'Macros / Hardcoded' | 'Histerese' | 'Nomenclatura' | 'Host Mismatch';
    message: string;
    recommendation: string;
  }>;

  // Refined output
  refinedHost: string;
  refinedName: string;
  refinedExpression: string;
  refinedRecoveryExpression?: string;
  recommendedSeverity: ZabbixSeverity;
  recommendedMacros: Array<{ macro: string; value: string; description: string }>;
  recommendedTags: Array<{ tag: string; value: string }>;
  operationalData: string;
  auditScore: number; // 0 - 100
}

export interface EnvironmentAuditReport {
  timestamp: string;
  totalTriggers: number;
  uniqueHostsCount: number;
  overallHealthScore: number; // 0 - 100

  counts: {
    criticalRisks: number;
    flappingRisks: number;
    hardcodedThresholds: number;
    legacySyntax50: number;
    missingHysteresis: number;
    cleanCompliant: number;
  };

  topProblematicHosts: Array<{ host: string; issuesCount: number; triggerCount: number }>;
  recommendedTemplateMacros: Array<{ macro: string; defaultValue: string; usageCount: number; description: string }>;
  triggers: AuditedTriggerItem[];
}

/**
 * Audits a single trigger from the 3-column inventory
 */
export function auditSingleTrigger(record: RawTriggerRecord): AuditedTriggerItem {
  const host = record.host.trim();
  const name = record.name.trim();
  const expr = record.expression.trim();

  const issues: AuditedTriggerItem['issues'] = [];
  const recommendedMacros: AuditedTriggerItem['recommendedMacros'] = [];
  const recommendedTags: AuditedTriggerItem['recommendedTags'] = [];

  let isLegacySyntax = false;
  let hasFlappingRisk = false;
  let hasHardcodedValues = false;
  let hasNoHysteresis = false;
  let isValidSyntax = true;
  let auditScore = 100;

  // 1. Check for legacy 5.0 syntax: {host:key.func(param)}
  const legacyRegex = /\{([^:]+):([^\.]+)\.([a-zA-Z_]+)\(([^\)]*)\)\}\s*([=!><]+)\s*(.+)/;
  const legacyMatch = expr.match(legacyRegex);

  let parsedHost = host;
  let parsedItemKey = '';
  let parsedFunction = '';
  let parsedParam = '';
  let parsedOperator = '';
  let parsedThreshold = '';

  if (legacyMatch) {
    isLegacySyntax = true;
    isValidSyntax = false;
    auditScore -= 30;

    parsedHost = legacyMatch[1].trim();
    parsedItemKey = legacyMatch[2].trim();
    parsedFunction = legacyMatch[3].trim().toLowerCase();
    parsedParam = legacyMatch[4].trim();
    parsedOperator = legacyMatch[5].trim();
    parsedThreshold = legacyMatch[6].trim();

    issues.push({
      type: 'critical',
      category: 'Sintaxe',
      message: 'Sintaxe legada do Zabbix 5.0 detectada ({host:item.func()}).',
      recommendation: `Converter para notação moderna Zabbix 6.0/7.0: ${parsedFunction}(/${parsedHost}/${parsedItemKey}${parsedParam ? `,${parsedParam}` : ''})${parsedOperator}${parsedThreshold}`,
    });
  } else {
    // Modern 6.0/7.0 syntax pattern: func(/host/key, params) op val
    const modernPattern = /^([a-zA-Z_]+)\(\/([^\/]+)\/([^,\)]+)(?:,([^\)]*))?\)\s*([=!><]+)\s*(.+)$/;
    const modernMatch = expr.match(modernPattern);

    if (modernMatch) {
      parsedFunction = modernMatch[1].trim().toLowerCase();
      parsedHost = modernMatch[2].trim();
      parsedItemKey = modernMatch[3].trim();
      parsedParam = (modernMatch[4] || '').trim();
      parsedOperator = modernMatch[5].trim();
      parsedThreshold = modernMatch[6].trim();
    } else {
      // Compound expression or special function
      if (expr.includes('(') && expr.includes(')')) {
        isValidSyntax = true;
      } else {
        isValidSyntax = false;
        auditScore -= 40;
        issues.push({
          type: 'critical',
          category: 'Sintaxe',
          message: 'Expressão com formato sintático inválido ou incompleto.',
          recommendation: 'Assegure o padrão: funcao(/host/item.key, parametro) operador limiar',
        });
      }
    }
  }

  // 2. Validate Host Consistency between Column 1 and inside Expression
  if (parsedHost && host && parsedHost !== host && !parsedHost.startsWith('{')) {
    auditScore -= 10;
    issues.push({
      type: 'warning',
      category: 'Host Mismatch',
      message: `O ativo na coluna Host ('${host}') difere do host referenciado na expressão ('${parsedHost}').`,
      recommendation: `Alinhe para que a expressão aponte explicitamente para o host correto: /${host}/...`,
    });
  }

  const effectiveHost = host || parsedHost || 'host';

  // 3. Flapping Risk & Missing Hysteresis Analysis
  const volatileMetricKeywords = ['cpu', 'util', 'load', 'traffic', 'in.errors', 'out.errors', 'packets', 'sessions', 'connections', 'memory', 'mem'];
  const isVolatileMetric = volatileMetricKeywords.some((k) =>
    (parsedItemKey + ' ' + name).toLowerCase().includes(k)
  );

  if (isVolatileMetric && (parsedFunction === 'last' || parsedFunction === 'change')) {
    hasFlappingRisk = true;
    auditScore -= 20;
    issues.push({
      type: 'warning',
      category: 'Flapping',
      message: `Uso da função '${parsedFunction}()' em métrica de alta volatilidade ('${parsedItemKey || name}').`,
      recommendation: 'Substitua por min(..., 5m) ou avg(..., 5m) para exigir persistência temporal e evitar excesso de alertas intermitentes (alert fatigue).',
    });
  }

  // Missing Hysteresis Gap
  if (['>', '>=', '<', '<='].includes(parsedOperator) && !parsedFunction.includes('nodata')) {
    hasNoHysteresis = true;
    auditScore -= 10;
    issues.push({
      type: 'info',
      category: 'Histerese',
      message: 'Trigger de limiar numérico sem expressão de recuperação declarada.',
      recommendation: 'Recomenda-se configurar expressão de recuperação com margem de segurança (histerese) para evitar disparos contínuos no limiar de oscilação.',
    });
  }

  // 4. Hardcoded Values & Macro Extraction
  if (parsedThreshold && !parsedThreshold.startsWith('{$')) {
    hasHardcodedValues = true;
    auditScore -= 15;
    let macroName = '{$THRESHOLD.WARN}';

    if (parsedItemKey.includes('cpu')) macroName = '{$CPU.UTIL.CRIT}';
    else if (parsedItemKey.includes('memory') || parsedItemKey.includes('mem')) macroName = '{$MEM.UTIL.CRIT}';
    else if (parsedItemKey.includes('vfs.fs') || parsedItemKey.includes('disk')) macroName = '{$VFS.FS.PUSED.MAX}';
    else if (parsedItemKey.includes('net.if') || parsedItemKey.includes('traffic')) macroName = '{$IF.UTIL.MAX}';
    else if (parsedItemKey.includes('session') || parsedItemKey.includes('rate')) macroName = '{$SESSIONS.MAX.WARN}';
    else if (parsedItemKey.includes('container') || parsedItemKey.includes('docker')) macroName = '{$DOCKER.STOPPED.MAX}';
    else if (parsedItemKey.includes('error') || parsedItemKey.includes('crc')) macroName = '{$IF.ERRORS.WARN}';

    issues.push({
      type: 'warning',
      category: 'Macros / Hardcoded',
      message: `Valor fixo hardcoded '${parsedThreshold}' encontrado no limiar de disparo.`,
      recommendation: `Parametrize através da macro de template ${macroName} (valor default: ${parsedThreshold}).`,
    });

    recommendedMacros.push({
      macro: macroName,
      value: parsedThreshold,
      description: `Limiar de disparo para ${parsedItemKey || name}`,
    });
  }

  // Check nodata hardcoded time
  if (parsedFunction === 'nodata' && parsedParam && !parsedParam.startsWith('{$')) {
    hasHardcodedValues = true;
    auditScore -= 10;
    const isOracle = (parsedItemKey + ' ' + name).toLowerCase().includes('oracle');
    const nodataMacro = isOracle ? '{$ORACLE.NODATA.WARN}' : '{$NODATA.TIMEOUT}';

    issues.push({
      type: 'warning',
      category: 'Macros / Hardcoded',
      message: `Janela de tempo '${parsedParam}' na função nodata() fixada sem macro.`,
      recommendation: `Substitua por ${nodataMacro} (ex: ${parsedParam}) permitindo ajuste centralizado pelo NOC.`,
    });

    recommendedMacros.push({
      macro: nodataMacro,
      value: parsedParam,
      description: `Tempo de tolerância para ausência de coleta em ${effectiveHost}`,
    });
  }

  // 5. Build Refined Zabbix 6.0/7.0 Outputs
  let refinedFunction = parsedFunction || 'last';
  let refinedParam = parsedParam;
  let refinedOperator = parsedOperator || '>';
  let refinedThreshold = parsedThreshold || '0';
  let refinedRecoveryExpression: string | undefined = undefined;

  // Smoothing for flapping metrics
  if (hasFlappingRisk) {
    refinedFunction = 'min';
    refinedParam = '5m';
  }

  // Macro replacement for threshold
  if (recommendedMacros.length > 0) {
    const mainMacro = recommendedMacros[0];
    if (parsedFunction !== 'nodata') {
      refinedThreshold = mainMacro.macro;
    } else {
      refinedParam = mainMacro.macro;
    }
  }

  // Refined Expression
  let refinedExpression = expr;
  if (parsedItemKey) {
    refinedExpression = `${refinedFunction}(/${effectiveHost}/${parsedItemKey}${refinedParam ? `,${refinedParam}` : ''})${refinedOperator}${refinedThreshold}`;
  } else if (isLegacySyntax && legacyMatch) {
    refinedExpression = `${refinedFunction}(/${effectiveHost}/${parsedItemKey}${refinedParam ? `,${refinedParam}` : ''})${refinedOperator}${refinedThreshold}`;
  }

  // Generate Hysteresis Recovery Expression if applicable
  if (['>', '>='].includes(refinedOperator) && parsedItemKey && !parsedFunction.includes('nodata')) {
    const recoveryFunc = 'max';
    const numThreshold = parseFloat(parsedThreshold);
    let recoveryThreshold = `${refinedThreshold} - 5`;
    if (!isNaN(numThreshold) && numThreshold > 10) {
      recoveryThreshold = `${numThreshold - 10}`;
    }
    refinedRecoveryExpression = `${recoveryFunc}(/${effectiveHost}/${parsedItemKey},5m) < ${recoveryThreshold}`;
  }

  // Refined Name (Standardizing [Service]: [Symptom])
  let refinedName = name;
  const lowerName = name.toLowerCase();
  if (lowerName.includes('oracle') && !name.startsWith('Oracle:')) {
    refinedName = `Oracle: ${name.replace(/^oracle[:\s-]*/i, '')}`;
  } else if (lowerName.includes('linux') && !name.startsWith('Linux:')) {
    refinedName = `Linux: ${name.replace(/^linux[:\s-]*/i, '')}`;
  } else if (lowerName.includes('cisco') && !name.startsWith('Cisco:')) {
    refinedName = `Cisco: ${name.replace(/^cisco[:\s-]*/i, '')}`;
  } else if (lowerName.includes('fortigate') && !name.startsWith('FortiGate:')) {
    refinedName = `FortiGate: ${name.replace(/^fortigate[:\s-]*/i, '')}`;
  }

  // Severity recommendation
  let recommendedSeverity: ZabbixSeverity = 'Average';
  if (lowerName.includes('crítico') || lowerName.includes('falha') || lowerName.includes('indisponível') || lowerName.includes('down')) {
    recommendedSeverity = 'High';
  } else if (lowerName.includes('desastre') || lowerName.includes('parada total')) {
    recommendedSeverity = 'Disaster';
  } else if (lowerName.includes('aviso') || lowerName.includes('warning') || lowerName.includes('alerta')) {
    recommendedSeverity = 'Warning';
  }

  // Recommended Tags
  if (lowerName.includes('oracle') || parsedItemKey.includes('oracle')) {
    recommendedTags.push({ tag: 'scope', value: 'availability' }, { tag: 'target', value: 'oracle' }, { tag: 'class', value: 'database' });
  } else if (lowerName.includes('cpu') || parsedItemKey.includes('cpu')) {
    recommendedTags.push({ tag: 'scope', value: 'performance' }, { tag: 'class', value: 'os' });
  } else if (lowerName.includes('vfs.fs') || lowerName.includes('disk') || lowerName.includes('disco')) {
    recommendedTags.push({ tag: 'scope', value: 'capacity' }, { tag: 'class', value: 'storage' });
  } else if (lowerName.includes('net.if') || lowerName.includes('traffic') || lowerName.includes('crc')) {
    recommendedTags.push({ tag: 'scope', value: 'network' }, { tag: 'class', value: 'interface' });
  } else {
    recommendedTags.push({ tag: 'scope', value: 'availability' }, { tag: 'class', value: 'system' });
  }

  if (issues.length === 0) {
    issues.push({
      type: 'success',
      category: 'Sintaxe',
      message: 'Trigger conforme com as boas práticas e padrões oficiais Zabbix 6.0/7.0.',
      recommendation: 'Nenhuma correção imediata necessária.',
    });
  }

  auditScore = Math.max(10, Math.min(100, auditScore));

  return {
    id: record.id,
    sourceRowNumber: record.sourceRowNumber,
    originalHost: host,
    originalName: name,
    originalExpression: expr,

    isLegacySyntax,
    hasFlappingRisk,
    hasHardcodedValues,
    hasNoHysteresis,
    isValidSyntax,

    issues,
    refinedHost: effectiveHost,
    refinedName,
    refinedExpression,
    refinedRecoveryExpression,
    recommendedSeverity,
    recommendedMacros,
    recommendedTags,
    operationalData: parsedFunction === 'nodata' ? 'Último valor: {ITEM.LASTVALUE1}' : 'Valor atual: {ITEM.LASTVALUE1}',
    auditScore,
  };
}

/**
 * Runs the comprehensive environment audit over all inventory triggers
 */
export function auditTriggerEnvironment(records: RawTriggerRecord[]): EnvironmentAuditReport {
  const auditedTriggers = records.map(auditSingleTrigger);

  const uniqueHosts = Array.from(new Set(records.map((r) => r.host.trim()).filter(Boolean)));

  let criticalRisks = 0;
  let flappingRisks = 0;
  let hardcodedThresholds = 0;
  let legacySyntax50 = 0;
  let missingHysteresis = 0;
  let cleanCompliant = 0;

  const hostIssueMap: Record<string, { issuesCount: number; triggerCount: number }> = {};

  const macroMap: Record<string, { count: number; defaultValue: string; description: string }> = {};

  auditedTriggers.forEach((t) => {
    if (!hostIssueMap[t.originalHost]) {
      hostIssueMap[t.originalHost] = { issuesCount: 0, triggerCount: 0 };
    }
    hostIssueMap[t.originalHost].triggerCount++;

    const realIssues = t.issues.filter((i) => i.type !== 'success');
    if (realIssues.length === 0) {
      cleanCompliant++;
    } else {
      hostIssueMap[t.originalHost].issuesCount += realIssues.length;
    }

    if (t.isLegacySyntax) legacySyntax50++;
    if (t.hasFlappingRisk) flappingRisks++;
    if (t.hasHardcodedValues) hardcodedThresholds++;
    if (t.hasNoHysteresis) missingHysteresis++;
    if (!t.isValidSyntax || t.isLegacySyntax) criticalRisks++;

    t.recommendedMacros.forEach((m) => {
      if (!macroMap[m.macro]) {
        macroMap[m.macro] = { count: 0, defaultValue: m.value, description: m.description };
      }
      macroMap[m.macro].count++;
    });
  });

  const avgScore =
    auditedTriggers.length > 0
      ? Math.round(auditedTriggers.reduce((acc, t) => acc + t.auditScore, 0) / auditedTriggers.length)
      : 100;

  const topProblematicHosts = Object.entries(hostIssueMap)
    .map(([host, data]) => ({ host, issuesCount: data.issuesCount, triggerCount: data.triggerCount }))
    .sort((a, b) => b.issuesCount - a.issuesCount)
    .slice(0, 5);

  const recommendedTemplateMacros = Object.entries(macroMap)
    .map(([macro, data]) => ({
      macro,
      defaultValue: data.defaultValue,
      usageCount: data.count,
      description: data.description,
    }))
    .sort((a, b) => b.usageCount - a.usageCount);

  return {
    timestamp: new Date().toISOString(),
    totalTriggers: records.length,
    uniqueHostsCount: uniqueHosts.length,
    overallHealthScore: avgScore,
    counts: {
      criticalRisks,
      flappingRisks,
      hardcodedThresholds,
      legacySyntax50,
      missingHysteresis,
      cleanCompliant,
    },
    topProblematicHosts,
    recommendedTemplateMacros,
    triggers: auditedTriggers,
  };
}

/**
 * Exports Refined Triggers in CSV format (UTF-8 with BOM)
 */
export function exportRefinedTriggersCsv(report: EnvironmentAuditReport): void {
  const headers = [
    'Host',
    'Nome Original',
    'Expressão Original',
    'Nome Refinado Zabbix',
    'Expressão Refinada Zabbix 6.0/7.0',
    'Expressão de Recuperação (Histerese)',
    'Severidade Recomendada',
    'Macros Sugeridas',
    'Tags Zabbix',
    'Status de Conformidade',
    'Score de Auditoria',
  ];

  const rows = report.triggers.map((t) => [
    t.refinedHost,
    t.originalName,
    t.originalExpression,
    t.refinedName,
    t.refinedExpression,
    t.refinedRecoveryExpression || 'Automática (nodata/equal)',
    t.recommendedSeverity,
    t.recommendedMacros.map((m) => `${m.macro}=${m.value}`).join(' | '),
    t.recommendedTags.map((tg) => `${tg.tag}:${tg.value}`).join(' | '),
    t.issues.some((i) => i.type === 'critical' || i.type === 'warning') ? 'Ajustes Recomendados' : 'Conforme',
    String(t.auditScore),
  ]);

  const csvContent = [headers, ...rows]
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    .join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `inventario_triggers_refinado_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports Refined Triggers in native Excel format (.xlsx)
 */
export function exportRefinedTriggersExcel(report: EnvironmentAuditReport): void {
  const headers = [
    'Host',
    'Nome Original',
    'Expressão Original',
    'Nome Refinado Zabbix',
    'Expressão Refinada Zabbix 6.0/7.0',
    'Expressão de Recuperação (Histerese)',
    'Severidade Recomendada',
    'Macros Sugeridas',
    'Tags Zabbix',
    'Status de Conformidade',
    'Score de Auditoria',
  ];

  const rows = report.triggers.map((t) => [
    t.refinedHost,
    t.originalName,
    t.originalExpression,
    t.refinedName,
    t.refinedExpression,
    t.refinedRecoveryExpression || 'Automática (nodata/equal)',
    t.recommendedSeverity,
    t.recommendedMacros.map((m) => `${m.macro}=${m.value}`).join(' | '),
    t.recommendedTags.map((tg) => `${tg.tag}:${tg.value}`).join(' | '),
    t.issues.some((i) => i.type === 'critical' || i.type === 'warning') ? 'Ajustes Recomendados' : 'Conforme',
    t.auditScore,
  ]);

  const worksheetData = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 25 }, // Host
    { wch: 35 }, // Nome Original
    { wch: 45 }, // Expressão Original
    { wch: 35 }, // Nome Refinado
    { wch: 45 }, // Expressão Refinada
    { wch: 35 }, // Recuperação
    { wch: 22 }, // Severidade
    { wch: 30 }, // Macros
    { wch: 30 }, // Tags
    { wch: 22 }, // Status
    { wch: 15 }, // Score
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Triggers Refinadas');

  // Summary sheet with environment stats
  const summaryData = [
    ['Indicador de Auditoria Zabbix', 'Valor'],
    ['Data da Auditoria', new Date().toLocaleString('pt-BR')],
    ['Total de Triggers Analisadas', report.totalTriggers],
    ['Ativos Monitorados Únicos', report.uniqueHostsCount],
    ['Índice Geral de Saúde do Monitoramento', `${report.overallHealthScore} / 100`],
    ['Triggers com Risco de Flapping', report.counts.flappingRisks],
    ['Triggers com Valores Hardcoded (sem macros)', report.counts.hardcodedThresholds],
    ['Triggers com Sintaxe Legada Zabbix 5.0', report.counts.legacySyntax50],
    ['Triggers sem Histerese', report.counts.missingHysteresis],
    ['Triggers em Plena Conformidade', report.counts.cleanCompliant],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 40 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo do Ambiente');

  XLSX.writeFile(workbook, `inventario_triggers_refinado_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Generates an Executive Markdown Report for Technical Management & NOC
 */
export function generateExecutiveMarkdownReport(report: EnvironmentAuditReport): string {
  return `# Relatório Executivo de Auditoria & Refinamento de Triggers Zabbix
**Data da Auditoria:** ${new Date().toLocaleString('pt-BR')}  
**Ativos Auditados:** ${report.uniqueHostsCount} hosts | **Total de Triggers:** ${report.totalTriggers}  
**Índice Geral de Saúde do Monitoramento:** **${report.overallHealthScore} / 100**

---

## 1. Resumo Executivo das Não-Conformidades
* **Triggers com Risco de Flapping (Alert Fatigue):** ${report.counts.flappingRisks}
* **Triggers com Valores Hardcoded (Sem Macros):** ${report.counts.hardcodedThresholds}
* **Triggers com Sintaxe Legada Zabbix 5.0:** ${report.counts.legacySyntax50}
* **Triggers sem Margem de Histerese:** ${report.counts.missingHysteresis}
* **Triggers em Plena Conformidade:** ${report.counts.cleanCompliant} (${Math.round((report.counts.cleanCompliant / Math.max(1, report.totalTriggers)) * 100)}%)

---

## 2. Macros Globais Recomendadas para Criação em Templates
${report.recommendedTemplateMacros.length > 0 ? report.recommendedTemplateMacros.map((m) => `- \`${m.macro}\` (Valor Padrão: \`${m.defaultValue}\`) - Aplicada em ${m.usageCount} trigger(s): ${m.description}`).join('\n') : 'Nenhuma macro adicional requerida.'}

---

## 3. Top Ativos com Maior Volume de Não-Conformidades
${report.topProblematicHosts.map((h, i) => `${i + 1}. **${h.host}**: ${h.issuesCount} anomalia(s) em ${h.triggerCount} trigger(s)`).join('\n')}

---

## 4. Relação das Triggers Refinadas para Zabbix 6.0+ / 7.0
| Host | Nome Refinado | Expressão Zabbix 6.0/7.0 | Recuperação / Histerese | Severidade |
| :--- | :--- | :--- | :--- | :--- |
${report.triggers.map((t) => `| \`${t.refinedHost}\` | ${t.refinedName} | \`${t.refinedExpression}\` | \`${t.refinedRecoveryExpression || 'Automática'}\` | ${t.recommendedSeverity} |`).join('\n')}
`;
}
