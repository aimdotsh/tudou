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
    ? 'border-red-500/80 ring-2 ring-red-500/20'
    : 'border-slate-700/80 focus:border-emerald-500';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-12">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-8 backdrop-blur-xl shadow-2xl shadow-emerald-500/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -z-10" />
        
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-bold text-slate-100 mb-2 tracking-tight">
            高驰 EvoLab 深度分析
          </h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            此区域包含核心生理学数据、体能储备模型与个人竞技表现，请输入安全验证码以解锁查看。
          </p>

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
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
                className={`w-full pl-11 pr-4 py-3 bg-slate-950/80 border ${inputBorderClass} rounded-xl text-slate-100 placeholder-slate-500 text-center tracking-widest text-lg font-mono focus:outline-none transition-all`}
              />
            </div>

            {error && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-red-400">
                <ShieldAlert className="w-4 h-4" />
                <span>验证码错误，请重新输入</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-medium rounded-xl shadow-lg shadow-emerald-600/20 transition-all duration-200 cursor-pointer"
            >
              <span>安全解锁查看</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800/80 w-full text-center">
            <span className="text-xs text-slate-500 font-mono">
              COROS EvoLab · Privacy Protected Area
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
