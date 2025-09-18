#!/usr/bin/env python3
"""
轨迹GIF生成脚本 - Python版本
自动生成所有单轨迹日期的GIF动画文件
"""

import json
import os
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import polyline
import math
import base64
import io
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
    def __init__(self, project_root=None):
        """初始化GIF生成器"""
        if project_root is None:
            # 自动检测项目根目录
            current_dir = Path(__file__).parent
            self.project_root = current_dir.parent
        else:
            self.project_root = Path(project_root)
        
        self.activities_file = self.project_root / "src" / "static" / "activities_py4567.json"
        self.output_dir = self.project_root / "assets" / "gif"
        
        # GIF参数 - 7:9宽高比，宽度200，总时长约4秒
        self.width = 200
        self.height = int(200 * 9 / 7)  # 约257，保持7:9宽高比
        self.animation_frames = 50  # 动画帧数
        self.static_frames = 20     # 静止帧数（显示完整图案）
        self.frames = self.animation_frames + self.static_frames  # 总帧数70
        self.animation_duration = 0.06  # 动画帧每帧60ms
        self.static_duration = 0.05     # 静止帧每帧50ms
        
        print(f"📁 项目根目录: {self.project_root}")
        print(f"📊 活动数据文件: {self.activities_file}")
        print(f"📁 输出目录: {self.output_dir}")
        
        # 加载起点和终点图标
        self.start_icon = self.load_svg_icon("start.svg")
        self.end_icon = self.load_svg_icon("end.svg")
    
    def load_svg_icon(self, filename):
        """加载SVG图标并转换为PIL Image"""
        svg_path = self.project_root / "assets" / filename
        try:
            # 尝试使用cairosvg转换SVG
            try:
                import cairosvg
                png_data = cairosvg.svg2png(url=str(svg_path))
                return Image.open(io.BytesIO(png_data)).convert("RGBA")
            except ImportError:
                # 如果cairosvg不可用，从SVG中提取base64 PNG数据
                with open(svg_path, 'r', encoding='utf-8') as f:
                    svg_content = f.read()
                
                # 查找base64数据
                import re
                base64_match = re.search(r'data:image/png;base64,([^"]+)', svg_content)
                if base64_match:
                    base64_data = base64_match.group(1)
                    png_data = base64.b64decode(base64_data)
                    return Image.open(io.BytesIO(png_data)).convert("RGBA")
                else:
                    print(f"⚠️ 无法从 {filename} 中提取图标数据")
                    return None
        except Exception as e:
            print(f"⚠️ 加载图标 {filename} 失败: {e}")
            return None
    
    def load_activities(self):
        """加载活动数据"""
        try:
            with open(self.activities_file, 'r', encoding='utf-8') as f:
                activities = json.load(f)
            print(f"✅ 成功加载 {len(activities)} 条活动记录")
            return activities
        except FileNotFoundError:
            print(f"❌ 找不到活动数据文件: {self.activities_file}")
            return []
        except json.JSONDecodeError as e:
            print(f"❌ JSON解析错误: {e}")
            return []
    
    def analyze_single_track_dates(self, activities):
        """分析单轨迹日期"""
        date_tracks = defaultdict(list)
        
        for activity in activities:
            date = activity['start_date_local'].split(' ')[0]
            date_tracks[date].append(activity)
        
        single_track_dates = []
        for date, tracks in date_tracks.items():
            if len(tracks) == 1:
                activity = tracks[0]
                if activity.get('summary_polyline') and activity['summary_polyline'].strip():
                    single_track_dates.append({
                        'date': date,
                        'run_id': activity['run_id'],
                        'activity': activity
                    })
        
        single_track_dates.sort(key=lambda x: x['date'])
        print(f"📊 找到 {len(single_track_dates)} 个单轨迹日期")
        return single_track_dates
    
    def decode_polyline(self, encoded_polyline):
        """解码polyline字符串为坐标点"""
        try:
            coordinates = polyline.decode(encoded_polyline)
            return [(lat, lng) for lat, lng in coordinates]
        except Exception as e:
            print(f"❌ polyline解码失败: {e}")
            return []
    
    def normalize_coordinates(self, coordinates):
        """将地理坐标标准化到画布坐标"""
        if not coordinates:
            return []
        
        lats = [coord[0] for coord in coordinates]
        lngs = [coord[1] for coord in coordinates]
        
        min_lat, max_lat = min(lats), max(lats)
        min_lng, max_lng = min(lngs), max(lngs)
        
        # 添加边距 - 适应7:9宽高比画布
        margin = 20
        canvas_width = self.width - 2 * margin
        canvas_height = self.height - 50  # 为标题留空间，适应更高的画布
        
        normalized = []
        for lat, lng in coordinates:
            if max_lat != min_lat:
                y = margin + 35 + (max_lat - lat) / (max_lat - min_lat) * canvas_height  # 适应更高的画布
            else:
                y = self.height // 2
            
            if max_lng != min_lng:
                x = margin + (lng - min_lng) / (max_lng - min_lng) * canvas_width
            else:
                x = self.width // 2
            
            normalized.append((x, y))
        
        return normalized
    
    def create_frame(self, coordinates, progress, date, frame_num):
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
        draw.text((text_x, 8), title, fill='black', font=font)  # 减少顶部间距
        
        if not coordinates:
            # 如果没有坐标数据，绘制示例轨迹
            self.draw_sample_track(draw, progress, date)
        else:
            # 绘制真实轨迹
            self.draw_real_track(draw, coordinates, progress)
        
        return img
    
    def draw_real_track(self, draw, coordinates, progress):
        """绘制真实轨迹"""
        if len(coordinates) < 2:
            return
        
        points_to_show = max(1, int(len(coordinates) * progress))
        
        # 绘制轨迹线
        if points_to_show > 1:
            track_points = coordinates[:points_to_show]
            for i in range(len(track_points) - 1):
                x1, y1 = track_points[i]
                x2, y2 = track_points[i + 1]
                draw.line([(x1, y1), (x2, y2)], fill='red', width=3)
        
        # 绘制起点
        if coordinates:
            start_x, start_y = coordinates[0]
            draw.ellipse([start_x-6, start_y-6, start_x+6, start_y+6], 
                        fill='green', outline='darkgreen', width=2)
        
        # 绘制当前位置
        if points_to_show > 0 and points_to_show <= len(coordinates):
            current_x, current_y = coordinates[points_to_show - 1]
            draw.ellipse([current_x-5, current_y-5, current_x+5, current_y+5], 
                        fill='blue', outline='darkblue', width=2)
    
    def draw_sample_track(self, draw, progress, date):
        """绘制示例轨迹（当没有真实数据时）"""
        # 使用日期作为种子生成伪随机轨迹
        seed = sum(int(x) for x in date.split('-'))
        np.random.seed(seed)
        
        points = 60
        points_to_show = max(1, int(points * progress))
        
        # 生成轨迹点 - 适应7:9宽高比画布
        track_points = []
        for i in range(points_to_show):
            t = i / (points - 1) if points > 1 else 0
            x = 20 + 160 * t  # 适应200px宽度
            y = 130 + (  # 适应257px高度，居中显示
                np.sin(t * 2 * np.pi + seed * 0.1) * 30 +
                np.sin(t * 4 * np.pi + seed * 0.2) * 15 +
                np.sin(t * 8 * np.pi + seed * 0.3) * 8
            )
            track_points.append((x, y))
        
        # 绘制轨迹线
        if len(track_points) > 1:
            for i in range(len(track_points) - 1):
                x1, y1 = track_points[i]
                x2, y2 = track_points[i + 1]
                draw.line([(x1, y1), (x2, y2)], fill='red', width=3)
        
        # 绘制起点
        if track_points:
            start_x, start_y = track_points[0]
            draw.ellipse([start_x-6, start_y-6, start_x+6, start_y+6], 
                        fill='green', outline='darkgreen', width=2)
            
            # 只在动画进行中显示当前位置点，完成后不显示（让轨迹更清晰）
            if progress < 1.0 and len(track_points) > 1:
                current_x, current_y = track_points[-1]
                draw.ellipse([current_x-5, current_y-5, current_x+5, current_y+5], 
                            fill='blue', outline='darkblue', width=2)
    
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
    
    def generate_all_gifs(self, limit=None):
        """生成所有GIF文件"""
        print("🚀 开始批量生成轨迹GIF...")
        
        # 确保输出目录存在
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # 加载活动数据
        activities = self.load_activities()
        if not activities:
            print("❌ 没有活动数据，无法生成GIF")
            return
        
        # 分析单轨迹日期
        single_track_dates = self.analyze_single_track_dates(activities)
        if not single_track_dates:
            print("❌ 没有找到单轨迹日期")
            return
        
        # 限制生成数量（用于测试）
        if limit:
            single_track_dates = single_track_dates[:limit]
            print(f"🎯 限制生成前 {limit} 个GIF进行测试")
        
        # 批量生成
        success_count = 0
        fail_count = 0
        
        for i, date_info in enumerate(single_track_dates):
            try:
                if self.generate_single_gif(date_info, i, len(single_track_dates)):
                    success_count += 1
                else:
                    fail_count += 1
            except Exception as e:
                print(f"❌ 生成失败: {e}")
                fail_count += 1
        
        print(f"\n🎉 批量生成完成!")
        print(f"✅ 成功: {success_count} 个")
        print(f"❌ 失败: {fail_count} 个")
        print(f"📁 输出目录: {self.output_dir}")

    def generate_specific_date(self):
        """生成指定日期的GIF"""
        print("🎯 指定日期GIF生成")
        print("-" * 30)
        
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
                    
                    # 显示最近的几个日期作为建议
                    suggestions = []
                    for date in available_dates:
                        if abs(self._date_distance(target_date, date)) <= 30:  # 30天内的日期
                            suggestions.append(date)
                    
                    if suggestions:
                        suggestions.sort()
                        print(f"💡 建议的相近日期: {', '.join(suggestions[:5])}")
                    else:
                        print(f"💡 可用日期范围: {available_dates[0]} 到 {available_dates[-1]}")
                    continue
                
                # 找到对应的日期信息
                target_info = None
                for item in single_track_dates:
                    if item['date'] == target_date:
                        target_info = item
                        break
                
                if target_info:
                    print(f"🎬 开始生成 {target_date} 的GIF...")
                    success = self.generate_single_gif(target_info, 0, 1)
                    
                    if success:
                        print(f"✅ 成功生成 {target_date} 的GIF!")
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

    def _date_distance(self, date1, date2):
        """计算两个日期之间的天数差距"""
        try:
            from datetime import datetime
            d1 = datetime.strptime(date1, '%Y-%m-%d')
            d2 = datetime.strptime(date2, '%Y-%m-%d')
            return abs((d1 - d2).days)
        except:
            return 999  # 如果日期格式错误，返回大数值


