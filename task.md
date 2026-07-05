# 任务列表 (coros_paotuan)

- `[x]` Phase 1: 建立全栈后端骨架与 SQLite
    - `[x]` 安装后端依赖 (`express`, `sqlite3`, `cors`, `jsonwebtoken`, `node-cron`) 并声明 package.json 修改。
    - `[x]` 建立后端入口 `server/index.js` 与 `server/db.js` 初始化跑团数据库表（用户、运动记录、EvoLab 数据、评论点赞表）。
    - `[x]` 编写后端 RESTful API：OIDC 登录回调、个人大盘数据、跑团首页动态、点赞与评论接口。
- `[x]` Phase 2: 定时同步机制集成
    - `[x]` 修改 Python `coros_sync.py`，支持接收 `ACCOUNT`、`PASSWORD`、`USER_ID` 参数运行，并将抓取的数据写回 SQLite 数据库而非单一本地 Mock 文件。
    - `[x]` 编写 Express 定时 Cron 服务，每日自动遍历激活的用户凭证并子进程触发 Python 抓取。
- `[x]` Phase 3: 懒猫 OIDC 对接
    - `[x]` 实现 `/api/auth/oidc/login` 与回调端点，对接懒猫云 OAuth 并颁发 JWT。
- `[x]` Phase 4: 海洋风格与跑团首页前端开发
    - `[x]` 引入深海蓝配色主题 CSS 系统。
    - `[x]` 开发跑团大厅首页：本月跑量龙虎榜、总仪表盘、跑团运动 Feed（含评论与点赞实时响应）。
- `[x]` Phase 5: Docker 容器化与懒猫 Manifest 部署
    - `[x]` 编写 `Dockerfile` 实现 Node 服务静态托管 Vite 产物与 Python 爬虫的一体化运行。
    - `[x]` 编写 `lzc-manifest.yml` 和 `lzc-build.yml`。
