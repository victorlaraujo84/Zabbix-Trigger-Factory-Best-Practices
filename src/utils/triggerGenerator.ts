import { Customer, GeneratedTrigger, Host, Practice, ZabbixSeverity } from '../types';

export interface GeneratorOptions {
  useTemplateMacro?: boolean; // If true, uses {HOST.HOST} instead of specific hostname
  includeCriticalHoursCondition?: boolean;
}

export function generateTrigger(
  practice: Practice,
  host: Host,
  customer: Customer,
  options: GeneratorOptions = {}
): GeneratedTrigger {
  const hostTarget = options.useTemplateMacro ? '{HOST.HOST}' : host.hostname;
  const { thresholds, severity_policy } = customer.business_rules;

  // Resolve severity based on customer severity policy
  const mappedSeverity: ZabbixSeverity =
    severity_policy[practice.severity_param] || 'Average';

  // Resolve threshold value
  let thresholdVal: string | number = practice.default_threshold_value;
  if (
    practice.threshold_param in thresholds &&
    (thresholds as any)[practice.threshold_param] !== undefined
  ) {
    thresholdVal = (thresholds as any)[practice.threshold_param];
  }

  // Check host-level macro overrides
  if (host.custom_macro_overrides && practice.macro_name in host.custom_macro_overrides) {
    thresholdVal = host.custom_macro_overrides[practice.macro_name];
  }

  // Build Problem Expression
  const evalPeriod = practice.evaluation_period ? `,${practice.evaluation_period}` : '';
  const baseExpression = `${practice.function}(/${hostTarget}/${practice.item_key}${evalPeriod}) ${practice.operator} ${practice.macro_name}`;

  let finalExpression = baseExpression;

  // If critical hours are requested and configured
  if (options.includeCriticalHoursCondition || practice.only_critical_hours) {
    finalExpression = `(${baseExpression}) and time() >= 080000 and time() <= 180000`;
  }

  // Build Recovery Expression
  let recoveryExpression = '';
  let recoveryMode: 'Expression' | 'None' = 'None';

  if (practice.recovery) {
    recoveryMode = 'Expression';
    const recPeriod = practice.recovery.period ? `,${practice.recovery.period}` : '';
    const recRhs = practice.recovery.delta_expr || practice.recovery.custom_expr || `${thresholdVal}`;
    recoveryExpression = `${practice.recovery.function}(/${hostTarget}/${practice.item_key}${recPeriod}) ${practice.recovery.operator} (${recRhs})`;
  }

  // Build Trigger Name
  const unitSuffix = practice.unit ? practice.unit : '';
  const triggerName = `${host.hostname}: ${practice.title} (${practice.operator} ${practice.macro_name}${unitSuffix})`;

  // Operational Data
  const operationalData = practice.operational_data || 'Valor atual: {ITEM.LASTVALUE1}';

  // Description formatted for NOC operator and audit
  const description = [
    `=== BOAS PRÁTICAS DE MONITORAMENTO ZABBIX ===`,
    `Título: ${practice.title}`,
    `Host: ${host.display_name} (${host.ip})`,
    `Criticidade do Host: ${host.criticality.toUpperCase()}`,
    '',
    `[JUSTIFICATIVA TÉCNICA]`,
    practice.rationale,
    '',
    `[AÇÃO OPERACIONAL RECOMENDADA]`,
    practice.recommended_action,
    '',
    `[PARÂMETROS DE REFERÊNCIA]`,
    `- Macro Zabbix: ${practice.macro_name} = ${thresholdVal}${unitSuffix}`,
    `- Função de Avaliação: ${practice.function}${evalPeriod ? ` (${practice.evaluation_period})` : ''}`,
    practice.recovery ? `- Recuperação com histerese: ${practice.recovery.function} ${practice.recovery.operator} ${practice.recovery.delta_expr || practice.recovery.custom_expr}` : '- Recuperação padrão: quando a expressão do problema retornar FALSO.',
    `- Horário Crítico do Cliente: ${customer.business_rules.critical_hours}`,
  ].join('\n');

  // Tags
  const tags: Array<{ tag: string; value: string }> = [
    ...(practice.tags || []),
    { tag: 'target', value: host.hostname.toLowerCase() },
    { tag: 'category', value: practice.category },
    { tag: 'governance', value: 'official-practice' },
    { tag: 'managed_by', value: customer.customer_name.toLowerCase() },
  ];

  // Macros involved
  const macros = [
    {
      macro: practice.macro_name,
      value: thresholdVal,
      description: `Limiar para ${practice.title} (${customer.customer_name})`,
    },
  ];

  // Human-accessible explanation
  const operatorHuman =
    practice.operator === '>'
      ? 'for MAIOR que'
      : practice.operator === '>='
      ? 'for MAIOR OU IGUAL a'
      : practice.operator === '<'
      ? 'for MENOR que'
      : practice.operator === '<='
      ? 'for MENOR OU IGUAL a'
      : practice.operator === '='
      ? 'for IGUAL a'
      : 'for DIFERENTE de';

  const periodHuman = practice.evaluation_period
    ? ` mantido por ${practice.evaluation_period} contínuos (média/contagem sustentada)`
    : ' verificado na checagem mais recente';

  const whatMonitors = `Monitora a saúde e integridade de "${practice.title}" no ativo ${host.display_name} através da chave Zabbix [${practice.item_key}].`;

  const whenTriggers = `O Zabbix vai ALARMAR quando a métrica ${operatorHuman} ${thresholdVal}${unitSuffix}${periodHuman}.`;

  const businessImpact = `${practice.rationale} Se este alarme tocar, indica risco direto de indisponibilidade ou gargalo no serviço.`;

  let recoveryCondition = 'Normaliza automaticamente assim que a expressão do problema deixar de ser verdadeira.';
  if (practice.recovery) {
    const recOp =
      practice.recovery.operator === '<'
        ? 'cair para MENOS de'
        : practice.recovery.operator === '<='
        ? 'cair para MENOR OU IGUAL a'
        : practice.recovery.operator === '>'
        ? 'subir para MAIS de'
        : 'atingir o patamar seguro de';
    const recTarget = practice.recovery.delta_expr || `${thresholdVal}`;
    const recPeriod = practice.recovery.period ? ` durante ${practice.recovery.period}` : '';
    recoveryCondition = `O alarme SÓ VAI FECHAR (recuperar) quando a métrica ${recOp} ${recTarget}${unitSuffix}${recPeriod}. Isso evita que o alarme fique piscando (flapping) se o valor oscilar na borda.`;
  }

  const autoSummary = `Monitora se "${practice.title}" ${operatorHuman.toLowerCase()} ${thresholdVal}${unitSuffix}, indicando ${practice.rationale.toLowerCase().replace(/\.$/, '')}.`;

  const customExpl = practice.accessible_explanation || {};

  const accessibleExplanation = {
    summary: customExpl.summary || autoSummary,
    what_monitors: customExpl.what_monitors || whatMonitors,
    when_triggers: customExpl.when_triggers || whenTriggers,
    business_impact: customExpl.business_impact || businessImpact,
    recovery_condition: customExpl.recovery_condition || recoveryCondition,
  };

  return {
    id: `trig-${host.host_id}-${practice.id}`,
    practice_id: practice.id,
    host_id: host.host_id,
    hostname: host.hostname,
    trigger_name: triggerName,
    expression: finalExpression,
    recovery_mode: recoveryMode,
    recovery_expression: recoveryExpression,
    severity: mappedSeverity,
    operational_data: operationalData,
    description,
    tags,
    macros,
    item_key: practice.item_key,
    category_name: practice.category,
    edital_section: practice.edital_section || 'Geral',
    rationale: practice.rationale,
    recommended_action: practice.recommended_action,
    validation: practice.validation,
    accessible_explanation: accessibleExplanation,
  };
}
