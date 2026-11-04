import React from 'react';
import { X, Check, Copy, ExternalLink, HelpCircle, ArrowRight } from 'lucide-react';
import { GeneratedTrigger } from '../types';

interface ZabbixGuidanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: GeneratedTrigger | null;
}

export const ZabbixGuidanceModal: React.FC<ZabbixGuidanceModalProps> = ({
  isOpen,
  onClose,
  trigger,
}) => {
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-rose-500" />
              Guia Passo a Passo: Onde colar no Zabbix Frontend
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Navegação manual no Zabbix 6.0 / 7.0 LTS sem dependência de APIs ou conectores automáticos.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Breadcrumb Path in Zabbix */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Caminho no Menu do Zabbix Web
            </span>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-200">
              <span className="px-2.5 py-1 bg-slate-800 rounded text-slate-300">Coleta de Dados / Configuração</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              <span className="px-2.5 py-1 bg-slate-800 rounded text-slate-300">Hosts (ou Templates)</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              <span className="px-2.5 py-1 bg-slate-800 rounded text-slate-300">Selecionar Host / Triggers</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              <span className="px-2.5 py-1 bg-rose-950 text-rose-300 border border-rose-800/50 rounded font-semibold">
                [ Criar Trigger ]
              </span>
            </div>
          </div>

          {/* Accessible Meaning Box if Trigger is present */}
          {trigger && trigger.accessible_explanation && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
              <span className="text-xs font-semibold text-rose-400 font-mono uppercase tracking-wider block">
                Entendimento Operacional desta Trigger
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 bg-slate-900 rounded border border-slate-850">
                  <strong className="text-slate-300 block mb-0.5">🎯 O Que Monitora:</strong>
                  <span className="text-slate-300">{trigger.accessible_explanation.what_monitors}</span>
                </div>
                <div className="p-2.5 bg-slate-900 rounded border border-slate-850">
                  <strong className="text-amber-400 block mb-0.5">⚠️ Quando Alarma:</strong>
                  <span className="text-slate-300">{trigger.accessible_explanation.when_triggers}</span>
                </div>
                <div className="p-2.5 bg-slate-900 rounded border border-slate-850">
                  <strong className="text-rose-400 block mb-0.5">💡 O Que Quer Dizer na Prática:</strong>
                  <span className="text-slate-300">{trigger.accessible_explanation.business_impact}</span>
                </div>
                <div className="p-2.5 bg-slate-900 rounded border border-slate-850">
                  <strong className="text-emerald-400 block mb-0.5">🔄 Quando Normaliza:</strong>
                  <span className="text-slate-300">{trigger.accessible_explanation.recovery_condition}</span>
                </div>
              </div>
            </div>
          )}

          {/* Simulated Zabbix Trigger Form Mapping */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center justify-between">
              <span>Mapeamento de Campos do Formulário Zabbix</span>
              {trigger && (
                <span className="text-xs font-mono text-slate-400">
                  Host: <strong className="text-slate-200">{trigger.hostname}</strong>
                </span>
              )}
            </h3>

            <div className="space-y-3">
              {/* Field 1: Name */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-lg">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-800 text-xs font-mono text-slate-300 font-semibold">
                      1
                    </span>
                    <span className="text-xs font-semibold text-slate-200">Campo Zabbix: Name (Nome)</span>
                    <span className="text-xs text-rose-400 font-mono">*obrigatório</span>
                  </div>
                  {trigger && (
                    <button
                      onClick={() => copyToClipboard(trigger.trigger_name, 'name')}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                    >
                      {copiedField === 'name' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Nome</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-400 mb-2">
                  Cole no primeiro campo do formulário. Contém o hostname e os parâmetros de limite.
                </p>
                {trigger && (
                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded font-mono text-xs text-slate-200 break-all select-all">
                    {trigger.trigger_name}
                  </div>
                )}
              </div>

              {/* Field 2: Severity */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-lg">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-800 text-xs font-mono text-slate-300 font-semibold">
                    2
                  </span>
                  <span className="text-xs font-semibold text-slate-200">Campo Zabbix: Severity (Severidade)</span>
                  {trigger && (
                    <span className="ml-auto text-xs font-semibold px-2.5 py-0.5 rounded border bg-slate-900 border-slate-700 text-slate-200">
                      Selecionar: {trigger.severity}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Marque o botão de opção correspondente à severidade acordada na matriz de governança do cliente.
                </p>
              </div>

              {/* Field 3: Expression */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-lg">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-800 text-xs font-mono text-slate-300 font-semibold">
                      3
                    </span>
                    <span className="text-xs font-semibold text-slate-200">Campo Zabbix: Expression (Expressão do Problema)</span>
                    <span className="text-xs text-rose-400 font-mono">*obrigatório</span>
                  </div>
                  {trigger && (
                    <button
                      onClick={() => copyToClipboard(trigger.expression, 'expr')}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                    >
                      {copiedField === 'expr' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Expressão</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-400 mb-2">
                  Cole diretamente na caixa de texto da expressão. Usa sintaxe nativa Zabbix 6.0+ (função + chave de item).
                </p>
                {trigger && (
                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded font-mono text-xs text-amber-300 break-all select-all">
                    {trigger.expression}
                  </div>
                )}
              </div>

              {/* Field 4: Recovery Mode & Expression */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-lg">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-800 text-xs font-mono text-slate-300 font-semibold">
                      4
                    </span>
                    <span className="text-xs font-semibold text-slate-200">
                      Campo Zabbix: OK event generation & Recovery expression
                    </span>
                  </div>
                  {trigger && trigger.recovery_expression && (
                    <button
                      onClick={() => copyToClipboard(trigger.recovery_expression, 'recexpr')}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                    >
                      {copiedField === 'recexpr' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Expressão OK</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-400 mb-2">
                  Se houver histerese, marque <strong>"Recovery expression"</strong> no rádio "OK event generation" e cole a expressão abaixo. Caso contrário, mantenha <strong>"Expression"</strong>.
                </p>
                {trigger && (
                  trigger.recovery_expression ? (
                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded font-mono text-xs text-emerald-300 break-all select-all">
                      {trigger.recovery_expression}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic">
                      Não requer expressão de recuperação dedicada. O evento fechará automaticamente quando a expressão do problema retornar falso.
                    </div>
                  )
                )}
              </div>

              {/* Field 5: Operational Data */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-lg">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-800 text-xs font-mono text-slate-300 font-semibold">
                      5
                    </span>
                    <span className="text-xs font-semibold text-slate-200">Campo Zabbix: Operational data (Dados Operacionais)</span>
                  </div>
                  {trigger && (
                    <button
                      onClick={() => copyToClipboard(trigger.operational_data, 'opdata')}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                    >
                      {copiedField === 'opdata' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Dados Op.</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-400 mb-2">
                  Exibe o valor em tempo real na tela de "Problemas" do Zabbix (ex: 78% de CPU ou 12% de disco).
                </p>
                {trigger && (
                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded font-mono text-xs text-cyan-300 break-all select-all">
                    {trigger.operational_data}
                  </div>
                )}
              </div>

              {/* Field 6: Description */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-lg">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-800 text-xs font-mono text-slate-300 font-semibold">
                      6
                    </span>
                    <span className="text-xs font-semibold text-slate-200">Campo Zabbix: Description (Descrição Técnica & Ação)</span>
                  </div>
                  {trigger && (
                    <button
                      onClick={() => copyToClipboard(trigger.description, 'desc')}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                    >
                      {copiedField === 'desc' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Descrição</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-400 mb-2">
                  Serve de memorial técnico e procedimento operacional padrão (SOP) para o operador de plantão do NOC.
                </p>
                {trigger && (
                  <pre className="p-2.5 bg-slate-900 border border-slate-800 rounded font-mono text-xs text-slate-300 whitespace-pre-wrap max-h-36 overflow-y-auto">
                    {trigger.description}
                  </pre>
                )}
              </div>

              {/* Field 7: Tags & Macros */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-lg">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-800 text-xs font-mono text-slate-300 font-semibold">
                    7
                  </span>
                  <span className="text-xs font-semibold text-slate-200">Aba Zabbix: Tags e Macros do Host</span>
                </div>
                <p className="text-xs text-slate-400 mb-2">
                  Na aba <strong>"Tags"</strong> da trigger, insira os pares de chave e valor para correlação de eventos. Na aba <strong>"Macros"</strong> do Host (ou Template), garanta a definição do valor da macro.
                </p>
                {trigger && (
                  <div className="space-y-2 mt-2">
                    <div className="text-xs text-slate-400">
                      <strong>Tags Recomendadas:</strong>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {trigger.tags.map((t, idx) => (
                        <span key={idx} className="font-mono text-xs px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-300">
                          {t.tag}: {t.value}
                        </span>
                      ))}
                    </div>
                    {trigger.macros.length > 0 && (
                      <div className="mt-2 text-xs text-slate-400">
                        <strong>Macro no Host/Template:</strong>
                        <div className="mt-1 font-mono text-xs text-amber-300">
                          {trigger.macros.map((m) => `${m.macro} = ${m.value}`).join(' | ')}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end px-6 py-4 bg-slate-900 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Fechar Guia
          </button>
        </div>
      </div>
    </div>
  );
};
