import React, { useState } from 'react';
import { Host, HostTypeId, MonitoringModel } from '../types';
import { MONITORING_CATEGORIES } from '../data/categories';
import {
  Server,
  Plus,
  Trash2,
  Edit2,
  ArrowRight,
  Search,
  Filter,
  Check,
  X,
  Download,
  Upload,
  FileSpreadsheet,
  Activity,
  Cpu,
  Radio,
} from 'lucide-react';

interface HostInventoryViewProps {
  hosts: Host[];
  onSaveHosts: (updated: Host[]) => void;
  onSelectHostForFactory: (hostId: string) => void;
}

export const HostInventoryView: React.FC<HostInventoryViewProps> = ({
  hosts,
  onSaveHosts,
  onSelectHostForFactory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [monitoringFilter, setMonitoringFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHost, setEditingHost] = useState<Host | null>(null);
  const [importNotification, setImportNotification] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Download Modelo CSV with UTF-8 BOM standard
  const handleDownloadTemplateCsv = () => {
    const csvLines = [
      'hostname,display_name,category,ip,criticality,monitoring_model,notes',
      'FW-EDGE-01,Firewall FortiGate Matriz,firewalls,192.168.1.1,critica,SNMP,FortiGate 100F HA Master',
      'SW-CORE-01,Switch Core Cisco Catalyst,switches,192.168.1.254,alta,SNMP,Cisco Catalyst 9300',
      'AP-FLOOR-2,Access Point Wi-Fi 2 Andar,access_points,192.168.20.10,media,SNMP,Aruba AP-515 Wi-Fi 6',
      'SRV-PRD-DB01,Banco de Dados MySQL Principal,mysql,192.168.10.15,critica,Agent Zabbix,Cluster master InnoDB',
      'SRV-WEB-NGINX,Servidor Web Frontend,web,192.168.10.20,alta,Agent Zabbix,Nginx Reverse Proxy',
      'VM-ESXI-CLUSTER,Host VMware ESXi 01,vmware,192.168.5.10,alta,SNMP,vSphere 7.0 Cluster',
      'DOCKER-NODE-01,Host Docker Swarm Worker,docker,192.168.10.50,alta,Agent Zabbix,Zabbix Agent 2 container plugin',
      'SQL-ERP-SRV,Servidor Microsoft SQL Server,mssql,192.168.10.18,critica,Agent Zabbix,ERP Protheus DB AlwaysOn',
      'LINK-WAN-CLARO,Link Internet Principal Claro,internet_links,200.180.10.2,critica,ICMP PING,Fibra 500Mbps Dedicado',
      'GW-BKP-LINK,Gateway Backup Satélite,internet_links,200.180.10.6,alta,ICMP PING,Link contingência Starlink',
    ];

    // UTF-8 BOM ensures Excel and external tools interpret Brazilian Portuguese characters and headers properly
    const blob = new Blob(['\uFEFF' + csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'modelo_inventario_hosts_zabbix.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export current hosts to CSV with UTF-8 BOM standard
  const handleExportCurrentCsv = () => {
    const lines = ['hostname,display_name,category,ip,criticality,monitoring_model,notes,custom_macros'];
    hosts.forEach((h) => {
      const cleanNotes = (h.notes || '').replace(/[\r\n,]/g, ' ');
      const cleanModel = h.monitoring_model || 'Agent Zabbix';
      const cleanMacros = h.custom_macro_overrides
        ? Object.entries(h.custom_macro_overrides)
            .map(([k, v]) => `${k}=${v}`)
            .join('; ')
        : '';
      lines.push(
        `"${h.hostname}","${h.display_name}","${h.host_type}","${h.ip}","${h.criticality}","${cleanModel}","${cleanNotes}","${cleanMacros}"`
      );
    });

    // UTF-8 BOM prefix
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `inventario_hosts_zabbix_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import CSV with UTF-8 reader explicitly
  const handleImportCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;

        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length <= 1) {
          alert('Arquivo CSV vazio ou sem dados suficientes.');
          return;
        }

        // Determine delimiter (, or ;)
        const headerLine = lines[0].replace(/^\uFEFF/, ''); // strip BOM if present
        const delimiter = headerLine.includes(';') ? ';' : ',';
        const headers = headerLine.split(delimiter).map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));

        const idxHostname = headers.findIndex((h) => h === 'hostname' || h === 'host');
        const idxDisplayName = headers.findIndex((h) => h === 'display_name' || h === 'nome' || h === 'name');
        const idxCategory = headers.findIndex((h) => h === 'category' || h === 'categoria' || h === 'tipo');
        const idxIp = headers.findIndex((h) => h === 'ip' || h === 'ip_address' || h === 'endereco');
        const idxCriticality = headers.findIndex((h) => h === 'criticality' || h === 'criticidade');
        const idxModel = headers.findIndex(
          (h) =>
            h === 'monitoring_model' ||
            h === 'modelo_monitoramento' ||
            h === 'modelo' ||
            h === 'metodo' ||
            h === 'tipo_coleta'
        );
        const idxNotes = headers.findIndex((h) => h === 'notes' || h === 'notas' || h === 'descricao');

        if (idxHostname === -1) {
          alert('Formato inválido: coluna "hostname" não encontrada no cabeçalho do CSV.');
          return;
        }

        const validCatIds = new Set(MONITORING_CATEGORIES.map((c) => c.id));
        const importedHosts: Host[] = [];

        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(delimiter).map((val) => val.trim().replace(/^["']|["']$/g, ''));
          if (!row[idxHostname]) continue;

          const rawHost = row[idxHostname].toUpperCase();
          const rawDisplay = idxDisplayName !== -1 && row[idxDisplayName] ? row[idxDisplayName] : rawHost;
          let rawCat: HostTypeId = 'vmware';
          if (idxCategory !== -1 && row[idxCategory]) {
            const catCandidate = row[idxCategory].toLowerCase() as HostTypeId;
            if (validCatIds.has(catCandidate)) {
              rawCat = catCandidate;
            } else {
              const matched = MONITORING_CATEGORIES.find(
                (c) =>
                  c.short_title.toLowerCase().includes(catCandidate) || c.id.toLowerCase().includes(catCandidate)
              );
              if (matched) rawCat = matched.id;
            }
          }

          const rawIp = idxIp !== -1 && row[idxIp] ? row[idxIp] : '127.0.0.1';
          let rawCrit: 'baixa' | 'media' | 'alta' | 'critica' = 'alta';
          if (idxCriticality !== -1 && row[idxCriticality]) {
            const critLower = row[idxCriticality].toLowerCase();
            if (['baixa', 'media', 'alta', 'critica'].includes(critLower)) {
              rawCrit = critLower as any;
            }
          }

          // Parse monitoring model
          let rawModel: MonitoringModel = 'Agent Zabbix';
          if (idxModel !== -1 && row[idxModel]) {
            const m = row[idxModel].toLowerCase();
            if (m.includes('snmp')) rawModel = 'SNMP';
            else if (m.includes('icmp') || m.includes('ping')) rawModel = 'ICMP PING';
            else if (m.includes('agent') || m.includes('agente')) rawModel = 'Agent Zabbix';
            else if (m.includes('hibrid') || m.includes('híbrid')) rawModel = 'Híbrido (Agent + SNMP)';
            else if (m.includes('ipmi')) rawModel = 'IPMI';
            else if (m.includes('jmx') || m.includes('web')) rawModel = 'JMX / Web';
          } else {
            // infer default based on category if not provided
            if (rawCat === 'network_switch' || rawCat === 'firewall' || rawCat === 'access_point' || rawCat === 'vmware') {
              rawModel = 'SNMP';
            } else if (rawCat === 'internet_link') {
              rawModel = 'ICMP PING';
            } else {
              rawModel = 'Agent Zabbix';
            }
          }

          const rawNotes = idxNotes !== -1 && row[idxNotes] ? row[idxNotes] : 'Importado via CSV (UTF-8)';

          importedHosts.push({
            host_id: `host-csv-${Date.now()}-${i}`,
            customer_id: 'cust-firjan-001',
            hostname: rawHost,
            display_name: rawDisplay,
            host_type: rawCat,
            ip: rawIp,
            criticality: rawCrit,
            monitoring_model: rawModel,
            notes: rawNotes,
          });
        }

        if (importedHosts.length === 0) {
          alert('Nenhum host válido encontrado no CSV.');
          return;
        }

        const shouldReplace = window.confirm(
          `Foram identificados ${importedHosts.length} hosts no arquivo CSV.\n\nClique em OK para ADICIONAR aos hosts existentes, ou Cancelar para substituir todo o inventário.`
        );

        let finalHosts: Host[];
        if (shouldReplace) {
          finalHosts = [...importedHosts, ...hosts];
        } else {
          finalHosts = importedHosts;
        }

        onSaveHosts(finalHosts);
        setImportNotification(
          `${importedHosts.length} hosts importados com sucesso com modelo de monitoramento e codificação UTF-8 padrão!`
        );
        setTimeout(() => setImportNotification(null), 5000);
      } catch (err: any) {
        alert('Erro ao processar CSV: ' + err.message);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    // Standard UTF-8 reading
    reader.readAsText(file, 'UTF-8');
  };

  // Form State
  const [formHostname, setFormHostname] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formHostType, setFormHostType] = useState<HostTypeId>('vmware');
  const [formIp, setFormIp] = useState('');
  const [formCriticality, setFormCriticality] = useState<'baixa' | 'media' | 'alta' | 'critica'>('alta');
  const [formMonitoringModel, setFormMonitoringModel] = useState<MonitoringModel>('Agent Zabbix');
  const [formNotes, setFormNotes] = useState('');

  const openNewModal = () => {
    setEditingHost(null);
    setFormHostname('');
    setFormDisplayName('');
    setFormHostType('vmware');
    setFormIp('');
    setFormCriticality('alta');
    setFormMonitoringModel('Agent Zabbix');
    setFormNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (h: Host) => {
    setEditingHost(h);
    setFormHostname(h.hostname);
    setFormDisplayName(h.display_name);
    setFormHostType(h.host_type);
    setFormIp(h.ip);
    setFormCriticality(h.criticality);
    setFormMonitoringModel(h.monitoring_model || 'Agent Zabbix');
    setFormNotes(h.notes);
    setIsModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formHostname.trim()) return;

    if (editingHost) {
      const updated = hosts.map((h) =>
        h.host_id === editingHost.host_id
          ? {
              ...h,
              hostname: formHostname.trim().toUpperCase(),
              display_name: formDisplayName.trim(),
              host_type: formHostType,
              ip: formIp.trim(),
              criticality: formCriticality,
              monitoring_model: formMonitoringModel,
              notes: formNotes.trim(),
            }
          : h
      );
      onSaveHosts(updated);
    } else {
      const newHost: Host = {
        host_id: `host-${Date.now()}`,
        customer_id: 'cust-firjan-001',
        hostname: formHostname.trim().toUpperCase(),
        display_name: formDisplayName.trim() || formHostname.trim().toUpperCase(),
        host_type: formHostType,
        ip: formIp.trim() || '127.0.0.1',
        criticality: formCriticality,
        monitoring_model: formMonitoringModel,
        notes: formNotes.trim(),
      };
      onSaveHosts([newHost, ...hosts]);
    }

    setIsModalOpen(false);
  };

  const handleDeleteHost = (hostId: string) => {
    if (confirm('Deseja realmente remover este host do inventário?')) {
      const updated = hosts.filter((h) => h.host_id !== hostId);
      onSaveHosts(updated);
    }
  };

  const filteredHosts = hosts.filter((h) => {
    const matchesCat = categoryFilter === 'all' || h.host_type === categoryFilter;
    const matchesModel =
      monitoringFilter === 'all' || (h.monitoring_model || 'Agent Zabbix') === monitoringFilter;
    const matchesSearch =
      h.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.ip.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (h.monitoring_model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.notes.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesModel && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Hidden File Input for CSV Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportCsvFile}
        accept=".csv,text/csv"
        className="hidden"
      />

      {/* Top Header */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-rose-500" />
            Inventário de Hosts do Cliente
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cadastre ativos com o <strong>Modelo de Monitoramento</strong> (SNMP, ICMP PING ou Agent Zabbix) e codificação padrão UTF-8.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleDownloadTemplateCsv}
            className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-sm"
            title="Baixar planilha/arquivo modelo CSV formatado em UTF-8 com exemplos"
          >
            <Download className="w-3.5 h-3.5 text-rose-400" />
            <span>Download Modelo CSV (UTF-8)</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-xs font-semibold text-rose-300 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/80 rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-sm"
            title="Importar lista de hosts a partir de arquivo CSV UTF-8"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Importar CSV</span>
          </button>

          <button
            onClick={handleExportCurrentCsv}
            className="px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/60 rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-sm"
            title="Exportar inventário atual para CSV formatado em UTF-8 com modelos e macros"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exportar CSV (UTF-8)</span>
          </button>

          <button
            onClick={openNewModal}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm transition-colors inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Host</span>
          </button>
        </div>
      </div>

      {/* Import Notification Banner */}
      {importNotification && (
        <div className="p-3.5 bg-emerald-950/50 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center justify-between gap-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{importNotification}</span>
          </div>
          <button
            onClick={() => setImportNotification(null)}
            className="text-emerald-400 hover:text-white text-xs"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por hostname, IP, modelo de monitoramento (SNMP, Ping, Agent)..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-mono text-[11px]">Modelo:</span>
            <select
              value={monitoringFilter}
              onChange={(e) => setMonitoringFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500 font-medium"
            >
              <option value="all">Todos os Modelos</option>
              <option value="Agent Zabbix">Agent Zabbix</option>
              <option value="SNMP">SNMP</option>
              <option value="ICMP PING">ICMP PING</option>
              <option value="Híbrido (Agent + SNMP)">Híbrido (Agent + SNMP)</option>
              <option value="IPMI">IPMI</option>
              <option value="JMX / Web">JMX / Web</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-mono text-[11px]">Categoria:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500 font-medium"
            >
              <option value="all">Todas as Categorias ({hosts.length})</option>
              {MONITORING_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.short_title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Hosts Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono">
              <tr>
                <th className="py-3 px-4">Hostname Zabbix</th>
                <th className="py-3 px-4">Nome de Exibição</th>
                <th className="py-3 px-4">Categoria do Edital</th>
                <th className="py-3 px-4">Modelo de Monitoramento</th>
                <th className="py-3 px-4">IP / FQDN</th>
                <th className="py-3 px-4">Criticidade</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredHosts.map((h) => {
                const cat = MONITORING_CATEGORIES.find((c) => c.id === h.host_type);
                const model = h.monitoring_model || 'Agent Zabbix';
                return (
                  <tr key={h.host_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {h.hostname}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <div className="font-medium text-slate-200">{h.display_name}</div>
                      {h.notes && (
                        <div className="text-[11px] text-slate-500 line-clamp-1">{h.notes}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {cat?.short_title || h.host_type}
                    </td>
                    {/* Modelo de Monitoramento Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold font-mono border ${
                          model === 'SNMP'
                            ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/80'
                            : model === 'ICMP PING'
                            ? 'bg-amber-950/70 text-amber-300 border-amber-800/80'
                            : model === 'Híbrido (Agent + SNMP)'
                            ? 'bg-purple-950/70 text-purple-300 border-purple-800/80'
                            : model === 'IPMI' || model === 'JMX / Web'
                            ? 'bg-indigo-950/70 text-indigo-300 border-indigo-800/80'
                            : 'bg-cyan-950/70 text-cyan-300 border-cyan-800/80'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            model === 'SNMP'
                              ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                              : model === 'ICMP PING'
                              ? 'bg-amber-400 shadow-sm shadow-amber-400'
                              : model === 'Híbrido (Agent + SNMP)'
                              ? 'bg-purple-400'
                              : 'bg-cyan-400 shadow-sm shadow-cyan-400'
                          }`}
                        />
                        <span>{model}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {h.ip}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                          h.criticality === 'critica'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : h.criticality === 'alta'
                            ? 'bg-orange-950 text-orange-300 border border-orange-800'
                            : h.criticality === 'media'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {h.criticality}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onSelectHostForFactory(h.host_id)}
                          className="px-2.5 py-1 text-xs font-semibold text-rose-400 hover:text-white bg-slate-950 hover:bg-rose-600 border border-slate-800 hover:border-rose-600 rounded transition-colors inline-flex items-center gap-1"
                        >
                          <span>Fábrica</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => openEditModal(h)}
                          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteHost(h.host_id)}
                          className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingHost ? 'Editar Host' : 'Adicionar Novo Host'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-mono block">
                  Hostname Zabbix (exato no frontend): *
                </label>
                <input
                  type="text"
                  required
                  value={formHostname}
                  onChange={(e) => setFormHostname(e.target.value)}
                  placeholder="EX: BLADE-01, SQL-PROD-01"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono uppercase focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-mono block">Nome Amigável / Descritivo:</label>
                <input
                  type="text"
                  value={formDisplayName}
                  onChange={(e) => setFormDisplayName(e.target.value)}
                  placeholder="Ex: Servidor de Aplicação Datacenter RJ"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Categoria do Edital & Modelo de Monitoramento */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-mono block">Categoria do Edital: *</label>
                  <select
                    value={formHostType}
                    onChange={(e) => setFormHostType(e.target.value as HostTypeId)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-rose-500 font-medium"
                  >
                    {MONITORING_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-rose-400 font-mono block font-semibold">
                    Modelo de Monitoramento: *
                  </label>
                  <select
                    value={formMonitoringModel}
                    onChange={(e) => setFormMonitoringModel(e.target.value as MonitoringModel)}
                    className="w-full px-3 py-2 bg-slate-950 border border-rose-800/80 rounded-lg text-white focus:outline-none focus:border-rose-500 font-medium text-xs"
                  >
                    <option value="Agent Zabbix">Agent Zabbix (Agente / Agent 2)</option>
                    <option value="SNMP">SNMP (v1 / v2c / v3)</option>
                    <option value="ICMP PING">ICMP PING (fping / Latência)</option>
                    <option value="Híbrido (Agent + SNMP)">Híbrido (Agent + SNMP)</option>
                    <option value="IPMI">IPMI (Gestão Hardware)</option>
                    <option value="JMX / Web">JMX / Web HTTP Agent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-mono block">Endereço IP ou FQDN: *</label>
                  <input
                    type="text"
                    required
                    value={formIp}
                    onChange={(e) => setFormIp(e.target.value)}
                    placeholder="10.0.0.10 ou fqdn.dominio.local"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-mono block">Criticidade:</label>
                  <select
                    value={formCriticality}
                    onChange={(e) => setFormCriticality(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-rose-500 font-medium"
                  >
                    <option value="critica">Crítica (Disaster)</option>
                    <option value="alta">Alta (High)</option>
                    <option value="media">Média (Average)</option>
                    <option value="baixa">Baixa (Warning)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-mono block">Observações Técnicas / Papel:</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ex: Cluster de alta disponibilidade, chassi blade..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-500 font-medium shadow-sm"
                >
                  Salvar Host
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
