import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import { query, run, get } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'coros-paotuan-secret-key-13579';

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// 静态资源托管：同时静态托管前端 build 产物
const distPath = path.resolve(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// ----------------------------------------------------
// 🔑 鉴权中间件 (JWT Middleware)
// ----------------------------------------------------
const authenticateJWT = (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: '未登录，请先登录' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '登录会话过期或无效' });
    }
    req.user = user;
    next();
  });
};

// ----------------------------------------------------
// 🐈 懒猫云 OIDC 统一单点登录与鉴权
// ----------------------------------------------------
app.get('/api/auth/oidc/login', (req, res) => {
  // 从部署时环境变量获取授权端点
  const authUri = process.env.LAZYCAT_AUTH_OIDC_AUTH_URI || 'https://sys-oauth.heiyu.space/sys/oauth/auth';
  const clientId = process.env.LAZYCAT_AUTH_OIDC_CLIENT_ID || 'dummy-client-id';
  const boxDomain = process.env.LAZYCAT_BOXDOMAIN || req.get('host');
  const redirectUri = `https://${boxDomain}/api/auth/oidc/callback`;

  const loginUrl = `${authUri}?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid%20profile%20email`;
  res.redirect(loginUrl);
});

// OIDC 回调鉴权
app.get('/api/auth/oidc/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send('缺少授权 code 凭证');
  }

  try {
    const tokenUri = process.env.LAZYCAT_AUTH_OIDC_TOKEN_URI || 'https://sys-oauth.heiyu.space/sys/oauth/token';
    const clientId = process.env.LAZYCAT_AUTH_OIDC_CLIENT_ID || 'dummy-client-id';
    const clientSecret = process.env.LAZYCAT_AUTH_OIDC_CLIENT_SECRET || 'dummy-client-secret';
    const boxDomain = process.env.LAZYCAT_BOXDOMAIN || req.get('host');
    const redirectUri = `https://${boxDomain}/api/auth/oidc/callback`;

    // 1. 换取 Token
    const tokenRes = await fetch(tokenUri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret
      })
    });
    
    if (!tokenRes.ok) {
      throw new Error(`Token 请求失败: ${tokenRes.statusText}`);
    }
    const tokenData = await tokenRes.json();

    // 2. 获取用户信息
    const userInfoUri = process.env.LAZYCAT_AUTH_OIDC_USERINFO_URI || 'https://sys-oauth.heiyu.space/sys/oauth/userinfo';
    const userRes = await fetch(userInfoUri, {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });
    if (!userRes.ok) {
      throw new Error(`获取用户信息失败: ${userRes.statusText}`);
    }
    const userInfo = await userRes.json();

    const openidSub = userInfo.sub;
    const username = userInfo.name || userInfo.preferred_username || `跑友_${openidSub.slice(-4)}`;

    // 3. 检查或在数据库创建用户
    let user = await get('SELECT * FROM users WHERE openid_sub = ?', [openidSub]);
    if (!user) {
      const result = await run(
        'INSERT INTO users (username, openid_sub) VALUES (?, ?)',
        [username, openidSub]
      );
      user = { id: result.id, username, openid_sub: openidSub };
    }

    // 4. 签发系统 JWT 并存入 Cookie
    const sessionToken = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7天
    });

    // 登录成功重定向回前端主页
    res.redirect('/#/coros');
  } catch (err) {
    console.error('OIDC 鉴权发生异常:', err);
    res.status(500).send(`鉴权失败: ${err.message}`);
  }
});

// 开发或免密测试登录接口 (降级备用)
app.post('/api/auth/dev-login', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: '用户名不能为空' });

  try {
    let user = await get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      const result = await run('INSERT INTO users (username) VALUES (?)', [username]);
      user = { id: result.id, username };
    }
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 3600 * 1000 });
    res.json({ success: true, user: { id: user.id, username: user.username } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取当前用户信息
app.get('/api/auth/me', async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.json({ user: null });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await get('SELECT id, username, coros_account FROM users WHERE id = ?', [decoded.id]);
    res.json({ user });
  } catch {
    res.json({ user: null });
  }
});

// 退出登录
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

