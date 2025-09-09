import fs from 'fs';
import path from 'path';
import polyline from '@mapbox/polyline';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 定义偏移量（与 utils.ts 中的 getOffset 函数保持一致）
const OFFSET = {
  // 直线距离偏移: 456.78 公里，偏移的方位角: 114.45° (东南方向)
  lat: -1.642, // 纬度偏移
  lng: 3.762,  // 经度偏移
};

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