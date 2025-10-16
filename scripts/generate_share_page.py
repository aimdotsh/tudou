#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
根据 run_id 生成静态分享页面（含 Open Graph/WeChat 预览 meta）
输出: public/share/{run_id}.html
"""

import json
import argparse
from pathlib import Path
from datetime import datetime

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ACTIVITIES_FILE = PROJECT_ROOT / "src" / "static" / "activities_py4567.json"
OUTPUT_DIR = PROJECT_ROOT / "public" / "share"

HTML_TEMPLATE = """<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>{title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <!-- Generic -->
  <meta name="description" content="{description}" />
  <link rel="canonical" href="{page_url}" />
  <!-- Open Graph -->
  <meta property="og:type" content="article" />
  <meta property="og:title" content="{title}" />
  <meta property="og:description" content="{description}" />
  <meta property="og:image" content="{image_url}" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="{page_url}" />
  <meta property="og:site_name" content="Run.liups.com" />
  <meta property="og:locale" content="zh_CN" />
  <!-- Twitter (fallback) -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{title}" />
  <meta name="twitter:description" content="{description}" />
  <meta name="twitter:image" content="{image_url}" />
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif; margin: 0; padding: 24px; }}
    .container {{ max-width: 680px; margin: 0 auto; }}
    .cover {{ width: 100%; aspect-ratio: 16/9; object-fit: contain; background: #f7f7f7; border: 1px solid #eee; }}
    .title {{ font-size: 20px; font-weight: 600; margin: 16px 0 8px; }}
    .desc {{ color: #666; }}
    .hint {{ margin-top: 16px; color: #999; font-size: 13px; }}
    a.btn {{ display: inline-block; margin-top: 16px; padding: 8px 12px; background: #ff8c00; color: #fff; text-decoration: none; border-radius: 6px; }}
  </style>
</head>
<body>
  <div class="container">
    <img class="cover" src="{image_url}" alt="{title}" />
    <div class="title">{title}</div>
    <div class="desc">{description}</div>
    <a class="btn" href="{app_url}">打开原始页面</a>
    <div class="hint">提示：此分享页仅用于社交平台预览，点击按钮可打开完整交互页面。</div>
  </div>
</body>
</html>
"""

def load_activities():
    if not ACTIVITIES_FILE.exists():
        raise FileNotFoundError(f"活动数据文件不存在: {ACTIVITIES_FILE}")
    with ACTIVITIES_FILE.open("r", encoding="utf-8") as f:
        data = json.load(f)
        if isinstance(data, list):
            return data
        elif isinstance(data, dict):
            return data.get("activities", data.get("runs", []))
        return []

def format_datetime(dt_str):
    """
    处理常见时间格式:
    - 2024-08-17T06:30:25Z
    - 2024-08-17 06:30:25
    - 2024-08-17
    """
    if not dt_str:
        return ""
    s = dt_str.strip()
    try:
        if "T" in s:
            # ISO
            # 去掉尾部的Z或时区
            s2 = s.replace("Z", "").split("+")[0]
            # 可能包含毫秒
            try:
                dt = datetime.fromisoformat(s2)
            except ValueError:
                dt = datetime.strptime(s2[:19], "%Y-%m-%dT%H:%M:%S")
            return dt.strftime("%Y-%m-%d %H:%M")
        elif " " in s and len(s) >= 19:
            dt = datetime.strptime(s[:19], "%Y-%m-%d %H:%M:%S")
            return dt.strftime("%Y-%m-%d %H:%M")
        else:
            # 仅日期
            dt = datetime.strptime(s[:10], "%Y-%m-%d")
            return dt.strftime("%Y-%m-%d")
    except Exception:
        return s[:16]

def build_description(act=None, when_override=None):
    pieces = []
    # 时间
    when = None
    if when_override:
        when = format_datetime(when_override)
    elif act:
        when = format_datetime(act.get("start_date_local") or act.get("start_date") or "")
    if when:
        pieces.append(f"时间：{when}")
    # 距离
    dist = act.get("distance")
    if isinstance(dist, (int, float)):
        km = dist / 1000.0 if dist > 1000 else dist
        unit = "km" if dist > 1000 else "m"
        pieces.append(f"距离：{km:.2f}{unit}")
    # 用时
    moving = act.get("moving_time") or act.get("elapsed_time")
    if isinstance(moving, int):
        h = moving // 3600
        m = (moving % 3600) // 60
        s = moving % 60
        if h > 0:
            pieces.append(f"用时：{h}小时{m}分{s}秒")
        else:
            pieces.append(f"用时：{m}分{s}秒")
    # 配速
    pace = act.get("average_speed")
    if isinstance(pace, (int, float)) and pace > 0:
        # m/s -> min/km
        min_per_km = 1000.0 / pace / 60.0
        mm = int(min_per_km)
        ss = int(round((min_per_km - mm) * 60))
        pieces.append(f"配速：{mm}:{ss:02d}/km")
    return "，".join(pieces) if pieces else "跑步记录分享"

def pick_image_url(act, base_url, date_override=None, image_override=None):
    """
    优先使用 PNG：
    1) 用户传入 image 覆盖
    2) 指定日期的 SVG -> 转 PNG（assets/yyyymmdd/{date}.svg -> public/images/share/{date}.png）
    3) 回退到站点占位 PNG
    """
    # 覆盖图
    if image_override:
        return image_override if image_override.startswith("http") else f"{base_url}{image_override}"

    # 选择日期
    date_str = None
    if date_override:
        date_str = date_override[:10]
    elif act:
        date_str = (act.get("start_date_local") or act.get("start_date") or "")[:10]

    # 尝试将 SVG 转 PNG
    if date_str:
        from pathlib import Path as _P
        proj = _P(__file__).resolve().parent.parent
        svg_path = proj / "assets" / "yyyymmdd" / f"{date_str}.svg"
        png_out_dir = proj / "public" / "images" / "share"
        png_out_dir.mkdir(parents=True, exist_ok=True)
        png_path = png_out_dir / f"{date_str}.png"
        if svg_path.exists():
            # 使用 cairosvg 转换
            try:
                import cairosvg
                cairosvg.svg2png(url=str(svg_path), write_to=str(png_path), output_width=1200, output_height=630)
            except Exception as e:
                # 转换失败则忽略，后续用占位图
                pass
            # 若已生成 PNG，返回绝对 URL
            if png_path.exists():
                return f"{base_url}/images/share/{date_str}.png"

    # 回退：占位 PNG
    return f"{base_url}/images/favicon.png"

def main():
    parser = argparse.ArgumentParser(description="生成微信/社交平台分享静态页面")
    parser.add_argument("-run_id", "--run_id", required=True, help="活动ID（run_id）")
    parser.add_argument("-base_url", "--base_url", default="https://run.liups.com", help="站点基础URL（用于生成 og:image 等绝对链接）")
    # 覆盖参数（当数据集中找不到活动时使用）
    parser.add_argument("-title", "--title", help="分享标题（覆盖活动名称）")
    parser.add_argument("-time", "--time", help="时间，例如 2024-08-17 06:30（覆盖活动时间）")
    parser.add_argument("-image", "--image", help="图片URL或站内路径（覆盖 og:image），例如 /assets/gif/track_2024-08-17.gif")
    parser.add_argument("-date", "--date", help="用于选择按日期命名的GIF，例如 2024-08-17")
    args = parser.parse_args()

    activities = load_activities()
    # run_id 可能是字符串或数字，兼容多字段
    target = None
    for act in activities:
        vals = [
            act.get("id"),
            act.get("run_id"),
            act.get("activity_id"),
            act.get("upload_id"),
            act.get("external_id"),
            act.get("strava_id"),
        ]
        if any(str(v) == str(args.run_id) for v in vals if v is not None):
            target = act
            break

    # 标题与描述
    if target:
        title = (target.get("name") or args.title or "跑步记录").strip()
        description = build_description(target, when_override=args.time)
    else:
        if not (args.title or args.time or args.image or args.date):
            raise SystemExit(f"未找到 run_id={args.run_id} 的活动，请提供至少 --title/--time/--image/--date 之一以生成分享页")
        title = (args.title or "跑步记录").strip()
        description = build_description(None, when_override=args.time)

    image_url = pick_image_url(target, args.base_url, date_override=args.date, image_override=args.image)
    page_url = f"{args.base_url}/share/{args.run_id}.html"
    app_url = f"{args.base_url}/?run_id={args.run_id}"

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    out_file = OUTPUT_DIR / f"{args.run_id}.html"
    html = HTML_TEMPLATE.format(
        title=title,
        description=description,
        image_url=image_url,
        page_url=page_url,
        app_url=app_url
    )
    out_file.write_text(html, encoding="utf-8")
    print(f"✅ 已生成分享页: {out_file}")
    print(f"🔗 分享该链接到微信即可显示预览: {page_url}")

if __name__ == "__main__":
    main()