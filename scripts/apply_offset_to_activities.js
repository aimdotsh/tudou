import fs from 'fs';
import path from 'path';
import polyline from '@mapbox/polyline';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 默认偏移配置
const DEFAULT_OFFSET_CONFIG = {
  distance: 456.78,  // 直线距离偏移: 456.78 公里
  bearing: 114.45    // 偏移的方位角: 114.45° (东南方向)
};

// 尝试读取 site-metadata 配置
let distance = DEFAULT_OFFSET_CONFIG.distance;
let bearing = DEFAULT_OFFSET_CONFIG.bearing;

try {
  const siteMetadataPath = path.join(__dirname, '../src/static/site-metadata.ts');
  const siteMetadataContent = fs.readFileSync(siteMetadataPath, 'utf8');

  // 提取 mapOffset 配置（简单的正则匹配）
  const distanceMatch = siteMetadataContent.match(/distance:\s*([0-9.]+)/);
  const bearingMatch = siteMetadataContent.match(/bearing:\s*([0-9.]+)/);

  if (distanceMatch && bearingMatch) {
    distance = parseFloat(distanceMatch[1]);
    bearing = parseFloat(bearingMatch[1]);
    console.log('成功从 site-metadata.ts 读取偏移配置');
  } else {
    console.warn('无法解析 site-metadata.ts 中的偏移配置，使用默认值');
  }
} catch (error) {
  console.warn('读取 site-metadata.ts 失败，使用默认偏移配置:', error.message);
}

// 根据距离和方位角计算偏移量（与 utils.ts 中的 getOffset 函数逻辑一致）
function calculateOffset(distance, bearing) {
  // 将方位角转换为弧度
  const bearingRad = (bearing * Math.PI) / 180;

  // 计算南北和东西方向的距离分量
  const northDistance = distance * Math.cos(bearingRad); // 正值向北，负值向南
  const eastDistance = distance * Math.sin(bearingRad);  // 正值向东，负值向西

  // 转换为度数偏移
  // 1度纬度 ≈ 111 公里
  // 1度经度 ≈ 111 * cos(纬度) 公里，在中国大陆约为 89 公里
  const latOffset = northDistance / 111;
  const lngOffset = eastDistance / 89;

  return {
    lat: latOffset,
    lng: lngOffset,
  };
}

const OFFSET = calculateOffset(distance, bearing);
console.log(`使用偏移配置: 距离=${distance}km, 方位角=${bearing}°`);
console.log(`计算得到偏移量: lat=${OFFSET.lat.toFixed(6)}, lng=${OFFSET.lng.toFixed(6)}`);

// 输入和输出文件路径
const INPUT_FILE = path.join(__dirname, '../src/static/activities.json');
const OUTPUT_FILE = path.join(__dirname, '../src/static/activities_py4567.json');

console.log('开始处理活动数据...');

// 读取活动数据
let activities;
try {
  const data = fs.readFileSync(INPUT_FILE, 'utf8');
  activities = JSON.parse(data);
  console.log(`成功读取 ${activities.length} 条活动记录`);
} catch (error) {
  console.error('读取活动数据失败:', error);
  process.exit(1);
}

// 处理每个活动的 summary_polyline
let processedCount = 0;
let skippedCount = 0;

activities = activities.map(activity => {
  // 创建活动的副本，避免修改原始对象
  const newActivity = { ...activity };

  // Clean description
  if (newActivity.description) {
    newActivity.description = newActivity.description
      .replace(/Powered By www\.gearaut\.com/gi, "")
      .replace(/训练负荷：\d+[；;]?/g, "")
      .trim();
  }

  if (!newActivity.summary_polyline) {
    skippedCount++;
    return newActivity;
  }

  try {
    // 解码 polyline
    const points = polyline.decode(newActivity.summary_polyline);

    // 应用偏移
    const offsetPoints = points.map(point => [
      point[0] + OFFSET.lat,
      point[1] + OFFSET.lng
    ]);

    // 重新编码 polyline
    newActivity.summary_polyline = polyline.encode(offsetPoints);
    processedCount++;

    return newActivity;
  } catch (error) {
    console.error(`处理活动 ID ${newActivity.run_id} 失败:`, error);
    skippedCount++;
    return newActivity;
  }
});

// 保存处理后的数据
try {
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(activities, null, 2));
  console.log(`处理完成！已保存到 ${OUTPUT_FILE}`);
  console.log(`成功处理: ${processedCount} 条记录`);
  console.log(`跳过处理: ${skippedCount} 条记录`);
} catch (error) {
  console.error('保存数据失败:', error);
  process.exit(1);
}