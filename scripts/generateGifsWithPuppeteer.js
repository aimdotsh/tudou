const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 读取活动数据
const activitiesData = require('../src/static/activities_py4567.json');

// 分析数据，找出单轨迹日期
function analyzeSingleTrackDates() {
  const dateTrackCount = {};
  
  activitiesData.forEach(activity => {
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

async function generateGifForDate(browser, dateInfo, index, total) {
  const { date, runId } = dateInfo;
  console.log(`[${index + 1}/${total}] 正在生成 ${date} 的GIF...`);

  try {
    const page = await browser.newPage();
    
    // 设置视口大小
    await page.setViewport({ width: 1200, height: 800 });
    
    // 访问页面并等待加载
    const url = `http://localhost:5173/?run_id=${runId}`;
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // 等待地图加载完成
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    await page.waitForTimeout(2000); // 额外等待确保地图完全加载
    
    // 注入GIF生成脚本
    await page.addScriptTag({ path: './public/gif.js' });
    
    // 执行GIF生成
    const gifBuffer = await page.evaluate(async (targetDate) => {
      return new Promise((resolve, reject) => {
        try {
          // 查找动态轨迹地图组件
          const mapContainer = document.querySelector('.leaflet-container');
          if (!mapContainer) {
            throw new Error('找不到地图容器');
          }

          // 创建GIF实例
          const gif = new GIF({
            workers: 2,
            quality: 10,
            width: 400,
            height: 300,
            workerScript: '/gif.worker.js'
          });

          // 创建canvas用于截图
          const canvas = document.createElement('canvas');
          canvas.width = 400;
          canvas.height = 300;
          const ctx = canvas.getContext('2d');

          let frameCount = 0;
          const maxFrames = 35;
          const frameDelay = 200;

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
            ctx.fillText(targetDate, canvas.width / 2, 25);

            // 这里应该绘制轨迹动画帧
            // 由于在浏览器环境中，我们需要模拟轨迹绘制
            const progress = frameCount / (maxFrames - 1);
            
            // 简单的轨迹模拟（实际应该从地图数据获取）
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 3;
            ctx.beginPath();
            
            // 模拟轨迹绘制进度
            const points = 50;
            for (let i = 0; i <= points * progress; i++) {
              const x = 50 + (canvas.width - 100) * (i / points);
              const y = canvas.height / 2 + Math.sin(i * 0.2) * 50;
              
              if (i === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
            }
            ctx.stroke();

            // 添加帧到GIF
            gif.addFrame(canvas, { delay: frameDelay });
            frameCount++;

            setTimeout(captureFrame, 50);
          }

          gif.on('finished', function(blob) {
            const reader = new FileReader();
            reader.onload = function() {
              const arrayBuffer = reader.result;
              const uint8Array = new Uint8Array(arrayBuffer);
              resolve(Array.from(uint8Array));
            };
            reader.readAsArrayBuffer(blob);
          });

          gif.on('error', reject);

          // 开始捕获帧
          captureFrame();

        } catch (error) {
          reject(error);
        }
      });
    }, date);

    // 保存GIF文件
    const gifPath = path.join(__dirname, '../assets/gif', `track_${date}.gif`);
    fs.writeFileSync(gifPath, Buffer.from(gifBuffer));
    
    console.log(`✅ ${date} GIF生成完成: ${gifPath}`);
    
    await page.close();
    return true;

  } catch (error) {
    console.error(`❌ ${date} GIF生成失败:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 开始批量生成轨迹GIF...');
  
  // 确保输出目录存在
  const gifDir = path.join(__dirname, '../assets/gif');
  if (!fs.existsSync(gifDir)) {
    fs.mkdirSync(gifDir, { recursive: true });
  }

  // 分析单轨迹日期
  const singleTrackDates = analyzeSingleTrackDates();
  console.log(`📊 找到 ${singleTrackDates.length} 个单轨迹日期`);

  // 启动浏览器
  const browser = await puppeteer.launch({
    headless: false, // 设为false以便调试
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  let successCount = 0;
  let failCount = 0;

  // 批量生成（限制前10个进行测试）
  const testDates = singleTrackDates.slice(0, 10);
  
  for (let i = 0; i < testDates.length; i++) {
    const success = await generateGifForDate(browser, testDates[i], i, testDates.length);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // 添加延迟避免过载
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  await browser.close();

  console.log('\n🎉 批量生成完成!');
  console.log(`✅ 成功: ${successCount} 个`);
  console.log(`❌ 失败: ${failCount} 个`);
  console.log(`📁 GIF文件保存在: ${gifDir}`);
}

// 运行脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { analyzeSingleTrackDates, generateGifForDate };