# 轨迹GIF远点大小自定义设置指南

## 概述

`generate_gifs_custom_dots.py` 是一个增强版的轨迹GIF生成脚本，支持自定义起点、终点和当前位置点的大小。

## 新增功能

### 远点大小参数

- **起点大小** (`start_dot_size`): 控制轨迹起点圆点的半径
- **终点大小** (`end_dot_size`): 控制轨迹终点圆点的半径  
- **当前位置大小** (`current_dot_size`): 控制动画中当前位置点的半径

### 默认设置

```python
start_dot_size = 6      # 起点半径 6px
end_dot_size = 6        # 终点半径 6px
current_dot_size = 5    # 当前位置半径 5px
```

## 使用方法

### 1. 命令行参数方式

```bash
# 基本使用 - 使用默认远点大小
python scripts/generate_gifs_custom_dots.py -day 2024-08-17

# 自定义远点大小
python scripts/generate_gifs_custom_dots.py -day 2024-08-17 \
  -start_size 8 \
  -end_size 8 \
  -current_size 6

# 完整自定义参数
python scripts/generate_gifs_custom_dots.py -day 2024-08-17 \
  -width 250 \
  -height 320 \
  -color "#FF6B35" \
  -dot_color "blue" \
  -line_width 4 \
  -start_size 10 \
  -end_size 10 \
  -current_size 8
```

### 2. 交互式菜单方式

```bash
python scripts/generate_gifs_custom_dots.py
```

然后按照菜单提示选择操作。

## 参数说明

### 基础参数

| 参数 | 说明 | 默认值 | 示例 |
|------|------|--------|------|
| `-day` | 指定日期 | 无 | `2024-08-17` |
| `-width` | GIF宽度 | 200 | `250` |
| `-height` | GIF高度 | 自动计算 | `320` |
| `-color` | 轨迹颜色 | `#FF8C00` | `#FF6B35` |
| `-dot_color` | 当前位置点颜色 | `green` | `blue` |
| `-line_width` | 轨迹线宽度 | 3 | `4` |

### 远点大小参数（新增）

| 参数 | 说明 | 默认值 | 推荐范围 |
|------|------|--------|----------|
| `-start_size` | 起点圆点半径 | 6 | 3-15 |
| `-end_size` | 终点圆点半径 | 6 | 3-15 |
| `-current_size` | 当前位置圆点半径 | 5 | 3-12 |

## 远点大小效果对比

### 小尺寸远点（精细风格）
```bash
python scripts/generate_gifs_custom_dots.py -day 2024-08-17 \
  -start_size 3 -end_size 3 -current_size 2
```
- 适合：复杂轨迹、高密度路线
- 效果：精细、不遮挡轨迹细节

### 中等尺寸远点（默认风格）
```bash
python scripts/generate_gifs_custom_dots.py -day 2024-08-17 \
  -start_size 6 -end_size 6 -current_size 5
```
- 适合：一般轨迹、平衡视觉效果
- 效果：清晰可见、不过分突出

### 大尺寸远点（突出风格）
```bash
python scripts/generate_gifs_custom_dots.py -day 2024-08-17 \
  -start_size 12 -end_size 12 -current_size 10
```
- 适合：简单轨迹、需要强调起终点
- 效果：醒目突出、易于识别

## 实际应用场景

### 1. 城市跑步（复杂路线）
```bash
# 使用较小的远点，避免遮挡复杂的城市道路
python scripts/generate_gifs_custom_dots.py -day 2024-08-17 \
  -start_size 4 -end_size 4 -current_size 3 \
  -color "#2E86AB" -dot_color "#F24236"
```

### 2. 郊外徒步（简单路线）
```bash
# 使用较大的远点，突出起终点位置
python scripts/generate_gifs_custom_dots.py -day 2024-08-17 \
  -start_size 10 -end_size 10 -current_size 8 \
  -color "#A23B72" -dot_color "#F18F01"
```

### 3. 马拉松比赛（长距离）
```bash
# 中等大小远点，平衡视觉效果
python scripts/generate_gifs_custom_dots.py -day 2024-08-17 \
  -start_size 7 -end_size 9 -current_size 6 \
  -color "#C73E1D" -dot_color "#FFE66D"
```

## 批量生成不同尺寸

### 创建批量脚本

```bash
#!/bin/bash
# batch_generate_custom_dots.sh

DATE="2024-08-17"

# 小尺寸版本
python scripts/generate_gifs_custom_dots.py -day $DATE \
  -start_size 3 -end_size 3 -current_size 2 \
  -width 200

# 中等尺寸版本  
python scripts/generate_gifs_custom_dots.py -day $DATE \
  -start_size 6 -end_size 6 -current_size 5 \
  -width 200

# 大尺寸版本
python scripts/generate_gifs_custom_dots.py -day $DATE \
  -start_size 12 -end_size 12 -current_size 10 \
  -width 200
```

## 技术细节

### 远点绘制逻辑

1. **起点**: 始终显示，使用绿色或SVG图标
2. **终点**: 仅在动画完成时显示，使用红色或SVG图标
3. **当前位置**: 仅在动画进行中显示，使用可配置颜色

### 坐标系统

- 远点大小以像素为单位
- 圆点使用 `draw.ellipse()` 方法绘制
- 坐标格式: `[x-size, y-size, x+size, y+size]`

### 兼容性

- 支持真实轨迹数据和示例轨迹
- 兼容SVG图标和圆点备用方案
- 自动适应不同画布尺寸

## 故障排除

### 常见问题

1. **远点太大遮挡轨迹**
   - 解决：减小 `start_size`、`end_size`、`current_size` 参数

2. **远点太小看不清**
   - 解决：增大远点大小参数，或使用对比度更高的颜色

3. **远点位置偏移**
   - 原因：坐标标准化问题
   - 解决：检查轨迹数据质量

### 调试技巧

```bash
# 生成测试GIF查看效果
python scripts/generate_gifs_custom_dots.py -day 2024-08-17 \
  -start_size 8 -end_size 8 -current_size 6 \
  -width 300 -height 400
```

## 更新日志

### v1.0 (2024-09-20)
- ✅ 新增自定义远点大小功能
- ✅ 支持命令行参数配置
- ✅ 保持向后兼容性
- ✅ 添加详细使用文档

## 相关文件

- `generate_gifs_custom_dots.py` - 主脚本文件
- `generate_gifs_orange.py` - 原版橘色轨迹脚本
- `generate_gifs_python.py` - 基础版本脚本
- `assets/gif/` - GIF输出目录