def main():
    """主函数"""
    print("🎯 轨迹GIF生成器 - Python版本")
    print("=" * 50)
    
    # 创建生成器实例
    generator = GifGenerator()
    
    # 检查依赖
    if not generator.activities_file.exists():
        print(f"❌ 活动数据文件不存在: {generator.activities_file}")
        print("请确保文件路径正确")
        return
    
    # 询问生成模式
    try:
        choice = input("\n选择生成模式:\n1. 测试模式 (前10个)\n2. 全部生成 (745个)\n3. 指定日期生成\n请输入选择 (1/2/3): ").strip()
        
        if choice == "1":
            generator.generate_all_gifs(limit=10)
        elif choice == "2":
            confirm = input("确认生成全部745个GIF文件? 这可能需要较长时间 (y/N): ").strip().lower()
            if confirm in ['y', 'yes']:
                generator.generate_all_gifs()
            else:
                print("已取消生成")
        elif choice == "3":
            generator.generate_specific_date()
        else:
            print("无效选择，默认生成前10个进行测试")
            generator.generate_all_gifs(limit=10)
            
    except KeyboardInterrupt:
        print("\n\n⚠️ 用户中断生成过程")
    except Exception as e:
        print(f"\n❌ 生成过程出错: {e}")


if __name__ == "__main__":
    main()