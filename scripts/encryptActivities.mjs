import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 简单的XOR加密密钥
const CRYPTO_KEY = 'running_page_location_privacy';

/**
 * 使用XOR加密字符串并转为Base64
 * @param {string} text 要加密的文本
 * @returns {string} 加密后的Base64字符串
 */
const encrypt = (text) => {
  if (!text) return undefined;
  
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ CRYPTO_KEY.charCodeAt(i % CRYPTO_KEY.length);
    result += String.fromCharCode(charCode);
  }
  return Buffer.from(result).toString('base64'); // 转为Base64
};

// 输入和输出文件路径
const inputPath = path.join(__dirname, '../src/static/activities.json');
const outputPath = path.join(__dirname, '../src/static/activities.encrypted.json');

// 读取原始活动数据
console.log('Reading activities data...');
const activities = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

// 加密location_country字段
console.log('Encrypting location_country fields...');
const encryptedActivities = activities.map(activity => ({
  ...activity,
  location_country: activity.location_country ? encrypt(activity.location_country) : undefined
}));

// 写入加密后的数据
console.log('Writing encrypted data...');
fs.writeFileSync(outputPath, JSON.stringify(encryptedActivities, null, 2));

console.log(`Encryption complete! Encrypted ${activities.length} activities.`);
console.log(`Output file: ${outputPath}`);