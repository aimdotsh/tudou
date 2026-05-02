#!/usr/bin/env node
/**
 * 自动生成 public/luck.json 和 public/wonderful.json
 *
 * 【吉象同行】luck.json：
 *   - 扫描 assets/luck_photos/ 目录，提取日期
 *   - 检查 assets/yyyymmdd/ 下是否存在同日期的 SVG
 *   - 仅保留有匹配 SVG 的日期
 *
 * 【Wonderful Workouts】wonderful.json：
 *   - 读取 activities 数据，筛选距离 > 21km 的活动日期
 *   - 检查 assets/yyyymmdd/ 下是否存在同日期的 SVG（必须有）
 *   - 照片可选：有则显示，无则前端 fallback 到 placeholder.png
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/** 从文件名中提取日期（YYYY-MM-DD） */
function extractDate(filename) {
  const match = filename.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

/**
 * 【吉象同行】：扫描 photosDir，找出有对应 SVG 的日期
 */
function generateLuckJson(photosDir, svgDir, outputJson) {
  const photosDirAbs = path.resolve(ROOT, photosDir);
  const svgDirAbs    = path.resolve(ROOT, svgDir);
  const outputAbs    = path.resolve(ROOT, outputJson);

  if (!fs.existsSync(photosDirAbs)) {
    console.warn(`[警告] 照片目录不存在: ${photosDirAbs}`);
    return;
  }
  if (!fs.existsSync(svgDirAbs)) {
    console.warn(`[警告] SVG 目录不存在: ${svgDirAbs}`);
    return;
  }

  // 提取照片中的不重复日期
  const photoFiles = fs.readdirSync(photosDirAbs).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
  const dateSet = new Set();
  photoFiles.forEach(f => { const d = extractDate(f); if (d) dateSet.add(d); });

  // 只保留有匹配 SVG 的日期
  const matched = [];
  dateSet.forEach(date => {
    const svgPath = path.join(svgDirAbs, `${date}.svg`);
    if (fs.existsSync(svgPath)) {
      matched.push(`${date}.svg`);
    } else {
      console.warn(`  [跳过] ${date} — SVG 不存在`);
    }
  });

  matched.sort((a, b) => b.localeCompare(a));
  fs.writeFileSync(outputAbs, JSON.stringify(matched, null, 2) + '\n', 'utf-8');
  console.log(`[完成] 写入 ${outputJson}（共 ${matched.length} 条）:`);
  matched.forEach(s => console.log(`  - ${s}`));
}

/**
 * 【Wonderful Workouts】：从 activities 数据中筛选距离 > minDistanceKm 的活动
 * 有 SVG 的自动展示，照片可选（无照片时前端降级到 placeholder.png）
 */
function generateWonderfulJson(activitiesFile, svgDir, outputJson, minDistanceKm = 21) {
  const activitiesAbs = path.resolve(ROOT, activitiesFile);
  const svgDirAbs     = path.resolve(ROOT, svgDir);
  const outputAbs     = path.resolve(ROOT, outputJson);

  if (!fs.existsSync(activitiesAbs)) {
    console.warn(`[警告] activities 文件不存在: ${activitiesAbs}`);
    return;
  }
  if (!fs.existsSync(svgDirAbs)) {
    console.warn(`[警告] SVG 目录不存在: ${svgDirAbs}`);
    return;
  }

  const minDistanceM = minDistanceKm * 1000;
  const activities = JSON.parse(fs.readFileSync(activitiesAbs, 'utf-8'));

  // 筛选距离 > minDistanceKm 的活动，提取日期（去重，每天只保留最长的）
  const dateMap = new Map(); // date → maxDistance
  activities.forEach(a => {
    if (a.distance <= minDistanceM) return;
    const date = (a.start_date_local || a.start_date || '').split(' ')[0];
    if (!date) return;
    if (!dateMap.has(date) || a.distance > dateMap.get(date)) {
      dateMap.set(date, a.distance);
    }
  });

  // 只保留有对应 SVG 的日期
  const matched = [];
  const skippedNoSvg = [];
  dateMap.forEach((dist, date) => {
    const svgPath = path.join(svgDirAbs, `${date}.svg`);
    if (fs.existsSync(svgPath)) {
      matched.push({ svg: `${date}.svg`, dist });
    } else {
      skippedNoSvg.push(date);
    }
  });

  if (skippedNoSvg.length > 0) {
    console.warn(`  [跳过，无 SVG] ${skippedNoSvg.join(', ')}`);
  }

  // 按日期倒序排列
  matched.sort((a, b) => b.svg.localeCompare(a.svg));
  const result = matched.map(m => m.svg);

  fs.writeFileSync(outputAbs, JSON.stringify(result, null, 2) + '\n', 'utf-8');
  console.log(`[完成] 写入 ${outputJson}（共 ${result.length} 条，距离 >${minDistanceKm}km 且有 SVG）:`);
  matched.forEach(m => console.log(`  - ${m.svg}  (${(m.dist / 1000).toFixed(1)} km)`));
}

console.log('=== 开始生成 JSON 文件列表 ===\n');

console.log('【吉象同行】luck_photos → yyyymmdd/');
generateLuckJson('assets/luck_photos', 'assets/yyyymmdd', 'public/luck.json');

console.log('\n【Wonderful Workouts】activities 筛选距离 >21km → yyyymmdd/');
generateWonderfulJson(
  'src/static/activities_py4567.json',
  'assets/yyyymmdd',
  'public/wonderful.json',
  21  // 最小距离（公里）
);

console.log('\n=== 生成完毕 ===');
