# 🐍 Python环境设置指南

## 🚨 当前问题

你的系统使用的是Python 2.7，这个版本已经过时且不再维护。我提供了两种解决方案：

## 方案一：使用Python 2.7兼容版本（临时解决）

### 1. 安装兼容版本的依赖
```bash
pip install -r scripts/requirements_py2.txt
```

或者单独安装：
```bash
pip install 'Pillow>=2.0.0,<7.0.0'
pip install 'numpy>=1.16.0,<1.17.0'
```

### 2. 运行Python 2.7兼容脚本
```bash
python scripts/generate_gifs_python2.py
```

## 方案二：升级到Python 3（推荐）

### 1. 安装Python 3

#### macOS (推荐使用Homebrew)
```bash
# 安装Homebrew（如果还没有）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装Python 3
brew install python3

# 验证安装
python3 --version
```

#### 或者下载官方安装包
访问 https://www.python.org/downloads/ 下载最新版本

### 2. 使用Python 3安装依赖
```bash
pip3 install -r scripts/requirements.txt
```

### 3. 运行Python 3脚本
```bash
python3 scripts/generate_gifs_python.py
```

## 🔧 故障排除

### 如果pip安装失败

#### 升级pip
```bash
# Python 2.7
pip install --upgrade pip

# Python 3
pip3 install --upgrade pip
```

#### 使用国内镜像源
```bash
# Python 2.7
pip install -i https://pypi.tuna.tsinghua.edu.cn/simple -r scripts/requirements_py2.txt

# Python 3
pip3 install -i https://pypi.tuna.tsinghua.edu.cn/simple -r scripts/requirements.txt
```

### 权限问题
```bash
# 使用用户安装（推荐）
pip install --user -r scripts/requirements_py2.txt

# 或者使用sudo（不推荐）
sudo pip install -r scripts/requirements_py2.txt
```

## 📊 版本对比

| 特性 | Python 2.7版本 | Python 3版本 |
|------|----------------|--------------|
| 兼容性 | ⚠️ 有限 | ✅ 完整 |
| 性能 | ⚠️ 较慢 | ✅ 更快 |
| 库支持 | ❌ 受限 | ✅ 完整 |
| 未来维护 | ❌ 已停止 | ✅ 持续更新 |

## 🎯 推荐步骤

1. **立即可用**：先使用Python 2.7兼容版本生成GIF
2. **长期方案**：升级到Python 3以获得更好的性能和支持

## 📋 快速测试

### Python 2.7版本
```bash
cd /Users/brty.liu/Documents/GitHub/tudou
pip install 'Pillow>=2.0.0,<7.0.0' 'numpy>=1.16.0,<1.17.0'
python scripts/generate_gifs_python2.py
```

### Python 3版本
```bash
cd /Users/brty.liu/Documents/GitHub/tudou
pip3 install Pillow imageio polyline numpy
python3 scripts/generate_gifs_python.py
```

## ⚡ 立即开始

选择其中一种方案，现在就可以开始生成GIF文件了！

**推荐：先用Python 2.7版本快速生成，然后考虑升级到Python 3** 🚀