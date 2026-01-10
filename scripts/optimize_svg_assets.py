import re
import os

def shift_grid_svg(file_path):
    if not os.path.exists(file_path):
        print(f"Skipping: {file_path} not found.")
        return
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update text x="10" to x="2"
    content = content.replace('x="10"', 'x="2"')

    # 2. Update polyline points: shift x by -8
    def shift_path(match):
        points_str = match.group(1)
        new_parts = []
        parts = re.split(r'(\s+)', points_str)
        for part in parts:
            if ',' in part:
                coords = part.split(',')
                try:
                    new_x = max(0, float(coords[0]) - 8)
                    new_parts.append(f"{new_x},{coords[1]}")
                except ValueError:
                    new_parts.append(part)
            else:
                new_parts.append(part)
        return f'points="{"".join(new_parts)}"'

    content = re.sub(r'points="([^"]+)"', shift_path, content)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Optimized Grid SVG: {file_path}")

def shift_mol_svg(file_path):
    if not os.path.exists(file_path):
        print(f"Skipping: {file_path} not found.")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update text x="10" to x="2"
    content = content.replace('x="10"', 'x="2"')

    # 2. Update circle cx values: reduce by 8
    def shift_cx(match):
        val = float(match.group(1))
        new_val = max(0, val - 8)
        return f'cx="{new_val}"'

    def shift_cx(match):
        val = float(match.group(1))
        new_val = max(0, val - 8)
        return f'cx="{new_val}"'

    content = re.sub(r'\bcx="([\d.]+)"', shift_cx, content)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Optimized MOL SVG: {file_path}")

def shift_github_svg(file_path):
    if not os.path.exists(file_path):
        print(f"Skipping: {file_path} not found.")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Optimized regex to avoid matching rx, etc. and prevent double shifts
    def shift_x(match):
        val = float(match.group(1))
        if val == 0:
            return match.group(0)
        new_val = max(0, val - 8)
        return f'x="{new_val}"'

    # The issue was that both text and rect were handled separately but using the same regex r'x="..."'
    # which would match and shift the same coordinates twice if they were already shifted in a previous pass
    # or if the regex was applied to the whole content multiple times.
    # We'll use word boundary \b to ensure we only match the full attribute name 'x'.
    content = re.sub(r'\bx="([\d.]+)"', shift_x, content)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Optimized GitHub SVG: {file_path}")

if __name__ == "__main__":
    assets_dir = 'assets'
    shift_grid_svg(os.path.join(assets_dir, 'grid.svg'))
    shift_mol_svg(os.path.join(assets_dir, 'mol.svg'))
    shift_github_svg(os.path.join(assets_dir, 'github.svg'))
