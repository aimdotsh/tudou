# ==================== Phase 1: Build Frontend ====================
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# ==================== Phase 2: Running Environment ====================
# 使用带 Python 的 Alpine 镜像，以一体化运行 Node.js 全栈后端与 Python 抓取脚本
FROM node:20-alpine
WORKDIR /app

# 安装 python3 及 sqlite 依赖环境
RUN apk add --no-cache python3 py3-pip sqlite-dev gcc g++ make musl-dev python3-dev

# 安装 Python 的 requests/http 抓取核心包 (按 coros_sync.py 的需要)
# 先拷贝并安装 requirements
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt --break-system-packages || pip3 install --no-cache-dir -r requirements.txt

# 拷贝后端 package 依赖
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install --prod --frozen-lockfile

# 拷贝主代码
COPY . .

# 拷贝前端打包产物至后端托管路径
COPY --from(frontend-builder) /app/dist ./dist

# 创建持久化数据库存储目录并暴露
RUN mkdir -p run_page && chmod 777 run_page
VOLUME ["/app/run_page"]

# 设置运行变量
ENV PORT=5000
ENV NODE_ENV=production

EXPOSE 5000

# 启动 Node.js 全栈服务端
CMD ["node", "server/index.js"]