// ----------------------------------------------------
// ⚙️ 个人配置 API：配置或更新高驰凭证
// ----------------------------------------------------
app.post('/api/user/coros-config', authenticateJWT, async (req, res) => {
  const { coros_account, coros_password } = req.body;
  if (!coros_account || !coros_password) {
    return res.status(400).json({ error: '账号和密码不能为空' });
  }

  try {
    await run(
      'UPDATE users SET coros_account = ?, coros_password = ? WHERE id = ?',
      [coros_account, coros_password, req.user.id]
    );
    res.json({ success: true, message: '高驰凭证更新完毕，大盘将自动为您定时抓取数据！' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 📊 跑团大厅首页 API (Club Summary & Feed)
// ----------------------------------------------------
app.get('/api/club/summary', async (req, res) => {
  try {
    const totalDistRes = await get('SELECT SUM(distance) as total FROM activities');
    const totalCountRes = await get('SELECT COUNT(*) as total FROM activities');
    const activeUsersRes = await get('SELECT COUNT(*) as total FROM users WHERE coros_account IS NOT NULL');

    // 本月跑步龙虎榜 (按公里数降序)
    const leaderboard = await query(`
      SELECT u.id as user_id, u.username, SUM(a.distance) as total_distance, COUNT(a.run_id) as count
      FROM users u
      JOIN activities a ON u.id = a.user_id
      WHERE a.type = 'Run' OR a.type = 'Trail Run'
      GROUP BY u.id
      ORDER BY total_distance DESC
      LIMIT 10
    `);

    res.json({
      summary: {
        total_distance: ((totalDistRes?.total || 0) / 1000).toFixed(2),
        total_count: totalCountRes?.total || 0,
        active_members: activeUsersRes?.total || 0
      },
      leaderboard: leaderboard.map(item => ({
        ...item,
        total_distance: (item.total_distance / 1000).toFixed(2)
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 跑团动态广场 Feed 列表
app.get('/api/club/feed', async (req, res) => {
  const currentUserId = req.cookies.token ? jwt.verify(req.cookies.token, JWT_SECRET)?.id : null;
  
  try {
    const feed = await query(`
      SELECT a.*, u.username,
             (SELECT COUNT(*) FROM likes WHERE run_id = a.run_id) as like_count,
             (SELECT COUNT(*) FROM comments WHERE run_id = a.run_id) as comment_count
      FROM activities a
      JOIN users u ON a.user_id = u.id
      ORDER BY a.start_date_local DESC
      LIMIT 30
    `);

    // 补齐点赞详情与评论详情
    const enrichedFeed = await Promise.all(feed.map(async (act) => {
      const comments = await query(`
        SELECT c.*, u.username 
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.run_id = ?
        ORDER BY c.created_at ASC
      `, [act.run_id]);

      const isLiked = currentUserId ? (await get('SELECT 1 FROM likes WHERE run_id = ? AND user_id = ?', [act.run_id, currentUserId]) ? true : false) : false;

      return {
        ...act,
        distance: (act.distance / 1000).toFixed(2),
        is_liked: isLiked,
        comments
      };
    }));

    res.json({ feed: enrichedFeed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 💬 社交互动 API (点赞/评论)
// ----------------------------------------------------
app.post('/api/activity/like', authenticateJWT, async (req, res) => {
  const { run_id } = req.body;
  if (!run_id) return res.status(400).json({ error: '缺少 run_id' });

  try {
    const exist = await get('SELECT 1 FROM likes WHERE run_id = ? AND user_id = ?', [run_id, req.user.id]);
    if (exist) {
      await run('DELETE FROM likes WHERE run_id = ? AND user_id = ?', [run_id, req.user.id]);
      res.json({ liked: false });
    } else {
      await run('INSERT INTO likes (run_id, user_id) VALUES (?, ?)', [run_id, req.user.id]);
      res.json({ liked: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/activity/comment', authenticateJWT, async (req, res) => {
  const { run_id, content } = req.body;
  if (!run_id || !content) return res.status(400).json({ error: '缺少必要参数' });

  try {
    const result = await run(
      'INSERT INTO comments (run_id, user_id, content) VALUES (?, ?, ?)',
      [run_id, req.user.id, content]
    );
    res.json({
      success: true,
      comment: {
        id: result.id,
        run_id,
        user_id: req.user.id,
        username: req.user.username,
        content,
        created_at: new Date()
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 📈 成员专属大盘 API (对齐 coros.tsx 接口数据)
// ----------------------------------------------------
app.get('/api/user/:userId/dashboard', async (req, res) => {
  const { userId } = req.params;
  try {
    const evolab = await get('SELECT * FROM evolab_data WHERE user_id = ?', [userId]);
    const activities = await query('SELECT * FROM activities WHERE user_id = ? ORDER BY start_date_local DESC', [userId]);

    res.json({
      evolab: evolab ? JSON.parse(evolab.raw_json) : null,
      activities: activities.map(act => ({
        ...act,
        distance: act.distance // 保持以米为单位
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 🔄 数据手动同步触发接口
// ----------------------------------------------------
app.post('/api/user/sync', authenticateJWT, async (req, res) => {
  const user = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!user || !user.coros_account || !user.coros_password) {
    return res.status(400).json({ error: '请先在后台绑定高驰账号密码' });
  }

  // 异步触发 Python 脚本同步
  const scriptPath = path.resolve(__dirname, '../run_page/coros_sync.py');
  const cmd = `python3 "${scriptPath}" "${user.coros_account}" "${user.coros_password}" --user-id ${user.id}`;
  
  console.log(`开始为跑友 [${user.username}] 执行手动同步:`, cmd);
  exec(cmd, async (error, stdout, stderr) => {
    if (error) {
      console.error(`同步出错 [${user.username}]:`, error);
      return;
    }
    console.log(`同步完成 [${user.username}]:`, stdout);
  });

  res.json({ success: true, message: '云端同步请求已提交，后台大约需要 1-2 分钟抓取完毕，请稍后刷新！' });
});

// ----------------------------------------------------
// ⏰ Cron 定时任务：每天凌晨 3:00 自动跑同步
// ----------------------------------------------------
cron.schedule('0 3 * * *', async () => {
  console.log('⏰ [Cron] 开始执行跑团全员运动数据定时同步...');
  try {
    const activeUsers = await query('SELECT * FROM users WHERE coros_account IS NOT NULL AND coros_password IS NOT NULL');
    const scriptPath = path.resolve(__dirname, '../run_page/coros_sync.py');
    
    for (const user of activeUsers) {
      const cmd = `python3 "${scriptPath}" "${user.coros_account}" "${user.coros_password}" --user-id ${user.id}`;
      exec(cmd, (error, stdout) => {
        if (error) console.error(`定时同步失败 [${user.username}]:`, error);
        else console.log(`定时同步成功 [${user.username}]`);
      });
    }
  } catch (err) {
    console.error('定时同步执行异常:', err);
  }
});

// 路由兜底，方便单页路由渲染
app.get('*', (req, res) => {
  if (fs.existsSync(path.join(distPath, 'index.html'))) {
    res.sendFile(path.join(distPath, 'index.html'));
  } else {
    res.send('COROS 跑团大厅服务运行中，请先进行打包编译！');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 COROS 跑团全栈后台服务启动成功，监听端口: ${PORT}`);
});
