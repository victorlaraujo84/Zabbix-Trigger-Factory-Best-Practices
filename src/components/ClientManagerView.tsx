import React, { useState } from 'react';
import { Customer, CustomerBusinessRules, BusinessThresholds, SeverityPolicy, ZabbixSeverity, CustomThresholdItem } from '../types';
import {
  Sliders,
  Save,
  Check,
  Plus,
  Trash2,
  RotateCcw,
  AlertOctagon,
  Clock,
  Shield,
  Layers,
  Sparkles,
  FileText,
  Printer,
  Download,
} from 'lucide-react';

interface ClientManagerViewProps {
  customers: Customer[];
  activeCustomer: Customer;
  onUpdateCustomer: (updated: Customer) => void;
  onCreateCustomer: (newCust: Customer) => void;
  onDeleteCustomer: (custId: string) => void;
  onResetToDefault: () => void;
  onWipeAllData: () => void;
}

export const ClientManagerView: React.FC<ClientManagerViewProps> = ({
  customers,
  activeCustomer,
  onUpdateCustomer,
  onCreateCustomer,
  onDeleteCustomer,
  onResetToDefault,
  onWipeAllData,
}) => {
  const [formData, setFormData] = useState<Customer>(activeCustomer);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [newCustModal, setNewCustModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [confirmWipeModal, setConfirmWipeModal] = useState(false);
  const [confirmResetModal, setConfirmResetModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);

  // Custom Item Form State
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [customItemLabel, setCustomItemLabel] = useState('');
  const [customItemMacro, setCustomItemMacro] = useState('');
  const [customItemValue, setCustomItemValue] = useState('');
  const [customItemUnit, setCustomItemUnit] = useState('');
  const [customItemScope, setCustomItemScope] = useState('Geral');

  // Sync if active customer changes externally
  React.useEffect(() => {
    setFormData(activeCustomer);
  }, [activeCustomer]);

  const handleThresholdChange = (key: keyof BusinessThresholds, val: any) => {
    const num = typeof val === 'number' ? val : parseFloat(val);
    setFormData((prev) => ({
      ...prev,
      business_rules: {
        ...prev.business_rules,
        thresholds: {
          ...prev.business_rules.thresholds,
          [key]: isNaN(num) ? val : num,
        },
      },
    }));
  };

  const handleSeverityChange = (category: keyof SeverityPolicy, val: ZabbixSeverity) => {
    setFormData((prev) => ({
      ...prev,
      business_rules: {
        ...prev.business_rules,
        severity_policy: {
          ...prev.business_rules.severity_policy,
          [category]: val,
        },
      },
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCustomer(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    const newCust: Customer = {
      customer_id: `cust-${Date.now()}`,
      customer_name: newCustName.trim(),
      created_at: new Date().toISOString(),
      notes: `Cliente configurado com base nas regras do edital.`,
      business_rules: JSON.parse(JSON.stringify(activeCustomer.business_rules)),
    };

    onCreateCustomer(newCust);
    setNewCustName('');
    setNewCustModal(false);
  };

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItemLabel.trim() || !customItemMacro.trim()) return;

    const formattedMacro = customItemMacro.trim().startsWith('{$')
      ? customItemMacro.trim().toUpperCase()
      : `{$${customItemMacro.trim().toUpperCase()}}`;

    const newItem: CustomThresholdItem = {
      id: `custom-${Date.now()}`,
      label: customItemLabel.trim(),
      macro: formattedMacro,
      value: isNaN(parseFloat(customItemValue)) ? customItemValue.trim() : parseFloat(customItemValue),
      unit: customItemUnit.trim(),
      scope: customItemScope.trim(),
    };

    const currentItems = formData.business_rules.thresholds.custom_items || [];
    const updatedCustomer = {
      ...formData,
      business_rules: {
        ...formData.business_rules,
        thresholds: {
          ...formData.business_rules.thresholds,
          custom_items: [...currentItems, newItem],
        },
      },
    };

    setFormData(updatedCustomer);
    onUpdateCustomer(updatedCustomer);
    setCustomItemLabel('');
    setCustomItemMacro('');
    setCustomItemValue('');
    setCustomItemUnit('');
    setShowAddCustomModal(false);
  };

  const handleRemoveCustomItem = (itemId: string) => {
    const currentItems = formData.business_rules.thresholds.custom_items || [];
    const updatedCustomer = {
      ...formData,
      business_rules: {
        ...formData.business_rules,
        thresholds: {
          ...formData.business_rules.thresholds,
          custom_items: currentItems.filter((i) => i.id !== itemId),
        },
      },
    };
    setFormData(updatedCustomer);
    onUpdateCustomer(updatedCustomer);
  };

  const severityOptions: ZabbixSeverity[] = [
    'Disaster',
    'High',
    'Average',
    'Warning',
    'Information',
  ];

  const handleExportRulesCsv = () => {
    const t = formData.business_rules.thresholds;
    const p = formData.business_rules.severity_policy;
    const rows = [
      ['Categoria / Escopo', 'Parâmetro Técnico', 'Macro Zabbix', 'Limiar Warning', 'Limiar Crítico / Disaster', 'Unidade', 'Severidade Mapeada'],
      ['Servidores & VMs', 'Utilização de CPU', '{$CPU_WARN} / {$CPU_CRIT}', `${t.cpu_warning ?? 70}`, `${t.cpu_critical ?? 90}`, '%', p.capacity_critical || 'Disaster'],
      ['Servidores & VMs', 'Memória Livre Mínima', '{$MEM_FREE_WARN} / {$MEM_FREE_CRIT}', `${t.memory_warning ?? 20}`, `${t.memory_critical ?? 10}`, '% livre', p.capacity || 'Average'],
      ['Storage & Discos', 'Espaço Livre em Disco', '{$DISK_WARN} / {$DISK_CRIT}', `${t.disk_warning ?? 15}`, `${t.disk_critical ?? 5}`, '% livre', p.capacity_critical || 'High'],
      ['Bancos de Dados', 'Buffer Cache Hit Ratio', '{$DB_BUFFER_HIT_WARN}', `${t.db_buffer_hit_warning ?? 95}`, 'N/A', '%', p.performance || 'Average'],
      ['Bancos de Dados', 'Page Life Expectancy', '{$DB_PAGE_LIFE_WARN}', `${t.db_page_life_warning ?? 300}`, 'N/A', 'segundos', p.performance || 'Warning'],
      ['Bancos de Dados', 'Espaço de Log Usado', '{$DB_LOG_USED_WARN}', `${t.db_log_free_warning ?? 20}`, 'N/A', '%', p.capacity || 'Warning'],
      ['Bancos de Dados', 'Slow Queries (Duração)', '{$SLOW_QUERY_THRESHOLD}', `${t.slow_query_threshold ?? 5}`, 'N/A', 'segundos', p.performance || 'Warning'],
      ['Firewalls de Borda', 'Tabela de Sessões de Estado', '{$FW_SESSION_WARN} / {$FW_SESSION_CRIT}', `${t.fw_session_warning ?? 80}`, `${t.fw_session_critical ?? 95}`, '%', p.capacity_critical || 'Disaster'],
      ['Firewalls de Borda', 'Status Túneis VPN IPsec', '{$VPN_TUNNEL_UP}', `${t.vpn_tunnel_warning ?? 1}`, '0 (Down)', 'status', p.availability || 'High'],
      ['Access Points Wi-Fi', 'Densidade de Clientes por Rádio', '{$AP_CLIENTS_WARN}', `${t.ap_clients_warning ?? 35}`, 'N/A', 'clientes', p.capacity || 'Warning'],
      ['Access Points Wi-Fi', 'Ocupação de Canal RF', '{$AP_CHANNEL_UTIL_WARN}', `${t.ap_channel_util_warning ?? 70}`, 'N/A', '%', p.performance || 'Warning'],
      ['Access Points Wi-Fi', 'Uptime Mínimo (Detecção de Reboot)', '{$UPTIME_REBOOT}', `${t.uptime_reboot_threshold ?? 600}`, 'N/A', 'segundos', p.reboot || 'Warning'],
      ['Servidores Web', 'Tempo de Resposta HTTP', '{$WEB_RESP_WARN}', `${t.web_response_time_warning ?? 3}`, 'N/A', 'segundos', p.performance || 'Average'],
      ['Servidores Web', 'Erros HTTP 5xx em 5min', '{$WEB_5XX_WARN}', `${t.web_5xx_error_threshold ?? 10}`, 'N/A', 'erros', p.error || 'High'],
      ['Servidores Web', 'Expiração de Certificado SSL/TLS', '{$SSL_DAYS_WARN}', `${t.ssl_expiry_days_warning ?? 30}`, '7', 'dias', p.security || 'High'],
      ['Links de Internet / WAN', 'Saturação de Banda WAN', '{$LINK_SAT_WARN} / {$LINK_SAT_CRIT}', `${t.link_warning_pct ?? 70}`, `${t.link_critical_pct ?? 90}`, '%', p.capacity_critical || 'High'],
      ['Links de Internet / WAN', 'Perda de Pacotes WAN', '{$LINK_LOSS_WARN}', `${t.link_loss_warning ?? 10}`, 'N/A', '% perda', p.availability || 'Average'],
      ['Links de Internet / WAN', 'Latência de Link WAN', '{$LINK_LATENCY_WARN}', `${t.link_latency_warning ? t.link_latency_warning * 1000 : 100}`, 'N/A', 'ms', p.performance || 'Warning'],
      ['Switches de Rede', 'Utilização de Portas LAN', '{$IF_UTIL_WARN}', `${t.interface_util_warning ?? 80}`, 'N/A', '%', p.performance || 'Warning'],
      ['Switches de Rede', 'Erros de Pacotes CRC na Porta', '{$IF_ERRORS_WARN}', `${t.interface_error_warning ?? 100}`, 'N/A', 'pacotes', p.error || 'Average'],
      ['Switches de Rede', 'Consumo de Energia PoE Switch', '{$POE_POWER_WARN}', `${t.poe_power_warning ?? 80}`, 'N/A', '%', p.capacity || 'Warning'],
      ['Virtualização', 'Utilização de CPU da VM', '{$VM_CPU_WARN}', `${t.vm_cpu_warning ?? 80}`, 'N/A', '%', p.capacity || 'Average'],
      ['Virtualização', 'Utilização de RAM da VM', '{$VM_MEM_WARN}', `${t.vm_memory_warning ?? 85}`, 'N/A', '%', p.capacity || 'Average'],
      ['Virtualização', 'Espaço Livre em Datastore', '{$DATASTORE_WARN}', `${t.datastore_free_warning ?? 20}`, 'N/A', '% livre', p.capacity_critical || 'High'],
      ['Containers Docker', 'Utilização de CPU Container', '{$CONTAINER_CPU_WARN}', `${t.container_cpu_warning ?? 80}`, 'N/A', '%', p.capacity || 'Average'],
      ['Containers Docker', 'Utilização de RAM Container', '{$CONTAINER_MEM_WARN}', `${t.container_memory_warning ?? 85}`, 'N/A', '%', p.capacity || 'Average'],
      ['Containers Docker', 'Restarts de Container em 15m', '{$CONTAINER_RESTART_WARN}', `${t.container_restart_threshold ?? 3}`, 'N/A', 'restarts', p.availability || 'High'],
      ['LDAP & Active Directory', 'Tempo de Resposta Query LDAP', '{$LDAP_QUERY_WARN}', `${t.ldap_query_time_warning ?? 2}`, 'N/A', 'segundos', p.performance || 'Warning'],
    ];

    if (t.custom_items && t.custom_items.length > 0) {
      t.custom_items.forEach((ci) => {
        rows.push([
          `Personalizado (${ci.scope})`,
          ci.label,
          ci.macro,
          `${ci.value}`,
          'N/A',
          ci.unit || '',
          'Personalizado',
        ]);
      });
    }

    const csvContent = rows
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `regras_e_limiares_${formData.customer_name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Bar with Management & Reset Actions */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-rose-500" />
              Regras e Limiares Técnicos: {formData.customer_name}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Configuração de todos os escopos técnicos do edital: Servidores, Bancos, Firewalls, APs, Links e Web.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowPdfModal(true)}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm transition-colors inline-flex items-center gap-1.5"
            title="Gerar e exportar relatório técnico formal das regras em PDF"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Exportar em PDF</span>
          </button>

          <button
            onClick={handleExportRulesCsv}
            className="px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/60 rounded-lg shadow-sm transition-colors inline-flex items-center gap-1.5"
            title="Exportar todas as regras e limiares com valores em planilha CSV/Excel"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exportar Regras (CSV)</span>
          </button>

          <button
            onClick={() => setNewCustModal(true)}
            className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Cliente</span>
          </button>

          <button
            onClick={() => setConfirmResetModal(true)}
            className="px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-800/60 rounded-lg transition-colors inline-flex items-center gap-1.5"
            title="Restaurar valores padrões recomendados pelo edital"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Padrão do Edital</span>
          </button>

          <button
            onClick={() => setConfirmWipeModal(true)}
            className="px-3 py-1.5 text-xs font-medium text-rose-300 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/60 rounded-lg transition-colors inline-flex items-center gap-1.5"
            title="Zerar toda a aplicação e remover clientes/hosts"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Zerar Aplicação</span>
          </button>

          {customers.length > 1 && (
            <button
              onClick={() => {
                if (confirm(`Remover o cliente "${formData.customer_name}" e seus registros?`)) {
                  onDeleteCustomer(formData.customer_id);
                }
              }}
              className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors inline-flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir Cliente</span>
            </button>
          )}

          <button
            onClick={handleSave}
            className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm transition-colors inline-flex items-center gap-1.5"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Salvo com Sucesso!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar Regras</span>
              </>
            )}
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Customer Base & Critical Hours */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-rose-400" />
            Identificação e Janela Crítica de Atendimento
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="text-slate-400 font-mono block">Nome do Cliente:</label>
              <input
                type="text"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-medium focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-mono block">
                Janela de Horário Crítico (Sintaxe Zabbix):
              </label>
              <input
                type="text"
                value={formData.business_rules.critical_hours}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    business_rules: {
                      ...formData.business_rules,
                      critical_hours: e.target.value,
                    },
                  })
                }
                placeholder="1-5,08:00-18:00"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-rose-500"
              />
              <span className="text-[10px] text-slate-500">
                Padrão Zabbix: 1-5 = Segunda a Sexta; 08:00-18:00 = Expediente Comercial.
              </span>
            </div>
          </div>
        </div>

        {/* Severity Policy Matrix */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-rose-400" />
            Matriz de Severidade da Política do Cliente
          </h3>
          <p className="text-xs text-slate-400">
            Define qual severidade do Zabbix será atribuída a cada tipo de problema detectado:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {(
              [
                ['availability', 'Disponibilidade (Quedas)'],
                ['reboot', 'Reinicialização / Uptime'],
                ['capacity', 'Capacidade (Aviso)'],
                ['capacity_critical', 'Capacidade Crítica'],
                ['performance', 'Performance / Lentidão'],
                ['error', 'Erros / Falhas de App'],
                ['security', 'Segurança / Certificados'],
                ['information', 'Informativo'],
              ] as const
            ).map(([catKey, catLabel]) => (
              <div key={catKey} className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5">
                <span className="text-slate-400 font-mono text-[11px] block truncate">{catLabel}</span>
                <select
                  value={formData.business_rules.severity_policy[catKey]}
                  onChange={(e) =>
                    handleSeverityChange(catKey as keyof SeverityPolicy, e.target.value as ZabbixSeverity)
                  }
                  className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-rose-500 font-medium"
                >
                  {severityOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Thresholds Categorized by Technical Scope */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Limiares de Alarme por Escopo Técnico
              </h3>
              <p className="text-xs text-slate-400">
                Ajuste os valores de disparo para cada tecnologia monitorada:
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddCustomModal(true)}
              className="px-3 py-1.5 text-xs font-semibold text-rose-400 hover:text-white bg-slate-950 hover:bg-rose-600 border border-slate-800 hover:border-rose-600 rounded-lg transition-colors inline-flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Incluir Outro Item Personalizado</span>
            </button>
          </div>

          {/* Group 1: Capacidade Geral */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center justify-between">
              <span>1. Servidores & Capacidade de SO</span>
              <span className="text-[10px] text-slate-500 font-normal">system.cpu.util · vfs.fs.size · vm.memory</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-mono text-[11px]">CPU Warning (%):</label>
                <input
                  type="number"
                  value={formData.business_rules.thresholds.cpu_warning}
                  onChange={(e) => handleThresholdChange('cpu_warning', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-mono text-[11px]">CPU Critical (%):</label>
                <input
                  type="number"
                  value={formData.business_rules.thresholds.cpu_critical}
                  onChange={(e) => handleThresholdChange('cpu_critical', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-mono text-[11px]">Memória Livre Warning (%):</label>
                <input
                  type="number"
                  value={formData.business_rules.thresholds.memory_warning}
                  onChange={(e) => handleThresholdChange('memory_warning', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-mono text-[11px]">Disco Livre Warning (%):</label>
                <input
                  type="number"
                  value={formData.business_rules.thresholds.disk_warning}
                  onChange={(e) => handleThresholdChange('disk_warning', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Group 2: Bancos de Dados */}
          <div className="space-y-3 pt-2 border-t border-slate-855">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center justify-between">
              <span>2. Bancos de Dados (MSSQL 2014+ & MySQL / MariaDB)</span>
              <span className="text-[10px] text-slate-500 font-normal">Buffer Manager · Page Life · Slow Queries</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-mono text-[11px]">Buffer Hit Ratio (%):</label>
                <input
                  type="number"
                  value={formData.business_rules.thresholds.db_buffer_hit_warning}
                  onChange={(e) => handleThresholdChange('db_buffer_hit_warning', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-mono text-[11px]">Page Life Expectancy (s):</label>
                <input
                  type="number"
                  value={formData.business_rules.thresholds.db_page_life_warning}
                  onChange={(e) => handleThresholdChange('db_page_life_warning', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-mono text-[11px]">Log File Usado Warning (%):</label>
                <input
                  type="number"
                  value={formData.business_rules.thresholds.db_log_free_warning}
                  onChange={(e) => handleThresholdChange('db_log_free_warning', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-mono text-[11px]">Slow Query Threshold (s):</label>
                <input
                  type="number"
                  value={formData.business_rules.thresholds.slow_query_threshold}
                  onChange={(e) => handleThresholdChange('slow_query_threshold', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Group 3: Firewalls de Borda & Datacenter */}
          <div className="space-y-3 pt-2 border-t border-slate-850">
            <h4 className="text-xs font-semibold text-red-300 uppercase tracking-wider font-mono flex items-center justify-between">
              <span>3. Firewalls de Borda & Datacenter</span>
              <span className="text-[10px] text-slate-500 font-normal">State Table · VPN IPsec · HA Sync</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-mono text-[11px]">Tabela de Sessões Warning (%):</label>
                <input
                  type="number"
                  value={formData.business_rules.thresholds.fw_session_warning}
                  onChange={(e) => handleThresholdChange('fw_session_warning', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
                <span className="text-[10px] text-slate-500">Macro: {'{$FW_SESSION_WARN}'}</span>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-mono text-[11px]">Tabela de Sessões Crítica (%):</label>
                <input
                  type="number"
                  value={formData.business_rules.thresholds.fw_session_critical}
                  onChange={(e) => handleThresholdChange('fw_session_critical', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
                <span className="text-[10px] text-slate-500">Macro: {'{$FW_SESSION_CRIT}'}</span>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-mono text-[11px]">Túneis VPN Fora (Status Up):</label>
                <input
                  type="number"
                  value={formData.business_rules.thresholds.vpn_tunnel_warning}
                  onChange={(e) => handleThresholdChange('vpn_tunnel_warning', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
                <span className="text-[10px] text-slate-500">Macro: {'{$VPN_TUNNEL_UP}'} (1 = UP)</span>
              </div>
            </div>
          </div>

          {/* Group 4: Access Points Wi-Fi */}
          <div className="space-y-3 pt-2 border-t border-slate-850">
            <h4 className="text-xs font-semibold text-fuchsia-300 uppercase tracking-wider font-mono flex items-center justify-between">
              <span>4. Access Points Wi-Fi</span>
              <span className="text-[10px] text-slate-500 font-normal">Densidade de Clientes · Ocupação de Canal RF</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-mono text-[11px]">Densidade Máx. Clientes/Rádio:</label>
                <input
                  type="number"
                  value={formData.business_rules.thresholds.ap_clients_warning}
                  onChange={(e) => handleThresholdChange('ap_clients_warning', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
                <span className="text-[10px] text-slate-500">Macro: {'{$AP_CLIENTS_WARN}'}</span>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-mono text-[11px]">Utilização de Canal Wi-Fi (%):</label>
                <input
                  type="number"
                  value={formData.business_rules.thresholds.ap_channel_util_warning}
                  onChange={(e) => handleThresholdChange('ap_channel_util_warning', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
                <span className="text-[10px] text-slate-500">Macro: {'{$AP_CHANNEL_UTIL_WARN}'}</span>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-mono text-[11px]">Uptime Reboot AP (s):</label>
                <input
                  type="number"
                  value={formData.business_rules.thresholds.uptime_reboot_threshold}
                  onChange={(e) => handleThresholdChange('uptime_reboot_threshold', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
                <span className="text-[10px] text-slate-500">Macro: {'{$UPTIME_REBOOT}'}</span>
              </div>
            </div>
          </div>

          {/* Group 5: Servidores Web & Aplicações */}
          <div className="space-y-3 pt-2 border-t border-slate-850">
            <h4 className="text-xs font-semibold text-cyan-300 uppercase tracking-wider font-mono flex items-center justify-between">
              <span>5. Servidores Web & Aplicações</span>
              <span className="text-[10px] text-slate-500 font-normal">HTTP Response Time · Erros 5xx · Certificados TLS</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-mono text-[11px]">Tempo de Resposta Web (s):</label>
                <input
                  type="number"
                  value={formData.business_rules.thresholds.web_response_time_warning}
                  onChange={(e) => handleThresholdChange('web_response_time_warning', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
                <span className="text-[10px] text-slate-500">Macro: {'{$WEB_RESP_WARN}'}</span>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-mono text-[11px]">Limite de Erros HTTP 5xx (em 5min):</label>
                <input
                  type="number"
                  value={formData.business_rules.thresholds.web_5xx_error_threshold}
                  onChange={(e) => handleThresholdChange('web_5xx_error_threshold', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
                <span className="text-[10px] text-slate-500">Macro: {'{$WEB_5XX_WARN}'}</span>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-mono text-[11px]">Validade Certificado SSL (dias):</label>
                <input
                  type="number"
                  value={formData.business_rules.thresholds.ssl_expiry_days_warning}
                  onChange={(e) => handleThresholdChange('ssl_expiry_days_warning', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
                <span className="text-[10px] text-slate-500">Macro: {'{$SSL_DAYS_WARN}'}</span>
              </div>
            </div>
          </div>

          {/* Group 6: LDAP / AD */}
          <div className="space-y-3 pt-2 border-t border-slate-850">
            <h4 className="text-xs font-semibold text-purple-300 uppercase tracking-wider font-mono flex items-center justify-between">
              <span>6. LDAP & Active Directory</span>
              <span className="text-[10px] text-slate-500 font-normal">Tempo de Query · NTDS · Replicação</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-mono text-[11px]">Tempo de Query LDAP Warning (s):</label>
                <input
                  type="number"
                  value={formData.business_rules.thresholds.ldap_query_time_warning}
                  onChange={(e) => handleThresholdChange('ldap_query_time_warning', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
                <span className="text-[10px] text-slate-500">Macro: {'{$LDAP_QUERY_WARN}'}</span>
              </div>
            </div>
          </div>

          {/* Group 7: Links de Internet, WAN & Switches */}
          <div className="space-y-3 pt-2 border-t border-slate-850">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center justify-between">
              <span>7. Links de Internet, WAN & Switches</span>
              <span className="text-[10px] text-slate-500 font-normal">Throughput · Erros CRC · Saturação</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-mono text-[11px]">Link Saturação Warning (%):</label>
                <input
                  type="number"
                  value={formData.business_rules.thresholds.link_warning_pct}
                  onChange={(e) => handleThresholdChange('link_warning_pct', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-mono text-[11px]">Link Perda Warning (%):</label>
                <input
                  type="number"
                  value={formData.business_rules.thresholds.link_loss_warning}
                  onChange={(e) => handleThresholdChange('link_loss_warning', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-mono text-[11px]">Porta Switch Utilização (%):</label>
                <input
                  type="number"
                  value={formData.business_rules.thresholds.interface_util_warning}
                  onChange={(e) => handleThresholdChange('interface_util_warning', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-mono text-[11px]">Porta Switch Erros CRC:</label>
                <input
                  type="number"
                  value={formData.business_rules.thresholds.interface_error_warning}
                  onChange={(e) => handleThresholdChange('interface_error_warning', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Group 8: Virtualização & Docker */}
          <div className="space-y-3 pt-2 border-t border-slate-850">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center justify-between">
              <span>8. Virtualização & Contêineres Docker</span>
              <span className="text-[10px] text-slate-500 font-normal">Datastores · Storage Latency · Crashloops</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-mono text-[11px]">Datastore Livre Warning (%):</label>
                <input
                  type="number"
                  value={formData.business_rules.thresholds.datastore_free_warning}
                  onChange={(e) => handleThresholdChange('datastore_free_warning', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-mono text-[11px]">Storage Latency Warning (ms):</label>
                <input
                  type="number"
                  value={formData.business_rules.thresholds.storage_latency_warning}
                  onChange={(e) => handleThresholdChange('storage_latency_warning', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-mono text-[11px]">Contêiner CPU Warning (%):</label>
                <input
                  type="number"
                  value={formData.business_rules.thresholds.container_cpu_warning}
                  onChange={(e) => handleThresholdChange('container_cpu_warning', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-mono text-[11px]">Contêiner Restarts (Crash):</label>
                <input
                  type="number"
                  value={formData.business_rules.thresholds.container_restart_threshold}
                  onChange={(e) => handleThresholdChange('container_restart_threshold', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Group 9: Itens e Limiares Personalizados Adicionados pelo Usuário */}
          {formData.business_rules.thresholds.custom_items &&
            formData.business_rules.thresholds.custom_items.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-slate-850">
                <h4 className="text-xs font-semibold text-rose-300 uppercase tracking-wider font-mono flex items-center justify-between">
                  <span>9. Limiares Personalizados Adicionais do Cliente</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    {formData.business_rules.thresholds.custom_items.length} itens extras
                  </span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  {formData.business_rules.thresholds.custom_items.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-start justify-between gap-2"
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-white">{item.label}</div>
                        <div className="text-[11px] font-mono text-amber-300">
                          {item.macro} = {item.value} {item.unit || ''}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">Escopo: {item.scope}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomItem(item.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Remover este item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      </form>

      {/* Modal: Add Custom Item / Threshold */}
      {showAddCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-rose-500" />
                Incluir Novo Limiar Personalizado
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Adicione parâmetros para monitorar equipamentos e serviços específicos (ex: Temperatura de Switches, Fila de Mensagens, Sessões VPN).
            </p>

            <form onSubmit={handleAddCustomItem} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-mono block">Nome do Limiar / Indicador: *</label>
                <input
                  type="text"
                  required
                  value={customItemLabel}
                  onChange={(e) => setCustomItemLabel(e.target.value)}
                  placeholder="Ex: Temperatura Máxima do Chassi, Fila RabbitMQ..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-mono block">Nome da Macro Zabbix: *</label>
                  <input
                    type="text"
                    required
                    value={customItemMacro}
                    onChange={(e) => setCustomItemMacro(e.target.value)}
                    placeholder="{$TEMP_WARN}"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono uppercase focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-mono block">Valor do Limiar: *</label>
                  <input
                    type="text"
                    required
                    value={customItemValue}
                    onChange={(e) => setCustomItemValue(e.target.value)}
                    placeholder="Ex: 50, 100, ok..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-mono block">Unidade de Medida:</label>
                  <input
                    type="text"
                    value={customItemUnit}
                    onChange={(e) => setCustomItemUnit(e.target.value)}
                    placeholder="Ex: °C, ms, %, msg..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-mono block">Escopo / Categoria:</label>
                  <select
                    value={customItemScope}
                    onChange={(e) => setCustomItemScope(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-medium focus:outline-none focus:border-rose-500"
                  >
                    <option value="Firewall">Firewall</option>
                    <option value="Access Point">Access Point</option>
                    <option value="Switch & Rede">Switch & Rede</option>
                    <option value="Servidor Web">Servidor Web</option>
                    <option value="Banco de Dados">Banco de Dados</option>
                    <option value="Virtualização">Virtualização</option>
                    <option value="Geral">Geral</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddCustomModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-500 font-semibold"
                >
                  Adicionar Limiar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Customer */}
      {newCustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Criar Novo Cliente / Ambiente</h3>
            <p className="text-xs text-slate-400">
              O novo cliente herdará a matriz de governança técnica e boas práticas homologadas do edital.
            </p>
            <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-mono block">Nome do Cliente / Empresa:</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="Ex: Novo Cliente S.A."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-rose-500 font-medium"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewCustModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-500 font-semibold"
                >
                  Criar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Reset to Default (Firjan) */}
      {confirmResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-amber-800/80 rounded-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <RotateCcw className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Restaurar Padrão do Edital?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Esta ação redefinirá os clientes e hosts para o cenário oficial de referência (Cliente Firjan, regras do edital 4.5 a 4.9 e inventário padrão).
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmResetModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetToDefault();
                  setConfirmResetModal(false);
                }}
                className="px-4 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-500 font-semibold text-xs"
              >
                Confirmar e Restaurar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: PDF Export & Printable Technical Report */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden my-6 max-h-[90vh] flex flex-col">
            {/* Modal Actions Header */}
            <div className="p-4 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between gap-3 shrink-0 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-rose-500" />
                <h3 className="text-sm font-bold text-white">
                  Relatório Técnico de Regras de Monitoramento (PDF)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportRulesCsv}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-colors"
                  title="Baixar planilha CSV com todos os valores e limiares"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Planilha CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / Salvar em PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPdfModal(false)}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="p-8 overflow-y-auto bg-slate-950 text-slate-100 font-sans space-y-6 print:p-0 print:bg-white print:text-black print:max-h-none">
              {/* Document Header */}
              <div className="border-b-2 border-rose-600 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-rose-400 print:text-rose-700 block">
                    Memorial Técnico de Monitoramento &amp; SLA
                  </span>
                  <h1 className="text-xl font-bold text-white print:text-black">
                    Regras e Limiares de Alarme Zabbix
                  </h1>
                  <p className="text-xs text-slate-400 print:text-gray-600">
                    Cliente: <strong>{formData.customer_name}</strong> (ID: {formData.customer_id})
                  </p>
                </div>
                <div className="text-right text-xs font-mono text-slate-400 print:text-gray-600">
                  <div>Data de Emissão: {new Date().toLocaleDateString('pt-BR')}</div>
                  <div>Status: <span className="text-emerald-400 print:text-emerald-700 font-semibold">HOMOLOGADO</span></div>
                </div>
              </div>

              {/* Scope Overview Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-900 print:bg-gray-100 rounded-lg border border-slate-800 print:border-gray-300">
                  <span className="text-[10px] uppercase font-mono text-slate-400 print:text-gray-500 block">CPU Warning / Disaster</span>
                  <span className="text-sm font-bold text-white print:text-black">
                    {formData.business_rules.thresholds.cpu_warning ?? 70}% / {formData.business_rules.thresholds.cpu_critical ?? 90}%
                  </span>
                </div>
                <div className="p-3 bg-slate-900 print:bg-gray-100 rounded-lg border border-slate-800 print:border-gray-300">
                  <span className="text-[10px] uppercase font-mono text-slate-400 print:text-gray-500 block">Memória Livre Mínima</span>
                  <span className="text-sm font-bold text-white print:text-black">
                    {formData.business_rules.thresholds.memory_warning ?? 20}% (Warning) / {formData.business_rules.thresholds.memory_critical ?? 10}% (Disaster)
                  </span>
                </div>
                <div className="p-3 bg-slate-900 print:bg-gray-100 rounded-lg border border-slate-800 print:border-gray-300">
                  <span className="text-[10px] uppercase font-mono text-slate-400 print:text-gray-500 block">Espaço Livre em Disco</span>
                  <span className="text-sm font-bold text-white print:text-black">
                    Livre &lt; {formData.business_rules.thresholds.disk_warning ?? 15}% (Disaster &lt; {formData.business_rules.thresholds.disk_critical ?? 5}%)
                  </span>
                </div>
                <div className="p-3 bg-slate-900 print:bg-gray-100 rounded-lg border border-slate-800 print:border-gray-300">
                  <span className="text-[10px] uppercase font-mono text-slate-400 print:text-gray-500 block">Tabela de Sessões Firewall</span>
                  <span className="text-sm font-bold text-white print:text-black">
                    {formData.business_rules.thresholds.fw_session_warning ?? 80}% (Warning) / {formData.business_rules.thresholds.fw_session_critical ?? 95}% (Disaster)
                  </span>
                </div>
                <div className="p-3 bg-slate-900 print:bg-gray-100 rounded-lg border border-slate-800 print:border-gray-300">
                  <span className="text-[10px] uppercase font-mono text-slate-400 print:text-gray-500 block">Wi-Fi AP Clientes / Canal</span>
                  <span className="text-sm font-bold text-white print:text-black">
                    &gt; {formData.business_rules.thresholds.ap_clients_warning ?? 35} clientes / &gt; {formData.business_rules.thresholds.ap_channel_util_warning ?? 70}% RF
                  </span>
                </div>
                <div className="p-3 bg-slate-900 print:bg-gray-100 rounded-lg border border-slate-800 print:border-gray-300">
                  <span className="text-[10px] uppercase font-mono text-slate-400 print:text-gray-500 block">Link WAN Saturação &amp; Latência</span>
                  <span className="text-sm font-bold text-white print:text-black">
                    &gt; {formData.business_rules.thresholds.link_warning_pct ?? 70}% / &gt; {formData.business_rules.thresholds.link_latency_warning ? formData.business_rules.thresholds.link_latency_warning * 1000 : 100} ms
                  </span>
                </div>
              </div>

              {/* All Technical Thresholds Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-rose-400 print:text-rose-700 uppercase tracking-wider">
                  Especificação Completa dos Parâmetros Monitorados
                </h4>
                <div className="border border-slate-800 print:border-gray-300 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 print:bg-gray-200 text-slate-400 print:text-gray-700 font-mono text-[11px]">
                      <tr>
                        <th className="p-2.5">Escopo Técnico</th>
                        <th className="p-2.5">Parâmetro / Macro</th>
                        <th className="p-2.5">Limiar Warning</th>
                        <th className="p-2.5">Limiar Disaster / Crítico</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 print:divide-gray-200">
                      <tr>
                        <td className="p-2.5 font-medium">Servidores &amp; VMs</td>
                        <td className="p-2.5 font-mono text-slate-300 print:text-gray-800">CPU &amp; Memória RAM</td>
                        <td className="p-2.5">{formData.business_rules.thresholds.cpu_warning ?? 70}% / Livre &lt; {formData.business_rules.thresholds.memory_warning ?? 20}%</td>
                        <td className="p-2.5 text-rose-400 print:text-rose-700">{formData.business_rules.thresholds.cpu_critical ?? 90}% / Livre &lt; {formData.business_rules.thresholds.memory_critical ?? 10}%</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium">Storage &amp; Discos</td>
                        <td className="p-2.5 font-mono text-slate-300 print:text-gray-800">Espaço em Disco Local/SAN</td>
                        <td className="p-2.5">Livre &lt; {formData.business_rules.thresholds.disk_warning ?? 15}%</td>
                        <td className="p-2.5 text-rose-400 print:text-rose-700">Livre &lt; {formData.business_rules.thresholds.disk_critical ?? 5}%</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium">Firewalls de Borda</td>
                        <td className="p-2.5 font-mono text-slate-300 print:text-gray-800">Tabela de Sessões &amp; Túneis VPN</td>
                        <td className="p-2.5">{formData.business_rules.thresholds.fw_session_warning ?? 80}% sessões / Túneis &lt; {formData.business_rules.thresholds.vpn_tunnel_warning ?? 1}</td>
                        <td className="p-2.5 text-rose-400 print:text-rose-700">{formData.business_rules.thresholds.fw_session_critical ?? 95}% sessões</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium">Access Points Wi-Fi</td>
                        <td className="p-2.5 font-mono text-slate-300 print:text-gray-800">Densidade Clientes &amp; RF</td>
                        <td className="p-2.5">{formData.business_rules.thresholds.ap_clients_warning ?? 35} clientes / {formData.business_rules.thresholds.ap_channel_util_warning ?? 70}% RF</td>
                        <td className="p-2.5 text-rose-400 print:text-rose-700">Uptime &lt; {formData.business_rules.thresholds.uptime_reboot_threshold ?? 600}s (Reboot)</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium">Links de Internet / WAN</td>
                        <td className="p-2.5 font-mono text-slate-300 print:text-gray-800">Saturação, Perda &amp; Latência</td>
                        <td className="p-2.5">&gt; {formData.business_rules.thresholds.link_warning_pct ?? 70}% saturação / &gt; {formData.business_rules.thresholds.link_loss_warning ?? 10}% perda</td>
                        <td className="p-2.5 text-rose-400 print:text-rose-700">&gt; {formData.business_rules.thresholds.link_critical_pct ?? 90}% saturação crítica</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium">Bancos de Dados</td>
                        <td className="p-2.5 font-mono text-slate-300 print:text-gray-800">Buffer Cache &amp; Page Life</td>
                        <td className="p-2.5">Cache &lt; {formData.business_rules.thresholds.db_buffer_hit_warning ?? 95}% / PLE &lt; {formData.business_rules.thresholds.db_page_life_warning ?? 300}s</td>
                        <td className="p-2.5 text-rose-400 print:text-rose-700">Log Usado &gt; {100 - (formData.business_rules.thresholds.db_log_free_warning ?? 20)}% / Slow Query &gt; {formData.business_rules.thresholds.slow_query_threshold ?? 5}s</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium">Aplicações Web</td>
                        <td className="p-2.5 font-mono text-slate-300 print:text-gray-800">Tempo de Resposta &amp; SSL</td>
                        <td className="p-2.5">&gt; {formData.business_rules.thresholds.web_response_time_warning ?? 3}s / SSL &lt; {formData.business_rules.thresholds.ssl_expiry_days_warning ?? 30} dias</td>
                        <td className="p-2.5 text-rose-400 print:text-rose-700">Erros 5xx &gt; {formData.business_rules.thresholds.web_5xx_error_threshold ?? 10} em 5m</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium">Virtualização (VMware/Hyper-V)</td>
                        <td className="p-2.5 font-mono text-slate-300 print:text-gray-800">CPU / RAM VM &amp; Datastore</td>
                        <td className="p-2.5">CPU &gt; {formData.business_rules.thresholds.vm_cpu_warning ?? 80}% / Datastore Livre &lt; {formData.business_rules.thresholds.datastore_free_warning ?? 20}%</td>
                        <td className="p-2.5 text-rose-400 print:text-rose-700">RAM &gt; {formData.business_rules.thresholds.vm_memory_warning ?? 85}% / Latência &gt; {formData.business_rules.thresholds.storage_latency_warning ?? 20}ms</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium">Containers Docker</td>
                        <td className="p-2.5 font-mono text-slate-300 print:text-gray-800">CPU, RAM &amp; Restarts</td>
                        <td className="p-2.5">CPU &gt; {formData.business_rules.thresholds.container_cpu_warning ?? 80}% / RAM &gt; {formData.business_rules.thresholds.container_memory_warning ?? 85}%</td>
                        <td className="p-2.5 text-rose-400 print:text-rose-700">Restarts &gt; {formData.business_rules.thresholds.container_restart_threshold ?? 3} em 15m</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium">Switches de Rede</td>
                        <td className="p-2.5 font-mono text-slate-300 print:text-gray-800">Porta LAN, CRC &amp; PoE</td>
                        <td className="p-2.5">Porta &gt; {formData.business_rules.thresholds.interface_util_warning ?? 80}% / Erros CRC &gt; {formData.business_rules.thresholds.interface_error_warning ?? 100}</td>
                        <td className="p-2.5 text-rose-400 print:text-rose-700">PoE Power &gt; {formData.business_rules.thresholds.poe_power_warning ?? 80}%</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium">LDAP &amp; Active Directory</td>
                        <td className="p-2.5 font-mono text-slate-300 print:text-gray-800">Tempo de Query LDAP</td>
                        <td className="p-2.5">Query &gt; {formData.business_rules.thresholds.ldap_query_time_warning ?? 2}s</td>
                        <td className="p-2.5 text-rose-400 print:text-rose-700">Falha de Autenticação / Replicação</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Custom Threshold Items if any */}
              {formData.business_rules.thresholds.custom_items && formData.business_rules.thresholds.custom_items.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-rose-400 print:text-rose-700 uppercase tracking-wider">
                    Limiares Customizados do Cliente
                  </h4>
                  <div className="border border-slate-800 print:border-gray-300 rounded-lg p-3 space-y-1.5 text-xs">
                    {formData.business_rules.thresholds.custom_items.map((ci) => (
                      <div key={ci.id} className="flex items-center justify-between py-1 border-b border-slate-850 print:border-gray-200 last:border-0">
                        <span className="font-semibold text-white print:text-black">{ci.label} ({ci.scope})</span>
                        <span className="font-mono text-amber-300 print:text-amber-800">{ci.macro} = {ci.value} {ci.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Signatures and Validation Section */}
              <div className="pt-8 border-t border-slate-800 print:border-gray-400 grid grid-cols-2 gap-8 text-center text-xs">
                <div className="space-y-2">
                  <div className="border-t border-slate-700 print:border-gray-500 pt-2 font-semibold text-white print:text-black">
                    Engenharia de Monitoramento Zabbix
                  </div>
                  <div className="text-[11px] text-slate-400 print:text-gray-600">
                    Homologação Técnica & Configuração de Templates
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="border-t border-slate-700 print:border-gray-500 pt-2 font-semibold text-white print:text-black">
                    Aprovação do Cliente / Gestão de TI
                  </div>
                  <div className="text-[11px] text-slate-400 print:text-gray-600">
                    {formData.customer_name}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {confirmWipeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-rose-800 rounded-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <AlertOctagon className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Zerar Toda a Aplicação?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Esta ação <strong>apagará todos os clientes, hosts e customizações</strong> salvos no navegador, deixando a aplicação vazia e limpa para um novo projeto do zero.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmWipeModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onWipeAllData();
                  setConfirmWipeModal(false);
                }}
                className="px-4 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-500 font-semibold text-xs"
              >
                Sim, Zerar Tudo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
