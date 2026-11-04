import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, Info, X, ShieldAlert, CheckCircle2, ChevronRight } from 'lucide-react';
import { AccessibleExplanation } from '../types';

interface TriggerExplanationPopoverProps {
  explanation: AccessibleExplanation;
  triggerName: string;
  severity: string;
}

export const TriggerExplanationPopover: React.FC<TriggerExplanationPopoverProps> = ({
  explanation,
  triggerName,
  severity,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on ESC
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Trigger Button with Tooltip summary pill */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 transition-all text-left"
        title="Clique para ver o que este monitoramento avalia e quando vai alarmar"
      >
        <span className="w-4 h-4 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
          <Info className="w-3 h-3" />
        </span>
        <span className="text-[11px] font-medium text-slate-300 group-hover:text-white truncate max-w-xs sm:max-w-md">
          {explanation.summary}
        </span>
        <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-slate-300 shrink-0" />
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute left-0 mt-2 z-50 w-80 sm:w-96 p-4 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono text-rose-400 uppercase tracking-wider font-semibold block">
                Entendimento Operacional da Trigger
              </span>
              <h4 className="text-xs font-bold text-white leading-tight">
                {triggerName}
              </h4>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 1-sentence prompt summary quote */}
          <div className="p-2.5 bg-rose-950/20 border border-rose-900/40 rounded-lg text-xs text-rose-200/90 italic">
            "{explanation.summary}"
          </div>

          <div className="space-y-2.5 text-xs">
            {/* O Que Monitora */}
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1">
              <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                <span>🎯 O Que Está Avaliando:</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                {explanation.what_monitors}
              </p>
            </div>

            {/* Quando Vai Alarmar */}
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1">
              <div className="text-[11px] font-semibold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                <span>⚠️ Quando Vai Tocar o Alarme:</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                {explanation.when_triggers}
              </p>
            </div>

            {/* O Que Significa na Prática */}
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1">
              <div className="text-[11px] font-semibold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider">
                <span>💡 O Que Quer Dizer na Prática:</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                {explanation.business_impact}
              </p>
            </div>

            {/* Quando Normaliza */}
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1">
              <div className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                <span>🔄 Como e Quando Normaliza (Recupera):</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                {explanation.recovery_condition}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Severidade Zabbix: <strong className="text-slate-300">{severity}</strong></span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-rose-400 hover:text-rose-300"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
