// 浏览器兼容的存储工具
const isLocalStorageAvailable = () => {
  try {
    const testKey = '__test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

const isCookieAvailable = () => {
  return navigator.cookieEnabled;
};

export const setPrivacyMode = (enabled: boolean) => {
  if (isLocalStorageAvailable()) {
    localStorage.setItem('privacy_mode', String(enabled));
  } else if (isCookieAvailable()) {
    document.cookie = `privacy_mode=${enabled}; path=/; max-age=31536000; SameSite=Lax`;
  }
};

export const getPrivacyMode = (): boolean => {
  // Safari 兼容性处理
  if (typeof window === 'undefined') {
    return true;
  }

  if (isLocalStorageAvailable()) {
    return localStorage.getItem('privacy_mode') === 'true';
  }
  
  if (isCookieAvailable()) {
    const match = document.cookie.match(/(^| )privacy_mode=([^;]+)/);
    return match ? match[2] === 'true' : true; // 默认开启隐私模式
  }

  return true; // 默认启用隐私模式
};