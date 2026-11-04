import { ZabbixSeverity } from '../types';

export interface DiagnosticIssue {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description: string;
  recommendation?: string;
}

export interface CustomTriggerAnalysisResult {
  isValidSyntax: boolean;
  isLegacySyntax: boolean;
  score: number; // 0 to 100
  parsedComponents: {
    functionName?: string;
    host?: string;
    itemKey?: string;
    parameters?: string;
    operator?: string;
    threshold?: string;
    isCompoundExpression: boolean;
  };
  diagnostics: DiagnosticIssue[];
  optimizedExpression: string;
  optimizedTriggerName: string;
  recommendedRecoveryExpression?: string;
  recommendedMacros: Array<{ macro: string; value: string; description: string }>;
  recommendedTags: Array<{ tag: string; value: string }>;
  operationalDataSuggestion: string;
}

export function analyzeCustomTrigger(
  triggerName: string,
  expression: string,
  recoveryExpression?: string,
  severity: ZabbixSeverity = 'Average'
): CustomTriggerAnalysisResult {
  const cleanExpr = expression.trim();
  const cleanName = triggerName.trim();
  const diagnostics: DiagnosticIssue[] = [];
  const recommendedMacros: Array<{ macro: string; value: string; description: string }> = [];
  const recommendedTags: Array<{ tag: string; value: string }> = [];

  let isValidSyntax = false;
  let isLegacySyntax = false;
  let score = 100;

  // 1. Check for empty expression
  if (!cleanExpr) {
    return {
      isValidSyntax: false,
      isLegacySyntax: false,
      score: 0,
      parsedComponents: { isCompoundExpression: false },
      diagnostics: [
        {
          type: 'error',
          title: 'Expressão Vazia',
          description: 'Insira a expressão da trigger para realizar a análise sintática e de boas práticas.',
        },
      ],
      optimizedExpression: '',
      optimizedTriggerName: cleanName,
      recommendedMacros: [],
      recommendedTags: [],
      operationalDataSuggestion: '',
    };
  }

  // 2. Detect Zabbix 5.0 Legacy Syntax: {host:item.func(param)}
  const legacyRegex = /\{([^:]+):([^\.]+)\.([a-zA-Z_]+)\(([^\)]*)\)\}/;
  if (legacyRegex.test(cleanExpr)) {
    isLegacySyntax = true;
    score -= 30;
    diagnostics.push({
      type: 'warning',
      title: 'Sintaxe Legada Zabbix 5.0 Detectada',
      description: 'A expressão utiliza chaves no formato `{host:key.func()}`, substituído no Zabbix 6.0 e 7.0 pela nova notação `func(/host/key, ...)`.',
      recommendation: 'Converta para a sintaxe Zabbix 6.0+/7.0 para garantir compatibilidade com versões suportadas.',
    });
  }

  // 3. Parentheses balance check
  const openParens = (cleanExpr.match(/\(/g) || []).length;
  const closeParens = (cleanExpr.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    score -= 40;
    diagnostics.push({
      type: 'error',
      title: 'Parênteses Desbalanceados',
      description: `A expressão contém ${openParens} parêntese(s) de abertura '(' e ${closeParens} de fechamento ')'.`,
      recommendation: 'Revise o fechamento de todas as funções e blocos lógicos.',
    });
  }

  // 4. Parse Modern Zabbix 6.0/7.0 syntax: func(/host/key, params) op val
  // e.g.: nodata(/rj01ora_ptrhucm1_instance/oracle.uptime,5m)=1
  const modernPattern = /^([a-zA-Z_]+)\(\/([^\/]+)\/([^,\)]+)(?:,([^\)]*))?\)\s*([=!><]+)\s*(.+)$/;
  const modernMatch = cleanExpr.match(modernPattern);

  let functionName = '';
  let host = '';
  let itemKey = '';
  let parameters = '';
  let operator = '';
  let threshold = '';
  let isCompound = false;

  if (modernMatch) {
    isValidSyntax = true;
    functionName = modernMatch[1].toLowerCase();
    host = modernMatch[2].trim();
    itemKey = modernMatch[3].trim();
    parameters = (modernMatch[4] || '').trim();
    operator = modernMatch[5].trim();
    threshold = modernMatch[6].trim();

    diagnostics.push({
      type: 'success',
      title: 'Sintaxe Zabbix 6.0+ / 7.0 Válida',
      description: `Função '${functionName}' sobre o item '${itemKey}' no host '${host}' identificada com sucesso.`,
    });
  } else if (!isLegacySyntax) {
    // Check if it is a compound expression (contains 'and', 'or', etc.)
    if (/\b(and|or)\b/i.test(cleanExpr)) {
      isCompound = true;
      isValidSyntax = openParens === closeParens;
      diagnostics.push({
        type: 'info',
        title: 'Expressão Composta (Múltiplas Condições)',
        description: 'A expressão combina múltiplas condições com operadores lógicos (AND/OR).',
      });
    } else if (cleanExpr.startsWith('/') || !cleanExpr.includes('(')) {
      score -= 35;
      diagnostics.push({
        type: 'error',
        title: 'Estrutura Incorreta de Função',
        description: 'A expressão Zabbix 6.0+ deve iniciar com o nome da função (ex: nodata, last, avg, min, max, count).',
        recommendation: 'Formato esperado: funcao(/host/item.key, parametro) operador valor',
      });
    } else {
      isValidSyntax = openParens === closeParens;
    }
  }

  // 5. Deep Best Practices Auditing

  // Detection of Oracle context
  const isOracle =
    itemKey.toLowerCase().includes('oracle') ||
    cleanName.toLowerCase().includes('oracle') ||
    host.toLowerCase().includes('ora');

  // Audit: nodata() Function
  if (functionName === 'nodata') {
    // Check item key suitability
    if (itemKey.includes('uptime')) {
      score -= 5;
      diagnostics.push({
        type: 'info',
        title: 'Uso de nodata() em Métrica de Uptime',
        description: `O item '${itemKey}' contabiliza o tempo contínuo de atividade operacional. Utilizar nodata() é válido para detectar interrupção na comunicação, mas a métrica uptime serve primariamente para detecção de reboot inesperado.`,
        recommendation: isOracle
          ? 'Para disponibilidade de banco de dados Oracle, a boa prática oficial da Zabbix (templates Oracle Agent 2 / ODBC) prioriza itens dedicados como oracle.ping ou oracle.instance.status, mantendo nodata(/.../oracle.uptime) como sentinela secundária de perda de dados.'
          : 'Certifique-se de ter outra trigger para detecção de reinicialização (ex: last() < 10m).',
      });
    }

    // Check hardcoded time parameter (e.g. 5m, 10m, 300s)
    if (parameters && !parameters.startsWith('{$')) {
      score -= 15;
      const macroName = isOracle ? '{$ORACLE.NODATA.WARN}' : '{$NODATA.TIMEOUT}';
      diagnostics.push({
        type: 'warning',
        title: 'Parâmetro de Tempo Fixo (Hardcoded)',
        description: `O tempo de tolerância '${parameters}' está fixado no código da expressão em vez de utilizar uma macro de usuário.`,
        recommendation: `Parametrize como '${macroName}:"${parameters}"' ou '${macroName}' para permitir que o NOC ajuste o limiar por ambiente sem modificar a trigger.`,
      });
      recommendedMacros.push({
        macro: macroName,
        value: parameters,
        description: `Período máximo sem recebimento de dados para ${itemKey}`,
      });
    } else if (parameters && parameters.startsWith('{$')) {
      diagnostics.push({
        type: 'success',
        title: 'Boas Práticas: Macro de Usuário Adotada',
        description: `O período de tolerância utiliza macro Zabbix (${parameters}), facilitando a governança.`,
      });
    }

    // Check time period duration evaluation
    if (parameters === '1m' || parameters === '2m' || parameters === '60s' || parameters === '120s') {
      score -= 10;
      diagnostics.push({
        type: 'warning',
        title: 'Janela Curta para nodata() (Risco de Alarme Falso)',
        description: `Janela de ${parameters} pode gerar alarmes falsos em caso de lentidão temporária na rede, jitter ou backups de banco de dados (ex: RMAN).`,
        recommendation: 'Recomenda-se no mínimo 5 minutos (5m) para tolerar pequenos atrasos de ciclo de coleta.',
      });
    } else if (parameters === '5m' || parameters === '10m') {
      diagnostics.push({
        type: 'success',
        title: 'Janela de Tempo Adequada (5m a 10m)',
        description: 'A tolerância de 5m é o padrão da indústria para absorver pequenas oscilações de rede sem mascarar falhas reais.',
      });
    }

    // Recovery mode note
    diagnostics.push({
      type: 'info',
      title: 'Modo de Recuperação Nativo da nodata()',
      description: 'Triggers com nodata() normalizam automaticamente no Zabbix assim que um novo valor é recebido pelo servidor/proxy (nodata()=0). Não requer expressão de histerese complexa.',
    });
  }

  // Audit: last() vs avg() on high-variance metrics
  if (functionName === 'last') {
    if (itemKey.includes('cpu') || itemKey.includes('util') || itemKey.includes('traffic')) {
      score -= 15;
      diagnostics.push({
        type: 'warning',
        title: 'Uso de last() em Métrica Oscilante',
        description: `A função last() em métricas voláteis como '${itemKey}' pode alarmar por picos momentâneos de 1 segundo (flapping).`,
        recommendation: 'Substitua por min(..., 5m) ou avg(..., 5m) para confirmar se a sobrecarga persiste por vários minutos consecutivos.',
      });
    }
  }

  // Audit: Trigger Naming Conventions
  let optimizedTriggerName = cleanName;
  if (cleanName) {
    if (isOracle && !cleanName.toLowerCase().startsWith('oracle:')) {
      score -= 5;
      optimizedTriggerName = `Oracle: ${cleanName.replace(/^oracle[:\s-]*/i, '')}`;
      diagnostics.push({
        type: 'info',
        title: 'Padronização de Prefixo no Nome da Trigger',
        description: 'A convenção oficial da Zabbix recomenda iniciar com o serviço/tecnologia seguido de dois pontos (ex: Oracle: ...).',
      });
    }

    if (!cleanName.includes('{HOST.NAME}') && !cleanName.includes(host) && host) {
      // Suggest operational data rather than cluttering trigger name
      diagnostics.push({
        type: 'info',
        title: 'Dica de Governança: Dados Operacionais Zabbix',
        description: 'Evite colocar o nome específico do host dentro do nome da trigger para permitir reaproveitamento em templates.',
        recommendation: 'Mantenha o nome genérico (ex: Oracle: Falha na coleta de dados de telemetria) e use Dados Operacionais: {ITEM.LASTVALUE1}.',
      });
    }
  } else {
    optimizedTriggerName = isOracle
      ? 'Oracle: Falha na coleta de dados (sem dados recentes)'
      : 'Serviço: Falha na coleta de dados de telemetria';
  }

  // Determine Tags based on context
  if (isOracle) {
    recommendedTags.push({ tag: 'scope', value: 'availability' });
    recommendedTags.push({ tag: 'target', value: 'oracle' });
    recommendedTags.push({ tag: 'class', value: 'database' });
    recommendedTags.push({ tag: 'component', value: 'instance' });
  } else if (itemKey.includes('cpu') || itemKey.includes('memory') || itemKey.includes('disk')) {
    recommendedTags.push({ tag: 'scope', value: 'performance' });
    recommendedTags.push({ tag: 'class', value: 'os' });
  } else if (itemKey.includes('net') || itemKey.includes('if')) {
    recommendedTags.push({ tag: 'scope', value: 'network' });
    recommendedTags.push({ tag: 'class', value: 'interface' });
  } else {
    recommendedTags.push({ tag: 'scope', value: 'availability' });
    recommendedTags.push({ tag: 'class', value: 'system' });
  }

  // Build Optimized Expression
  let optimizedExpression = cleanExpr;
  if (modernMatch) {
    const optimizedParam = parameters && !parameters.startsWith('{$')
      ? (isOracle ? '{$ORACLE.NODATA.WARN}' : '{$NODATA.TIMEOUT}')
      : parameters;

    optimizedExpression = `${functionName}(/${host}/${itemKey}${optimizedParam ? `,${optimizedParam}` : ''})${operator}${threshold}`;
  }

  // Ensure score is bounded between 0 and 100
  score = Math.max(10, Math.min(100, score));

  return {
    isValidSyntax,
    isLegacySyntax,
    score,
    parsedComponents: {
      functionName,
      host,
      itemKey,
      parameters,
      operator,
      threshold,
      isCompoundExpression: isCompound,
    },
    diagnostics,
    optimizedExpression,
    optimizedTriggerName,
    recommendedRecoveryExpression: recoveryExpression?.trim() || undefined,
    recommendedMacros,
    recommendedTags,
    operationalDataSuggestion: functionName === 'nodata' ? 'Último dado: {ITEM.LASTVALUE1}' : 'Valor atual: {ITEM.LASTVALUE1}',
  };
}
