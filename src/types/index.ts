export type HostTypeId =
  | 'docker_container'
  | 'vmware'
  | 'hyperv'
  | 'nutanix'
  | 'mssql'
  | 'mysql'
  | 'web_server'
  | 'microsoft_365'
  | 'mail_server'
  | 'ldap_ad'
  | 'web_application'
  | 'network_switch'
  | 'access_point'
  | 'firewall'
  | 'internet_link';

export type ZabbixSeverity = 'Disaster' | 'High' | 'Average' | 'Warning' | 'Information' | 'Not classified';

export type ZabbixFunction = 'last' | 'avg' | 'min' | 'max' | 'count' | 'change' | 'nodata' | 'fuzzytime';

export type Operator = '=' | '<>' | '>' | '<' | '>=' | '<=';

export type ValidationStatus =
  | 'standard_template' // Coberto por template padrão
  | 'extended_native' // Capacidade oficial estendida
  | 'custom_implementation' // Requer implementação customizada
  | 'not_recommended'; // Não é boa prática

export interface ValidationDetail {
  status: ValidationStatus;
  status_label: string;
  basis: string; // Base técnica oficial
  official_template?: string; // e.g. "Docker by Zabbix agent 2"
  native_capability_check: string;
  suggested_solution: string[];
  limitations?: string;
  recommended_alternative_tool?: string; // When not recommended in Zabbix
}

export interface CustomThresholdItem {
  id: string;
  label: string;
  macro: string;
  value: number | string;
  unit?: string;
  scope: string;
}

export interface BusinessThresholds {
  // Capacidade Geral
  cpu_warning: number;
  cpu_critical: number;
  memory_warning: number;
  memory_critical: number;
  disk_warning: number;
  disk_critical: number;
  uptime_reboot_threshold: number;

  // Banco de Dados
  db_cpu_warning: number;
  db_memory_warning: number;
  db_buffer_hit_warning: number;
  db_page_life_warning: number;
  db_log_free_warning: number;
  db_data_free_warning: number;
  slow_query_threshold: number;

  // Web
  web_response_time_warning: number;
  web_5xx_error_threshold: number;
  ssl_expiry_days_warning: number;

  // Link de Internet
  link_warning_pct: number;
  link_critical_pct: number;
  link_usage_window: string;
  link_loss_warning: number;
  link_latency_warning: number;

  // Rede & Switch
  interface_util_warning: number;
  interface_error_warning: number;
  poe_power_warning: number;

  // Virtualização
  vm_cpu_warning: number;
  vm_memory_warning: number;
  datastore_free_warning: number;
  storage_latency_warning: number;
  iops_warning: number;

  // Docker
  container_cpu_warning: number;
  container_memory_warning: number;
  container_restart_threshold: number;

  // Firewall
  fw_session_warning: number;
  fw_session_critical: number;
  vpn_tunnel_warning: number;
  fw_cpu_warning?: number;
  fw_threat_drop_warning?: number;

  // Access Point
  ap_clients_warning: number;
  ap_channel_util_warning: number;
  ap_noise_floor_warning?: number;

  // Mail & M365
  mail_queue_warning?: number;
  m365_license_days_warning?: number;

  // LDAP / AD
  ldap_query_time_warning: number;
  ad_repl_lag_warning?: number;

  // Switch
  switch_temp_warning?: number;

  // Custom Items added by user
  custom_items?: CustomThresholdItem[];
  [key: string]: any;
}

export type SeverityCategory =
  | 'availability'
  | 'reboot'
  | 'capacity'
  | 'capacity_critical'
  | 'performance'
  | 'error'
  | 'security'
  | 'information';

export interface SeverityPolicy {
  availability: ZabbixSeverity;
  reboot: ZabbixSeverity;
  capacity: ZabbixSeverity;
  capacity_critical: ZabbixSeverity;
  performance: ZabbixSeverity;
  error: ZabbixSeverity;
  security: ZabbixSeverity;
  information: ZabbixSeverity;
}

export interface CustomerBusinessRules {
  critical_hours: string; // e.g. "1-5,08:00-18:00"
  thresholds: BusinessThresholds;
  severity_policy: SeverityPolicy;
}

export interface Customer {
  customer_id: string;
  customer_name: string;
  business_rules: CustomerBusinessRules;
  created_at: string;
  notes?: string;
}

export type MonitoringModel =
  | 'Agent Zabbix'
  | 'SNMP'
  | 'ICMP PING'
  | 'Híbrido (Agent + SNMP)'
  | 'IPMI'
  | 'JMX / Web';

