#!/usr/bin/env node

/**
 * 批量生成轨迹GIF脚本
 * 
 * 使用方法：
 * 1. 确保开发服务器正在运行 (npm run dev)
 * 2. 安装依赖: pnpm add -D puppeteer
 * 3. 运行脚本: node scripts/batchGenerateGifs.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取活动数据
function loadActivities() {
  try {
    // 直接读取主要的JSON文件
    const activitiesPath = path.join(__dirname, '../src/static/activities_py4567.json');
    
    if (!fs.existsSync(activitiesPath)) {
      console.error('Activities file not found:', activitiesPath);
      return [];
    }
    
    console.log(`📁 使用活动数据文件: ${path.basename(activitiesPath)}`);
    
    const data = fs.readFileSync(activitiesPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading activities:', error);
    return [];
  }
}

// 获取所有有轨迹的日期
function getDatesWithTracks(activities) {
  const datesWithTracks = new Set();
  
  activities.forEach(activity => {
    if (activity.summary_polyline && activity.start_date_local) {
      const date = activity.start_date_local.split('T')[0];
      datesWithTracks.add(date);
    }
  });
  
  return Array.from(datesWithTracks).sort();
}

// 检查是否为单条轨迹
function isSingleTrackDate(date, activities) {
  const dayActivities = activities.filter(activity => 
    activity.start_date_local.startsWith(date) && activity.summary_polyline
  );
  return dayActivities.length === 1;
}

// 生成浏览器端执行的脚本
function generateBrowserScript() {
  return `
// 批量生成GIF的浏览器端脚本
window.generateTrackGifs = async function() {
  console.log('开始批量生成轨迹GIF...');
  
  // 检查必要的依赖
  if (typeof GIF === 'undefined') {
    console.error('GIF.js not loaded');
    return;
  }
  
  if (typeof html2canvas === 'undefined') {
    console.error('html2canvas not loaded');
    return;
  }
  
  if (typeof mapboxgl === 'undefined') {
    console.error('Mapbox GL not loaded');
    return;
  }

  // 获取活动数据
  const activities = window.activities || [];
  if (!activities.length) {
    console.error('No activities data found');
    return;
  }

  // 获取所有有轨迹的日期
  const datesWithTracks = [];
  const dateMap = new Map();
  
  activities.forEach(activity => {
    if (activity.summary_polyline && activity.start_date_local) {
      const date = activity.start_date_local.split('T')[0];
      if (!dateMap.has(date)) {
        dateMap.set(date, []);
      }
      dateMap.get(date).push(activity);
    }
  });

  // 只处理单条轨迹的日期
  for (const [date, dayActivities] of dateMap) {
    if (dayActivities.length === 1) {
      datesWithTracks.push(date);
    }
  }

  console.log(\`找到 \${datesWithTracks.length} 个单轨迹日期\`);

  // 创建隐藏容器
  const container = document.createElement('div');
  container.style.cssText = \`
    position: fixed;
    top: -2000px;
    left: -2000px;
    width: 400px;
    height: 300px;
    z-index: -9999;
    background: #f8f9fa;
  \`;
  document.body.appendChild(container);

  const results = [];
  
  for (let i = 0; i < datesWithTracks.length; i++) {
    const date = datesWithTracks[i];
    console.log(\`处理 \${date} (\${i + 1}/\${datesWithTracks.length})\`);
    
    try {
      const gifBlob = await generateSingleGif(date, container, dateMap.get(date)[0]);
      if (gifBlob) {
        // 下载GIF
        const url = URL.createObjectURL(gifBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = \`track_\${date}.gif\`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        results.push({ date, success: true });
        console.log(\`✓ 成功生成 \${date}.gif\`);
      } else {
        results.push({ date, success: false });
        console.log(\`✗ 生成失败 \${date}\`);
      }
    } catch (error) {
      console.error(\`生成 \${date} 时出错:\`, error);
      results.push({ date, success: false, error: error.message });
    }
    
    // 添加延迟避免浏览器卡死
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // 清理
  document.body.removeChild(container);
  
  console.log('批量生成完成!');
  console.log('成功:', results.filter(r => r.success).length);
  console.log('失败:', results.filter(r => !r.success).length);
  
  return results;
};

// 生成单个GIF
async function generateSingleGif(date, container, activity) {
  return new Promise((resolve) => {
    try {
      // 解码轨迹
      const coordinates = decodePolyline(activity.summary_polyline);
      if (coordinates.length < 2) {
        resolve(null);
        return;
      }

      // 创建地图容器
      const mapId = \`gif-map-\${Date.now()}\`;
      container.innerHTML = \`
        <div id="\${mapId}" style="width: 100%; height: 100%; position: relative; background: #f8f9fa;">
          <div style="
            position: absolute; 
            top: 12px; 
            left: 12px; 
            background: rgba(0,0,0,0.85); 
            color: white; 
            padding: 8px 16px; 
            border-radius: 6px; 
            font-size: 16px; 
            font-weight: 600; 
            z-index: 1000;
            font-family: 'Courier New', monospace;
          ">
            \${date}
          </div>
        </div>
      \`;

      const mapContainer = document.getElementById(mapId);
      
      // 计算边界
      const bounds = calculateBounds(coordinates);
      
      // 创建地图
      const map = new mapboxgl.Map({
        container: mapId,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [bounds.longitude, bounds.latitude],
        zoom: bounds.zoom,
        interactive: false,
        attributionControl: false,
        logoControl: false
      });

      map.on('load', async () => {
        try {
          // 创建GIF
          const gif = new GIF({
            workers: 2,
            quality: 8,
            width: 400,
            height: 300,
            workerScript: '/gif.worker.js'
          });

          const totalFrames = 35;
          const step = Math.max(1, Math.floor(coordinates.length / totalFrames));

          // 生成动画帧
          for (let i = 2; i < coordinates.length; i += step) {
            const frameCoords = coordinates.slice(0, i);
            
            // 更新轨迹
            updateMapTrack(map, frameCoords);
            
            // 等待渲染
            await new Promise(resolve => setTimeout(resolve, 100));

            // 截图
            const canvas = await html2canvas(mapContainer, {
              width: 400,
              height: 300,
              scale: 1,
              useCORS: true,
              allowTaint: true,
              backgroundColor: '#f8f9fa'
            });

            gif.addFrame(canvas, { delay: 120 });
          }

          // 最后一帧（完整轨迹）
          updateMapTrack(map, coordinates);
          await new Promise(resolve => setTimeout(resolve, 100));

          const finalCanvas = await html2canvas(mapContainer, {
            width: 400,
            height: 300,
            scale: 1,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#f8f9fa'
          });

          gif.addFrame(finalCanvas, { delay: 1500 });

          // 生成GIF
          gif.on('finished', function(blob) {
            map.remove();
            resolve(blob);
          });

          gif.on('error', function(error) {
            console.error('GIF generation error:', error);
            map.remove();
            resolve(null);
          });

          gif.render();

        } catch (error) {
          console.error('Map processing error:', error);
          map.remove();
          resolve(null);
        }
      });

      map.on('error', (error) => {
        console.error('Map error:', error);
        resolve(null);
      });

    } catch (error) {
      console.error('Setup error:', error);
      resolve(null);
    }
  });
}

// 更新地图轨迹
function updateMapTrack(map, coordinates) {
  if (map.getSource('track')) {
    map.removeLayer('track-line');
    map.removeSource('track');
  }

  map.addSource('track', {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: coordinates
      }
    }
  });

  map.addLayer({
    id: 'track-line',
    type: 'line',
    source: 'track',
    paint: {
      'line-color': '#FF8C00',
      'line-width': 4,
      'line-opacity': 1
    },
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    }
  });
}

// 解码polyline
function decodePolyline(polyline) {
  if (!polyline) return [];
  
  try {
    // 使用已有的解码函数
    if (typeof mapboxPolyline !== 'undefined' && mapboxPolyline.decode) {
      const decoded = mapboxPolyline.decode(polyline);
      return decoded.map(arr => [arr[1], arr[0]]);
    }
    
    // 如果没有解码库，返回空数组
    console.warn('Polyline decoder not available');
    return [];
  } catch (error) {
    console.error('Polyline decode error:', error);
    return [];
  }
}

// 计算边界
function calculateBounds(coordinates) {
  if (coordinates.length === 0) {
    return { longitude: 116.3974, latitude: 39.9093, zoom: 10 };
  }

  const lngs = coordinates.map(coord => coord[0]);
  const lats = coordinates.map(coord => coord[1]);
  
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  const centerLng = (minLng + maxLng) / 2;
  const centerLat = (minLat + maxLat) / 2;

  const lngDiff = maxLng - minLng;
  const latDiff = maxLat - minLat;
  const maxDiff = Math.max(lngDiff, latDiff);
  
  let zoom = 10;
  if (maxDiff > 1) zoom = 8;
  else if (maxDiff > 0.1) zoom = 11;
  else if (maxDiff > 0.01) zoom = 13;
  else zoom = 15;

  return { longitude: centerLng, latitude: centerLat, zoom };
}

console.log('GIF生成脚本已加载');
console.log('运行 generateTrackGifs() 开始批量生成');
  `;
}

// 主函数
async function main() {
  console.log('🎬 批量生成轨迹GIF脚本');
  console.log('========================');
  
  // 检查活动数据
  const activities = loadActivities();
  if (activities.length === 0) {
    console.error('❌ 未找到活动数据');
    return;
  }
  
  console.log(`📊 加载了 ${activities.length} 条活动记录`);
  
  // 获取有轨迹的日期
  const datesWithTracks = getDatesWithTracks(activities);
  console.log(`📍 找到 ${datesWithTracks.length} 个有轨迹的日期`);
  
  // 筛选单轨迹日期
  const singleTrackDates = datesWithTracks.filter(date => 
    isSingleTrackDate(date, activities)
  );
  
  console.log(`🎯 其中 ${singleTrackDates.length} 个日期为单轨迹（适合生成GIF）`);
  
  if (singleTrackDates.length === 0) {
    console.log('❌ 没有找到适合生成GIF的单轨迹日期');
    return;
  }
  
  // 确保输出目录存在
  const gifDir = path.join(__dirname, '../assets/gif');
  if (!fs.existsSync(gifDir)) {
    fs.mkdirSync(gifDir, { recursive: true });
    console.log(`📁 创建目录: ${gifDir}`);
  }
  
  console.log('');
  console.log('🚀 使用说明：');
  console.log('1. 确保开发服务器正在运行 (npm run dev 或 pnpm dev)');
  console.log('2. 在浏览器中打开应用 (通常是 http://localhost:5173)');
  console.log('3. 打开浏览器开发者工具的控制台');
  console.log('4. 复制并粘贴以下脚本到控制台：');
  console.log('');
  console.log('--- 复制以下内容到浏览器控制台 ---');
  console.log(generateBrowserScript());
  console.log('--- 复制结束 ---');
  console.log('');
  console.log('5. 在控制台运行: generateTrackGifs()');
  console.log('6. 等待所有GIF自动下载完成');
  console.log('7. 将下载的GIF文件移动到 assets/gif/ 目录');
  console.log('');
  console.log(`📋 预计生成 ${singleTrackDates.length} 个GIF文件：`);
  singleTrackDates.slice(0, 10).forEach(date => {
    console.log(`   - track_${date}.gif`);
  });
  if (singleTrackDates.length > 10) {
    console.log(`   ... 还有 ${singleTrackDates.length - 10} 个文件`);
  }
}

// 运行脚本
main().catch(console.error);

export {
  loadActivities,
  getDatesWithTracks,
  generateBrowserScript
};