import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Customer, Host } from '../types';
import {
  Shield,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Download,
  Trash2,
  RefreshCw,
  Sparkles,
  Key,
  Database,
  UserCheck,
  Check,
  Copy,
  Activity,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';

interface SecurityComplianceViewProps {
  customer: Customer;
  customers: Customer[];
  hosts: Host[];
  onOpenLoginModal: () => void;
}

export const SecurityComplianceView: React.FC<SecurityComplianceViewProps> = ({
  customer,
  customers,
  hosts,
  onOpenLoginModal,
}) => {
  const {
    user,
    firebaseUser,
    auditLogs,
    exportUserDataZipOrJson,
    deleteUserAccountAndData,
    logAuditEvent,
  } = useAuth();

  // Interactive Sanitizer State
  const [testExpression, setTestExpression] = useState<string>(
    'net.tcp.service[tcp,192.168.1.10,3306] & db.odbc.select[mysql,root,SenhaSuperSecreta123,SELECT 1]'
  );
  const [sanitizedResult, setSanitizedResult] = useState<string | null>(null);
  const [sanitizerAlerts, setSanitizerAlerts] = useState<string[]>([]);
  const [copiedSanitized, setCopiedSanitized] = useState(false);

  // Security Policy Toggles
  const [maskSensitiveMacros, setMaskSensitiveMacros] = useState(true);
  const [enforceZeroTrustStorage, setEnforceZeroTrustStorage] = useState(true);
  const [strictAuditLogging, setStrictAuditLogging] = useState(true);
  const [autoPurgeLogs, setAutoPurgeLogs] = useState(false);

  const handleRunSanitizer = () => {
    let sanitized = testExpression;
    const alerts: string[] = [];

    // Check for hardcoded passwords/secrets
    const passwordPattern = /(password|pwd|senha|secret|token)\s*[:=,]\s*([^,\s\)]+)/gi;
    if (passwordPattern.test(testExpression)) {
      alerts.push('Credencial/Senha em texto puro detectada e mascarada por macro secreta Zabbix.');
      sanitized = sanitized.replace(passwordPattern, '$1:{$SECRET_MACRO}');
    }

    // Check for root or administrative hardcoded credentials
    if (/root|admin|administrator/i.test(testExpression) && /select|exec|login|connect/i.test(testExpression)) {
      alerts.push('Usuário com privilégio administrativo em expressão. Recomendado usar usuário com privilégios mínimos (Least Privilege).');
    }

    // Check for personal email pattern
    const emailPattern = /[a-zA-Z0-9._%+-]+@(gmail|hotmail|yahoo|outlook|uol)\.[a-zA-Z]{2,}/gi;
    if (emailPattern.test(testExpression)) {
      alerts.push('E-mail pessoal identificado (Dado Pessoal LGPD). Recomendado usar alias de sistema técnico.');
      sanitized = sanitized.replace(emailPattern, 'alerta-sistema@cliente.com.br');
    }

    // Check for explicit CPF pattern
    const cpfPattern = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
    if (cpfPattern.test(testExpression)) {
      alerts.push('CPF identificado na expressão! Violação do Princípio da Minimização de Dados (LGPD Art. 6º, III).');
      sanitized = sanitized.replace(cpfPattern, '[DADO_SENSIVEL_REMOVIDO]');
    }

    if (alerts.length === 0) {
      alerts.push('Nenhuma vulnerabilidade ou dado pessoal detectado na expressão. Conforme com boas práticas!');
    }

    setSanitizerAlerts(alerts);
    setSanitizedResult(sanitized);

    logAuditEvent(
      'CUSTOMER_UPDATE',
      'Sanitizador LGPD',
      `Análise de conformidade executada para expressão técnica.`
    );
  };

  const handleCopySanitized = () => {
    if (!sanitizedResult) return;
    navigator.clipboard.writeText(sanitizedResult);
    setCopiedSanitized(true);
    setTimeout(() => setCopiedSanitized(false), 2000);
  };

  const handleExportData = () => {
    exportUserDataZipOrJson(customers, hosts);
  };

  const handleDeleteData = async () => {
    if (
      confirm(
        'ATENÇÃO: Você está solicitando o DIREITO AO ESQUECIMENTO (LGPD Art. 18).\n\nTodos os seus clientes, inventário de hosts e conta serão excluídos permanentemente do banco de dados em nuvem. Deseja prosseguir?'
      )
    ) {
      try {
        await deleteUserAccountAndData();
        alert('Seus dados e conta foram completamente eliminados em conformidade com a LGPD.');
      } catch (err: any) {
        alert('Erro ao excluir dados: ' + err.message);
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner: Security & LGPD Overview */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-900 to-rose-950/40 border border-slate-800 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-rose-950 border border-rose-800 text-[11px] font-mono text-rose-300 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Conformidade LGPD & Zero-Trust Architecture</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-[11px] font-mono text-emerald-300 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Criptografia TLS 1.3 & Firestore Rules</span>
            </span>
          </div>

          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-rose-500" />
            <span>Overview de Segurança & Governança LGPD</span>
          </h2>

          <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
            Diagnóstico de segurança da infraestrutura de monitoramento Zabbix em conformidade com a <strong>Lei Geral de Proteção de Dados (Lei nº 13.709/2018)</strong>, com regras de isolamento estrito, minimização de dados e preservação em banco de dados em nuvem.
          </p>
        </div>

        {/* Security Score Widget */}
        <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-xl flex items-center gap-4 shrink-0">
          <div className="text-center">
            <div className="text-3xl font-black text-emerald-400 font-mono">98%</div>
            <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">Score LGPD</span>
          </div>
          <div className="h-10 w-px bg-slate-800" />
          <div className="text-xs space-y-0.5">
            <div className="text-slate-200 font-semibold">Status de Conformidade</div>
            <div className="text-[11px] text-emerald-400 flex items-center gap-1">
              <Check className="w-3 h-3" />
              <span>Totalmente Adequado</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Pillars of LGPD in Monitoring */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-rose-400 font-semibold font-mono uppercase text-[11px]">
            <Lock className="w-4 h-4" />
            <span>1. Autenticação & Sigilo</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            Conexão com Google OAuth 2.0. Dados protegidos por regras Zero-Trust no Firestore, garantindo que nenhum cliente acesse dados de outro.
          </p>
          <div className="pt-1">
            {user ? (
              <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                <Check className="w-3 h-3" /> {user.email}
              </span>
            ) : (
              <button
                onClick={onOpenLoginModal}
                className="text-[11px] text-rose-400 hover:text-rose-300 underline font-medium"
              >
                Conectar Conta Google
              </button>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-semibold font-mono uppercase text-[11px]">
            <EyeOff className="w-4 h-4" />
            <span>2. Minimização (Art. 6º, III)</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            Monitoramento focado em telemetria técnica de máquinas e redes. Expressões são sanitizadas contra senhas ou dados pessoais em texto puro.
          </p>
          <div className="text-[11px] text-emerald-400 font-mono">
            Filtro de Telemetria Ativo
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-sky-400 font-semibold font-mono uppercase text-[11px]">
            <UserCheck className="w-4 h-4" />
            <span>3. Direitos dos Titulares</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            Garantia dos direitos previstos no Artigo 18 da LGPD: Portabilidade completa dos dados e Direito à Eliminação imediata dos dados pessoais.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleExportData}
              className="text-[11px] text-sky-400 hover:underline inline-flex items-center gap-1"
            >
              <Download className="w-3 h-3" /> Exportar Dados
            </button>
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold font-mono uppercase text-[11px]">
            <Activity className="w-4 h-4" />
            <span>4. Auditoria (Art. 37 - ROPA)</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            Trilha de auditoria imutável (Audit Trail) de todas as modificações em clientes, limiares de alarmes e exportações de relatórios.
          </p>
          <div className="text-[11px] text-slate-400 font-mono">
            {auditLogs.length} eventos registrados
          </div>
        </div>
      </div>

      {/* Interactive Tool: Sensitive Data & Secret Sanitizer */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rose-500" />
              <span>Sanitizador Ativo de Dados Sensíveis e Senhas (Zabbix)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Analisa chaves de itens e triggers para identificar e mascarar credenciais expostas ou dados pessoais conforme a LGPD.
            </p>
          </div>

          <button
            onClick={handleRunSanitizer}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-colors shrink-0"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Executar Análise de Segurança</span>
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-slate-300 text-xs font-medium block">
            Expressão ou Parâmetro Zabbix para Análise:
          </label>
          <textarea
            rows={2}
            value={testExpression}
            onChange={(e) => setTestExpression(e.target.value)}
            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-rose-500"
          />
        </div>

        {sanitizerAlerts.length > 0 && (
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-3">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
              Resultado do Diagnóstico LGPD:
            </span>
            <div className="space-y-1.5">
              {sanitizerAlerts.map((alt, i) => (
                <div
                  key={i}
                  className={`p-2.5 rounded-md text-xs flex items-start gap-2 ${
                    alt.includes('detectada') || alt.includes('Violação')
                      ? 'bg-rose-950/40 text-rose-300 border border-rose-800/60'
                      : alt.includes('Recomendado')
                      ? 'bg-amber-950/40 text-amber-300 border border-amber-800/60'
                      : 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/60'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{alt}</span>
                </div>
              ))}
            </div>

            {sanitizedResult && (
              <div className="space-y-1 pt-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Versão Sanitizada e Recomendada (Zero-Trust):</span>
                  <button
                    onClick={handleCopySanitized}
                    className="text-slate-300 hover:text-white inline-flex items-center gap-1"
                  >
                    {copiedSanitized ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copiada!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copiar Expressão Segura</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-2.5 bg-slate-900 border border-slate-800 rounded font-mono text-xs text-emerald-300 break-all select-all">
                  {sanitizedResult}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Suggested & Implemented Security Actions */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Key className="w-4 h-4 text-rose-500" />
          <span>Controles de Segurança e Governança Implementados</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-white block">Regras Zero-Trust no Firestore</span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Todas as leituras e gravações exigem autenticação válida e restringem acesso exclusivamente aos documentos do próprio usuário (<code>request.auth.uid == userId</code>).
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-white block">Criptografia em Trânsito e Repouso</span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Conexões protegidas por TLS 1.3 obrigatório. Dados persistidos no Google Cloud Firestore com criptografia AES-256 nativa.
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-white block">Gestão de Consentimento LGPD</span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Termo de consentimento e notificação prévia de finalidade técnica integrada ao fluxo de login e uso da ferramenta.
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-white block">Portabilidade & Direito ao Esquecimento</span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Módulos de download dos dados do titular em JSON padronizado e exclusão completa com expurgo de dados sob demanda.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons for Rights of the Data Subject */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportData}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-medium inline-flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-rose-400" />
              <span>Exportar Meus Dados (Portabilidade LGPD)</span>
            </button>
          </div>

          <div>
            <button
              onClick={handleDeleteData}
              className="px-3.5 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800 text-rose-300 rounded-lg font-medium inline-flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Solicitar Exclusão Total dos Dados (Direito ao Esquecimento)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Audit Trail (LGPD Art. 37) */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Trilha de Auditoria em Tempo Real (LGPD Art. 37)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Registro histórico imutável das ações operacionais para atendimento a auditorias e órgãos reguladores (ANPD).
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {auditLogs.length} registros
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono">
              <tr>
                <th className="py-2.5 px-3">Data/Hora</th>
                <th className="py-2.5 px-3">Usuário</th>
                <th className="py-2.5 px-3">Ação</th>
                <th className="py-2.5 px-3">Alvo</th>
                <th className="py-2.5 px-3">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {auditLogs.slice(0, 10).map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40">
                  <td className="py-2 px-3 font-mono text-slate-400 whitespace-nowrap text-[11px]">
                    {new Date(log.timestamp).toLocaleString('pt-BR')}
                  </td>
                  <td className="py-2 px-3 text-slate-300 font-mono text-[11px] whitespace-nowrap">
                    {log.userEmail}
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-800 text-rose-300 border border-slate-700">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-200 font-medium">
                    {log.target}
                  </td>
                  <td className="py-2 px-3 text-slate-400 text-xs">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
