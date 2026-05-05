#!/usr/bin/env python3
import json
import os
import sys
import argparse
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageColor
import polyline
import math
import base64
import io
import re
import urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor

try:
    import imageio
except ImportError:
    print("❌ 需要安装 imageio 库: pip install imageio")
    sys.exit(1)

class MapGifGenerator:
    def __init__(self, project_root=None, width=300, height=390, track_color='#FF5722', 
                 animation_frames=80, static_frames=20, force=False):
        if project_root is None:
            self.project_root = Path(__file__).parent.parent
        else:
            self.project_root = Path(project_root)
        
        self.activities_file = self.project_root / "src" / "static" / "activities.json"
        self.output_dir = self.project_root / "public" / "assets" / "gif"
        self.tile_cache = self.project_root / "scripts" / "tile_cache"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.tile_cache.mkdir(exist_ok=True)
        
        self.target_width, self.target_height = width, height
        self.draw_width, self.draw_height = width * 2, height * 2
        self.track_color = track_color
        self.animation_frames = animation_frames
        self.static_frames = static_frames
        self.line_width = 3
        self.force = force
        
        self.offset_lat, self.offset_lng = self.get_offset_config()
        self.start_icon = self.load_svg_icon("start.svg")
        self.end_icon = self.load_svg_icon("end.svg")
        
        # 预加载字体
        self.f_bold, self.f_reg = self.load_fonts()

    def get_offset_config(self):
        # 优先从环境变量读取（与 GitHub Secrets 保持一致）
        lat_offset = float(os.environ.get("VITE_LAT_OFFSET", 0.0))
        lng_offset = float(os.environ.get("VITE_LNG_OFFSET", 0.0))
        
        # 如果环境变量为空，则尝试从 site-metadata 解析（向后兼容）
        if lat_offset == 0.0:
            dist, bearing = 0.0, 114.45
            try:
                meta_path = self.project_root / "src" / "static" / "site-metadata.ts"
                content = meta_path.read_text()
                d_m = re.search(r'distance:\s*([0-9.]+)', content)
                b_m = re.search(r'bearing:\s*([0-9.]+)', content)
                if d_m: dist = float(d_m.group(1))
                if b_m: bearing = float(b_m.group(1))
                rad = math.radians(bearing)
                lat_offset, lng_offset = (dist * math.cos(rad)) / 111.0, (dist * math.sin(rad)) / 89.0
            except: pass
            
        return lat_offset, lng_offset

    def load_fonts(self):
        font_paths = [
            "/System/Library/Fonts/PingFang.ttc",
            "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
            "/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc",
            "/System/Library/Fonts/STHeiti Light.ttc",
            "/Library/Fonts/Arial Unicode.ttf"
        ]
        for p in font_paths:
            if os.path.exists(p):
                try:
                    return ImageFont.truetype(p, 44), ImageFont.truetype(p, 34)
                except: continue
        return ImageFont.load_default(), ImageFont.load_default()

    def load_svg_icon(self, filename):
        svg_path = self.project_root / "assets" / filename
        try:
            content = svg_path.read_text()
            match = re.search(r'data:image/png;base64,([^"]+)', content)
            if match:
                data = base64.b64decode(match.group(1))
                return Image.open(io.BytesIO(data)).convert("RGBA")
        except: pass
        return None

    def download_tile(self, x, y, z):
        style = "voyager_nolabels"
        cache_path = self.tile_cache / f"{style}_{z}_{x}_{y}.png"
        if cache_path.exists():
            return Image.open(cache_path).convert("RGBA")
        url = f"https://basemaps.cartocdn.com/rastertiles/{style}/{z}/{x}/{y}.png"
        headers = {'User-Agent': 'Mozilla/5.0'}
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=10) as res:
                data = res.read()
                cache_path.write_bytes(data)
                return Image.open(io.BytesIO(data)).convert("RGBA")
        except:
            return Image.new('RGBA', (256, 256), (241, 238, 232, 255))

    def latlng_to_pixel(self, lat, lon, zoom):
        x = ((lon + 180) / 360) * (2**zoom) * 256
        y = (1 - math.log(math.tan(math.radians(lat)) + 1/math.cos(math.radians(lat))) / math.pi) / 2 * (2**zoom) * 256
        return x, y

    def get_map_background(self, coordinates):
        lats, lons = [c[0] for c in coordinates], [c[1] for c in coordinates]
        min_lat, max_lat, min_lon, max_lon = min(lats), max(lats), min(lons), max(lons)
        
        # 1. 寻找合适的缩放层级（确保轨迹在当前 zoom 下有足够的像素细节）
        # 我们希望轨迹跨度在 800~1200 像素左右，这样缩放到 600~800 时依然清晰
        for zoom in range(18, 5, -1):
            px1, py1 = self.latlng_to_pixel(max_lat, min_lon, zoom)
            px2, py2 = self.latlng_to_pixel(min_lat, max_lon, zoom)
            if abs(px2 - px1) > 1000 or abs(py2 - py1) > 1200:
                continue
            break
        
        # 轨迹中心
        c_lat, c_lon = (min_lat + max_lat) / 2, (min_lon + max_lon) / 2
        cx, cy = self.latlng_to_pixel(c_lat, c_lon, zoom)
        
        # 2. 计算精确裁剪框 (保持 1:1.3 比例)
        px_coords = [self.latlng_to_pixel(lat, lon, zoom) for lat, lon in coordinates]
        xs, ys = [p[0] for p in px_coords], [p[1] for p in px_coords]
        track_w, track_h = max(xs) - min(xs), max(ys) - min(ys)
        
        # 目标占比 90% (留白 5%)
        # 根据宽高比决定是以宽为基准还是以高为基准缩放
        if track_w / track_h > (self.draw_width / self.draw_height):
            # 轨迹太宽，以宽为准
            view_w = track_w / 0.90
            view_h = view_w * (self.draw_height / self.draw_width)
        else:
            # 轨迹太高，以高为准
            view_h = track_h / 0.90
            view_w = view_h * (self.draw_width / self.draw_height)
        
        left, top = cx - view_w / 2, cy - view_h / 2
        
        # 3. 拼图（覆盖裁剪区域所需的瓦片）
        tx_s, tx_e = int(left // 256), int((left + view_w) // 256)
        ty_s, ty_e = int(top // 256), int((top + view_h) // 256)
        
        full = Image.new('RGBA', ((tx_e-tx_s+1)*256, (ty_e-ty_s+1)*256))
        for tx in range(tx_s, tx_e + 1):
            for ty in range(ty_s, ty_e + 1):
                full.paste(self.download_tile(tx, ty, zoom), ((tx-tx_s)*256, (ty-ty_s)*256))
        
        # 4. 执行裁剪并缩放到绘图尺寸
        l_img, t_img = int(left - tx_s*256), int(top - ty_s*256)
        bg = full.crop((l_img, t_img, l_img + int(view_w), t_img + int(view_h)))
        bg = bg.resize((self.draw_width, self.draw_height), Image.Resampling.LANCZOS)
        
        return bg, lambda lat, lon: (
            (self.latlng_to_pixel(lat, lon, zoom)[0] - left) * (self.draw_width / view_w),
            (self.latlng_to_pixel(lat, lon, zoom)[1] - top) * (self.draw_height / view_h)
        )

    def interpolate(self, coords, n):
        if len(coords) < 2: return coords
        c = np.array(coords)
        dists = np.concatenate(([0], np.cumsum(np.sqrt(((np.diff(c, axis=0))**2).sum(axis=1)))))
        new_dists = np.linspace(0, dists[-1], n)
        return list(zip(np.interp(new_dists, dists, c[:, 0]), np.interp(new_dists, dists, c[:, 1])))

    def draw_beautiful_line(self, draw, points):
        if len(points) < 2: return
        pts = [(p[0], p[1]) for p in points]
        rgb = ImageColor.getrgb(self.track_color)
        draw.line(pts, fill=(*rgb, 25), width=int(self.line_width * 3), joint='round')
        draw.line(pts, fill=(*rgb, 60), width=int(self.line_width * 2), joint='round')
        draw.line(pts, fill=self.track_color, width=int(self.line_width), joint='round')

    def generate(self, date, activity=None):
        out_path = self.output_dir / f"track_{date}.gif"
        if out_path.exists() and not self.force:
            print(f"⏩ 跳过 {date} (文件已存在)")
            return True
            
        if not activity:
            data = json.load(open(self.activities_file))
            activity = next((a for a in data if a['start_date_local'].startswith(date) and a.get('summary_polyline')), None)
            
        if not activity: return False
        
        raw = [[p[0] - self.offset_lat, p[1] - self.offset_lng] for p in polyline.decode(activity['summary_polyline'])]
        bg, map_fn = self.get_map_background(raw)
        pixel_coords = [map_fn(lat, lon) for lat, lon in raw]
        smooth = self.interpolate(pixel_coords, self.animation_frames * 4)
        
        text_color = "#21B2AA"
        mask_color = (235, 235, 235, 180)
        frames = []
        for i in range(self.animation_frames):
            frame = bg.copy()
            draw = ImageDraw.Draw(frame, 'RGBA')
            pts = smooth[:int(len(smooth) * (i+1)/self.animation_frames)]
            self.draw_beautiful_line(draw, pts)
            
            # 顶部全宽背景与日期 + 距离
            t_date = date
            dist_km = activity.get('distance', 0) / 1000.0
            t_info = f"{activity.get('type', 'Run')} {dist_km:.2f}km"
            
            bbox = draw.textbbox((25, 20), t_date, font=self.f_bold)
            draw.rectangle([0, 0, self.draw_width, bbox[3]+15], fill=mask_color)
            
            draw.text((25, 20), t_date, fill=text_color, font=self.f_bold)
            draw.text((self.draw_width - 25, 20), t_info, fill=text_color, font=self.f_bold, anchor="ra")
            
            # 底部全宽背景与时长 + 运动名称
            name = activity.get('name') or "Run"
            t_dur = str(activity.get('moving_time', '0:00'))
            
            bbox_n = draw.textbbox((self.draw_width - 25, self.draw_height - 25), name, font=self.f_reg, anchor="rb")
            draw.rectangle([0, bbox_n[1]-15, self.draw_width, self.draw_height], fill=mask_color)
            
            draw.text((25, self.draw_height - 25), t_dur, fill=text_color, font=self.f_reg, anchor="lb")
            draw.text((self.draw_width - 25, self.draw_height - 25), name, fill=text_color, font=self.f_reg, anchor="rb")

            if pts:
                cx, cy = pts[-1]
                draw.ellipse([cx-4, cy-4, cx+4, cy+4], fill='white', outline=self.track_color, width=2)
            frames.append(frame.resize((self.target_width, self.target_height), Image.Resampling.LANCZOS))
        
        final = bg.copy()
        draw = ImageDraw.Draw(final, 'RGBA')
        self.draw_beautiful_line(draw, smooth)
        
        # 顶部全宽背景与日期 + 距离
        dist_km = activity.get('distance', 0) / 1000.0
        t_info = f"{activity.get('type', 'Run')} {dist_km:.2f}km"
        bbox = draw.textbbox((25, 20), date, font=self.f_bold)
        draw.rectangle([0, 0, self.draw_width, bbox[3]+15], fill=mask_color)
        draw.text((25, 20), date, fill=text_color, font=self.f_bold)
        draw.text((self.draw_width - 25, 20), t_info, fill=text_color, font=self.f_bold, anchor="ra")
        
        # 底部全宽背景与时长 + 运动名称
        name = activity.get('name') or "Run"
        t_dur = str(activity.get('moving_time', '0:00'))
        
        bbox_n = draw.textbbox((self.draw_width - 25, self.draw_height - 25), name, font=self.f_reg, anchor="rb")
        draw.rectangle([0, bbox_n[1]-15, self.draw_width, self.draw_height], fill=mask_color)
        
        draw.text((25, self.draw_height - 25), t_dur, fill=text_color, font=self.f_reg, anchor="lb")
        draw.text((self.draw_width - 25, self.draw_height - 25), name, fill=text_color, font=self.f_reg, anchor="rb")

        if self.start_icon:
            final.paste(i2:=self.start_icon.resize((32,32)), (int(smooth[0][0]-16), int(smooth[0][1]-16)), i2)
        if self.end_icon:
            final.paste(i3:=self.end_icon.resize((32,32)), (int(smooth[-1][0]-16), int(smooth[-1][1]-16)), i3)
        final_1x = final.resize((self.target_width, self.target_height), Image.Resampling.LANCZOS)
        
        imageio.mimsave(str(out_path), [np.array(f) for f in (frames + [final_1x] * self.static_frames)], fps=25, loop=0)
        print(f"✅ 生成完成: {date}")
        return True

    def generate_all(self, min_distance=0):
        print(f"🚀 批量生成 (>= {min_distance}m)...")
        data = json.load(open(self.activities_file))
        tasks = []
        for act in data:
            if not act.get('summary_polyline') or act.get('distance', 0) < min_distance: continue
            tasks.append((act['start_date_local'][:10], act))
        
        tasks.sort(key=lambda x: x[0], reverse=True)
        print(f"📊 共 {len(tasks)} 条任务")
        
        with ThreadPoolExecutor(max_workers=8) as executor:
            list(executor.map(lambda x: self.generate(*x), tasks))
        print("🎉 全部完成")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("-day", type=str)
    parser.add_argument("-all", action="store_true")
    parser.add_argument("-force", action="store_true")
    parser.add_argument("-min-dist", type=float, default=21000)
    args = parser.parse_args()
    
    gen = MapGifGenerator(width=300, height=390, force=args.force)
    if args.day: gen.generate(args.day)
    elif args.all: gen.generate_all(min_distance=args.min_dist)
    else: parser.print_help()
