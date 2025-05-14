import { useState, useEffect } from 'react';

const PRIVACY_MODE_KEY = 'running_page_privacy_mode';

export const usePrivacyMode = () => {
  // 从 localStorage 获取初始值，如果没有则使用 false
  const [isPrivacyMode, setIsPrivacyMode] = useState(() => {
    const saved = localStorage.getItem(PRIVACY_MODE_KEY);
    return saved ? JSON.parse(saved) : false;
  });

  // 当隐私模式状态改变时，保存到 localStorage
  useEffect(() => {
    localStorage.setItem(PRIVACY_MODE_KEY, JSON.stringify(isPrivacyMode));
  }, [isPrivacyMode]);

  return {
    isPrivacyMode,
    setIsPrivacyMode,
  };
};