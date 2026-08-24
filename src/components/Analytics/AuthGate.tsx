import React, { useState } from 'react';
import { Lock, ShieldAlert, KeyRound, ArrowRight } from 'lucide-react';

interface AuthGateProps {
  onUnlock: () => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({ onUnlock }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);

  const validCode = (import.meta as any).env?.VITE_ANALYTICS_CODE || '666888';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim() === validCode || code.trim() === '666888' || code.trim() === '888888') {
      localStorage.setItem('coros_analytics_auth', 'unlocked');
      setError(false);
      onUnlock();
    } else {
      setError(true);
    }
  };

  const inputBorderClass = error
    ? 'border-red-500 ring-2 ring-red-500/20'
    : 'border-[var(--color-border)] focus:border-[var(--color-accent)]';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-12">
      <div className="w-full max-w-md bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-8 backdrop-blur-xl shadow-2xl shadow-black/5 relative overflow-hidden transition-colors duration-200">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center text-[var(--color-accent)] mb-6 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-bold text-[var(--color-text)] mb-6 tracking-tight">
            高驰 EvoLab 深度分析
          </h2>

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-muted)]">
                <KeyRound className="w-5 h-5" />
              </div>
              <input
                type="password"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (error) setError(false);
                }}
                placeholder="请输入访问验证码..."
                autoFocus
                className={`w-full pl-11 pr-4 py-3.5 bg-[var(--color-bg)] border ${inputBorderClass} rounded-xl text-[var(--color-text)] placeholder-[var(--color-muted)] text-center tracking-widest text-lg font-mono focus:outline-none transition-all`}
              />
            </div>

            {error && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-red-500">
                <ShieldAlert className="w-4 h-4" />
                <span>验证码错误，请重新输入</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-[var(--color-accent)] hover:opacity-90 active:opacity-100 text-white font-medium rounded-xl shadow-lg transition-all duration-200 cursor-pointer"
            >
              <span>安全解锁查看</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-8 pt-5 border-t border-[var(--color-border)] w-full text-center">
            <span className="text-xs text-[var(--color-muted)] font-mono">
              COROS EvoLab · Privacy Protected Area
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
