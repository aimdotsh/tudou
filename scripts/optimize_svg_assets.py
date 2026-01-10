import os
import re
import glob

# 统一位移量
SHIFT_AMOUNT = 6

def shift_svg_content(file_path, patterns):
    if not os.path.exists(file_path):
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    for pattern, repl_func in patterns:
        content = re.sub(pattern, repl_func, content)

    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Optimized SVG: {file_path}")

def shift_x(match):
    val = float(match.group(1))
    if val == 0:
        return match.group(0)
    new_val = max(0, val - SHIFT_AMOUNT)
    # 保持一位小数以确保兼容性
    return f'x="{new_val:.1f}"' if '.' in match.group(1) else f'x="{int(new_val) if new_val == int(new_val) else new_val}"'

def shift_cx(match):
    val = float(match.group(1))
    if val == 0:
        return match.group(0)
    new_val = max(0, val - SHIFT_AMOUNT)
    return f'cx="{new_val:.1f}"' if '.' in match.group(1) else f'cx="{int(new_val) if new_val == int(new_val) else new_val}"'

def shift_polyline_points(match):
    points_str = match.group(1)
    parts = points_str.split(' ')
    new_parts = []
    for part in parts:
        if ',' in part:
            coords = part.split(',')
            try:
                new_x = max(0, float(coords[0]) - SHIFT_AMOUNT)
                new_parts.append(f"{new_x},{coords[1]}")
            except ValueError:
                new_parts.append(part)
        else:
            new_parts.append(part)
    return f'points="{" ".join(new_parts)}"'

def optimize_all():
    assets_dir = 'assets'
    
    # 定义匹配规则
    # 1. 通用规则：处理 x 和 cx 属性
    common_patterns = [
        (r'\bx="([\d.]+)"', shift_x),
        (r'\bcx="([\d.]+)"', shift_cx)
    ]
    
    # 2. 特殊规则：处理 Grid 的 polyline
    grid_patterns = common_patterns + [
        (r'points="([^"]+)"', shift_polyline_points)
    ]

    # 处理特定文件
    # Grid
    shift_svg_content(os.path.join(assets_dir, 'grid.svg'), grid_patterns)
    
    # Month of Life
    shift_svg_content(os.path.join(assets_dir, 'mol.svg'), common_patterns)
    
    # GitHub (all github_*.svg and github.svg)
    github_files = glob.glob(os.path.join(assets_dir, 'github*.svg'))
    for f in github_files:
        shift_svg_content(f, common_patterns)
        
    # Annual Total Posters
    ayeartotal_files = glob.glob(os.path.join(assets_dir, 'ayeartotal*.svg'))
    for f in ayeartotal_files:
        shift_svg_content(f, common_patterns)
        
    # Calendars
    calendar_files = glob.glob(os.path.join(assets_dir, 'calendar*.svg'))
    for f in calendar_files:
        shift_svg_content(f, common_patterns)

if __name__ == "__main__":
    optimize_all()
