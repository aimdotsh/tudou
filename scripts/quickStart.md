# 快速生成GIF指南

由于puppeteer安装较慢，这里提供一个更快的浏览器端生成方案。

## 🚀 快速开始

### 1. 确保开发服务器运行
```bash
pnpm dev
```

### 2. 打开浏览器
访问 `http://localhost:5173`

### 3. 打开开发者工具
按 `F12` 或右键选择"检查"

### 4. 在控制台中运行初始化脚本

复制粘贴以下代码到控制台：

```javascript
// 加载初始化脚本
fetch('/loadGifScript.js')
  .then(response => response.text())
  .then(script => eval(script))
  .then(() => initGifGenerator())
  .catch(console.error);
```

### 5. 开始生成GIF

初始化完成后，运行：

```javascript
// 查看可生成的日期
const dates = analyzeSingleTrackDates();
console.log(`找到 ${dates.length} 个可生成GIF的日期`);

// 开始批量生成（测试前5个）
generateAllGifs();
```

## 📋 生成过程

1. 脚本会自动分析活动数据
2. 筛选出单轨迹日期（745个）
3. 逐个生成GIF动画
4. 自动下载到浏览器下载文件夹
5. 文件命名格式：`track_YYYY-MM-DD.gif`

## 📁 文件整理

生成完成后，需要手动将下载的GIF文件移动到项目的 `assets/gif/` 目录。

## 🔧 自定义选项

可以修改生成参数：

```javascript
// 修改生成数量（默认测试5个）
const testDates = singleTrackDates.slice(0, 10); // 生成前10个

// 修改GIF参数
const gif = new GIF({
  workers: 2,
  quality: 10,        // 质量 1-30，数字越小质量越高
  width: 400,         // 宽度
  height: 300,        // 高度
  workerScript: '/gif.worker.js'
});
```

## ⚠️ 注意事项

1. 生成过程中不要关闭浏览器标签页
2. 每个GIF大约需要10-20秒生成时间
3. 生成过程中页面会自动切换到不同的运动记录
4. 建议分批生成，避免浏览器过载

## 🐛 故障排除

如果遇到问题：

1. **GIF.js加载失败**：检查 `/gif.js` 和 `/gif.worker.js` 文件是否存在
2. **没有轨迹数据**：确保页面已完全加载，地图组件正常显示
3. **生成失败**：检查控制台错误信息，可能需要刷新页面重试

## 📊 预期结果

- 总共可生成约745个GIF文件
- 每个GIF包含35帧轨迹动画
- 文件大小约50-200KB每个
- 动画时长约7秒（35帧 × 200ms）