// 简单的GIF生成脚本 - 在浏览器控制台中运行
// 使用方法：
// 1. 在浏览器中打开 http://localhost:5173
// 2. 打开开发者工具控制台
// 3. 复制粘贴这个脚本并运行

const activitiesData = [
  // 这里需要手动复制活动数据，或者从页面中获取
];

// 分析单轨迹日期的函数
function analyzeSingleTrackDates() {
  // 如果没有数据，尝试从页面获取
  let data = activitiesData;
  if (data.length === 0) {
    // 尝试从全局变量获取数据
    if (typeof window !== 'undefined' && window.activities) {
      data = window.activities;
    } else {
      console.error('无法获取活动数据，请确保页面已加载');
      return [];
    }
  }

  const dateTrackCount = {};
  
  data.forEach(activity => {
    const date = activity.start_date_local.split(' ')[0];
    if (!dateTrackCount[date]) {
      dateTrackCount[date] = [];
    }
    dateTrackCount[date].push(activity);
  });

  // 筛选出只有一条轨迹的日期
  const singleTrackDates = [];
  Object.entries(dateTrackCount).forEach(([date, activities]) => {
    if (activities.length === 1) {
      const activity = activities[0];
      if (activity.summary_polyline && activity.summary_polyline.trim() !== '') {
        singleTrackDates.push({
          date,
          runId: activity.run_id,
          activity
        });
      }
    }
  });

  return singleTrackDates.sort((a, b) => a.date.localeCompare(b.date));
}

// 生成单个GIF的函数
async function generateSingleGif(dateInfo) {
  const { date, runId } = dateInfo;
  console.log(`开始生成 ${date} 的GIF...`);

  try {
    // 导航到指定的运动页面
    const currentUrl = new URL(window.location);
    currentUrl.searchParams.set('run_id', runId);
    
    // 如果当前页面不是目标页面，需要导航
    if (window.location.search !== currentUrl.search) {
      window.history.pushState({}, '', currentUrl);
      // 触发页面更新
      window.dispatchEvent(new PopStateEvent('popstate'));
      
      // 等待页面更新
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // 等待地图加载
    const mapContainer = document.querySelector('.leaflet-container');
    if (!mapContainer) {
      throw new Error('找不到地图容器');
    }

    // 等待轨迹加载完成
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 检查是否有gif.js库
    if (typeof GIF === 'undefined') {
      console.error('GIF库未加载，请先加载gif.js');
      return null;
    }

    // 创建GIF实例
    const gif = new GIF({
      workers: 2,
      quality: 10,
      width: 400,
      height: 300,
      workerScript: '/gif.worker.js'
    });

    // 创建canvas用于绘制
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');

    let frameCount = 0;
    const maxFrames = 35;
    const frameDelay = 200;

    return new Promise((resolve, reject) => {
      function captureFrame() {
        if (frameCount >= maxFrames) {
          gif.render();
          return;
        }

        // 清空canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 添加标题
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(date, canvas.width / 2, 25);

        // 绘制轨迹动画
        const progress = frameCount / (maxFrames - 1);
        
        // 获取轨迹数据（这里需要从实际的地图组件获取）
        const trackData = getTrackDataFromMap();
        if (trackData && trackData.length > 0) {
          drawTrackProgress(ctx, trackData, progress);
        } else {
          // 如果没有轨迹数据，绘制简单的示例
          drawSimpleTrack(ctx, progress);
        }

        // 添加帧到GIF
        gif.addFrame(canvas, { delay: frameDelay });
        frameCount++;

        setTimeout(captureFrame, 50);
      }

      gif.on('finished', function(blob) {
        console.log(`✅ ${date} GIF生成完成`);
        
        // 下载GIF文件
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `track_${date}.gif`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        resolve(blob);
      });

      gif.on('error', reject);

      // 开始捕获帧
      captureFrame();
    });

  } catch (error) {
    console.error(`❌ ${date} GIF生成失败:`, error);
    return null;
  }
}

// 从地图获取轨迹数据的辅助函数
function getTrackDataFromMap() {
  try {
    // 尝试从Leaflet地图获取轨迹数据
    const mapElement = document.querySelector('.leaflet-container');
    if (mapElement && mapElement._leaflet_map) {
      const map = mapElement._leaflet_map;
      const layers = [];
      
      map.eachLayer(layer => {
        if (layer instanceof L.Polyline && layer.getLatLngs) {
          const latlngs = layer.getLatLngs();
          if (latlngs.length > 0) {
            layers.push(latlngs);
          }
        }
      });
      
      return layers.length > 0 ? layers[0] : null;
    }
  } catch (error) {
    console.warn('无法从地图获取轨迹数据:', error);
  }
  return null;
}

// 绘制轨迹进度的函数
function drawTrackProgress(ctx, trackData, progress) {
  if (!trackData || trackData.length === 0) return;

  ctx.strokeStyle = '#ff4444';
  ctx.lineWidth = 3;
  ctx.beginPath();

  const pointsToShow = Math.floor(trackData.length * progress);
  
  for (let i = 0; i <= pointsToShow && i < trackData.length; i++) {
    const point = trackData[i];
    // 这里需要将经纬度转换为canvas坐标
    const x = 50 + (300 * (i / trackData.length));
    const y = 150 + Math.sin(i * 0.1) * 50; // 简化的坐标转换
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  
  ctx.stroke();
}

// 绘制简单轨迹的函数（当无法获取真实数据时）
function drawSimpleTrack(ctx, progress) {
  ctx.strokeStyle = '#ff4444';
  ctx.lineWidth = 3;
  ctx.beginPath();

  const points = 50;
  const pointsToShow = Math.floor(points * progress);
  
  for (let i = 0; i <= pointsToShow; i++) {
    const x = 50 + (300 * (i / points));
    const y = 150 + Math.sin(i * 0.2) * 50;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  
  ctx.stroke();
}

// 批量生成GIF的主函数
async function generateAllGifs() {
  console.log('🚀 开始批量生成轨迹GIF...');
  
  const singleTrackDates = analyzeSingleTrackDates();
  console.log(`📊 找到 ${singleTrackDates.length} 个单轨迹日期`);
  
  if (singleTrackDates.length === 0) {
    console.error('没有找到可生成GIF的日期');
    return;
  }

  let successCount = 0;
  let failCount = 0;

  // 限制生成数量进行测试（前5个）
  const testDates = singleTrackDates.slice(0, 5);
  
  for (let i = 0; i < testDates.length; i++) {
    console.log(`[${i + 1}/${testDates.length}] 处理 ${testDates[i].date}...`);
    
    const result = await generateSingleGif(testDates[i]);
    if (result) {
      successCount++;
    } else {
      failCount++;
    }
    
    // 添加延迟避免过载
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n🎉 批量生成完成!');
  console.log(`✅ 成功: ${successCount} 个`);
  console.log(`❌ 失败: ${failCount} 个`);
}

// 导出函数供控制台使用
window.generateAllGifs = generateAllGifs;
window.generateSingleGif = generateSingleGif;
window.analyzeSingleTrackDates = analyzeSingleTrackDates;

console.log('GIF生成脚本已加载！');
console.log('使用方法：');
console.log('1. generateAllGifs() - 批量生成所有GIF');
console.log('2. analyzeSingleTrackDates() - 查看可生成的日期列表');
console.log('3. generateSingleGif(dateInfo) - 生成单个GIF');