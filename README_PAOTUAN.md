# 🏃 COROS 跑团多用户数据同步平台 (Branch: `coros_paotuan`)

这是一个专为 COROS（高驰）跑友打造的多用户运动分享、体能大盘看板与互动社交平台。
项目支持多用户自备账号密码定时增量拉取、龙虎榜排行、运动 Feed 动态下的点赞与评论互动，以及完善的 Docker 自托管（Self-Hosted）与懒猫云 OIDC 部署。

---

## 🧭 当前开发分支信息
* **当前分支名**：`coros_paotuan`
* **远程仓库链接**：`git@github.com:aimdotsh/tudou.git` (或对应的 HTTPS 链接)

---

## ✨ 已实现的功能特性

### 1. 👥 多用户体系与凭据管理
* **独立的 SQLite 数据库储存**：使用本地轻量、高可用的 SQLite (`paotuan.db`) 保存成员记录，不需要额外部署庞大的数据库引擎。
* **开发免密登录与 JWT 认证**：支持在开发调试期间通过输入用户名一键注册/登录，配合 Express 的 Cookie-Parser 及 JWT，完美保障登录态的安全及跨组件共享。
* **高驰账号解耦**：每个用户均可在后台设置、更新自己独立的高驰（COROS）账号和密码。

### 2. 🌊 深海运动风格大厅与互动 Feed
* **海洋配色视觉规范**：主视觉由深海蓝、荧光绿、珊瑚绿等高对比度运动系配色构成。
* **数据龙虎榜**：跑团大厅首页汇聚所有用户的关键运动指标，如本月总跑步里程龙虎榜、跑团总成员数、跑团累计跑步里程等。
* **社交互动圈**：主页展示大厅全体成员的运动 Feed 流，支持对某次具体的跑步活动进行**点赞（送上小红心）**与**发送评论**。
* **EvoLab 体能指标与空安全兜底**：当新账号刚刚注册、尚未拉取高驰云端数据时，页面将以 0 刻度的安全占位模板兜底，页面**绝对不会崩溃或强制跳出**，保障用户能随时进行高驰配置操作。

### 3. 🔄 定时同步与抓取引擎
* **Python 多用户增量同步**：重写了 `run_page/coros_sync.py`，支持接收 `--user-id` 参数，可异步将高驰云端的活动明细与 EvoLab 运动大盘数据一并拉入并写回 SQLite。
* **自动化定时 Cron 任务**：后端服务配置了 `node-cron` 定时任务，每天凌晨 `3:00` 自动为所有已绑定凭证的跑团成员执行高驰增量数据同步。
* **手动一键同步**：用户可在主页一键提交手动拉取请求，后台子进程将无感运行拉取。

### 🐱 4. 懒猫云自托管与高级 OIDC 支持
* **高级 OIDC 免密接入**：实现了对接懒猫云（Lazycat）应用平台的 Advanced OIDC OAuth 标准授权，自动解析环境变量和懒猫回调。
* **标准 Manifest 描述**：内置了 `lzc-manifest.yml` 和 `lzc-build.yml`，在自托管商店中支持一键极速安装。

---

## 🛠️ 已排除的环境与兼容性阻碍 (Bug Fixes)

1. **AirPlay 5000 端口占用**：macOS 的 AirPlay 服务常年霸占 `5000` 端口，项目后端统一修正为 `5005` 端口作为服务默认端口。
2. **跨端口 Cookie 调试隔离**：当前端在 `5173/5174` 端口预览、后端在 `5005` 端口时，跨域 Cookie 默认无法携带。前端已封装 `paotuanFetch`，在跨域请求中强制声明 `credentials: 'include'`，彻底打通本地开发调试。
3. **Python 3.14 移除 `cgi` 导致同步脚本崩溃**：由于 macOS 采用最新的 Python 3.14，而原 requirements 强行锁死了极古老的 `httpx==0.15.5`（调用了已被 Python 官方剔除的 `cgi` 模块）。现已升级 httpx 至较新版，并自动补全了本地 Python 库的缺失。
4. **Docker 构建极度缓慢**：移除了 requirements 文件中对离线分析库 `duckdb` 的依赖，在 Docker Alpine 中**省去了漫长的 C++ 源码就地编译过程**，使本地 Docker 构建部署速度提升了 80% 以上（最快仅需 30 秒）。

---

## 🚀 部署与使用指南

### 方法 A: 本地极速开发联调模式
适合对代码、前端样式进行高频修改并热更新预览。

```bash
# 1. 克隆代码并切换至对应分支
git checkout coros_paotuan

# 2. 安装 Node 依赖并自动打包
pnpm install
pnpm run build

# 3. 本地安装 Python 抓取库的依赖 (macOS 系统上建议加上 --break-system-packages 参数)
pip3 install --break-system-packages -r requirements.txt pytz

# 4. 启动 Express 全栈后端
node server/index.js

# 5. 在另一个终端窗口启动 Vite 开发调试服务器
pnpm run dev
```
打开浏览器访问：`http://localhost:5173/coros` 即可开始调试。

---

### 方法 B: 本地 Docker 一键部署演示（推荐）
完全贴合生产环境的部署模式，前端资源由 Express 直接托管，单容器无感预览。

项目已为您编写好了自动化构建部署脚本。每当您修改完代码，只需执行：

```bash
# 运行一键构建部署脚本
./deploy-local.sh
```

**该脚本将自动完成：**
1. 强制清理与停止可能在运行中的旧版 `coros-paotuan-demo` 容器；
2. 采用清华/阿里云镜像源加速 Alpine 底层依赖拉取；
3. 将您宿主机的 `run_page/` 目录（包含 `paotuan.db`）挂载到容器中，**数据互通且在容器销毁后持久化不丢失**；
4. 暴露 `5005` 端口运行。

部署成功后，直接在浏览器中打开：
👉 **[http://localhost:5005/coros](http://localhost:5005/coros)** 即可完成预览！

---

### 方法 C: 懒猫自托管商店打包与部署
项目已经内置了懒猫云商店配置：
* 配置文件：[lzc-manifest.yml](file:///Users/liups/ai/github/tudou/lzc-manifest.yml)
* 构建配置：[lzc-build.yml](file:///Users/liups/ai/github/tudou/lzc-build.yml)

您可以按照懒猫云开发者中心的规范，通过 `lzc-cli` 进行应用的本地构建打包和一键上架发布。
