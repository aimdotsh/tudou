export const usePrivacyMode = () => {
  // 始终返回隐私模式开启状态
  const isPrivacyMode = true;
  const setIsPrivacyMode = () => {
    console.log('Privacy mode is always enabled');
  };

  return { isPrivacyMode, setIsPrivacyMode };
};