#!/usr/bin/env python3
"""
轨迹GIF生成脚本 - 自定义远点大小版本
支持自定义起点、终点、当前位置点的大小
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
        
        参数:
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
    
    def draw_icon(self, img, icon, x, y, size=None):
        """在指定位置绘制图标"""
        if not icon:
            return
        
        # 如果指定了大小，调整图标尺寸
        if size:
            icon_size = size * 2  # 图标大小是圆点直径的2倍
            icon = icon.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
        
        # 计算图标位置（居中）
        icon_x = int(x - icon.width // 2)
        icon_y = int(y - icon.height // 2)
        
        # 粘贴图标到主图像
        img.paste(icon, (icon_x, icon_y), icon)
    
    def get_darker_color(self, color):
        """获取颜色的深色版本用作边框"""
        if color == 'green':
            return 'darkgreen'
        elif color == 'blue':
            return 'darkblue'
        elif color == 'red':
            return 'darkred'
        elif color.startswith('#'):
            # 处理十六进制颜色
            try:
                r = int(color[1:3], 16)
                g = int(color[3:5], 16)
                b = int(color[5:7], 16)
                # 降低亮度
                r = max(0, r - 50)
                g = max(0, g - 50)
                b = max(0, b - 50)
                return f"#{r:02x}{g:02x}{b:02x}"
            except:
                return 'black'
        else:
            return 'black'
    
    def load_activities(self):
        """加载活动数据"""
        try:
            with open(self.activities_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"❌ 加载活动数据失败: {e}")
            return []
    
    def get_single_track_dates(self, activities):
        """获取单轨迹日期列表"""
        date_activities = defaultdict(list)
        
        for activity in activities:
            date = activity['start_date_local'][:10]
            date_activities[date].append(activity)
        
        # 只保留单轨迹日期
        single_track_dates = []
        for date, acts in date_activities.items():
            if len(acts) == 1:
                single_track_dates.append({
                    'date': date,
                    'activity': acts[0]
                })
        
        # 按日期倒序排列
        single_track_dates.sort(key=lambda x: x['date'], reverse=True)
        return single_track_dates
    
    def decode_polyline(self, encoded_polyline):
        """解码polyline数据"""
        try:
            return polyline.decode(encoded_polyline)
        except Exception as e:
            print(f"⚠️ 解码polyline失败: {e}")
            return []
    
    def normalize_coordinates(self, coordinates):
        """将坐标标准化到画布尺寸"""
        if not coordinates:
            return []
        
        # 提取经纬度
        lats = [coord[0] for coord in coordinates]
        lons = [coord[1] for coord in coordinates]
        
        # 计算边界
        min_lat, max_lat = min(lats), max(lats)
        min_lon, max_lon = min(lons), max(lons)
        
        # 计算范围
        lat_range = max_lat - min_lat
        lon_range = max_lon - min_lon
        
        # 防止除零错误
        if lat_range == 0:
            lat_range = 0.001
        if lon_range == 0:
            lon_range = 0.001
        
        # 计算缩放比例，保持纵横比
        margin = 30  # 边距
        available_width = self.width - 2 * margin
        available_height = self.height - 60  # 为标题留出空间
        
        scale_x = available_width / lon_range
        scale_y = available_height / lat_range
        scale = min(scale_x, scale_y)
        
        # 计算偏移量以居中显示
        scaled_width = lon_range * scale
        scaled_height = lat_range * scale
        offset_x = margin + (available_width - scaled_width) / 2
        offset_y = 40 + (available_height - scaled_height) / 2  # 40为标题高度
        
        # 标准化坐标
        normalized = []
        for lat, lon in coordinates:
            x = offset_x + (lon - min_lon) * scale
            y = offset_y + (max_lat - lat) * scale  # 翻转Y轴
            normalized.append((x, y))
        
        return normalized
    
    def create_frame(self, coordinates, progress, date, frame_num):
        """创建单帧图像"""
        # 创建白色背景
        img = Image.new('RGB', (self.width, self.height), 'white')
        draw = ImageDraw.Draw(img)
        
        # 绘制标题
        try:
            font = ImageFont.truetype("arial.ttf", 16)
        except:
            try:
                font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 16)
            except:
                font = ImageFont.load_default()
        
        # 根据字体选择标题语言
        try:
            # 测试是否支持中文
            test_bbox = draw.textbbox((0, 0), "测试", font=font)
            title = f"轨迹动画 - {date}"
        except:
            # 如果不支持中文，使用英文标题
            title = f"Track - {date}"
        
        bbox = draw.textbbox((0, 0), title, font=font)
        text_width = bbox[2] - bbox[0]
        text_x = (self.width - text_width) // 2
        draw.text((text_x, 8), title, fill='black', font=font)
        
        if not coordinates:
            # 如果没有坐标数据，绘制示例轨迹
            self.draw_sample_track(img, draw, progress, date)
        else:
            # 绘制真实轨迹
            self.draw_real_track(img, draw, coordinates, progress)
        
        return img
    
    def draw_real_track(self, img, draw, coordinates, progress):
        """绘制真实轨迹 - 支持自定义远点大小"""
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
        
        # 绘制起点图标或圆点 - 使用自定义大小
        if coordinates and self.start_icon:
            start_x, start_y = coordinates[0]
            self.draw_icon(img, self.start_icon, start_x, start_y, self.start_dot_size)
        elif coordinates:
            # 备用方案：绘制绿色圆点 - 使用自定义大小
            start_x, start_y = coordinates[0]
            size = self.start_dot_size
            draw.ellipse([start_x-size, start_y-size, start_x+size, start_y+size], 
                        fill='green', outline='darkgreen', width=2)
        
        # 绘制终点图标或圆点（只在动画完成时显示）- 使用自定义大小
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
        """绘制示例轨迹（当没有真实数据时）- 支持自定义远点大小"""
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
        
        # 绘制起点图标或圆点 - 使用自定义大小
        if track_points and self.start_icon:
            start_x, start_y = track_points[0]
            self.draw_icon(img, self.start_icon, start_x, start_y, self.start_dot_size)
        elif track_points:
            start_x, start_y = track_points[0]
            size = self.start_dot_size
            draw.ellipse([start_x-size, start_y-size, start_x+size, start_y+size], 
                        fill='green', outline='darkgreen', width=2)
        
        # 绘制终点图标或圆点（只在动画完成时显示）- 使用自定义大小
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
            
            frame = self.create_frame(coordinates, progress, date, frame_num)
            frames.append(frame)
        
        # 保存GIF - 为不同帧设置不同持续时间
        output_path = self.output_dir / f"track_{date}.gif"
        try:
            # 确保输出目录存在
            self.output_dir.mkdir(parents=True, exist_ok=True)
            
            # 创建持续时间列表
            durations = []
            for i in range(len(frames)):
                if i < self.animation_frames:
                    durations.append(self.animation_duration)
                else:
                    durations.append(self.static_duration)
            
            # 保存GIF
            imageio.mimsave(
                str(output_path),
                frames,
                duration=durations,
                loop=0
            )
            
            print(f"✅ 成功生成: {output_path}")
            return True
            
        except Exception as e:
            print(f"❌ 生成失败: {e}")
            return False
    
    def generate_all_gifs(self, limit=None):
        """生成所有GIF文件"""
        print("🚀 开始批量生成轨迹GIF...")
        
        activities = self.load_activities()
        if not activities:
            print("❌ 没有活动数据，无法生成GIF")
            return
        
        single_track_dates = self.get_single_track_dates(activities)
        print(f"📊 找到 {len(single_track_dates)} 个单轨迹日期")
        
        if limit:
            single_track_dates = single_track_dates[:limit]
            print(f"🎯 限制生成前 {limit} 个GIF进行测试")
        
        success_count = 0
        for i, date_info in enumerate(single_track_dates):
            try:
                if self.generate_single_gif(date_info, i, len(single_track_dates)):
                    success_count += 1
            except KeyboardInterrupt:
                print("\n⏹️ 用户中断生成")
                break
            except Exception as e:
                print(f"❌ 生成 {date_info['date']} 时出错: {e}")
        
        print(f"\n🎉 生成完成！成功: {success_count}/{len(single_track_dates)}")
    
    def generate_specific_date(self):
        """生成指定日期的GIF"""
        print("🎯 指定日期GIF生成 - 自定义远点大小版本")
        print("-" * 50)
        
        activities = self.load_activities()
        if not activities:
            print("❌ 没有活动数据")
            return
        
        single_track_dates = self.get_single_track_dates(activities)
        date_dict = {item['date']: item for item in single_track_dates}
        
        while True:
            try:
                target_date = input("\n请输入要生成GIF的日期 (YYYY-MM-DD格式，输入 'q' 退出): ").strip()
                
                if target_date.lower() == 'q':
                    break
                
                target_info = date_dict.get(target_date)
                if target_info:
                    print(f"🎬 开始生成 {target_date} 的自定义远点GIF...")
                    success = self.generate_single_gif(target_info, 0, 1)
                    
                    if success:
                        print(f"✅ 成功生成 {target_date} 的GIF!")
                        print(f"📁 文件位置: {self.output_dir}/track_{target_date}.gif")
                        print(f"🎨 远点大小: 起点{self.start_dot_size}px, 终点{self.end_dot_size}px, 当前位置{self.current_dot_size}px")
                        
                        # 询问是否继续生成其他日期
                        continue_choice = input("\n是否继续生成其他日期的GIF? (y/N): ").strip().lower()
                        if continue_choice not in ['y', 'yes']:
                            break
                    else:
                        print(f"❌ 生成 {target_date} 的GIF失败")
                else:
                    print(f"❌ 日期 {target_date} 不存在或不是单轨迹日期")
                    print("💡 可用的单轨迹日期示例:")
                    for i, item in enumerate(single_track_dates[:5]):
                        print(f"   - {item['date']}")
                    if len(single_track_dates) > 5:
                        print(f"   ... 还有 {len(single_track_dates) - 5} 个日期")
                        
            except KeyboardInterrupt:
                print("\n👋 再见！")
                break
            except Exception as e:
                print(f"❌ 发生错误: {e}")
    
    def generate_single_date_by_param(self, target_date):
        """通过命令行参数生成指定日期的GIF"""
        print(f"🎯 命令行模式 - 生成日期: {target_date}")
        
        # 验证日期格式
        try:
            from datetime import datetime
            datetime.strptime(target_date, '%Y-%m-%d')
        except ValueError:
            print("❌ 日期格式错误，请使用 YYYY-MM-DD 格式")
            print("💡 示例: python generate_gifs_custom_dots.py -day 2025-08-17")
            return
        
        activities = self.load_activities()
        if not activities:
            print("❌ 没有活动数据")
            return
        
        single_track_dates = self.get_single_track_dates(activities)
        date_dict = {item['date']: item for item in single_track_dates}
        
        target_info = date_dict.get(target_date)
        if target_info:
            print(f"🎬 开始生成 {target_date} 的自定义远点GIF...")
            success = self.generate_single_gif(target_info, 0, 1)
            
            if success:
                print(f"✅ 成功生成 {target_date} 的GIF!")
                print(f"📁 文件位置: {self.output_dir}/track_{target_date}.gif")
                print(f"🎨 远点大小: 起点{self.start_dot_size}px, 终点{self.end_dot_size}px, 当前位置{self.current_dot_size}px")
            else:
                print(f"❌ 生成 {target_date} 的GIF失败")
        else:
            print(f"❌ 日期 {target_date} 不存在或不是单轨迹日期")

def main():
    """主函数"""
    # 解析命令行参数
    parser = argparse.ArgumentParser(description='轨迹GIF生成器 - 自定义远点大小版本')
    parser.add_argument('-day', '--day', type=str, help='指定要生成GIF的日期 (YYYY-MM-DD格式)')
    parser.add_argument('-width', '--width', type=int, default=200, help='GIF宽度 (默认: 200)')
    parser.add_argument('-height', '--height', type=int, help='GIF高度 (默认: 根据宽度按7:9比例计算)')
    parser.add_argument('-color', '--color', type=str, default='#FF8C00', help='轨迹颜色 (默认: #FF8C00橘色)')
    parser.add_argument('-dot_color', '--dot_color', type=str, default='green', help='当前位置点颜色 (默认: green)')
    parser.add_argument('-line_width', '--line_width', type=int, default=3, help='轨迹线宽度 (默认: 3)')
    
    # 新增远点大小参数
    parser.add_argument('-start_size', '--start_size', type=int, default=6, help='起点圆点半径 (默认: 6)')
    parser.add_argument('-end_size', '--end_size', type=int, default=6, help='终点圆点半径 (默认: 6)')
    parser.add_argument('-current_size', '--current_size', type=int, default=5, help='当前位置圆点半径 (默认: 5)')
    
    args = parser.parse_args()
    
    print("🎯 轨迹GIF生成器 - 自定义远点大小版本")
    print("=" * 60)
    
    # 创建生成器实例，传入命令行参数
    generator = GifGenerator(
        width=args.width,
        height=args.height,
        track_color=args.color,
        dot_color=args.dot_color,
        line_width=args.line_width,
        start_dot_size=args.start_size,
        end_dot_size=args.end_size,
        current_dot_size=args.current_size
    )
    
    # 如果指定了日期参数，直接生成该日期的GIF
    if args.day:
        generator.generate_single_date_by_param(args.day)
        return
    
    # 交互式菜单
    while True:
        print("\n" + "="*60)
        print("请选择操作:")
        print("1. 生成前10个GIF进行测试")
        print("2. 生成全部GIF文件")
        print("3. 生成指定日期的GIF")
        print("4. 退出")
        print("-" * 60)
        
        choice = input("请输入选择 (1-4): ").strip()
        
        if choice == "1":
            generator.generate_all_gifs(limit=10)
        elif choice == "2":
            confirm = input("确认生成全部GIF文件? 这可能需要较长时间 (y/N): ").strip().lower()
            if confirm in ['y', 'yes']:
                generator.generate_all_gifs()
            else:
                print("已取消")
        elif choice == "3":
            generator.generate_specific_date()
        elif choice == "4":
            print("👋 再见！")
            break
        else:
            print("无效选择，默认生成前10个进行测试")
            generator.generate_all_gifs(limit=10)

if __name__ == "__main__":
    main()