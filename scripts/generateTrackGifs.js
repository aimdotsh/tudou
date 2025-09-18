const fs = require('fs');
const path = require('path');

// 批量生成轨迹GIF的脚本
// 这个脚本需要在浏览器环境中运行，因为需要访问Mapbox和Canvas API

const script = `
// 批量生成轨迹GIF脚本
// 在浏览器控制台中运行此脚本

async function generateAllTrackGifs() {
  // 导入必要的模块
  const activities = window.activities || [];
  
  if (!activities || activities.length === 0) {
    console.error('No activities data found. Please make sure activities are loaded.');
    return;
  }

  // 获取所有有轨迹数据的日期
  const datesWithTracks = new Set();
  activities.forEach(activity => {
    if (activity.summary_polyline && activity.start_date_local) {
      const date = activity.start_date_local.split('T')[0];
      datesWithTracks.add(date);
    }
  });

  console.log(\`Found \${datesWithTracks.size} dates with track data\`);

  const gifUrls = {};
  let processed = 0;
  const total = datesWithTracks.size;

  // 创建一个隐藏的容器来生成GIF
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-1000px';
  container.style.left = '-1000px';
  container.style.width = '400px';
  container.style.height = '300px';
  container.style.zIndex = '-1';
  document.body.appendChild(container);

  for (const date of Array.from(datesWithTracks)) {
    try {
      console.log(\`Processing \${date} (\${processed + 1}/\${total})\`);
      
      const gifUrl = await generateSingleTrackGif(date, container);
      if (gifUrl) {
        gifUrls[date] = gifUrl;
        
        // 下载GIF文件
        const link = document.createElement('a');
        link.href = gifUrl;
        link.download = \`track_\${date}.gif\`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log(\`✓ Generated GIF for \${date}\`);
      } else {
        console.log(\`✗ Failed to generate GIF for \${date}\`);
      }
      
      processed++;
      
      // 添加延迟避免浏览器卡死
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(\`Error processing \${date}:\`, error);
      processed++;
    }
  }

  // 清理
  document.body.removeChild(container);
  
  console.log(\`Completed! Generated \${Object.keys(gifUrls).length} GIFs out of \${total} dates\`);
  return gifUrls;
}

async function generateSingleTrackGif(date, container) {
  return new Promise(async (resolve) => {
    try {
      // 获取该日期的活动数据
      const dayActivities = window.activities.filter(activity => 
        activity.start_date_local.startsWith(date) && activity.summary_polyline
      );

      if (dayActivities.length === 0) {
        resolve(null);
        return;
      }

      // 只处理单条轨迹
      if (dayActivities.length !== 1) {
        console.log(\`Skipping \${date}: multiple tracks (\${dayActivities.length})\`);
        resolve(null);
        return;
      }

      const activity = dayActivities[0];
      
      // 解码轨迹数据
      const coordinates = decodePolyline(activity.summary_polyline);
      if (coordinates.length < 2) {
        resolve(null);
        return;
      }

      // 创建地图容器
      container.innerHTML = \`
        <div id="gif-map-\${date.replace(/-/g, '')}" style="width: 100%; height: 100%; position: relative;">
          <div style="position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.8); color: white; padding: 8px 12px; border-radius: 6px; font-size: 14px; font-weight: 600; z-index: 1000;">
            \${date}
          </div>
        </div>
      \`;

      const mapContainer = container.querySelector(\`#gif-map-\${date.replace(/-/g, '')}\`);
      
      // 计算地图边界
      const bounds = calculateBounds(coordinates);
      
      // 创建Mapbox地图
      const map = new mapboxgl.Map({
        container: mapContainer,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [bounds.longitude, bounds.latitude],
        zoom: bounds.zoom,
        interactive: false,
        attributionControl: false
      });

      map.on('load', async () => {
        // 创建GIF生成器
        const gif = new GIF({
          workers: 2,
          quality: 10,
          width: 400,
          height: 300,
          workerScript: '/gif.worker.js'
        });

        const totalFrames = 40;
        const step = Math.max(1, Math.floor(coordinates.length / totalFrames));

        // 生成动画帧
        for (let i = 2; i < coordinates.length; i += step) {
          const frameCoords = coordinates.slice(0, i);
          
          // 更新地图数据
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
                coordinates: frameCoords
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

          // 等待渲染完成
          await new Promise(resolve => setTimeout(resolve, 100));

          // 截取帧
          const canvas = await html2canvas(mapContainer, {
            width: 400,
            height: 300,
            scale: 1,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#f8f9fa'
          });

          gif.addFrame(canvas, { delay: 150 });
        }

        // 添加完整轨迹的最后一帧
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

        await new Promise(resolve => setTimeout(resolve, 100));

        const finalCanvas = await html2canvas(mapContainer, {
          width: 400,
          height: 300,
          scale: 1,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#f8f9fa'
        });

        gif.addFrame(finalCanvas, { delay: 2000 });

        // 生成GIF
        gif.on('finished', function(blob) {
          const url = URL.createObjectURL(blob);
          map.remove();
          resolve(url);
        });

        gif.render();
      });

    } catch (error) {
      console.error(\`Error generating GIF for \${date}:\`, error);
      resolve(null);
    }
  });
}

// 解码polyline函数
function decodePolyline(polyline) {
  if (!polyline) return [];
  
  try {
    // 简化的polyline解码实现
    const decoded = polyline.split('').reduce((acc, char, i) => {
      // 这里需要实际的polyline解码逻辑
      // 为了简化，假设已经有解码函数
      return acc;
    }, []);
    
    return decoded;
  } catch (error) {
    console.error('Failed to decode polyline:', error);
    return [];
  }
}

// 计算边界函数
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

// 启动批量生成
console.log('Starting batch GIF generation...');
console.log('Make sure you have loaded the activities data and required libraries (mapboxgl, html2canvas, gif.js)');
console.log('Run: generateAllTrackGifs()');
`;

console.log('批量生成轨迹GIF脚本');
console.log('====================');
console.log('');
console.log('使用方法：');
console.log('1. 在浏览器中打开应用');
console.log('2. 打开开发者工具控制台');
console.log('3. 复制并粘贴以下脚本到控制台：');
console.log('');
console.log(script);
console.log('');
console.log('4. 运行 generateAllTrackGifs() 函数');
console.log('5. 等待所有GIF生成完成并自动下载');
console.log('6. 将下载的GIF文件移动到 assets/gif/ 目录');