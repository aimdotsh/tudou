import os
import sys
from pathlib import Path
import subprocess

def main():
    # 切换到脚本所在目录的父目录
    project_root = Path(__file__).parent.parent
    os.chdir(project_root)
    
    print("🚀 正在调用 Map V2 高清生成引擎批量处理缺失或需要更新的 GIF...")
    
    # 直接调用 generate_gifs_map_v2.py 的逻辑
    # 默认生成所有 >= 21km 的活动 (Wonderful Workouts 需求)
    # 如果需要生成所有历史活动，可以去掉 -min-dist 或设为 0
    cmd = [
        sys.executable, 
        "scripts/generate_gifs_map_v2.py", 
        "-all", 
        "-min-dist", "21000",
        "-force"
    ]
    
    try:
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ 批量生成失败: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
