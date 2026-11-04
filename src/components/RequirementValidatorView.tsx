import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Wrench,
  Ban,
  Search,
  ArrowRight,
  Copy,
  Check,
  Layers,
  Sparkles,
  ExternalLink,
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  Sliders,
  CheckSquare,
  Square,
  FileCheck,
} from 'lucide-react';
import { validateMonitoringRequirement, ValidationRequirementResult } from '../utils/validationEngine';
import { Customer, ValidationStatus, CustomClientRequirement } from '../types';

interface RequirementValidatorViewProps {
  customer?: Customer;
  customers?: Customer[];
  onSelectCustomer?: (c: Customer) => void;
  onUpdateClientRequirements?: (customerId: string, reqs: CustomClientRequirement[]) => void;
}

const DEFAULT_REQUIREMENTS_MATRIX: CustomClientRequirement[] = [
  // Docker
  { id: 'req-docker-1', req: 'Status do contêiner (running/stopped/paused)', cat: 'Docker', status: 'standard_template', base: 'Template oficial Docker inclui docker.containers.discovery e status', isMandatory: true },
  { id: 'req-docker-2', req: 'Uso de CPU e Memória por contêiner', cat: 'Docker', status: 'standard_template', base: 'Template inclui docker.container_stats com pré-processamento de CPU e memória', isMandatory: true },
  { id: 'req-docker-3', req: 'Disco e volumes do contêiner', cat: 'Docker', status: 'standard_template', base: 'Template inclui storage_objects nativo', isMandatory: false },
  { id: 'req-docker-4', req: 'Tráfego de rede do contêiner', cat: 'Docker', status: 'extended_native', base: 'Template inclui estatísticas de rede via JSON; requer pré-processamento', isMandatory: false },
  { id: 'req-docker-5', req: 'Logs de contêineres', cat: 'Docker', status: 'custom_implementation', base: 'Template Docker não tem coleta de log; requer log[] lendo arquivos mapeados no host', isMandatory: false },
  { id: 'req-docker-6', req: 'Reinício ou crash do contêiner', cat: 'Docker', status: 'standard_template', base: 'Template inclui monitoramento de mudança de estado do contêiner', isMandatory: true },
  { id: 'req-docker-7', req: 'Status do Docker Engine daemon', cat: 'Docker', status: 'extended_native', base: 'Checagem via net.tcp.service checando porta 2375 ou proc.num[dockerd]', isMandatory: true },

  // VMware
  { id: 'req-vmware-1', req: 'Status do Hypervisor ESXi', cat: 'VMware', status: 'standard_template', base: 'Template VMware oficial inclui vmware.hv.status', isMandatory: true },
  { id: 'req-vmware-2', req: 'CPU, memória e rede do Hypervisor', cat: 'VMware', status: 'standard_template', base: 'Template oficial coleta performance counters nativamente', isMandatory: true },
  { id: 'req-vmware-3', req: 'Armazenamento e datastores (tamanho e latência)', cat: 'VMware', status: 'standard_template', base: 'vmware.datastore.size e vmware.datastore.read latency', isMandatory: true },
  { id: 'req-vmware-4', req: 'Status e Uptime da VM', cat: 'VMware', status: 'standard_template', base: 'vmware.vm.powerstate e vmware.vm.uptime', isMandatory: true },
  { id: 'req-vmware-5', req: 'Monitoramento de Snapshots', cat: 'VMware', status: 'extended_native', base: 'Contagem é nativa; idade do snapshot requer item prototype customizado', isMandatory: false },
  { id: 'req-vmware-6', req: 'Monitoramento de replicação de storage', cat: 'VMware', status: 'custom_implementation', base: 'Sem indicador padrão; requer script externo via pyVmomi / VRMS', isMandatory: false },
  { id: 'req-vmware-7', req: 'Monitoramento de status de backup', cat: 'VMware', status: 'custom_implementation', base: 'Sem indicador padrão; requer integração API da ferramenta de backup (Veeam/Commvault)', isMandatory: false },

  // MSSQL
  { id: 'req-mssql-1', req: 'Status do serviço e instância MSSQL', cat: 'MS SQL Server', status: 'standard_template', base: 'Template ODBC checa status de porta TCP e ping', isMandatory: true },
  { id: 'req-mssql-2', req: 'Buffer Cache Hit Ratio e Page Life Expectancy', cat: 'MS SQL Server', status: 'standard_template', base: 'Template ODBC consulta sys.dm_os_performance_counters', isMandatory: true },
  { id: 'req-mssql-3', req: 'Deadlocks por segundo', cat: 'MS SQL Server', status: 'standard_template', base: 'Performance counters de Lock e Deadlocks nativos', isMandatory: true },
  { id: 'req-mssql-4', req: 'Top Queries Lentas', cat: 'MS SQL Server', status: 'extended_native', base: 'Requer consulta SQL customizada sobre DMVs', isMandatory: false },
  { id: 'req-mssql-5', req: 'Status de Backup e Jobs do SQL Agent', cat: 'MS SQL Server', status: 'standard_template', base: 'Template oficial inclui consulta get_last_backup e job status', isMandatory: true },

  // MySQL
  { id: 'req-mysql-1', req: 'Status do serviço (mysql.ping)', cat: 'MySQL', status: 'standard_template', base: 'Template oficial MySQL by Zabbix agent 2 inclui mysql.ping', isMandatory: true },
  { id: 'req-mysql-2', req: 'Conexões ativas e Threads running', cat: 'MySQL', status: 'standard_template', base: 'Status variables nativas do MySQL', isMandatory: true },
  { id: 'req-mysql-3', req: 'Taxa de slow queries', cat: 'MySQL', status: 'standard_template', base: 'Contador Slow_queries com change per second', isMandatory: false },
  { id: 'req-mysql-4', req: 'Histórico de todas as queries (General Log)', cat: 'MySQL', status: 'not_recommended', base: 'Não é boa prática no Zabbix; causa exaustão de disco. Usar Percona PMM', isMandatory: false },

  // Servidores Web
  { id: 'req-web-1', req: 'Disponibilidade HTTP/HTTPS e portas', cat: 'Servidores Web', status: 'standard_template', base: 'net.tcp.service e web.page.get nativos', isMandatory: true },
  { id: 'req-web-2', req: 'Tempo de resposta de página web', cat: 'Servidores Web', status: 'standard_template', base: 'web.page.perf nativo', isMandatory: true },
  { id: 'req-web-3', req: 'Validade de certificado SSL/TLS', cat: 'Servidores Web', status: 'standard_template', base: 'web.certificate.get nativo no Agent 2', isMandatory: true },
  { id: 'req-web-4', req: 'Erros HTTP 5xx / 4xx', cat: 'Servidores Web', status: 'standard_template', base: 'Performance counters ou log parsing de web server', isMandatory: true },

  // M365 & Exchange & AD
  { id: 'req-m365-1', req: 'Estatísticas de uso M365 (Teams/Outlook)', cat: 'Microsoft 365', status: 'standard_template', base: 'Template oficial Microsoft 365 reports by HTTP', isMandatory: false },
  { id: 'req-m365-2', req: 'Service Health e incidentes do M365', cat: 'Microsoft 365', status: 'extended_native', base: 'Requer integração Graph API com App Registration no Azure AD', isMandatory: true },
  { id: 'req-m365-3', req: 'Disponibilidade de e-mail SMTP', cat: 'Correio Eletrônico', status: 'standard_template', base: 'net.tcp.service[smtp] nativo', isMandatory: true },
  { id: 'req-ad-1', req: 'Status do serviço AD NTDS', cat: 'Active Directory', status: 'standard_template', base: 'service.info[NTDS,state] no Agent do Windows', isMandatory: true },
  { id: 'req-ad-2', req: 'Tempo de resposta de query LDAP', cat: 'Active Directory', status: 'extended_native', base: 'Sem item key padrão; requer UserParameter com ldapsearch', isMandatory: false },

  // Rede & Links & Firewalls
  { id: 'req-net-1', req: 'Dispositivo UP/DOWN e interfaces', cat: 'Switches & Rede', status: 'standard_template', base: 'IF-MIB oficial (Interfaces SNMP / Cisco IOS SNMP)', isMandatory: true },
  { id: 'req-net-2', req: 'Deep Packet Inspection (DPI) / PCAP', cat: 'Switches & Rede', status: 'not_recommended', base: 'Não é boa prática no Zabbix. Usar nTop-ng / Zeek / SPAN port', isMandatory: false },
  { id: 'req-ap-1', req: 'Contagem de clientes associados no AP', cat: 'Access Points', status: 'extended_native', base: 'MIB proprietária do fabricante (Aruba/Cisco WLC)', isMandatory: true },
  { id: 'req-fw-1', req: 'Tabela de sessões de Firewall', cat: 'Firewalls', status: 'standard_template', base: 'MIBs oficiais de fabricantes (FortiGate / Palo Alto)', isMandatory: true },
  { id: 'req-link-1', req: 'Latência e Perda de Pacotes Link WAN', cat: 'Links de Internet', status: 'standard_template', base: 'icmpping e icmppingloss nativos do Zabbix', isMandatory: true },
];

