import React, { useState, useMemo, useEffect } from 'react';
import { Customer, Host, Practice, GeneratedTrigger } from '../types';
import { evaluateZabbixCondition } from '../utils/syntaxEvaluator';
import { Play, CheckCircle2, AlertTriangle, Cpu, RotateCcw, HelpCircle, ArrowLeft, Sparkles, Check } from 'lucide-react';

interface SyntaxSimulatorViewProps {
  customer: Customer;
  practices: Practice[];
  hosts: Host[];
  preselectedTrigger?: GeneratedTrigger | null;
  onClearPreselectedTrigger?: () => void;
}

export const SyntaxSimulatorView: React.FC<SyntaxSimulatorViewProps> = ({
  customer,
  practices,
  hosts,
  preselectedTrigger,
  onClearPreselectedTrigger,
}) => {
  const [selectedPracticeId, setSelectedPracticeId] = useState<string>(() => {
    if (preselectedTrigger?.practice_id) return preselectedTrigger.practice_id;
    return practices[0]?.id || '';
  });
  const [activeTrigger, setActiveTrigger] = useState<GeneratedTrigger | null>(preselectedTrigger || null);
  const [simulatedValue, setSimulatedValue] = useState<string>('78');

  // When preselectedTrigger updates from outside
  useEffect(() => {
    if (preselectedTrigger) {
      setActiveTrigger(preselectedTrigger);
      if (preselectedTrigger.practice_id) {
        setSelectedPracticeId(preselectedTrigger.practice_id);
      }
      // Extract numeric threshold or default to 85
      const numMatch = preselectedTrigger.expression.match(/([0-9]+(\.[0-9]+)?)/);
      if (numMatch) {
        setSimulatedValue(numMatch[1]);
      } else {
        setSimulatedValue('1');
      }
    }
  }, [preselectedTrigger]);

  const selectedPractice = useMemo(() => {
    return practices.find((p) => p.id === selectedPracticeId) || practices[0];
  }, [practices, selectedPracticeId]);

  // Resolve threshold value from customer
  const thresholdValue = useMemo(() => {
    if (!selectedPractice) return 70;
    const { thresholds } = customer.business_rules;
    if (selectedPractice.threshold_param in thresholds) {
      return (thresholds as any)[selectedPractice.threshold_param];
    }
    return selectedPractice.default_threshold_value;
  }, [customer, selectedPractice]);

  // Evaluate Problem
  const problemEval = useMemo(() => {
    if (!selectedPractice) return null;
    return evaluateZabbixCondition(simulatedValue, selectedPractice.operator, thresholdValue);
  }, [simulatedValue, selectedPractice, thresholdValue]);

  // Calculate Recovery threshold if hysteresis exists
  const recoveryThreshold = useMemo(() => {
    if (!selectedPractice?.recovery) return null;
    if (selectedPractice.recovery.delta_expr && typeof thresholdValue === 'number') {
      // Parse delta e.g. "{$CPU_WARN} - 5"
      const match = selectedPractice.recovery.delta_expr.match(/-\s*(\d+(\.\d+)?)/);
      if (match) {
        return thresholdValue - parseFloat(match[1]);
      }
      const matchPlus = selectedPractice.recovery.delta_expr.match(/\+\s*(\d+(\.\d+)?)/);
      if (matchPlus) {
        return thresholdValue + parseFloat(matchPlus[1]);
      }
    }
    return thresholdValue;
  }, [selectedPractice, thresholdValue]);

  // Evaluate Recovery
  const recoveryEval = useMemo(() => {
    if (!selectedPractice?.recovery || recoveryThreshold === null) return null;
    return evaluateZabbixCondition(simulatedValue, selectedPractice.recovery.operator, recoveryThreshold);
  }, [simulatedValue, selectedPractice, recoveryThreshold]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Play className="w-5 h-5 text-rose-500" />
          Simulador Interativo & Validador de Sintaxe Zabbix
        </h2>
        <p className="text-xs text-slate-400">
          Simule valores reais de itens coletados para validar se a trigger dispararia um evento de Problema ou Recuperação.
        </p>
      </div>

      {/* Banner if trigger was sent directly from Trigger Factory */}
      {activeTrigger && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in duration-300">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 bg-rose-600 text-white rounded text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Trigger Carregada da Fábrica
              </span>
              <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 font-mono text-[11px] rounded">
                Host: <strong>{activeTrigger.hostname}</strong>
              </span>
              <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-amber-300 font-mono text-[11px] rounded">
                Severidade: {activeTrigger.severity}
              </span>
            </div>
            <div className="text-sm font-semibold text-white">
              {activeTrigger.trigger_name}
            </div>
            <div className="text-xs font-mono text-slate-300 break-all">
              Expressão: <span className="text-amber-300">{activeTrigger.expression}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setActiveTrigger(null);
                if (onClearPreselectedTrigger) onClearPreselectedTrigger();
              }}
              className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
            >
              Voltar ao Modo Livre
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Select Practice & Inputs */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
          <div className="space-y-1">
            <label className="text-slate-400 font-mono text-xs block">
              1. Selecionar Prática do Catálogo:
            </label>
            <select
              value={selectedPracticeId}
              onChange={(e) => {
                setSelectedPracticeId(e.target.value);
                const p = practices.find((x) => x.id === e.target.value);
                if (p) {
                  setSimulatedValue(String(p.default_threshold_value));
                }
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500 font-medium"
            >
              {practices.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.item_key})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 font-mono text-xs block">
              2. Simular Valor Coletado ({selectedPractice?.unit || 'unidade'}):
            </label>
            <input
              type="text"
              value={simulatedValue}
              onChange={(e) => setSimulatedValue(e.target.value)}
              placeholder="Ex: 85, 0, 15, running..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-rose-500"
            />
            <span className="text-[11px] text-slate-500">
              Altere o valor para testar o comportamento em tempo real.
            </span>
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-2 text-xs">
            <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[11px]">
              Parâmetros em Avaliação
            </span>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1 font-mono text-[11px]">
              <div>Item: <span className="text-amber-300">{selectedPractice?.item_key}</span></div>
              <div>Macro do Cliente: <span className="text-slate-200">{selectedPractice?.macro_name} = {thresholdValue}</span></div>
              <div>Operador de Disparo: <span className="text-slate-200">{selectedPractice?.operator}</span></div>
              {recoveryThreshold !== null && (
                <div>Limiar de Histerese: <span className="text-emerald-400">{selectedPractice?.recovery?.operator} {recoveryThreshold}</span></div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Trigger Evaluation & Hysteresis Visualizer */}
        <div className="lg:col-span-2 space-y-4">
          {/* Problem Expression Result Card */}
          <div
            className={`p-6 rounded-xl border transition-all ${
              problemEval?.isTriggered
                ? 'bg-rose-950/30 border-rose-800/80 shadow-lg shadow-rose-950/20'
                : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Avaliação da Expressão do Problema
              </span>
              <span
                className={`px-3 py-1 rounded text-xs font-bold font-mono uppercase ${
                  problemEval?.isTriggered
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}
              >
                {problemEval?.isTriggered ? 'PROBLEMA DISPARADO (1)' : 'ESTADO OK (0)'}
              </span>
            </div>

            <div className="mt-4 p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-amber-300">
              {selectedPractice?.function}(/HOST/{selectedPractice?.item_key}) {selectedPractice?.operator} {thresholdValue}
            </div>

            <div className="mt-3 text-xs text-slate-300 font-sans leading-relaxed">
              {problemEval?.explanation}
            </div>
          </div>

          {/* Hysteresis & Recovery Analysis Card */}
          {selectedPractice?.recovery ? (
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  Comportamento da Histerese (Expressão de Recuperação)
                </span>
                <span
                  className={`px-3 py-1 rounded text-xs font-bold font-mono uppercase ${
                    recoveryEval?.isTriggered
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}
                >
                  {recoveryEval?.isTriggered ? 'RECUPERADO (OK)' : 'PROBLEMA MANTIDO'}
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-emerald-300">
                {selectedPractice.recovery.function}(/HOST/{selectedPractice.item_key}) {selectedPractice.recovery.operator} ({recoveryThreshold})
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {recoveryEval?.isTriggered
                  ? `O valor atual (${simulatedValue}) satisfez a condição de recuperação (${recoveryThreshold}). O evento no Zabbix será encerrado automaticamente.`
                  : `O valor atual (${simulatedValue}) ainda não alcançou o limiar seguro de recuperação (${recoveryThreshold}). A histerese impede o flapping e mantém o incidente visível até estabilização completa.`}
              </p>
            </div>
          ) : (
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs text-slate-400">
              <span className="font-semibold text-slate-300 block uppercase tracking-wider text-[11px]">
                Recuperação Padrão do Zabbix (Sem Histerese)
              </span>
              <p>
                Esta trigger utiliza o modo padrão: fecha automaticamente assim que a expressão do problema retornar FALSO (valor {selectedPractice?.operator === '>' ? '<=' : '>='} {thresholdValue}).
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
