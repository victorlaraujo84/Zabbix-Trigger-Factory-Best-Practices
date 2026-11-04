import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  Lock,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  User,
  Cloud,
  Check,
  Sparkles,
  ShieldCheck,
  FileText,
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSecurityOverview?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onOpenSecurityOverview,
}) => {
  const {
    user,
    firebaseUser,
    loading,
    error,
    signInWithGoogle,
    logout,
    lgpdConsent,
    acceptLgpdConsent,
  } = useAuth();

  const [acceptedTermsLocally, setAcceptedTermsLocally] = useState(lgpdConsent);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    if (!acceptedTermsLocally) {
      await acceptLgpdConsent();
    }
    await signInWithGoogle();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden space-y-0">
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-b border-slate-800 flex items-start justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-950/70 border border-rose-800/80 text-[11px] font-mono text-rose-300">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
              <span>Acesso Seguro & Nuvem Google</span>
            </div>
            <h3 className="text-lg font-bold text-white">
              {user ? 'Conta Conectada' : 'Conectar com o Google'}
            </h3>
            <p className="text-xs text-slate-400">
              {user
                ? 'Seus dados de clientes, inventário e limiares estão sincronizados com segurança.'
                : 'Faça login para preservar seus clientes, inventário de hosts e regras no banco de dados.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 text-sm"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-950/50 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {user ? (
            /* Logged in state */
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-3">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Avatar'}
                    className="w-12 h-12 rounded-full border border-slate-700 object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-rose-900/60 border border-rose-700 flex items-center justify-center text-white font-bold">
                    {user.displayName?.[0] || 'U'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate">
                    {user.displayName || 'Operador Zabbix'}
                  </div>
                  <div className="text-xs text-slate-400 truncate font-mono">
                    {user.email}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-400 font-medium">
                    <Cloud className="w-3.5 h-3.5" />
                    <span>Sincronizado via Firestore Cloud</span>
                  </div>
                </div>
              </div>

              {/* Security & LGPD Status */}
              <div className="p-3 bg-emerald-950/30 border border-emerald-900/50 rounded-xl space-y-1.5 text-xs text-emerald-200">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Conformidade LGPD Ativa (Art. 46)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Isolamento por UID, auditoria de alterações habilitada e banco protegido contra acessos não autorizados.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                {onOpenSecurityOverview && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenSecurityOverview();
                    }}
                    className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border border-slate-700"
                  >
                    <Shield className="w-3.5 h-3.5 text-rose-400" />
                    <span>Painel de Segurança & LGPD</span>
                  </button>
                )}
                <button
                  onClick={async () => {
                    await logout();
                  }}
                  className="px-4 py-2 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800 text-rose-300 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sair</span>
                </button>
              </div>
            </div>
          ) : (
            /* Logged out state */
            <div className="space-y-4">
              {/* LGPD Consent Checkbox */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedTermsLocally}
                    onChange={(e) => {
                      setAcceptedTermsLocally(e.target.checked);
                      if (e.target.checked) acceptLgpdConsent();
                    }}
                    className="mt-0.5 w-4 h-4 accent-rose-600 rounded cursor-pointer"
                  />
                  <span className="text-xs text-slate-300 leading-relaxed">
                    Concordo com os <strong>Termos de Privacidade e Proteção de Dados (LGPD)</strong>. Meus dados de monitoramento serão armazenados com isolamento seguro e criptografia na nuvem.
                  </span>
                </label>
              </div>

              {/* Google Sign In Button */}
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 font-semibold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-3 active:scale-[0.99] disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{loading ? 'Conectando...' : 'Entrar com Conta Google'}</span>
              </button>

              <div className="pt-2 text-center">
                <span className="text-[11px] text-slate-500 block">
                  Autenticação via OAuth 2.0 com suporte a Google Workspace e Gmail corporativo.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
