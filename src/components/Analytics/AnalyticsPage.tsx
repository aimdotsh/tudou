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
    ? 'bg-[var(--color-accent)] text-white shadow-md'
    : 'text-[var(--color-muted)] hover:text-[var(--color-text)]';

  const trendsBtnClass = activeSubTab === 'trends'
    ? 'bg-[var(--color-accent)] text-white shadow-md'
    : 'text-[var(--color-muted)] hover:text-[var(--color-text)]';

  return (
    <div className="space-y-6 pb-12 transition-colors duration-200">
      {/* 顶部控制栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-4 backdrop-blur shadow-sm">
        {/* 子视图切换 */}
        <div className="flex items-center gap-2 bg-[var(--color-bg)] p-1 rounded-xl border border-[var(--color-border)]">
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
        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-[var(--color-muted)] font-mono">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
            <ShieldCheck className="w-4 h-4" />
            <span>已安全解锁</span>
          </div>
          <button
            onClick={handleLock}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-bg)] hover:bg-[var(--color-border)] text-[var(--color-text)] rounded-lg border border-[var(--color-border)] transition cursor-pointer"
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
