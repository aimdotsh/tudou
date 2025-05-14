const CRYPTO_KEY = 'running_page_salt'; // 实际项目中应使用更安全的密钥管理方式

// 简单加密函数
export const encrypt = (text: string): string => {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ CRYPTO_KEY.charCodeAt(i % CRYPTO_KEY.length);
    result += String.fromCharCode(charCode);
  }
  return btoa(result); // 转为Base64
};

// 简单解密函数
export const decrypt = (cipherText: string): string => {
  try {
    const decoded = atob(cipherText);
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ CRYPTO_KEY.charCodeAt(i % CRYPTO_KEY.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch (e) {
    console.error('Decryption failed:', e);
    return cipherText; // 解密失败返回原文本
  }
};