export const RequirementValidatorView: React.FC<RequirementValidatorViewProps> = ({
  customer,
  customers,
  onSelectCustomer,
  onUpdateClientRequirements,
}) => {
  const currentCustomerId = customer?.customer_id || 'default';

  // Load client specific requirements
  const [clientRequirements, setClientRequirements] = useState<CustomClientRequirement[]>(() => {
    try {
      const stored = localStorage.getItem(`zabbix_reqs_${currentCustomerId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_REQUIREMENTS_MATRIX;
  });

  // When customer changes externally
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`zabbix_reqs_${currentCustomerId}`);
      if (stored) {
        setClientRequirements(JSON.parse(stored));
      } else {
        setClientRequirements(DEFAULT_REQUIREMENTS_MATRIX);
      }
    } catch {
      setClientRequirements(DEFAULT_REQUIREMENTS_MATRIX);
    }
  }, [currentCustomerId]);

  const saveRequirements = (updated: CustomClientRequirement[]) => {
    setClientRequirements(updated);
    try {
      localStorage.setItem(`zabbix_reqs_${currentCustomerId}`, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    if (onUpdateClientRequirements) {
      onUpdateClientRequirements(currentCustomerId, updated);
    }
  };

  const [inputText, setInputText] = useState('Monitorar logs de contêineres Docker');
  const [validationResult, setValidationResult] = useState<ValidationRequirementResult>(() =>
    validateMonitoringRequirement('Monitorar logs de contêineres Docker')
  );
  const [copiedExpr, setCopiedExpr] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [onlyMandatoryFilter, setOnlyMandatoryFilter] = useState(false);

  // Modal State for Adding Custom Requirement
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingReqId, setEditingReqId] = useState<string | null>(null);
  const [newReqTitle, setNewReqTitle] = useState('');
  const [newReqCategory, setNewReqCategory] = useState('Geral');
  const [newReqStatus, setNewReqStatus] = useState<ValidationStatus>('standard_template');
  const [newReqBase, setNewReqBase] = useState('');
  const [newReqMandatory, setNewReqMandatory] = useState(true);

  const handleValidate = (text: string) => {
    setInputText(text);
    const res = validateMonitoringRequirement(text);
    setValidationResult(res);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedExpr(true);
    setTimeout(() => setCopiedExpr(false), 2000);
  };

  const exampleQueries = [
    { label: 'Docker: Logs de contêineres', query: 'Monitorar logs de contêineres Docker' },
    { label: 'Docker: CPU e Status', query: 'Status e uso de CPU de contêiner Docker' },
    { label: 'MySQL: Histórico de todas as queries', query: 'Armazenar histórico de todas as queries executadas no MySQL' },
    { label: 'Switch: Captura profunda de pacotes (DPI)', query: 'Captura contínua de pacotes e Deep Packet Inspection (DPI) no switch' },
    { label: 'VMware: Status de Backup e Replicação', query: 'Monitoramento de status de backup e replicação de storage VMware' },
    { label: 'SQL Server: Top Queries Lentas', query: 'Top Queries lentas por tempo de CPU no SQL Server' },
    { label: 'M365: Service Health e Incidentes', query: 'Monitorar incidentes e Service Health do Microsoft 365' },
    { label: 'AD: Tempo de consulta LDAP', query: 'Tempo de resposta de consulta LDAP no Active Directory' },
  ];

  const handleOpenAddModal = () => {
    setEditingReqId(null);
    setNewReqTitle('');
    setNewReqCategory('Firewalls');
    setNewReqStatus('standard_template');
    setNewReqBase('Template oficial Zabbix homologado para o cliente');
    setNewReqMandatory(true);
    setIsAddModalOpen(true);
  };

  const handleEditReq = (r: CustomClientRequirement) => {
    setEditingReqId(r.id);
    setNewReqTitle(r.req);
    setNewReqCategory(r.cat);
    setNewReqStatus(r.status);
    setNewReqBase(r.base);
    setNewReqMandatory(r.isMandatory);
    setIsAddModalOpen(true);
  };

  const handleSaveReqForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReqTitle.trim()) return;

    if (editingReqId) {
      const updated = clientRequirements.map((r) =>
        r.id === editingReqId
          ? {
              ...r,
              req: newReqTitle.trim(),
              cat: newReqCategory.trim(),
              status: newReqStatus,
              base: newReqBase.trim(),
              isMandatory: newReqMandatory,
            }
          : r
      );
      saveRequirements(updated);
    } else {
      const newReq: CustomClientRequirement = {
        id: `custom-req-${Date.now()}`,
        req: newReqTitle.trim(),
        cat: newReqCategory.trim(),
        status: newReqStatus,
        base: newReqBase.trim(),
        isMandatory: newReqMandatory,
      };
      saveRequirements([newReq, ...clientRequirements]);
    }
    setIsAddModalOpen(false);
  };

  const handleDeleteReq = (id: string) => {
    if (confirm('Deseja remover este requisito da matriz deste cliente?')) {
      saveRequirements(clientRequirements.filter((r) => r.id !== id));
    }
  };

  const handleToggleMandatory = (id: string) => {
    saveRequirements(
      clientRequirements.map((r) => (r.id === id ? { ...r, isMandatory: !r.isMandatory } : r))
    );
  };

  const handleResetToStandard = () => {
    if (confirm(`Restaurar todos os requisitos da matriz para o padrão inicial do cliente "${customer?.customer_name || 'Atual'}"?`)) {
      saveRequirements(DEFAULT_REQUIREMENTS_MATRIX);
    }
  };

  const filteredMatrix = useMemo(() => {
    return clientRequirements.filter((item) => {
      const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
      const matchesMandatory = !onlyMandatoryFilter || item.isMandatory;
      return matchesStatus && matchesMandatory;
    });
  }, [clientRequirements, filterStatus, onlyMandatoryFilter]);

  // Statistics for this specific client
  const clientStats = useMemo(() => {
    const total = clientRequirements.length;
    const mandatory = clientRequirements.filter((r) => r.isMandatory).length;
    const standard = clientRequirements.filter((r) => r.status === 'standard_template').length;
    const extended = clientRequirements.filter((r) => r.status === 'extended_native').length;
    const custom = clientRequirements.filter((r) => r.status === 'custom_implementation').length;
    const notRecommended = clientRequirements.filter((r) => r.status === 'not_recommended').length;
    const compliantCount = standard + extended;
    const complianceRate = total > 0 ? Math.round((compliantCount / total) * 100) : 100;

    return {
      total,
      mandatory,
      standard,
      extended,
      custom,
      notRecommended,
      complianceRate,
    };
  }, [clientRequirements]);

  const getStatusBadge = (status: ValidationStatus) => {
    switch (status) {
      case 'standard_template':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Padrão em Template</span>
          </span>
        );
      case 'extended_native':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-800">
            <Wrench className="w-3.5 h-3.5" />
            <span>Nativo Estendido</span>
          </span>
        );
      case 'custom_implementation':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-sky-950 text-sky-300 border border-sky-800">
            <Layers className="w-3.5 h-3.5" />
            <span>Implementação Customizada</span>
          </span>
        );
      case 'not_recommended':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-rose-950 text-rose-300 border border-rose-800">
            <Ban className="w-3.5 h-3.5" />
            <span>Não Recomendado no Zabbix</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Client Specific Header & Selector */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-rose-500" />
            <h2 className="text-base font-bold text-white">
              Validador de Requisitos & Viabilidade Zabbix
            </h2>
            {customer && (
              <span className="px-2 py-0.5 rounded bg-rose-950 border border-rose-800 text-xs font-mono text-rose-300">
                Cliente: {customer.customer_name}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Personalizável por cliente: defina requisitos mandatórios, adicione checagens personalizadas e consulte a viabilidade técnica.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {customers && customers.length > 1 && onSelectCustomer && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400">Cliente:</span>
              <select
                value={customer?.customer_id}
                onChange={(e) => {
                  const found = customers.find((c) => c.customer_id === e.target.value);
                  if (found) onSelectCustomer(found);
                }}
                className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
              >
                {customers.map((c) => (
                  <option key={c.customer_id} value={c.customer_id}>
                    {c.customer_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleOpenAddModal}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Requisito do Cliente</span>
          </button>

          <button
            onClick={handleResetToStandard}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors inline-flex items-center gap-1.5"
            title="Restaurar matriz de requisitos para o padrão"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Restaurar Padrão</span>
          </button>
        </div>
      </div>

      {/* Client Compliance Metrics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <span className="text-slate-400 font-mono text-[10px] uppercase block">Aderência Técnica</span>
          <div className="text-xl font-bold text-emerald-400 font-mono">
            {clientStats.complianceRate}%
          </div>
          <span className="text-[11px] text-slate-500">Nativo / Estendido</span>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <span className="text-slate-400 font-mono text-[10px] uppercase block">Total de Requisitos</span>
          <div className="text-xl font-bold text-white font-mono">
            {clientStats.total}
          </div>
          <span className="text-[11px] text-slate-500">{clientStats.mandatory} obrigatórios</span>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <span className="text-slate-400 font-mono text-[10px] uppercase block">Templates Padrão</span>
          <div className="text-xl font-bold text-emerald-400 font-mono">
            {clientStats.standard}
          </div>
          <span className="text-[11px] text-slate-500">Pronto para uso</span>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <span className="text-slate-400 font-mono text-[10px] uppercase block">Customizados / Alerta</span>
          <div className="text-xl font-bold text-amber-400 font-mono">
            {clientStats.custom + clientStats.notRecommended}
          </div>
          <span className="text-[11px] text-slate-500">{clientStats.notRecommended} não recomendados</span>
        </div>
      </div>

      {/* Interactive Requirement Query Sandbox */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-white">
            Consultar Viabilidade Técnica de Qualquer Requisito
          </h3>
          <p className="text-xs text-slate-400">
            Digite qualquer item de infraestrutura ou requisito para analisar se o Zabbix atende de forma nativa ou customizada:
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              value={inputText}
              onChange={(e) => handleValidate(e.target.value)}
              placeholder="Digite o requisito..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        {/* Quick query tags */}
        <div className="flex flex-wrap gap-2 pt-1">
          {exampleQueries.map((ex, i) => (
            <button
              key={i}
              onClick={() => handleValidate(ex.query)}
              className="px-2.5 py-1 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-md text-[11px] text-slate-300 hover:text-white transition-colors"
            >
              {ex.label}
            </button>
          ))}
        </div>

        {/* Real-time Technical Result Card */}
        <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <span className="text-[11px] font-mono uppercase text-slate-400">Classificação Técnica Zabbix:</span>
              <div className="mt-1">{getStatusBadge(validationResult.classification)}</div>
            </div>
            {validationResult.matchedCategory && (
              <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-xs font-mono text-slate-300">
                Categoria: {validationResult.matchedCategory}
              </span>
            )}
          </div>

          <div className="text-xs text-slate-200 leading-relaxed font-sans">
            {validationResult.basis}
          </div>

          {validationResult.recommendedTriggerExpression && (
            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400">Expressão Zabbix Recomendada:</span>
                <button
                  onClick={() => handleCopy(validationResult.recommendedTriggerExpression!)}
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-300 hover:text-white"
                >
                  {copiedExpr ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copiada</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copiar Expressão</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded font-mono text-xs text-amber-300 break-all select-all">
                {validationResult.recommendedTriggerExpression}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Complete Matrix of Validation by Client Requirements */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Matriz de Requisitos do Cliente: {customer?.customer_name || 'Padrão'}
            </h3>
            <p className="text-xs text-slate-400">
              Personalize os requisitos, adicione novos ou marque quais são mandatórios para o contrato:
            </p>
          </div>

          {/* Filter segment tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setOnlyMandatoryFilter(!onlyMandatoryFilter)}
              className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-colors inline-flex items-center gap-1.5 ${
                onlyMandatoryFilter
                  ? 'bg-rose-950/80 border-rose-800 text-rose-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {onlyMandatoryFilter ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
              <span>Apenas Obrigatórios</span>
            </button>

            <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos ({clientRequirements.length})
              </button>
              <button
                onClick={() => setFilterStatus('standard_template')}
                className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                  filterStatus === 'standard_template'
                    ? 'bg-slate-800 text-emerald-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Padrão
              </button>
              <button
                onClick={() => setFilterStatus('extended_native')}
                className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                  filterStatus === 'extended_native'
                    ? 'bg-slate-800 text-amber-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Estendida
              </button>
              <button
                onClick={() => setFilterStatus('custom_implementation')}
                className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                  filterStatus === 'custom_implementation'
                    ? 'bg-slate-800 text-sky-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Customizada
              </button>
              <button
                onClick={() => setFilterStatus('not_recommended')}
                className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                  filterStatus === 'not_recommended'
                    ? 'bg-slate-800 text-rose-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Não Recomendado
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">Obrigatório</th>
                  <th className="py-3 px-4">Requisito do Cliente</th>
                  <th className="py-3 px-4">Escopo / Categoria</th>
                  <th className="py-3 px-4">Resultado da Validação</th>
                  <th className="py-3 px-4">Base Técnica Zabbix</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredMatrix.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleMandatory(item.id)}
                        className={`p-1 rounded transition-colors ${
                          item.isMandatory
                            ? 'text-rose-400 hover:text-rose-300'
                            : 'text-slate-600 hover:text-slate-400'
                        }`}
                        title={item.isMandatory ? 'Marcado como Obrigatório (Clique para desmarcar)' : 'Opcional (Clique para marcar como Obrigatório)'}
                      >
                        {item.isMandatory ? (
                          <CheckSquare className="w-4 h-4 fill-rose-500/20" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-200">
                      <div>{item.req}</div>
                      {item.isMandatory && (
                        <span className="inline-block mt-0.5 text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-rose-950/60 text-rose-300 border border-rose-800/50">
                          Mandatório
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {item.cat}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getStatusBadge(item.status as ValidationStatus)}
                    </td>
                    <td className="py-3 px-4 text-slate-300 leading-relaxed text-xs">
                      {item.base}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleEditReq(item)}
                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                          title="Editar requisito"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteReq(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                          title="Remover requisito"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Add/Edit Custom Requirement */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-rose-500" />
                <span>{editingReqId ? 'Editar Requisito do Cliente' : 'Novo Requisito Personalizado'}</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveReqForm} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-medium block">
                  Descrição do Requisito de Monitoramento *
                </label>
                <input
                  type="text"
                  required
                  value={newReqTitle}
                  onChange={(e) => setNewReqTitle(e.target.value)}
                  placeholder="Ex: Monitoramento de fila RabbitMQ com alerta > 500 msgs"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium block">Categoria / Escopo</label>
                  <input
                    type="text"
                    value={newReqCategory}
                    onChange={(e) => setNewReqCategory(e.target.value)}
                    placeholder="Ex: Mensageria, Firewalls, Banco de Dados"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium block">Viabilidade Técnica Zabbix</label>
                  <select
                    value={newReqStatus}
                    onChange={(e) => setNewReqStatus(e.target.value as ValidationStatus)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-rose-500"
                  >
                    <option value="standard_template">Padrão em Template</option>
                    <option value="extended_native">Nativo Estendido</option>
                    <option value="custom_implementation">Implementação Customizada</option>
                    <option value="not_recommended">Não Recomendado no Zabbix</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium block">
                  Base Técnica / Justificativa Zabbix
                </label>
                <textarea
                  rows={2}
                  value={newReqBase}
                  onChange={(e) => setNewReqBase(e.target.value)}
                  placeholder="Ex: Coleta via HTTP Agent com token Bearer na API REST do serviço..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-200 block">Requisito Mandatório</span>
                  <span className="text-[11px] text-slate-400">
                    Obrigatório no escopo contratual e SLA deste cliente
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={newReqMandatory}
                  onChange={(e) => setNewReqMandatory(e.target.checked)}
                  className="w-4 h-4 accent-rose-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-500 font-semibold text-xs shadow-sm"
                >
                  Salvar Requisito
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
