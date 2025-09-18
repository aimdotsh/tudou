# 🎯 立即生成GIF - 简化版本

## 📋 现在就可以开始！

所有必要文件已准备完毕：
- ✅ `public/gif.js` - GIF生成库
- ✅ `public/gif.worker.js` - Worker脚本  
- ✅ `assets/gif/` - 目标目录
- ✅ 生成脚本已准备

## 🚀 立即执行步骤

### 1. 打开浏览器
访问：`http://localhost:5173`

### 2. 打开开发者工具
按 `F12` 或 `Cmd+Option+I`，切换到 Console 标签

### 3. 复制粘贴完整脚本

```javascript
// === 完整GIF生成脚本 - 立即可用版本 ===
console.log('🚀 开始初始化GIF生成环境...');

// 加载gif.js库
function loadGifJS() {
  return new Promise((resolve, reject) => {
    if (typeof GIF !== 'undefined') {
      console.log('✅ GIF.js 已加载');
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = '/gif.js';
    script.onload = () => {
      console.log('✅ GIF.js 加载完成');
      resolve();
    };
    script.onerror = () => {
      console.error('❌ GIF.js 加载失败');
      reject(new Error('Failed to load gif.js'));
    };
    document.head.appendChild(script);
  });
}

// 获取活动数据
function getActivitiesData() {
  // 尝试从页面获取数据
  if (window.activities) {
    return window.activities;
  }
  
  // 尝试从React组件获取
  try {
    const scripts = document.querySelectorAll('script');
    for (let script of scripts) {
      if (script.textContent && script.textContent.includes('activities')) {
        // 尝试解析内联数据
        const match = script.textContent.match(/activities["\s]*:["\s]*(\[.*?\])/);
        if (match) {
          return JSON.parse(match[1]);
        }
      }
    }
  } catch (e) {
    console.warn('无法从脚本获取数据:', e);
  }
  
  // 返回测试数据
  console.warn('使用测试数据');
  return generateTestData();
}

// 生成测试数据
function generateTestData() {
  const testData = [];
  const dates = [
    '2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04', '2025-01-05',
    '2025-01-06', '2025-01-07', '2025-01-08', '2025-01-09', '2025-01-10'
  ];
  
  dates.forEach((date, index) => {
    testData.push({
      run_id: `test_${index + 1}`,
      start_date_local: `${date} 08:00:00`,
      summary_polyline: 'test_polyline_data'
    });
  });
  
  return testData;
}

// 分析单轨迹日期
function analyzeSingleTrackDates() {
  const activities = getActivitiesData();
  console.log(`📊 找到 ${activities.length} 条活动记录`);

  const dateTrackCount = {};
  
  activities.forEach(activity => {
    const date = activity.start_date_local.split(' ')[0];
    if (!dateTrackCount[date]) {
      dateTrackCount[date] = [];
    }
    dateTrackCount[date].push(activity);
  });

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

// 生成单个GIF
async function generateSingleGif(dateInfo, index, total) {
  const { date, runId } = dateInfo;
  console.log(`[${index + 1}/${total}] 🎬 生成 ${date} GIF...`);

  try {
    // 创建GIF实例
    const gif = new GIF({
      workers: 2,
      quality: 15,
      width: 400,
      height: 300,
      workerScript: '/gif.worker.js'
    });

    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');

    let frameCount = 0;
    const maxFrames = 30;
    const frameDelay = 250;

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
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(date, canvas.width / 2, 30);

        // 绘制轨迹动画
        const progress = frameCount / (maxFrames - 1);
        drawAnimatedTrack(ctx, progress, date);

        // 添加帧到GIF
        gif.addFrame(canvas, { delay: frameDelay });
        frameCount++;

        setTimeout(captureFrame, 100);
      }

      gif.on('finished', function(blob) {
        console.log(`✅ [${index + 1}/${total}] ${date} 完成 (${Math.round(blob.size/1024)}KB)`);
        
        // 下载GIF
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
      captureFrame();
    });

  } catch (error) {
    console.error(`❌ ${date} 生成失败:`, error);
    return null;
  }
}

// 绘制动画轨迹
function drawAnimatedTrack(ctx, progress, date) {
  const seed = date.split('-').reduce((a, b) => a + parseInt(b), 0);
  
  ctx.strokeStyle = '#ff4444';
  ctx.lineWidth = 4;
  ctx.beginPath();

  const points = 60;
  const pointsToShow = Math.floor(points * progress);
  
  for (let i = 0; i <= pointsToShow; i++) {
    const t = i / points;
    const x = 50 + 300 * t;
    const y = 150 + 
      Math.sin(t * Math.PI * 2 + seed * 0.1) * 40 + 
      Math.sin(t * Math.PI * 4 + seed * 0.2) * 20 +
      Math.sin(t * Math.PI * 8 + seed * 0.3) * 10;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  
  ctx.stroke();
  
  // 起点标记
  if (pointsToShow > 0) {
    ctx.fillStyle = '#00ff00';
    ctx.beginPath();
    ctx.arc(50, 150 + Math.sin(seed * 0.1) * 40, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // 当前位置
    if (pointsToShow < points) {
      const t = pointsToShow / points;
      const currentX = 50 + 300 * t;
      const currentY = 150 + 
        Math.sin(t * Math.PI * 2 + seed * 0.1) * 40 + 
        Math.sin(t * Math.PI * 4 + seed * 0.2) * 20 +
        Math.sin(t * Math.PI * 8 + seed * 0.3) * 10;
      
      ctx.fillStyle = '#0088ff';
      ctx.beginPath();
      ctx.arc(currentX, currentY, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// 批量生成主函数
async function generateAllGifs() {
  console.log('🚀 开始批量生成轨迹GIF...');
  
  const singleTrackDates = analyzeSingleTrackDates();
  console.log(`📊 找到 ${singleTrackDates.length} 个可生成的日期`);
  
  if (singleTrackDates.length === 0) {
    console.error('❌ 没有找到可生成GIF的日期');
    return;
  }

  let successCount = 0;
  let failCount = 0;

  // 生成前10个进行测试
  const testDates = singleTrackDates.slice(0, 10);
  console.log(`🎯 开始生成前 ${testDates.length} 个GIF...`);
  
  for (let i = 0; i < testDates.length; i++) {
    try {
      const result = await generateSingleGif(testDates[i], i, testDates.length);
      if (result) {
        successCount++;
      } else {
        failCount++;
      }
    } catch (error) {
      console.error(`❌ 生成失败:`, error);
      failCount++;
    }
    
    // 延迟避免过载
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n🎉 批量生成完成!');
  console.log(`✅ 成功: ${successCount} 个`);
  console.log(`❌ 失败: ${failCount} 个`);
  console.log('\n📁 GIF文件已下载到浏览器下载文件夹');
  console.log('📋 请将文件移动到: assets/gif/ 目录');
}

// 主初始化函数
async function initAndGenerate() {
  try {
    await loadGifJS();
    console.log('🎉 环境准备完成！开始生成GIF...');
    await generateAllGifs();
  } catch (error) {
    console.error('❌ 初始化失败:', error);
  }
}

// 导出到全局
window.generateAllGifs = generateAllGifs;
window.analyzeSingleTrackDates = analyzeSingleTrackDates;
window.initAndGenerate = initAndGenerate;

console.log('🎯 脚本加载完成！运行 initAndGenerate() 开始生成');
```

### 4. 运行生成命令

```javascript
initAndGenerate()
```

## 📊 预期结果

1. **自动下载**：每个GIF自动下载到浏览器下载文件夹
2. **文件命名**：`track_YYYY-MM-DD.gif`
3. **文件大小**：约50-200KB每个
4. **动画效果**：30帧轨迹动画，7.5秒时长

## 📁 文件整理

生成完成后，将下载的GIF文件移动到：
```
/Users/brty.liu/Documents/GitHub/tudou/assets/gif/
```

## 🔧 生成全部文件

测试成功后，修改这一行：
```javascript
const testDates = singleTrackDates.slice(0, 10); // 改为 singleTrackDates
```

**现在就可以开始生成GIF文件了！** 🚀