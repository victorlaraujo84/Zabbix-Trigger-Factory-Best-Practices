import React, { useState, useMemo } from 'react';
import { Customer, Host, Practice } from '../types';
import { MONITORING_CATEGORIES } from '../data/categories';
import { generateTrigger } from '../utils/triggerGenerator';
import { exportAllData, importAllData } from '../utils/storage';
import {
  FileText,
  Copy,
  Check,
  Download,
  Upload,
  Printer,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';

interface DocumentationViewProps {
  customer: Customer;
  customers: Customer[];
  hosts: Host[];
  practices: Practice[];
  onImportData: (data: { customers: Customer[]; hosts: Host[] }) => void;
}

export const DocumentationView: React.FC<DocumentationViewProps> = ({
  customer,
  customers,
  hosts,
  practices,
  onImportData,
}) => {
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Generate complete markdown document
  const markdownContent = useMemo(() => {
    const lines: string[] = [];

    lines.push(`# Memorial Técnico de Governança Zabbix e Boas Práticas de Monitoramento`);
    lines.push(`**Cliente**: ${customer.customer_name}`);
    lines.push(`**Data de Emissão**: ${new Date().toLocaleDateString('pt-BR')}`);
    lines.push(`**Janela Crítica de Atendimento**: ${customer.business_rules.critical_hours}`);
    lines.push(`**Escopo**: 13 Categorias de Monitoramento Homologadas`);
    lines.push(``);
    lines.push(`---`);
    lines.push(``);

    lines.push(`## 1. Princípio de Validação Oficial`);
    lines.push(`Todas as expressões e itens deste memorial foram homologados sob as diretrizes oficiais do Zabbix (templates oficiais, item keys homologados e boas práticas da comunidade). Requisitos não adequados para monitoramento em Zabbix foram explicitamente segregados com recomendação de ferramentas especializadas.`);
    lines.push(``);

    lines.push(`## 2. Inventário de Hosts e Ativos`);
    lines.push(`| Hostname | Nome de Exibição | Categoria | Modelo de Monitoramento | IP / FQDN | Criticidade |`);
    lines.push(`|---|---|---|---|---|---|`);
    hosts.forEach((h) => {
      const cat = MONITORING_CATEGORIES.find((c) => c.id === h.host_type);
      const model = h.monitoring_model || 'Agent Zabbix';
      lines.push(`| \`${h.hostname}\` | ${h.display_name} | ${cat?.short_title || h.host_type} | **${model}** | \`${h.ip}\` | ${h.criticality.toUpperCase()} |`);
    });
    lines.push(``);

    lines.push(`## 3. Matriz de Severidades e Limiares Técnicos Homologados`);
    lines.push(`| Escopo Técnico | Parâmetro / Métrica | Macro Zabbix | Limiar Warning | Limiar Crítico / Disaster | Unidade |`);
    lines.push(`|---|---|---|---|---|---|`);
    const t = customer.business_rules.thresholds;
    lines.push(`| Servidores & SO | Utilização de CPU | \`{$CPU_WARN}\` / \`{$CPU_CRIT}\` | **${t.cpu_warning ?? 70}%** | **${t.cpu_critical ?? 90}%** | % |`);
    lines.push(`| Servidores & SO | Memória RAM Livre | \`{$MEM_FREE_WARN}\` / \`{$MEM_FREE_CRIT}\` | **${t.memory_warning ?? 20}%** | **${t.memory_critical ?? 10}%** | % livre |`);
    lines.push(`| Storage & Discos | Espaço Livre em Disco | \`{$DISK_WARN}\` / \`{$DISK_CRIT}\` | **${t.disk_warning ?? 15}%** | **${t.disk_critical ?? 5}%** | % livre |`);
    lines.push(`| Bancos de Dados | Buffer Cache Hit Ratio | \`{$DB_BUFFER_HIT_WARN}\` | **${t.db_buffer_hit_warning ?? 95}%** | N/A | % |`);
    lines.push(`| Bancos de Dados | Page Life Expectancy | \`{$DB_PAGE_LIFE_WARN}\` | **${t.db_page_life_warning ?? 300}s** | N/A | segundos |`);
    lines.push(`| Bancos de Dados | Espaço de Log Usado | \`{$DB_LOG_USED_WARN}\` | **${t.db_log_free_warning ?? 20}%** | N/A | % |`);
    lines.push(`| Bancos de Dados | Slow Queries (Duração) | \`{$SLOW_QUERY_THRESHOLD}\` | **${t.slow_query_threshold ?? 5}s** | N/A | segundos |`);
    lines.push(`| Firewalls de Borda | Tabela de Sessões | \`{$FW_SESSION_WARN}\` / \`{$FW_SESSION_CRIT}\` | **${t.fw_session_warning ?? 80}%** | **${t.fw_session_critical ?? 95}%** | % |`);
    lines.push(`| Firewalls de Borda | Túneis VPN IPsec | \`{$VPN_TUNNEL_UP}\` | **${t.vpn_tunnel_warning ?? 1}** | 0 (Down) | status |`);
    lines.push(`| Access Points Wi-Fi | Densidade de Clientes | \`{$AP_CLIENTS_WARN}\` | **${t.ap_clients_warning ?? 35}** | N/A | clientes |`);
    lines.push(`| Access Points Wi-Fi | Ocupação de Canal RF | \`{$AP_CHANNEL_UTIL_WARN}\` | **${t.ap_channel_util_warning ?? 70}%** | N/A | % |`);
    lines.push(`| Access Points Wi-Fi | Uptime Reboot Inesperado | \`{$UPTIME_REBOOT}\` | **${t.uptime_reboot_threshold ?? 600}s** | N/A | segundos |`);
    lines.push(`| Links WAN & Internet | Saturação de Banda | \`{$LINK_SAT_WARN}\` / \`{$LINK_SAT_CRIT}\` | **${t.link_warning_pct ?? 70}%** | **${t.link_critical_pct ?? 90}%** | % |`);
    lines.push(`| Links WAN & Internet | Perda de Pacotes | \`{$LINK_LOSS_WARN}\` | **${t.link_loss_warning ?? 10}%** | N/A | % |`);
    lines.push(`| Links WAN & Internet | Latência de Pacotes | \`{$LINK_LATENCY_WARN}\` | **${t.link_latency_warning ? t.link_latency_warning * 1000 : 100}ms** | N/A | ms |`);
    lines.push(`| Servidores Web | Tempo de Resposta HTTP | \`{$WEB_RESP_WARN}\` | **${t.web_response_time_warning ?? 3}s** | N/A | segundos |`);
    lines.push(`| Servidores Web | Erros 5xx em 5min | \`{$WEB_5XX_WARN}\` | **${t.web_5xx_error_threshold ?? 10}** | N/A | erros |`);
    lines.push(`| Servidores Web | Validade Certificado SSL | \`{$SSL_DAYS_WARN}\` | **${t.ssl_expiry_days_warning ?? 30} dias** | 7 dias | dias |`);
    lines.push(`| Virtualização | CPU / RAM da VM | \`{$VM_CPU_WARN}\` / \`{$VM_MEM_WARN}\` | **${t.vm_cpu_warning ?? 80}% / ${t.vm_memory_warning ?? 85}%** | N/A | % |`);
    lines.push(`| Virtualização | Datastore Livre | \`{$DATASTORE_WARN}\` | **${t.datastore_free_warning ?? 20}%** | N/A | % livre |`);
    lines.push(`| Containers Docker | CPU / RAM Container | \`{$CONTAINER_CPU_WARN}\` | **${t.container_cpu_warning ?? 80}% / ${t.container_memory_warning ?? 85}%** | N/A | % |`);
    lines.push(`| Containers Docker | Restarts em 15m | \`{$CONTAINER_RESTART_WARN}\` | **${t.container_restart_threshold ?? 3}** | N/A | restarts |`);
    lines.push(`| Switches LAN | Porta / Erros CRC | \`{$IF_UTIL_WARN}\` / \`{$IF_ERRORS_WARN}\` | **${t.interface_util_warning ?? 80}% / ${t.interface_error_warning ?? 100}** | N/A | % / pkts |`);
    lines.push(`| Switches LAN | Consumo PoE | \`{$POE_POWER_WARN}\` | **${t.poe_power_warning ?? 80}%** | N/A | % |`);
    lines.push(`| LDAP / AD | Tempo de Query | \`{$LDAP_QUERY_WARN}\` | **${t.ldap_query_time_warning ?? 2}s** | N/A | segundos |`);
    if (t.custom_items && t.custom_items.length > 0) {
      t.custom_items.forEach((ci) => {
        lines.push(`| Personalizado (${ci.scope}) | ${ci.label} | \`${ci.macro}\` | **${ci.value} ${ci.unit || ''}** | N/A | ${ci.unit || '-'} |`);
      });
    }
    lines.push(``);

    lines.push(`## 4. Catálogo Detalhado de Triggers por Categoria`);
    lines.push(``);

    MONITORING_CATEGORIES.forEach((cat) => {
      const catPractices = practices.filter((p) => p.category === cat.id);
      if (catPractices.length === 0) return;

      lines.push(`### ${cat.name}`);
      lines.push(`**Template Oficial Zabbix**: \`${cat.official_template_name}\``);
      lines.push(``);

      catPractices.forEach((p, idx) => {
        // Sample host for expression example
        const sampleHost = hosts.find((h) => h.host_type === cat.id) || hosts[0];
        const trig = generateTrigger(p, sampleHost, customer);

        lines.push(`#### ${idx + 1}. ${p.title}`);
        lines.push(`- **Item Key**: \`${p.item_key}\` (${p.item_type})`);
        lines.push(`- **Validação Oficial**: ${p.validation.status_label}`);
        lines.push(`- **Severidade**: \`${trig.severity}\``);
        lines.push(`- **O Que Monitora**: ${trig.accessible_explanation.what_monitors}`);
        lines.push(`- **Quando Vai Alarmar**: ${trig.accessible_explanation.when_triggers}`);
        lines.push(`- **O Que Significa na Prática**: ${trig.accessible_explanation.business_impact}`);
        lines.push(`- **Expressão do Problema**:`);
        lines.push(`  \`\`\`zabbix`);
        lines.push(`  ${trig.expression}`);
        lines.push(`  \`\`\``);
        if (trig.recovery_expression) {
          lines.push(`- **Expressão de Recuperação (Histerese)**:`);
          lines.push(`  \`\`\`zabbix`);
          lines.push(`  ${trig.recovery_expression}`);
          lines.push(`  \`\`\``);
          lines.push(`- **Condição de Retorno ao Normal**: ${trig.accessible_explanation.recovery_condition}`);
        }
        lines.push(`- **Dados Operacionais**: \`${trig.operational_data}\``);
        lines.push(`- **Ação Operacional**: ${p.recommended_action}`);
        if (p.validation.limitations) {
          lines.push(`- **Limitação / Requisito Técnico**: ${p.validation.limitations}`);
        }
        lines.push(``);
      });
    });

    lines.push(`---`);
    lines.push(`*Documento gerado automaticamente pela Fábrica de Triggers Zabbix em conformidade com o edital.*`);

    return lines.join('\n');
  }, [customer, hosts, practices]);

  const handleCopyMd = () => {
    navigator.clipboard.writeText(markdownContent);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  };

  const handleDownloadMd = () => {
    // Prepend UTF-8 BOM so text editors and Windows/Mac open Portuguese accents correctly
    const blob = new Blob(['\uFEFF' + markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Memorial_Zabbix_${customer.customer_name.replace(/\s+/g, '_')}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const jsonStr = exportAllData(customers, hosts);
    // Prepend UTF-8 BOM
    const blob = new Blob(['\uFEFF' + jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Backup_Cenario_Zabbix_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importAllData(content);
      if (res.success && res.data) {
        onImportData(res.data);
        setImportStatus(`Sucesso: ${res.message}`);
      } else {
        setImportStatus(`Falha: ${res.message}`);
      }
      setTimeout(() => setImportStatus(null), 4000);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Action Bar */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-rose-500" />
            Memorial Técnico & Exportação Documental
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Relatório técnico completo estruturado para auditoria do edital, cópia para documentação interna e backup em JSON.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopyMd}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors inline-flex items-center gap-1.5"
          >
            {copiedMd ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Markdown Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar .MD</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadMd}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar .MD</span>
          </button>

          <button
            onClick={handleExportJson}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Backup JSON</span>
          </button>

          <label className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>Restaurar JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportJsonFile}
              className="hidden"
            />
          </label>

          <button
            onClick={handlePrint}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm transition-colors inline-flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir / Salvar PDF</span>
          </button>
        </div>
      </div>

      {importStatus && (
        <div className="p-3 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-cyan-300">
          {importStatus}
        </div>
      )}

      {/* Rendered Preview of the Technical Memorial */}
      <div className="p-8 bg-slate-900 border border-slate-800 rounded-xl space-y-6 text-slate-200 text-xs sm:text-sm leading-relaxed font-sans shadow-sm print:bg-white print:text-black print:border-none print:p-0">
        <div className="border-b border-slate-800 pb-4 print:border-gray-300">
          <div className="flex items-center gap-2 text-rose-400 print:text-red-700 font-mono text-xs font-semibold uppercase">
            <ShieldCheck className="w-4 h-4" />
            Relatório de Conformidade Técnica do Edital
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white print:text-black mt-1">
            Memorial Técnico de Governança Zabbix e Boas Práticas
          </h1>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-400 print:text-gray-600 font-mono">
            <span>Cliente: <strong>{customer.customer_name}</strong></span>
            <span>Data: <strong>{new Date().toLocaleDateString('pt-BR')}</strong></span>
            <span>Horário Crítico: <strong>{customer.business_rules.critical_hours}</strong></span>
          </div>
        </div>

        {/* Section 1: Inventário */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-white print:text-black border-b border-slate-800 pb-1 print:border-gray-200">
            1. Inventário de Hosts e Ativos Monitorados
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 print:bg-gray-100 text-slate-400 print:text-gray-700 font-mono">
                <tr>
                  <th className="py-2 px-3">Hostname</th>
                  <th className="py-2 px-3">Nome Amigável</th>
                  <th className="py-2 px-3">Categoria</th>
                  <th className="py-2 px-3">Endereço IP</th>
                  <th className="py-2 px-3">Criticidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-gray-200 font-mono text-[11px]">
                {hosts.map((h) => (
                  <tr key={h.host_id}>
                    <td className="py-2 px-3 font-bold text-white print:text-black">{h.hostname}</td>
                    <td className="py-2 px-3 text-slate-300 print:text-gray-800">{h.display_name}</td>
                    <td className="py-2 px-3 text-slate-400">{h.host_type}</td>
                    <td className="py-2 px-3 text-slate-300">{h.ip}</td>
                    <td className="py-2 px-3 font-semibold uppercase">{h.criticality}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Triggers Detail */}
        <div className="space-y-6 pt-4">
          <h2 className="text-base font-bold text-white print:text-black border-b border-slate-800 pb-1 print:border-gray-200">
            2. Triggers Homologadas por Categoria (13 Escopos do Edital)
          </h2>

          {MONITORING_CATEGORIES.map((cat) => {
            const catPractices = practices.filter((p) => p.category === cat.id);
            if (catPractices.length === 0) return null;
            return (
              <div key={cat.id} className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-100 print:text-black">
                    {cat.name} (Edital {cat.edital_section})
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400 print:text-gray-600">
                    Template: {cat.official_template_name}
                  </span>
                </div>

                <div className="space-y-3">
                  {catPractices.map((p) => {
                    const sampleHost = hosts.find((h) => h.host_type === cat.id) || hosts[0];
                    const trig = generateTrigger(p, sampleHost, customer);
                    return (
                      <div
                        key={p.id}
                        className="p-3.5 bg-slate-950 print:bg-gray-50 border border-slate-800 print:border-gray-300 rounded-lg space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between font-mono">
                          <strong className="text-slate-100 print:text-black">{p.title}</strong>
                          <span className="text-slate-400 print:text-gray-600 font-semibold">
                            Sev: {trig.severity} · {p.validation.status_label}
                          </span>
                        </div>

                        <div className="font-mono text-[11px] text-amber-300 print:text-amber-800 bg-slate-900 print:bg-gray-100 p-2 rounded">
                          Expressão: {trig.expression}
                        </div>

                        {trig.recovery_expression && (
                          <div className="font-mono text-[11px] text-emerald-300 print:text-emerald-800 bg-slate-900 print:bg-gray-100 p-2 rounded">
                            Recuperação: {trig.recovery_expression}
                          </div>
                        )}

                        <div className="p-2.5 bg-slate-900/60 print:bg-gray-100 rounded text-[11px] space-y-1">
                          <div>
                            <strong className="text-slate-300 print:text-gray-900">🎯 O Que Monitora: </strong>
                            <span className="text-slate-300 print:text-gray-800">{trig.accessible_explanation.what_monitors}</span>
                          </div>
                          <div>
                            <strong className="text-amber-400 print:text-amber-800">⚠️ Quando Alarma: </strong>
                            <span className="text-slate-300 print:text-gray-800">{trig.accessible_explanation.when_triggers}</span>
                          </div>
                          <div>
                            <strong className="text-rose-400 print:text-red-800">💡 O Que Quer Dizer na Prática: </strong>
                            <span className="text-slate-300 print:text-gray-800">{trig.accessible_explanation.business_impact}</span>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-400 print:text-gray-600">
                          <strong>Ação Operacional:</strong> {p.recommended_action}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
