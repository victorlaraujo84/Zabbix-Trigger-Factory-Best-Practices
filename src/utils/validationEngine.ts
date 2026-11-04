import { ValidationDetail, ValidationStatus } from '../types';

export interface ValidationRequirementResult {
  query: string;
  matchedCategory?: string;
  classification: ValidationStatus;
  classificationLabel: string;
  basis: string;
  officialTemplateRef?: string;
  suggestedSolution: string[];
  recommendedTriggerExpression?: string;
  limitations?: string;
  alternativeTool?: string;
}

export function validateMonitoringRequirement(inputQuery: string): ValidationRequirementResult {
  const query = inputQuery.toLowerCase().trim();

  // Rule 1: Docker Logs
  if (query.includes('log') && (query.includes('docker') || query.includes('contêiner') || query.includes('container'))) {
    return {
      query: inputQuery,
      matchedCategory: 'Contêineres Docker',
      classification: 'custom_implementation',
      classificationLabel: 'Requer implementação customizada',
      basis: 'O template oficial Docker by Zabbix agent 2 NÃO possui capacidade nativa de coleta de logs; seu plugin foca em métricas de ciclo de vida e recursos de cgroups.',
      officialTemplateRef: 'Capacidade estendida via Zabbix Agent (Active)',
      suggestedSolution: [
        '1. Mapear o diretório de logs dos contêineres para o sistema de arquivos do host.',
        '2. Usar item do Agent ativo: log[/var/lib/docker/containers/{#CONTAINER.ID}/*-json.log,"\\"level\\":\\"error\\"",,,skip]',
        '3. Ou utilizar logrt[] caso haja rotação automática de arquivos de log pelo Docker daemon.',
      ],
      limitations: 'Requer que o usuário "zabbix" no host tenha permissões de leitura no diretório de logs do Docker.',
      recommendedTriggerExpression: 'count(/host/log[/var/lib/docker/containers/{#CONTAINER.ID}/*-json.log,"\\"level\\":\\"error\\""],5m) > {$CONTAINER_LOG_ERRORS}',
    };
  }

  // Rule 2: MySQL Query History / Raw general log storage
  if ((query.includes('histórico') || query.includes('gravar todas') || query.includes('todas as queries') || query.includes('armazenar query')) && (query.includes('mysql') || query.includes('banco') || query.includes('sql'))) {
    return {
      query: inputQuery,
      matchedCategory: 'MySQL / MariaDB',
      classification: 'not_recommended',
      classificationLabel: 'Não é boa prática',
      basis: 'O Zabbix é um sistema de monitoramento de métricas e estados de disponibilidade. Armazenar o log completo de todas as queries no banco de dados do Zabbix causará crescimento descontrolado de histórico, saturação de I/O e degradação do Zabbix Server.',
      alternativeTool: 'Percona Monitoring and Management (PMM) / MySQL Enterprise Audit / Grafana Loki com Filebeat',
      suggestedSolution: [
        'Adotar ferramenta especializada em APM e análise de banco de dados, como Percona PMM ou MySQL Enterprise Audit.',
        'No Zabbix, manter apenas o monitoramento do contador de slow queries (mysql.get_status_variables[Slow_queries]) e threads running.',
      ],
      limitations: 'Inadequado para sistemas de produção com throughput real de banco de dados.',
    };
  }

  // Rule 3: Packet capture / Deep Packet Inspection (DPI) / PCAP
  if (query.includes('dpi') || query.includes('pcap') || query.includes('captura de pacote') || query.includes('deep packet') || query.includes('inspeção profunda')) {
    return {
      query: inputQuery,
      matchedCategory: 'Dispositivos de Rede',
      classification: 'not_recommended',
      classificationLabel: 'Não é boa prática',
      basis: 'O Zabbix opera com contadores de interfaces SNMP (IF-MIB) e telemetria de performance. Ele não é uma sonda de Deep Packet Inspection nem um gravador de pacotes PCAP em tempo real.',
      alternativeTool: 'nTop-ng / Zeek / Wireshark / Arkime / Sondas NetFlow/IPFIX',
      suggestedSolution: [
        'Configurar porta de espelhamento (SPAN/Port Mirroring) no switch apontando para um analisador de tráfego dedicado.',
        'No Zabbix, monitorar apenas o throughput de banda das portas (net.if.in/out) e taxas de descarte/erros (ifInErrors).',
      ],
      limitations: 'Zabbix não armazena payloads de tráfego de rede.',
    };
  }

  // Rule 4: VMware Replication / Backup
  if ((query.includes('backup') || query.includes('replicação') || query.includes('replication')) && (query.includes('vmware') || query.includes('vm') || query.includes('virtualização'))) {
    return {
      query: inputQuery,
      matchedCategory: 'Virtualização VMware',
      classification: 'custom_implementation',
      classificationLabel: 'Requer implementação customizada',
      basis: 'O template oficial VMware coleta métricas do Hypervisor, Datastores e VMs via vCenter API nativa, mas NÃO expõe métricas de status de backups de terceiros nem do appliance vSphere Replication.',
      suggestedSolution: [
        'Para replicação: criar ExternalCheck em Python com pyVmomi consultando o vSphere Replication Management Server (VRMS).',
        'Para backup: integrar via API REST da ferramenta de backup (Veeam API, Commvault, Bacula) usando HTTP Agent no Zabbix.',
      ],
      limitations: 'Depende de scripts externos ou conectores HTTP REST dedicados.',
      recommendedTriggerExpression: 'last(/host/custom.vmware.backup.status[{#VM.UUID}]) <> "success"',
    };
  }

  // Rule 5: Top Queries / Slow queries analysis
  if (query.includes('top quer') || query.includes('query lenta') || query.includes('queries lentas') || query.includes('slow quer')) {
    return {
      query: inputQuery,
      matchedCategory: 'Bancos de Dados (MSSQL / MySQL)',
      classification: 'extended_native',
      classificationLabel: 'Capacidade oficial estendida',
      basis: 'O contador de quantidade de slow queries é nativo, porém a identificação do texto das Top Queries requer consulta customizada via ODBC (sys.dm_exec_query_stats no MSSQL) ou performance_schema no MySQL.',
      officialTemplateRef: 'MSSQL by ODBC / MySQL by Zabbix agent 2 (estendido)',
      suggestedSolution: [
        'Configurar item db.odbc.get com consulta SQL agregada sobre as DMVs de execução.',
        'Definir intervalo de coleta espaçado (ex: 10m) para não onerar o banco de produção.',
      ],
      recommendedTriggerExpression: 'count(/host/db.odbc.get[get_top_queries,{$MSSQL.DSN}],10m) > {$SLOW_QUERY_THRESHOLD}',
    };
  }

  // Rule 6: M365 Service Health
  if (query.includes('m365') || query.includes('microsoft 365') || query.includes('office 365') || query.includes('teams') || query.includes('exchange online')) {
    if (query.includes('health') || query.includes('incidente') || query.includes('aviso')) {
      return {
        query: inputQuery,
        matchedCategory: 'Microsoft 365',
        classification: 'extended_native',
        classificationLabel: 'Capacidade oficial estendida',
        basis: 'O template oficial cobre relatórios de uso; o monitoramento de Service Health e incidentes exige conexão à Microsoft Graph API (/admin/serviceAnnouncement/issues).',
        officialTemplateRef: 'Microsoft 365 reports by HTTP (estendido com Graph API)',
        suggestedSolution: [
          'Criar App Registration no Azure AD com permissão ServiceHealth.Read.All.',
          'Usar item HTTP Agent com autenticação OAuth2 Client Credentials nativo do Zabbix.',
        ],
        recommendedTriggerExpression: 'last(/host/microsoft365.service.health[{#SERVICE}]) <> "healthy"',
      };
    }
  }

  // Rule 7: LDAP / Active Directory query time
  if (query.includes('ldap') || query.includes('active directory') || query.includes('ad')) {
    if (query.includes('query') || query.includes('tempo') || query.includes('consulta')) {
      return {
        query: inputQuery,
        matchedCategory: 'LDAP / Active Directory',
        classification: 'extended_native',
        classificationLabel: 'Capacidade oficial estendida',
        basis: 'O status do serviço NTDS é coberto pelo template padrão (service.info[NTDS,state]), mas o tempo de resposta de consultas LDAP específicas requer script UserParameter com ldapsearch.',
        officialTemplateRef: 'Active Directory Domain Services by Zabbix agent',
        suggestedSolution: [
          'Adicionar UserParameter no Zabbix Agent com comando ldapsearch medindo tempo de resposta.',
          'Configurar trigger com histerese para consultas acima de 2 segundos.',
        ],
        recommendedTriggerExpression: 'avg(/host/ldap.query.time[{#LDAP.URL}],5m) > {$LDAP_QUERY_WARN}',
      };
    }
  }

  // Rule 8: CPU / Memory / Disk / General resource utilization
  if (query.includes('cpu') || query.includes('memória') || query.includes('disco') || query.includes('uptime') || query.includes('status')) {
    return {
      query: inputQuery,
      matchedCategory: 'Sistemas Operacionais & Hosts',
      classification: 'standard_template',
      classificationLabel: 'Coberto por template padrão',
      basis: 'Indicador padrão presente nos templates oficiais Zabbix (Linux by Zabbix agent, Windows by Zabbix agent, VMware, Docker).',
      officialTemplateRef: 'Linux by Zabbix agent 2 / Windows by Zabbix agent',
      suggestedSolution: [
        'Vincular o template oficial do SO correspondente ao Host.',
        'Utilizar macros de limite ({$CPU.UTIL.CRIT}, {$MEMORY.UTIL.MAX}) para ajustar sem editar o template.',
      ],
      recommendedTriggerExpression: 'avg(/host/system.cpu.util,5m) > {$CPU_WARN}',
    };
  }

  // Fallback for general matches
  return {
    query: inputQuery,
    matchedCategory: 'Métricas de Monitoramento Geral',
    classification: 'standard_template',
    classificationLabel: 'Coberto por template padrão',
    basis: 'O Zabbix possui suporte oficial nativo através de sua vasta biblioteca de templates e chaves padronizadas.',
    officialTemplateRef: 'Templates Oficiais Zabbix',
    suggestedSolution: [
      'Identificar o template oficial correspondente na documentação do Zabbix.',
      'Utilizar macros de usuário para customização de limiares de negócio do cliente.',
    ],
    recommendedTriggerExpression: 'last(/host/net.tcp.service[tcp,,{$PORT}]) = 0',
  };
}
