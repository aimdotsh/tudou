/**
 * 加密/解密工具函数
 * 用于保护敏感位置数据
 */

// 简单的XOR加密密钥
const CRYPTO_KEY = 'running_page_location_privacy';

/**
 * 使用XOR加密字符串并转为Base64
 * @param text 要加密的文本
 * @returns 加密后的Base64字符串
 */
export const encrypt = (text: string | undefined): string | undefined => {
  if (!text) return undefined;
  
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ CRYPTO_KEY.charCodeAt(i % CRYPTO_KEY.length);
    result += String.fromCharCode(charCode);
  }
  return btoa(result); // 转为Base64
};

/**
 * 解密Base64编码的XOR加密字符串
 * @param cipherText 加密的Base64字符串
 * @returns 解密后的原始文本
 */
export const decrypt = (cipherText: string | undefined): string | undefined => {
  if (!cipherText) return undefined;
  
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

