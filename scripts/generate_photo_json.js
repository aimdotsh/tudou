#!/usr/bin/env node
/**
 * 自动生成 public/luck.json 和 public/wonderful.json
 *
 * 逻辑：
 * - 扫描 assets/luck_photos/ 目录，提取日期（YYYY-MM-DD 格式）
 * - 检查 assets/luck/ 下是否存在同日期的 SVG
 * - 生成 public/luck.json（仅包含有匹配 SVG 的日期）
 *
 * - 扫描 assets/yyyymmdd_photos/ 目录，提取日期
 * - 检查 assets/yyyymmdd/ 下是否存在同日期的 SVG
 * - 生成 public/wonderful.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/**
 * 从文件名中提取日期（YYYY-MM-DD 格式）
 * 支持：2024-12-08.jpg、2024-12-081.jpg、2024-12-082.jpg 等
 */
function extractDate(filename) {
  const match = filename.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

/**
 * 扫描 photosDir，找出有对应 SVG 的日期，生成 JSON 文件列表
 * @param {string} photosDir  照片目录（相对于项目根目录）
 * @param {string} svgDir     SVG 目录（相对于项目根目录）
 * @param {string} outputJson 输出 JSON 路径（相对于项目根目录）
 */
function generateJson(photosDir, svgDir, outputJson) {
  const photosDirAbs = path.resolve(ROOT, photosDir);
  const svgDirAbs = path.resolve(ROOT, svgDir);
  const outputAbs = path.resolve(ROOT, outputJson);

  if (!fs.existsSync(photosDirAbs)) {
    console.warn(`[警告] 照片目录不存在: ${photosDirAbs}`);
    return;
  }

  if (!fs.existsSync(svgDirAbs)) {
    console.warn(`[警告] SVG 目录不存在: ${svgDirAbs}`);
    return;
  }

  // 读取所有照片文件名，提取不重复的日期
  const photoFiles = fs.readdirSync(photosDirAbs).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
  const dateSet = new Set();

  photoFiles.forEach(filename => {
    const date = extractDate(filename);
    if (date) dateSet.add(date);
  });

  // 过滤：只保留 SVG 目录中有对应文件的日期
  const matchedSvgs = [];
  dateSet.forEach(date => {
    const svgFile = `${date}.svg`;
    const svgPath = path.join(svgDirAbs, svgFile);
    if (fs.existsSync(svgPath)) {
      matchedSvgs.push(svgFile);
    } else {
      console.warn(`  [跳过] ${date} — SVG 不存在: ${svgPath}`);
    }
  });

  // 按日期倒序排列（最新的在前面）
  matchedSvgs.sort((a, b) => b.localeCompare(a));

  // 写入 JSON
  fs.writeFileSync(outputAbs, JSON.stringify(matchedSvgs, null, 2) + '\n', 'utf-8');
  console.log(`[完成] 写入 ${outputJson}（共 ${matchedSvgs.length} 条）:`);
  matchedSvgs.forEach(svg => console.log(`  - ${svg}`));
}

console.log('=== 开始生成 JSON 文件列表 ===\n');

console.log('【吉象同行】luck_photos → luck/');
generateJson('assets/luck_photos', 'assets/luck', 'public/luck.json');

console.log('\n【Wonderful Workouts】yyyymmdd_photos → yyyymmdd/');
generateJson('assets/yyyymmdd_photos', 'assets/yyyymmdd', 'public/wonderful.json');

console.log('\n=== 生成完毕 ===');
