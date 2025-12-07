#!/usr/bin/env python3
"""
轨迹GIF生成脚本 - Python版本
自动生成所有单轨迹日期的GIF动画文件
使用 CartoDB Positron No Labels 瓦片背景 (无路名)
尺寸固定为 300x390 (10:13 比例)
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
import requests

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
        
        # Determine actual activities file location
        if not self.activities_file.exists():
             self.activities_file = self.project_root / "src" / "static" / "activities.json"

        self.output_dir = self.project_root / "assets" / "gif"
        
        # Fixed dimensions 10:13 ratio (SVGs are 100x130, so 300x390 is 3x scale)
        self.width = 300
        self.height = 390
        
        self.animation_frames = 40  # Frames
        self.static_frames = 15     # Static frames at the end
        self.frames = self.animation_frames + self.static_frames
        self.animation_duration = 0.06
        self.static_duration = 0.1
        
        print(f"📁 项目根目录: {self.project_root}")
        print(f"📊 活动数据文件: {self.activities_file}")
        print(f"📁 输出目录: {self.output_dir}")
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
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
            if 'start_date_local' in activity:
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

    def get_bounds(self, coordinates):
        """Get bounding box of coordinates"""
        lats = [c[0] for c in coordinates]
        lngs = [c[1] for c in coordinates]
        return min(lngs), min(lats), max(lngs), max(lats)

    # --- Tile Utility Functions ---
    def deg2num(self, lat_deg, lon_deg, zoom):
        """Convert lat/lon to tile numbers"""
        lat_rad = math.radians(lat_deg)
        n = 2.0 ** zoom
        xtile = int((lon_deg + 180.0) / 360.0 * n)
        ytile = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
        return (xtile, ytile)

    def num2deg(self, xtile, ytile, zoom):
        """Convert tile numbers to lat/lon of NW corner"""
        n = 2.0 ** zoom
        lon_deg = xtile / n * 360.0 - 180.0
        lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * ytile / n)))
        lat_deg = math.degrees(lat_rad)
        return (lat_deg, lon_deg)

    def fetch_tile(self, z, x, y):
        """Fetch a single tile from CartoDB"""
        # Subdomains: a, b, c, d
        s = 'abc'[ (x+y) % 3 ]
        url = f"https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png"
        headers = {'User-Agent': 'Mozilla/5.0'}
        try:
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 200:
                return Image.open(io.BytesIO(response.content)).convert("RGBA")
        except Exception as e:
            print(f"⚠️ Tile fetch error {z}/{x}/{y}: {e}")
        return None

    def fetch_static_map_tiles_fixed_ratio(self, min_lng, min_lat, max_lng, max_lat):
        """
        Fetch background map tiles enforcing safe padding and fixed aspect ratio.
        The target image size is self.width x self.height (300x390).
        We calculate the geographic bounds that fit this ratio, centered on the track.
        """
        
        # 1. Calculate Track Bounds and Center
        track_width_lng = max_lng - min_lng
        if track_width_lng == 0: track_width_lng = 0.0001
        
        track_height_lat = max_lat - min_lat
        if track_height_lat == 0: track_height_lat = 0.0001 # Approximation
        
        # Center in Mercator
        def merc_x(lng): return (lng + 180.0) / 360.0
        def merc_y(lat): 
             lat_rad = math.radians(lat)
             return (1.0 - math.log(math.tan(lat_rad) + 1.0 / math.cos(lat_rad)) / math.pi) / 2.0
        
        def inv_merc_x(mx): return mx * 360.0 - 180.0
        def inv_merc_y(my): return math.degrees(math.atan(math.sinh(math.pi * (1.0 - 2.0 * my))))

        track_min_mx = merc_x(min_lng)
        track_max_mx = merc_x(max_lng)
        track_min_my = merc_y(max_lat) # Top (smaller Y in mercator projection usually? Wait. mercator Y goes 0 at top) 
                                     # My formula: (1 - ...) / 2.  Lat 85 => small y (approx 0). Lat -85 => large y (approx 1).
                                     # So max_lat corresponds to min_my. Correct.
        track_max_my = merc_y(min_lat) # Bottom
        
        center_mx = (track_min_mx + track_max_mx) / 2
        center_my = (track_min_my + track_max_my) / 2
        
        track_merc_w = track_max_mx - track_min_mx
        track_merc_h = track_max_my - track_min_my
        
        # 2. Determine View Bounds matching Image Aspect Ratio
        image_ratio = self.width / self.height # 300 / 390 = 0.769
        
        # We need to find a view width/height in Mercator units that:
        # 1. Contains the track w/ padding (e.g. 10%)
        # 2. Has width/height = image_ratio
        
        # Add 20% padding to track
        req_merc_w = track_merc_w * 1.2
        req_merc_h = track_merc_h * 1.2
        
        if req_merc_w / req_merc_h > image_ratio:
            # Track is wider than target ratio -> Limit by width
            view_merc_w = req_merc_w
            view_merc_h = view_merc_w / image_ratio
        else:
            # Track is taller than target ratio -> Limit by height
            view_merc_h = req_merc_h
            view_merc_w = view_merc_h * image_ratio
            
        view_min_mx = center_mx - view_merc_w / 2
        view_max_mx = center_mx + view_merc_w / 2
        view_min_my = center_my - view_merc_h / 2
        view_max_my = center_my + view_merc_h / 2
        
        # Convert back to lat/lon for tile fetching (approximate is fine for fetching, accurate for cropping)
        view_min_lng_deg = inv_merc_x(view_min_mx)
        view_max_lng_deg = inv_merc_x(view_max_mx)
        view_max_lat_deg = inv_merc_y(view_min_my) # Top Lat
        view_min_lat_deg = inv_merc_y(view_max_my) # Bottom Lat
        
        # 3. Determine Zoom
        # 256 * 2^z / 360  is pixels per degree (longitude) at Equator... 
        # Actually simpler: World size in pixels = 256 * 2^z
        # view_merc_w is fraction of world width (0..1)
        # We want view_merc_w * (256 * 2^z) = self.width
        # 2^z = self.width / (view_merc_w * 256)
        
        zoom = int(math.log2(self.width / (view_merc_w * 256)))
        zoom = max(1, min(zoom, 18))
        
        # 4. Fetch Tiles
        x1, y1 = self.deg2num(view_max_lat_deg, view_min_lng_deg, zoom)
        x2, y2 = self.deg2num(view_min_lat_deg, view_max_lng_deg, zoom)
        
        min_xt, max_xt = min(x1, x2), max(x1, x2)
        min_yt, max_yt = min(y1, y2), max(y1, y2)
        
        # Guard against huge areas
        if (max_xt - min_xt + 1) * (max_yt - min_yt + 1) > 25:
             zoom -= 1
             x1, y1 = self.deg2num(view_max_lat_deg, view_min_lng_deg, zoom)
             x2, y2 = self.deg2num(view_min_lat_deg, view_max_lng_deg, zoom)
             min_xt, max_xt = min(x1, x2), max(x1, x2)
             min_yt, max_yt = min(y1, y2), max(y1, y2)
             
        # Stitch
        tile_w, tile_h = 256, 256
        total_w = (max_xt - min_xt + 1) * tile_w
        total_h = (max_yt - min_yt + 1) * tile_h
        
        full_img = Image.new('RGBA', (total_w, total_h), (240, 240, 240, 255))
        
        for x in range(min_xt, max_xt + 1):
            for y in range(min_yt, max_yt + 1):
                tile_img = self.fetch_tile(zoom, x, y)
                if tile_img:
                    pos_x = (x - min_xt) * tile_w
                    pos_y = (y - min_yt) * tile_h
                    full_img.paste(tile_img, (pos_x, pos_y))
        
        # 5. Precise Crop
        # Get lat/lon of the stitched image corners
        tl_lat, tl_lng = self.num2deg(min_xt, min_yt, zoom)
        br_lat, br_lng = self.num2deg(max_xt + 1, max_yt + 1, zoom)
        
        img_min_mx = merc_x(tl_lng)
        img_min_my = merc_y(tl_lat)
        img_max_mx = merc_x(br_lng)
        img_max_my = merc_y(br_lat)
        
        # Pixels coordinates of view bounds in the full image
        # x = (mx - img_min_mx) / (img_max_mx - img_min_mx) * total_w
        
        crop_x1 = (view_min_mx - img_min_mx) / (img_max_mx - img_min_mx) * total_w
        crop_y1 = (view_min_my - img_min_my) / (img_max_my - img_min_my) * total_h
        crop_x2 = (view_max_mx - img_min_mx) / (img_max_mx - img_min_mx) * total_w
        crop_y2 = (view_max_my - img_min_my) / (img_max_my - img_min_my) * total_h
        
        crop_box = (int(crop_x1), int(crop_y1), int(crop_x2), int(crop_y2))
        
        # Validate crop
        if crop_box[2] <= crop_box[0] or crop_box[3] <= crop_box[1]:
             return full_img, (tl_lng, br_lat, br_lng, tl_lat)

        cropped_img = full_img.crop(crop_box)
        cropped_img = cropped_img.resize((self.width, self.height), Image.LANCZOS)
        
        print(f"🗺️ Map prepared for view: {view_min_lng_deg:.4f},{view_max_lat_deg:.4f} to {view_max_lng_deg:.4f},{view_min_lat_deg:.4f}")
        
        return cropped_img, (view_min_lng_deg, view_max_lat_deg, view_max_lng_deg, view_min_lat_deg) # MinLng, TopLat, MaxLng, BotLat

    def create_frame(self, coordinates, progress, date, frame_num, bg_image, bounds, width, height, activity=None):
        """创建单帧图像"""
        if bg_image:
            img = bg_image.copy()
        else:
            img = Image.new('RGB', (width, height), 'white')
            
        draw = ImageDraw.Draw(img)
        
        # Bounds: (min_lng, max_lat, max_lng, min_lat) -> (Left, Top, Right, Bottom)
        map_min_lng, map_max_lat, map_max_lng, map_min_lat = bounds
        
        def merc_x(lng): return (lng + 180.0) / 360.0    
        def merc_y(lat):
             lat_rad = math.radians(lat)
             return (1.0 - math.log(math.tan(lat_rad) + 1.0 / math.cos(lat_rad)) / math.pi) / 2.0
        
        min_mx, min_my = merc_x(map_min_lng), merc_y(map_max_lat) # Top-Left
        max_mx, max_my = merc_x(map_max_lng), merc_y(map_min_lat) # Bottom-Right
        
        def to_pixel(lat, lng):
            mx, my = merc_x(lng), merc_y(lat)
            denom_x = max_mx - min_mx if max_mx != min_mx else 1
            denom_y = max_my - min_my if max_my != min_my else 1
            
            x = (mx - min_mx) / denom_x * width
            y = (my - min_my) / denom_y * height
            return x, y

        pixels = [to_pixel(lat, lng) for lat, lng in coordinates]
        
        # Title
        try:
            # Scale font nicely for 300px width
            font_size = 14 
            font = ImageFont.truetype("/System/Library/Fonts/PingFang.ttc", font_size)
        except:
            font = ImageFont.load_default()
            
        # Get activity name or use date
        title = f"{date}"
        if activity and activity.get('name'):
             title = activity['name']
        bbox = draw.textbbox((0, 0), title, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        text_bg_margin = 4
        margin = 10
        
        # Calculate bottom-right position
        text_x = width - text_width - margin
        text_y = height - text_height - margin
        
        draw.rectangle(
            [text_x - text_bg_margin, text_y - text_bg_margin, 
             text_x + text_width + text_bg_margin, text_y + text_height + text_bg_margin],
            fill=(255, 255, 255, 200)
        )
        draw.text((text_x, text_y), title, fill='black', font=font)
        
        if not coordinates:
            return img
            
        self.draw_real_track(draw, pixels, progress)
        return img
    
    def draw_real_track(self, draw, pixels, progress):
        """绘制真实轨迹"""
        if len(pixels) < 2:
            return
        
        points_to_show = max(1, int(len(pixels) * progress))
        
        if points_to_show > 1:
            track_points = pixels[:points_to_show]
            draw.line(track_points, fill=(255, 69, 0), width=3) 
        
        if pixels:
            start_x, start_y = pixels[0]
            draw.ellipse([start_x-3, start_y-3, start_x+3, start_y+3], 
                        fill=(0, 200, 0), outline='white', width=1)
        
        if points_to_show > 0 and points_to_show <= len(pixels):
            current_x, current_y = pixels[points_to_show - 1]
            draw.ellipse([current_x-4, current_y-4, current_x+4, current_y+4], 
                        fill=(30, 144, 255), outline='white', width=2)
    
    def generate_single_gif(self, date_info, index, total):
        """生成单个GIF文件"""
        date = date_info['date']
        activity = date_info['activity']
        
        coordinates = []
        if activity.get('summary_polyline'):
            coordinates = self.decode_polyline(activity['summary_polyline'])
        
        if not coordinates:
            print(f"❌ [{index + 1}/{total}] {date} 失败: 无轨迹数据")
            return False
            
        min_lng, min_lat, max_lng, max_lat = self.get_bounds(coordinates)
        
        print(f"[{index + 1}/{total}] 🎬 生成 {date} ... 固定尺寸: {self.width}x{self.height}")
        
        # Fetch Map Tiles with Fixed Ratio Logic
        bg_image, map_bounds = self.fetch_static_map_tiles_fixed_ratio(min_lng, min_lat, max_lng, max_lat)
        
        frames = []
        for frame_num in range(self.frames):
            if frame_num < self.animation_frames:
                t = frame_num / (self.animation_frames - 1) if self.animation_frames > 1 else 1
                progress = 1 - (1 - t) * (1 - t) 
            else:
                progress = 1.0
            
            frame = self.create_frame(coordinates, progress, date, frame_num, bg_image, map_bounds, self.width, self.height, activity)
            frames.append(frame)
        
        output_path = self.output_dir / f"track_{date}.gif"
        try:
            durations = []
            for frame_num in range(self.frames):
                if frame_num < self.animation_frames:
                    durations.append(int(self.animation_duration * 1000))
                else:
                    durations.append(int(self.static_duration * 1000))
            
            frames[0].save(
                output_path,
                save_all=True,
                append_images=frames[1:],
                duration=durations,
                loop=0,
                optimize=True
            )
            
            file_size = output_path.stat().st_size
            print(f"✅ 完成 ({file_size // 1024}KB)")
            return True
            
        except Exception as e:
            print(f"❌ 失败: {e}")
            return False
    
    def generate_all_gifs(self, limit=None):
        """生成所有GIF文件"""
        self.output_dir.mkdir(parents=True, exist_ok=True)
        activities = self.load_activities()
        single_track_dates = self.analyze_single_track_dates(activities)
        
        if limit:
            single_track_dates = single_track_dates[:limit]
            
        success_count = 0
        for i, date_info in enumerate(single_track_dates):
            if self.generate_single_gif(date_info, i, len(single_track_dates)):
                success_count += 1
                
        print(f"🎉 完成! 成功: {success_count}")

def main():
    generator = GifGenerator()
    if len(sys.argv) > 1:
        arg = sys.argv[1]
        if arg == 'all':
             generator.generate_all_gifs()
        elif arg == 'test':
             generator.generate_all_gifs(limit=5)
        elif len(arg.split('-')) == 3: # Simple check for YYYY-MM-DD
             target_date = arg
             activities = generator.load_activities()
             single_track_dates = generator.analyze_single_track_dates(activities)
             date_info = next((item for item in single_track_dates if item['date'] == target_date), None)
             if date_info:
                 generator.generate_single_gif(date_info, 0, 1)
             else:
                 print(f"❌ 未找到日期 {target_date} 的单轨迹数据")
        else:
             print("Usage: python generate_gifs_python.py [all|test|YYYY-MM-DD]")
    else:
         print("Usage: python generate_gifs_python.py [all|test|YYYY-MM-DD]")

if __name__ == "__main__":
    main()