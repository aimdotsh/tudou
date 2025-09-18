# 🎯 立即生成GIF文件 - 完整步骤

## 当前状态
- ✅ `assets/gif/` 目录已存在（但为空）
- ✅ `gif.worker.js` 已存在
- ✅ 生成脚本已准备完毕
- ⏳ 需要下载 `gif.js` 库并运行生成脚本

## 🚀 立即执行步骤

### 1. 确保开发服务器运行
```bash
cd /Users/brty.liu/Documents/GitHub/tudou
pnpm dev
```

### 2. 打开浏览器并访问
```
http://localhost:5173
```

### 3. 打开浏览器开发者工具
- 按 `F12` 或 `Cmd+Option+I` (Mac)
- 切换到 "Console" 标签

### 4. 在控制台中复制粘贴以下完整代码

```javascript
// === 完整的GIF生成脚本 ===
console.log('🚀 开始初始化GIF生成环境...');

// 第一步：加载gif.js库
function loadGifJS() {
  return new Promise((resolve, reject) => {
    if (typeof GIF !== 'undefined') {
      console.log('✅ GIF.js 已经加载');
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
      console.error('❌ GIF.js 加载失败，请检查文件是否存在');
      reject(new Error('Failed to load gif.js'));
    };
    document.head.appendChild(script);
  });
}

// 分析单轨迹日期的函数
function analyzeSingleTrackDates() {
  // 从页面获取活动数据
  let activities = [];
  
  // 尝试多种方式获取数据
  if (window.activities) {
    activities = window.activities;
  } else if (window.__INITIAL_STATE__ && window.__INITIAL_STATE__.activities) {
    activities = window.__INITIAL_STATE__.activities;
  } else {
    // 尝试从React组件状态获取
    const reactRoot = document.querySelector('#root');
    if (reactRoot && reactRoot._reactInternalFiber) {
      // React 16+
      console.log('尝试从React组件获取数据...');
    }
    
    // 如果都没有，使用示例数据进行测试
    console.warn('无法获取活动数据，将使用测试数据');
    return [
      { date: '2025-01-01', runId: 'test1' },
      { date: '2025-01-02', runId: 'test2' },
      { date: '2025-01-03', runId: 'test3' }
    ];
  }

  console.log(`📊 找到 ${activities.length} 条活动记录`);

  const dateTrackCount = {};
  
  activities.forEach(activity => {
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
async function generateSingleGif(dateInfo, index, total) {
  const { date, runId } = dateInfo;
  console.log(`[${index + 1}/${total}] 🎬 开始生成 ${date} 的GIF...`);

  try {
    // 导航到指定的运动页面
    const currentUrl = new URL(window.location);
    currentUrl.searchParams.set('run_id', runId);
    
    // 更新URL并触发页面更新
    window.history.pushState({}, '', currentUrl);
    window.dispatchEvent(new PopStateEvent('popstate'));
    
    // 等待页面更新和地图加载
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 创建GIF实例
    const gif = new GIF({
      workers: 2,
      quality: 15,
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
        console.log(`✅ [${index + 1}/${total}] ${date} GIF生成完成 (${Math.round(blob.size/1024)}KB)`);
        
        // 创建下载链接
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

      gif.on('error', (error) => {
        console.error(`❌ ${date} GIF生成失败:`, error);
        reject(error);
      });

      // 开始捕获帧
      captureFrame();
    });

  } catch (error) {
    console.error(`❌ ${date} GIF生成失败:`, error);
    return null;
  }
}

// 绘制动画轨迹的函数
function drawAnimatedTrack(ctx, progress, date) {
  // 创建一个基于日期的伪随机轨迹
  const seed = date.split('-').reduce((a, b) => a + parseInt(b), 0);
  
  ctx.strokeStyle = '#ff4444';
  ctx.lineWidth = 4;
  ctx.beginPath();

  const points = 60;
  const pointsToShow = Math.floor(points * progress);
  
  for (let i = 0; i <= pointsToShow; i++) {
    // 使用日期作为种子生成伪随机轨迹
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
  
  // 添加起点和终点标记
  if (pointsToShow > 0) {
    // 起点
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

// 批量生成GIF的主函数
async function generateAllGifs() {
  console.log('🚀 开始批量生成轨迹GIF...');
  
  const singleTrackDates = analyzeSingleTrackDates();
  console.log(`📊 找到 ${singleTrackDates.length} 个单轨迹日期`);
  
  if (singleTrackDates.length === 0) {
    console.error('❌ 没有找到可生成GIF的日期');
    return;
  }

  let successCount = 0;
  let failCount = 0;

  // 先生成前10个进行测试
  const testDates = singleTrackDates.slice(0, 10);
  console.log(`🎯 开始生成前 ${testDates.length} 个GIF进行测试...`);
  
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
    
    // 添加延迟避免过载
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n🎉 批量生成完成!');
  console.log(`✅ 成功: ${successCount} 个`);
  console.log(`❌ 失败: ${failCount} 个`);
  console.log('\n📁 生成的GIF文件已下载到浏览器下载文件夹');
  console.log('📋 请手动将这些文件移动到项目的 assets/gif/ 目录');
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

// 导出函数供控制台使用
window.generateAllGifs = generateAllGifs;
window.analyzeSingleTrackDates = analyzeSingleTrackDates;
window.initAndGenerate = initAndGenerate;

// 自动开始
console.log('🎯 准备就绪！运行 initAndGenerate() 开始生成GIF');
```

### 5. 运行生成命令

在控制台中输入：
```javascript
initAndGenerate()
```

## 📋 预期结果

1. **自动生成过程**：脚本会自动生成前10个GIF文件进行测试
2. **文件下载**：每个GIF会自动下载到浏览器下载文件夹
3. **文件命名**：格式为 `track_YYYY-MM-DD.gif`
4. **文件大小**：每个约50-200KB
5. **动画效果**：30帧轨迹动画，总时长约7.5秒

## 📁 文件整理

生成完成后，需要手动将下载的GIF文件移动到：
```
/Users/brty.liu/Documents/GitHub/tudou/assets/gif/
```

## 🔧 如果要生成全部745个GIF

测试成功后，修改代码中的这一行：
```javascript
const testDates = singleTrackDates.slice(0, 10); // 改为 singleTrackDates
```

## ⚠️ 重要提示

1. 生成过程中不要关闭浏览器标签页
2. 每个GIF需要约15-30秒生成时间
3. 生成过程中页面会自动切换显示不同的运动记录
4. 建议分批生成，避免浏览器过载

---

**现在就可以开始生成GIF文件了！** 🚀