export interface Host {
  host_id: string;
  customer_id: string;
  hostname: string;
  display_name: string;
  host_type: HostTypeId;
  ip: string;
  criticality: 'baixa' | 'media' | 'alta' | 'critica';
  monitoring_model?: MonitoringModel;
  notes: string;
  custom_macro_overrides?: Record<string, string | number>;
}

export interface MonitoringCategory {
  id: HostTypeId;
  name: string;
  short_title: string;
  edital_section: string;
  description: string;
  icon_name: string;
  item_type_default: string;
  official_template_name: string;
}

export interface RecoveryRule {
  function: ZabbixFunction;
  period?: string;
  operator: Operator;
  delta_expr?: string;
  custom_expr?: string;
}

export interface Practice {
  id: string;
  title: string;
  category: HostTypeId;
  item_key: string;
  item_type: 'agent2' | 'agent' | 'snmp' | 'jmx' | 'simple' | 'internal' | 'calculated';
  function: ZabbixFunction;
  evaluation_period?: string | null;
  operator: Operator;
  threshold_param: keyof BusinessThresholds | string;
  default_threshold_value: string | number;
  macro_name: string;
  severity_param: SeverityCategory;
  recovery?: RecoveryRule | null;
  rationale: string;
  recommended_action: string;
  only_critical_hours?: boolean;
  operational_data?: string;
  tags?: Array<{ tag: string; value: string }>;
  edital_section?: string;
  unit?: string;
  validation: ValidationDetail;
  accessible_explanation?: Partial<AccessibleExplanation>;
}

export interface AccessibleExplanation {
  summary: string; // Resumo direto de 1 frase (ex: "Monitora se a latência excede o limite estipulado, indicando possível congestionamento no link")
  what_monitors: string; // O que monitora em linguagem acessível e direta
  when_triggers: string; // Condição exata que faz alarmar em português simples
  business_impact: string; // O que quer dizer na prática / impacto operacional
  recovery_condition: string; // Quando vai normalizar / recuperar
}

export interface GeneratedTrigger {
  id: string;
  practice_id: string;
  host_id: string;
  hostname: string;
  trigger_name: string;
  expression: string;
  recovery_mode: 'Expression' | 'None';
  recovery_expression: string;
  severity: ZabbixSeverity;
  operational_data: string;
  description: string;
  tags: Array<{ tag: string; value: string }>;
  macros: Array<{ macro: string; value: string | number; description: string }>;
  item_key: string;
  category_name: string;
  edital_section: string;
  rationale: string;
  recommended_action: string;
  validation: ValidationDetail;
  accessible_explanation: AccessibleExplanation;
}

export type ZabbixVersion = '7.0' | '6.4' | '6.0' | '5.0';

export interface IntegrationTriggerModel {
  id: string;
  name: string;
  severity: ZabbixSeverity;
  item_key: string;
  item_type: 'agent2' | 'agent' | 'snmp' | 'jmx' | 'simple' | 'internal' | 'calculated';
  expression_modern: string;
  expression_legacy: string;
  recovery_expression_modern?: string;
  recovery_expression_legacy?: string;
  default_threshold: string | number;
  macro: string;
  unit?: string;
  description: string;
  recommended_action: string;
  is_prototype?: boolean;
  discovery_rule?: string;
  accessible_explanation: AccessibleExplanation;
}

export interface ZabbixIntegration {
  id: string;
  slug: string;
  vendor: string;
  title: string;
  official_url: string;
  git_repo_url: string;
  asset_type: string;
  category: HostTypeId;
  official_template_name: string;
  collection_method: string;
  supported_versions: ZabbixVersion[];
  version_compatibility_notes: Record<ZabbixVersion, string>;
  lld_rules: Array<{ name: string; key: string; description: string }>;
  macros: Array<{ macro: string; value: string; description: string }>;
  triggers: IntegrationTriggerModel[];
}

export interface UserProfile {
  userId: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: string;
  lastLoginAt?: string;
  lgpdConsentAccepted?: boolean;
  lgpdConsentTimestamp?: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userEmail: string;
  action: 'LOGIN' | 'LOGOUT' | 'CUSTOMER_CREATE' | 'CUSTOMER_UPDATE' | 'CUSTOMER_DELETE' | 'HOST_CREATE' | 'HOST_IMPORT' | 'HOST_DELETE' | 'DATA_EXPORT' | 'DATA_WIPE' | 'LGPD_CONSENT';
  target: string;
  details: string;
  timestamp: string;
}

export interface CustomClientRequirement {
  id: string;
  req: string;
  cat: string;
  status: ValidationStatus;
  base: string;
  isMandatory: boolean;
  notes?: string;
}

