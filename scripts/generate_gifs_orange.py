#!/usr/bin/env python3
"""
轨迹GIF生成脚本 - 橘色轨迹版本
使用橘色轨迹和SVG图标
"""

import json
import os
import sys
import argparse
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import polyline
import math
import base64
import io
import re
from collections import defaultdict

try:
    import imageio
    print("✅ imageio 库已安装")
except ImportError:
    print("❌ 需要安装 imageio 库")
    print("运行: pip install imageio")
    sys.exit(1)

try:
    from PIL import Image, ImageDraw, ImageFont
    print("✅ Pillow 库已安装")
except ImportError:
    print("❌ 需要安装 Pillow 库")
    print("运行: pip install Pillow")
    sys.exit(1)

try:
    import polyline
    print("✅ polyline 库已安装")
except ImportError:
    print("❌ 需要安装 polyline 库")
    print("运行: pip install polyline")
    sys.exit(1)

class GifGenerator:
    def __init__(self, project_root=None, width=200, height=None, track_color='#FF8C00', 
                 dot_color='green', animation_frames=50, static_frames=20, 
                 animation_duration=0.06, static_duration=0.05, line_width=3,
                 start_dot_size=6, end_dot_size=6, current_dot_size=5):
        """
        初始化GIF生成器
        
        新增参数:
        - start_dot_size: 起点圆点半径 (默认: 6)
        - end_dot_size: 终点圆点半径 (默认: 6) 
        - current_dot_size: 当前位置圆点半径 (默认: 5)
        """
        if project_root is None:
            # 自动检测项目根目录
            current_dir = Path(__file__).parent
            self.project_root = current_dir.parent
        else:
            self.project_root = Path(project_root)
        
        self.activities_file = self.project_root / "src" / "static" / "activities_py4567.json"
        self.output_dir = self.project_root / "assets" / "gif"
        
        # GIF参数 - 可自定义
        self.width = width
        self.height = height if height else int(width * 9 / 7)  # 默认保持7:9宽高比
        self.track_color = track_color
        self.dot_color = dot_color
        self.animation_frames = animation_frames
        self.static_frames = static_frames
        self.frames = self.animation_frames + self.static_frames
        self.animation_duration = animation_duration
        self.static_duration = static_duration
        self.line_width = line_width
        
        # 远点大小参数 - 新增功能
        self.start_dot_size = start_dot_size
        self.end_dot_size = end_dot_size
        self.current_dot_size = current_dot_size
        
        print(f"📁 项目根目录: {self.project_root}")
        print(f"📊 活动数据文件: {self.activities_file}")
        print(f"📁 输出目录: {self.output_dir}")
        print(f"🎨 远点大小设置:")
        print(f"   - 起点大小: {self.start_dot_size}px")
        print(f"   - 终点大小: {self.end_dot_size}px") 
        print(f"   - 当前位置大小: {self.current_dot_size}px")
        
        # 加载起点和终点图标
        self.start_icon = self.load_svg_icon("start.svg")
        self.end_icon = self.load_svg_icon("end.svg")
    
    def load_svg_icon(self, filename):
        """加载SVG图标并转换为PIL Image"""
        svg_path = self.project_root / "assets" / filename
        try:
            # 从SVG中提取base64 PNG数据
            with open(svg_path, 'r', encoding='utf-8') as f:
                svg_content = f.read()
            
            # 查找base64数据
            base64_match = re.search(r'data:image/png;base64,([^"]+)', svg_content)
            if base64_match:
                base64_data = base64_match.group(1)
                png_data = base64.b64decode(base64_data)
                icon = Image.open(io.BytesIO(png_data)).convert("RGBA")
                print(f"✅ 成功加载图标: {filename}")
                return icon
            else:
                print(f"⚠️ 无法从 {filename} 中提取图标数据")
                return None
        except Exception as e:
            print(f"⚠️ 加载图标 {filename} 失败: {e}")
            return None
    
    def get_darker_color(self, color):
        """生成更深的颜色用作边框"""
        color_map = {
            'green': 'darkgreen',
            'blue': 'darkblue',
            'red': 'darkred',
            'orange': 'darkorange',
            'yellow': 'gold',
            'purple': 'darkviolet',
            'pink': 'deeppink',
            'cyan': 'darkcyan',
            'magenta': 'darkmagenta',
            'lime': 'limegreen'
        }
        
        # 如果是十六进制颜色，尝试生成更深的版本
        if color.startswith('#'):
            try:
                # 移除#号
                hex_color = color[1:]
                # 转换为RGB
                r = int(hex_color[0:2], 16)
                g = int(hex_color[2:4], 16)
                b = int(hex_color[4:6], 16)
                # 生成更深的颜色（减少亮度）
                r = max(0, int(r * 0.7))
                g = max(0, int(g * 0.7))
                b = max(0, int(b * 0.7))
                return f'#{r:02x}{g:02x}{b:02x}'
            except:
                return 'black'
        
        return color_map.get(color.lower(), 'black')
    
    def draw_icon(self, img, icon, x, y, size=None):
        """在指定位置绘制图标"""
        if icon is None:
            return
        
        # 调整图标大小 - 支持自定义大小
        if size:
            icon_size = size * 2  # 图标大小是圆点直径的2倍
        else:
            icon_size = 16  # 默认大小
        icon_resized = icon.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
        
        # 计算粘贴位置（居中）
        paste_x = int(x - icon_size // 2)
        paste_y = int(y - icon_size // 2)
        
        # 粘贴图标
        img.paste(icon_resized, (paste_x, paste_y), icon_resized)
    
    def load_activities(self):
        """加载活动数据"""
        try:
            with open(self.activities_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                # 处理不同的数据结构
                if isinstance(data, list):
                    activities = data
                elif isinstance(data, dict):
                    activities = data.get('activities', data.get('runs', []))
                else:
                    activities = []
                print(f"✅ 成功加载 {len(activities)} 条活动记录")
                return activities
        except Exception as e:
            print(f"❌ 加载活动数据失败: {e}")
            return []
    
    def analyze_single_track_dates(self, activities):
        """分析单轨迹日期"""
        date_activities = defaultdict(list)
        
        # 按日期分组活动
        for activity in activities:
            # 尝试多种日期字段格式
            date_str = activity.get('start_date_local', '') or activity.get('start_date', '')
            if 'T' in date_str:
                date = date_str.split('T')[0]
            else:
                date = date_str.split(' ')[0]  # 处理 "2018-04-14 06:07:08" 格式
            
            if date and activity.get('summary_polyline'):
                date_activities[date].append(activity)
        
        # 筛选单轨迹日期
        single_track_dates = []
        for date, day_activities in date_activities.items():
            if len(day_activities) == 1:
                single_track_dates.append({
                    'date': date,
                    'activity': day_activities[0]
                })
        
        # 按日期排序
        single_track_dates.sort(key=lambda x: x['date'])
        print(f"📊 找到 {len(single_track_dates)} 个单轨迹日期")
        
        return single_track_dates
    
    def decode_polyline(self, encoded_polyline):
        """解码polyline字符串为坐标列表"""
        try:
            coordinates = polyline.decode(encoded_polyline)
            return coordinates
        except Exception as e:
            print(f"❌ 解码polyline失败: {e}")
            return []
    
    def normalize_coordinates(self, coordinates):
        """标准化坐标到画布范围 - 保持正确的宽高比避免变形"""
        if not coordinates:
            return []
        
        lats = [coord[0] for coord in coordinates]
        lngs = [coord[1] for coord in coordinates]
        
        min_lat, max_lat = min(lats), max(lats)
        min_lng, max_lng = min(lngs), max(lngs)
        
        # 计算经纬度范围
        lat_range = max_lat - min_lat
        lng_range = max_lng - min_lng
        
        # 如果范围太小，设置最小范围避免除零错误
        if lat_range == 0:
            lat_range = 0.001
        if lng_range == 0:
            lng_range = 0.001
        
        # 添加边距
        margin = 20
        top_margin = 50  # 为标题留出空间
        bottom_margin = 30  # 底部边距
        
        available_width = self.width - 2 * margin
        available_height = self.height - top_margin - bottom_margin
        
        # 计算缩放比例，保持宽高比不变形
        # 使用较小的缩放比例确保轨迹完全显示在画布内
        scale_x = available_width / lng_range
        scale_y = available_height / lat_range
        scale = min(scale_x, scale_y)  # 使用较小的缩放比例
        
        # 计算实际使用的尺寸
        actual_width = lng_range * scale
        actual_height = lat_range * scale
        
        # 计算居中偏移
        offset_x = margin + (available_width - actual_width) / 2
        offset_y = top_margin + (available_height - actual_height) / 2
        
        normalized = []
        for lat, lng in coordinates:
            # 标准化坐标，保持正确比例
            x = offset_x + (lng - min_lng) * scale
            y = offset_y + (max_lat - lat) * scale  # 注意Y轴翻转
            
            normalized.append((x, y))
        
        return normalized
    
    def create_frame(self, coordinates, progress, date, frame_num, activity=None):
        """创建单帧图像"""
        # 创建白色背景
        img = Image.new('RGB', (self.width, self.height), 'white')
        draw = ImageDraw.Draw(img)
        
        # 绘制标题 - 使用支持中文的字体
        try:
            # 尝试使用系统中文字体
            font = ImageFont.truetype("/System/Library/Fonts/PingFang.ttc", 12)
        except:
            try:
                # 尝试使用其他中文字体
                font = ImageFont.truetype("/System/Library/Fonts/STHeiti Light.ttc", 12)
            except:
                try:
                    # 使用Arial Unicode字体
                    font = ImageFont.truetype("/System/Library/Fonts/Arial Unicode.ttf", 12)
                except:
                    # 如果都不行，使用英文标题和默认字体
                    font = ImageFont.load_default()
        
        # 获取运动标题
        if activity and activity.get('name') and activity['name'].strip():
            # 使用运动的实际标题
            activity_name = activity['name'].strip()
            title = activity_name
        else:
            # 如果没有标题或标题为空，使用备用标题
            try:
                # 测试是否支持中文
                test_bbox = draw.textbbox((0, 0), "测试", font=font)
                title = f"轨迹动画 - {date}"
            except:
                # 如果不支持中文，使用英文标题
                title = f"Track - {date}"
        
        bbox = draw.textbbox((0, 0), title, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        # 右下角显示
        margin = 10
        text_x = self.width - text_width - margin
        text_y = self.height - text_height - margin
        
        draw.text((text_x, text_y), title, fill='black', font=font)
        
        if not coordinates:
            # 如果没有坐标数据，绘制示例轨迹
            self.draw_sample_track(img, draw, progress, date)
        else:
            # 绘制真实轨迹
            self.draw_real_track(img, draw, coordinates, progress)
        
        return img
    
    def draw_real_track(self, img, draw, coordinates, progress):
        """绘制真实轨迹 - 橘色轨迹和SVG图标"""
        if not coordinates:
            return
        
        points_to_show = max(1, int(len(coordinates) * progress))
        
        # 绘制轨迹线 - 使用可配置颜色和线宽
        if points_to_show > 1:
            track_points = coordinates[:points_to_show]
            for i in range(len(track_points) - 1):
                x1, y1 = track_points[i]
                x2, y2 = track_points[i + 1]
                draw.line([(x1, y1), (x2, y2)], fill=self.track_color, width=self.line_width)
        
        # 绘制起点图标 - 使用自定义大小
        if coordinates and self.start_icon:
            start_x, start_y = coordinates[0]
            self.draw_icon(img, self.start_icon, start_x, start_y, self.start_dot_size)
        elif coordinates:
            # 备用方案：绘制绿色圆点 - 使用自定义大小
            start_x, start_y = coordinates[0]
            size = self.start_dot_size
            draw.ellipse([start_x-size, start_y-size, start_x+size, start_y+size], 
                        fill='green', outline='darkgreen', width=2)
        
        # 绘制终点图标（只在动画完成时显示）- 使用自定义大小
        if progress >= 1.0 and coordinates and self.end_icon:
            end_x, end_y = coordinates[-1]
            self.draw_icon(img, self.end_icon, end_x, end_y, self.end_dot_size)
        elif progress >= 1.0 and coordinates:
            # 备用方案：绘制红色圆点 - 使用自定义大小
            end_x, end_y = coordinates[-1]
            size = self.end_dot_size
            draw.ellipse([end_x-size, end_y-size, end_x+size, end_y+size], 
                        fill='red', outline='darkred', width=2)
        
        # 只在动画进行中显示当前位置点 - 使用自定义大小和颜色
        if progress < 1.0 and points_to_show > 0 and points_to_show <= len(coordinates):
            current_x, current_y = coordinates[points_to_show - 1]
            # 为动态圆点生成深色边框
            outline_color = self.get_darker_color(self.dot_color)
            size = self.current_dot_size
            draw.ellipse([current_x-size, current_y-size, current_x+size, current_y+size], 
                        fill=self.dot_color, outline=outline_color, width=2)
    
    def draw_sample_track(self, img, draw, progress, date):
        """绘制示例轨迹（当没有真实数据时）- 橘色轨迹"""
        # 使用日期作为种子生成伪随机轨迹
        seed = sum(int(x) for x in date.split('-'))
        np.random.seed(seed)
        
        points = 60
        points_to_show = max(1, int(points * progress))
        
        # 生成轨迹点 - 适应7:9宽高比画布，位置向上调整
        track_points = []
        for i in range(points_to_show):
            t = i / (points - 1) if points > 1 else 0
            x = 20 + 160 * t  # 适应200px宽度
            y = 100 + (  # 向上移动30px，确保轨迹不会超出画布底部
                np.sin(t * 2 * np.pi + seed * 0.1) * 30 +
                np.sin(t * 4 * np.pi + seed * 0.2) * 15 +
                np.sin(t * 8 * np.pi + seed * 0.3) * 8
            )
            track_points.append((x, y))
        
        # 绘制轨迹线 - 使用可配置颜色和线宽
        if len(track_points) > 1:
            for i in range(len(track_points) - 1):
                x1, y1 = track_points[i]
                x2, y2 = track_points[i + 1]
                draw.line([(x1, y1), (x2, y2)], fill=self.track_color, width=self.line_width)
        
        # 绘制起点图标 - 使用自定义大小
        if track_points and self.start_icon:
            start_x, start_y = track_points[0]
            self.draw_icon(img, self.start_icon, start_x, start_y, self.start_dot_size)
        elif track_points:
            start_x, start_y = track_points[0]
            size = self.start_dot_size
            draw.ellipse([start_x-size, start_y-size, start_x+size, start_y+size], 
                        fill='green', outline='darkgreen', width=2)
        
        # 绘制终点图标（只在动画完成时显示）- 使用自定义大小
        if progress >= 1.0 and track_points and self.end_icon:
            end_x, end_y = track_points[-1]
            self.draw_icon(img, self.end_icon, end_x, end_y, self.end_dot_size)
        elif progress >= 1.0 and track_points:
            end_x, end_y = track_points[-1]
            size = self.end_dot_size
            draw.ellipse([end_x-size, end_y-size, end_x+size, end_y+size], 
                        fill='red', outline='darkred', width=2)
        
        # 只在动画进行中显示当前位置点 - 使用自定义大小和颜色
        if progress < 1.0 and len(track_points) > 1:
            current_x, current_y = track_points[-1]
            outline_color = self.get_darker_color(self.dot_color)
            size = self.current_dot_size
            draw.ellipse([current_x-size, current_y-size, current_x+size, current_y+size], 
                        fill=self.dot_color, outline=outline_color, width=2)
    
    def generate_single_gif(self, date_info, index, total):
        """生成单个GIF文件"""
        date = date_info['date']
        activity = date_info['activity']
        
        print(f"[{index + 1}/{total}] 🎬 生成 {date} 的GIF...")
        
        # 解码轨迹数据
        coordinates = []
        if activity.get('summary_polyline'):
            coordinates = self.decode_polyline(activity['summary_polyline'])
            coordinates = self.normalize_coordinates(coordinates)
        
        # 生成所有帧
        frames = []
        for frame_num in range(self.frames):
            if frame_num < self.animation_frames:
                # 动画帧：逐步显示轨迹
                progress = frame_num / (self.animation_frames - 1) if self.animation_frames > 1 else 1
            else:
                # 静止帧：显示完整轨迹
                progress = 1.0
            
            frame = self.create_frame(coordinates, progress, date, frame_num, activity)
            frames.append(frame)
        
        # 保存GIF - 为不同帧设置不同持续时间
        output_path = self.output_dir / f"track_{date}.gif"
        try:
            # 创建持续时间列表：动画帧快一些，静止帧慢一些
            durations = []
            for frame_num in range(self.frames):
                if frame_num < self.animation_frames:
                    durations.append(int(self.animation_duration * 1000))  # 动画帧60ms
                else:
                    durations.append(int(self.static_duration * 1000))     # 静止帧50ms
            
            frames[0].save(
                output_path,
                save_all=True,
                append_images=frames[1:],
                duration=durations,  # 使用不同的持续时间
                loop=0,
                optimize=True
            )
            
            file_size = output_path.stat().st_size
            print(f"✅ [{index + 1}/{total}] {date} 完成 ({file_size // 1024}KB)")
            return True
            
        except Exception as e:
            print(f"❌ [{index + 1}/{total}] {date} 失败: {e}")
            return False
    
    def generate_specific_date(self):
        """生成指定日期的GIF"""
        print("🎯 指定日期GIF生成 - 橘色轨迹版本")
        print("-" * 40)
        
        # 加载活动数据
        activities = self.load_activities()
        if not activities:
            return
        
        # 获取所有可用日期
        single_track_dates = self.analyze_single_track_dates(activities)
        available_dates = [item['date'] for item in single_track_dates]
        
        print(f"📊 共有 {len(available_dates)} 个可用日期")
        print("💡 日期格式示例: 2018-04-14, 2019-02-06, 2021-05-23")
        
        while True:
            try:
                target_date = input("\n请输入要生成GIF的日期 (YYYY-MM-DD格式，输入 'q' 退出): ").strip()
                
                if target_date.lower() == 'q':
                    print("已退出指定日期生成")
                    return
                
                # 验证日期格式
                if not target_date or len(target_date) != 10 or target_date.count('-') != 2:
                    print("❌ 日期格式错误，请使用 YYYY-MM-DD 格式")
                    continue
                
                # 检查日期是否存在
                if target_date not in available_dates:
                    print(f"❌ 日期 {target_date} 不存在或没有轨迹数据")
                    continue
                
                # 找到对应的日期信息
                target_info = None
                for item in single_track_dates:
                    if item['date'] == target_date:
                        target_info = item
                        break
                
                if target_info:
                    print(f"🎬 开始生成 {target_date} 的橘色轨迹GIF...")
                    success = self.generate_single_gif(target_info, 0, 1)
                    
                    if success:
                        print(f"✅ 成功生成 {target_date} 的橘色轨迹GIF!")
                        print(f"📁 文件位置: {self.output_dir}/track_{target_date}.gif")
                        
                        # 询问是否继续生成其他日期
                        continue_choice = input("\n是否继续生成其他日期的GIF? (y/N): ").strip().lower()
                        if continue_choice not in ['y', 'yes']:
                            break
                    else:
                        print(f"❌ 生成 {target_date} 的GIF失败")
                else:
                    print(f"❌ 无法找到日期 {target_date} 的数据")
                    
            except KeyboardInterrupt:
                print("\n⚠️ 用户中断操作")
                break
            except Exception as e:
                print(f"❌ 处理过程出错: {e}")

    def generate_single_date_by_param(self, target_date):
        """通过命令行参数生成指定日期的GIF"""
        print(f"🎯 命令行模式 - 生成日期: {target_date}")
        print("-" * 40)
        
        # 验证日期格式
        if not target_date or len(target_date) != 10 or target_date.count('-') != 2:
            print("❌ 日期格式错误，请使用 YYYY-MM-DD 格式")
            print("💡 示例: python generate_gifs_orange.py -day 2025-08-17")
            return
        
        # 加载活动数据
        activities = self.load_activities()
        if not activities:
            return
        
        # 获取所有可用日期
        single_track_dates = self.analyze_single_track_dates(activities)
        available_dates = [item['date'] for item in single_track_dates]
        
        print(f"📊 共有 {len(available_dates)} 个可用日期")
        
        # 检查日期是否存在
        if target_date not in available_dates:
            print(f"❌ 日期 {target_date} 不存在或没有轨迹数据")
            print("💡 可用日期示例:", ", ".join(available_dates[:5]) + ("..." if len(available_dates) > 5 else ""))
            return
        
        # 找到对应的日期信息
        target_info = None
        for item in single_track_dates:
            if item['date'] == target_date:
                target_info = item
                break
        
        if target_info:
            print(f"🎬 开始生成 {target_date} 的橘色轨迹GIF...")
            success = self.generate_single_gif(target_info, 0, 1)
            
            if success:
                print(f"✅ 成功生成 {target_date} 的橘色轨迹GIF!")
                print(f"📁 文件位置: {self.output_dir}/track_{target_date}.gif")
            else:
                print(f"❌ 生成 {target_date} 的GIF失败")
        else:
            print(f"❌ 无法找到日期 {target_date} 的数据")


def main():
    """主函数"""
    # 解析命令行参数
    parser = argparse.ArgumentParser(description='轨迹GIF生成器 - 可自定义参数版本')
    parser.add_argument('-day', '--day', type=str, help='指定要生成GIF的日期 (YYYY-MM-DD格式)')
    parser.add_argument('-width', '--width', type=int, default=200, help='GIF宽度 (默认: 200)')
    parser.add_argument('-height', '--height', type=int, help='GIF高度 (默认: 根据宽度按7:9比例计算)')
    parser.add_argument('-color', '--color', type=str, default='#FF8C00', help='轨迹颜色 (默认: #FF8C00橘色)')
    parser.add_argument('-dot-color', '--dot-color', type=str, default='green', help='动态圆点颜色 (默认: green)')
    parser.add_argument('-animation-frames', '--animation-frames', type=int, default=50, help='动画帧数 (默认: 50)')
    parser.add_argument('-static-frames', '--static-frames', type=int, default=20, help='静止帧数 (默认: 20)')
    parser.add_argument('-animation-duration', '--animation-duration', type=float, default=0.06, help='动画帧持续时间/秒 (默认: 0.06)')
    parser.add_argument('-static-duration', '--static-duration', type=float, default=0.05, help='静止帧持续时间/秒 (默认: 0.05)')
    parser.add_argument('-line-width', '--line-width', type=int, default=3, help='轨迹线宽度 (默认: 3)')
    
    # 新增远点大小参数
    parser.add_argument('-start-size', '--start-size', type=int, default=6, help='起点圆点半径 (默认: 6)')
    parser.add_argument('-end-size', '--end-size', type=int, default=6, help='终点圆点半径 (默认: 6)')
    parser.add_argument('-current-size', '--current-size', type=int, default=5, help='当前位置圆点半径 (默认: 5)')
    
    args = parser.parse_args()
    
    print("🎯 轨迹GIF生成器 - 可自定义参数版本")
    print("=" * 50)
    
    # 创建生成器实例，传入命令行参数（包括新增的远点大小参数）
    generator = GifGenerator(
        width=args.width,
        height=args.height,
        track_color=args.color,
        dot_color=args.dot_color,
        animation_frames=args.animation_frames,
        static_frames=args.static_frames,
        animation_duration=args.animation_duration,
        static_duration=args.static_duration,
        line_width=args.line_width,
        start_dot_size=args.start_size,
        end_dot_size=args.end_size,
        current_dot_size=args.current_size
    )
    
    # 检查依赖
    if not generator.activities_file.exists():
        print(f"❌ 活动数据文件不存在: {generator.activities_file}")
        print("请确保文件路径正确")
        return
    
    # 如果指定了日期参数，直接生成该日期的GIF
    if args.day:
        try:
            generator.generate_single_date_by_param(args.day)
        except KeyboardInterrupt:
            print("\n\n⚠️ 用户中断生成过程")
        except Exception as e:
            print(f"\n❌ 生成过程出错: {e}")
    else:
        # 没有指定日期参数，进入交互模式
        try:
            generator.generate_specific_date()
        except KeyboardInterrupt:
            print("\n\n⚠️ 用户中断生成过程")
        except Exception as e:
            print(f"\n❌ 生成过程出错: {e}")


if __name__ == "__main__":
    main()