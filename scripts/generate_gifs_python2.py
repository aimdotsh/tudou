#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
轨迹GIF生成脚本 - Python 2.7兼容版本
自动生成所有单轨迹日期的GIF动画文件
"""

import json
import os
import sys
from collections import defaultdict

try:
    from PIL import Image, ImageDraw, ImageFont
    print("✅ Pillow 库已安装")
except ImportError:
    print("❌ 需要安装 Pillow 库")
    print("运行: pip install 'Pillow>=2.0.0,<7.0.0'")
    sys.exit(1)

try:
    import numpy as np
    print("✅ numpy 库已安装")
except ImportError:
    print("❌ 需要安装 numpy 库")
    print("运行: pip install 'numpy>=1.16.0,<1.17.0'")
    sys.exit(1)

# 简化的polyline解码函数（避免依赖外部库）
def decode_polyline(encoded):
    """解码polyline字符串为坐标点"""
    try:
        coordinates = []
        index = 0
        lat = 0
        lng = 0
        
        while index < len(encoded):
            # 解码纬度
            shift = 0
            result = 0
            while True:
                byte = ord(encoded[index]) - 63
                index += 1
                result |= (byte & 0x1f) << shift
                shift += 5
                if byte < 0x20:
                    break
            
            dlat = ~(result >> 1) if result & 1 else result >> 1
            lat += dlat
            
            # 解码经度
            shift = 0
            result = 0
            while True:
                byte = ord(encoded[index]) - 63
                index += 1
                result |= (byte & 0x1f) << shift
                shift += 5
                if byte < 0x20:
                    break
            
            dlng = ~(result >> 1) if result & 1 else result >> 1
            lng += dlng
            
            coordinates.append((lat * 1e-5, lng * 1e-5))
        
        return coordinates
    except Exception as e:
        print("❌ polyline解码失败: {}".format(e))
        return []

class GifGenerator(object):
    def __init__(self, project_root=None):
        """初始化GIF生成器"""
        if project_root is None:
            # 获取脚本所在目录的父目录作为项目根目录
            script_dir = os.path.dirname(os.path.abspath(__file__))
            self.project_root = os.path.dirname(script_dir)
        else:
            self.project_root = project_root
        
        self.activities_file = os.path.join(self.project_root, "src", "static", "activities_py4567.json")
        self.output_dir = os.path.join(self.project_root, "assets", "gif")
        
        # GIF参数 - 7:9宽高比，宽度200，总时长3秒
        self.width = 200
        self.height = int(200 * 9 / 7)  # 约257，保持7:9宽高比
        self.frames = 60  # 增加帧数提高丝滑度
        self.duration = 50  # 每帧50ms，总时长3秒（60帧 * 50ms = 3000ms）
        
        print("📁 项目根目录: {}".format(self.project_root))
        print("📊 活动数据文件: {}".format(self.activities_file))
        print("📁 输出目录: {}".format(self.output_dir))
    
    def load_activities(self):
        """加载活动数据"""
        try:
            with open(self.activities_file, 'r') as f:
                activities = json.load(f)
            print("✅ 成功加载 {} 条活动记录".format(len(activities)))
            return activities
        except IOError:
            print("❌ 找不到活动数据文件: {}".format(self.activities_file))
            return []
        except ValueError as e:
            print("❌ JSON解析错误: {}".format(e))
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
        print("📊 找到 {} 个单轨迹日期".format(len(single_track_dates)))
        return single_track_dates
    
    def normalize_coordinates(self, coordinates):
        """将地理坐标标准化到画布坐标"""
        if not coordinates:
            return []
        
        lats = [coord[0] for coord in coordinates]
        lngs = [coord[1] for coord in coordinates]
        
        min_lat, max_lat = min(lats), max(lats)
        min_lng, max_lng = min(lngs), max(lngs)
        
        # 添加边距
        margin = 50
        canvas_width = self.width - 2 * margin
        canvas_height = self.height - 80  # 为标题留空间
        
        normalized = []
        for lat, lng in coordinates:
            if max_lat != min_lat:
                y = margin + 50 + (max_lat - lat) / (max_lat - min_lat) * canvas_height
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
        
        # 绘制标题
        try:
            # 尝试使用系统字体
            font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 18)
        except:
            try:
                font = ImageFont.truetype("arial.ttf", 18)
            except:
                font = ImageFont.load_default()
        
        title = u"轨迹动画 - {}".format(date)
        # 计算文本位置（Python 2.7兼容方式）
        text_width, text_height = draw.textsize(title, font=font)
        text_x = (self.width - text_width) // 2
        draw.text((text_x, 15), title, fill='black', font=font)
        
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
                        fill='green', outline='darkgreen')
        
        # 绘制当前位置
        if points_to_show > 0 and points_to_show <= len(coordinates):
            current_x, current_y = coordinates[points_to_show - 1]
            draw.ellipse([current_x-5, current_y-5, current_x+5, current_y+5], 
                        fill='blue', outline='darkblue')
    
    def draw_sample_track(self, draw, progress, date):
        """绘制示例轨迹（当没有真实数据时）"""
        # 使用日期作为种子生成伪随机轨迹
        seed = sum(int(x) for x in date.split('-'))
        np.random.seed(seed)
        
        points = 60
        points_to_show = max(1, int(points * progress))
        
        # 生成轨迹点
        track_points = []
        for i in range(points_to_show):
            t = float(i) / (points - 1) if points > 1 else 0
            x = 50 + 300 * t
            y = 150 + (
                np.sin(t * 2 * np.pi + seed * 0.1) * 40 +
                np.sin(t * 4 * np.pi + seed * 0.2) * 20 +
                np.sin(t * 8 * np.pi + seed * 0.3) * 10
            )
            track_points.append((x, y))
        
        # 绘制轨迹线
        if len(track_points) > 1:
            for i in range(len(track_points) - 1):
                x1, y1 = track_points[i]
                x2, y2 = track_points[i + 1]
                draw.line([(x1, y1), (x2, y2)], fill='red', width=3)
        
        # 绘制起点和当前位置
        if track_points:
            start_x, start_y = track_points[0]
            draw.ellipse([start_x-6, start_y-6, start_x+6, start_y+6], 
                        fill='green', outline='darkgreen')
            
            if len(track_points) > 1:
                current_x, current_y = track_points[-1]
                draw.ellipse([current_x-5, current_y-5, current_x+5, current_y+5], 
                            fill='blue', outline='darkblue')
    
    def generate_single_gif(self, date_info, index, total):
        """生成单个GIF文件"""
        date = date_info['date']
        activity = date_info['activity']
        
        print("[{}/{}] 🎬 生成 {} 的GIF...".format(index + 1, total, date))
        
        # 解码轨迹数据
        coordinates = []
        if activity.get('summary_polyline'):
            coordinates = decode_polyline(activity['summary_polyline'])
            coordinates = self.normalize_coordinates(coordinates)
        
        # 生成所有帧
        frames = []
        for frame_num in range(self.frames):
            progress = float(frame_num) / (self.frames - 1) if self.frames > 1 else 1
            frame = self.create_frame(coordinates, progress, date, frame_num)
            frames.append(frame)
        
        # 保存GIF
        output_path = os.path.join(self.output_dir, "track_{}.gif".format(date))
        try:
            frames[0].save(
                output_path,
                save_all=True,
                append_images=frames[1:],
                duration=self.duration,
                loop=0,
                optimize=True
            )
            
            file_size = os.path.getsize(output_path)
            print("✅ [{}/{}] {} 完成 ({}KB)".format(index + 1, total, date, file_size // 1024))
            return True
            
        except Exception as e:
            print("❌ [{}/{}] {} 失败: {}".format(index + 1, total, date, e))
            return False
    
    def generate_all_gifs(self, limit=None):
        """生成所有GIF文件"""
        print("🚀 开始批量生成轨迹GIF...")
        
        # 确保输出目录存在
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)
        
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
            print("🎯 限制生成前 {} 个GIF进行测试".format(limit))
        
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
                print("❌ 生成失败: {}".format(e))
                fail_count += 1
        
        print("\n🎉 批量生成完成!")
        print("✅ 成功: {} 个".format(success_count))
        print("❌ 失败: {} 个".format(fail_count))
        print("📁 输出目录: {}".format(self.output_dir))


def main():
    """主函数"""
    print("🎯 轨迹GIF生成器 - Python 2.7兼容版本")
    print("=" * 50)
    
    # 创建生成器实例
    generator = GifGenerator()
    
    # 检查依赖
    if not os.path.exists(generator.activities_file):
        print("❌ 活动数据文件不存在: {}".format(generator.activities_file))
        print("请确保文件路径正确")
        return
    
    # 询问生成数量
    try:
        choice = raw_input("\n选择生成模式:\n1. 测试模式 (前10个)\n2. 全部生成 (745个)\n请输入选择 (1/2): ").strip()
        
        if choice == "1":
            generator.generate_all_gifs(limit=10)
        elif choice == "2":
            confirm = raw_input("确认生成全部745个GIF文件? 这可能需要较长时间 (y/N): ").strip().lower()
            if confirm in ['y', 'yes']:
                generator.generate_all_gifs()
            else:
                print("已取消生成")
        else:
            print("无效选择，默认生成前10个进行测试")
            generator.generate_all_gifs(limit=10)
            
    except KeyboardInterrupt:
        print("\n\n⚠️ 用户中断生成过程")
    except Exception as e:
        print("\n❌ 生成过程出错: {}".format(e))


if __name__ == "__main__":
    main()