import React, { useState } from 'react';
import { AuthGate } from './AuthGate';
import { DashboardOverview } from './DashboardOverview';
import { LongTermTrends } from './LongTermTrends';
import { Lock, LayoutDashboard, LineChart, ShieldCheck } from 'lucide-react';
import analyticsData from '../../static/coros_analytics.json';

export const AnalyticsPage: React.FC = () => {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return localStorage.getItem('coros_analytics_auth') === 'unlocked';
  });
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'trends'>('dashboard');

  const handleLock = () => {
    localStorage.removeItem('coros_analytics_auth');
    setIsUnlocked(false);
  };

  if (!isUnlocked) {
    return <AuthGate onUnlock={() => setIsUnlocked(true)} />;
  }

  const dashBtnClass = activeSubTab === 'dashboard'
    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
    : 'text-slate-400 hover:text-slate-200';

  const trendsBtnClass = activeSubTab === 'trends'
    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
    : 'text-slate-400 hover:text-slate-200';

  return (
    <div className="space-y-6 pb-12">
      {/* 顶部控制栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur">
        {/* 子视图切换 */}
        <div className="flex items-center gap-2 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveSubTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${dashBtnClass}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>⚡ 即时仪表板 (Dashboard)</span>
          </button>
          <button
            onClick={() => setActiveSubTab('trends')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${trendsBtnClass}`}
          >
            <LineChart className="w-4 h-4" />
            <span>📈 12周深度趋势 (EvoLab Trends)</span>
          </button>
        </div>

        {/* 状态指示与锁定按钮 */}
        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
            <ShieldCheck className="w-4 h-4" />
            <span>已安全解锁</span>
          </div>
          <button
            onClick={handleLock}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 active:bg-slate-900 text-slate-300 rounded-lg border border-slate-700 transition cursor-pointer"
            title="重新锁定此页面"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>锁定</span>
          </button>
        </div>
      </div>

      {/* 视图呈现 */}
      {activeSubTab === 'dashboard' ? (
        <DashboardOverview data={analyticsData} />
      ) : (
        <LongTermTrends data={analyticsData} />
      )}
    </div>
  );
};
