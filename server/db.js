import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 跑团数据库保存在项目根目录下，命名为 paotuan.db，支持持久化自托管
const DB_PATH = path.resolve(__dirname, '../run_page/paotuan.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('无法连接 SQLite 数据库:', err.message);
  } else {
    console.log('成功连接 SQLite 数据库:', DB_PATH);
  }
});

// 初始化数据表
db.serialize(() => {
  // 1. 用户表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      openid_sub TEXT UNIQUE, -- OIDC 账户标识
      coros_account TEXT, -- 高驰手机号或账号 (加密后或明文)
      coros_password TEXT, -- 高驰密码 (MD5加密后的凭据)
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. 运动记录表 (由多用户活动数据汇总构成)
  db.run(`
    CREATE TABLE IF NOT EXISTS activities (
      run_id TEXT PRIMARY KEY, -- 高驰或外部唯一运动ID
      user_id INTEGER,
      name TEXT,
      type TEXT,
      distance REAL, -- 米
      moving_time TEXT, -- hh:mm:ss 或类似格式
      pace TEXT,
      average_heartrate REAL,
      total_elevation_gain REAL,
      start_date_local TEXT, -- 本地开始日期
      summary_polyline TEXT, -- 折线压缩轨迹
      sync_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // 3. EvoLab 生理大盘表
  db.run(`
    CREATE TABLE IF NOT EXISTS evolab_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      running_score REAL, -- 跑步能力得分
      fatigue_load REAL, -- 短期负荷
      fitness_load REAL, -- 长期负荷
      load_ratio INTEGER,
      recovery_percent INTEGER,
      recovery_advice TEXT,
      raw_json TEXT, -- 大盘快照 JSON 字符串，便于扩展
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // 4. 评论表
  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT,
      user_id INTEGER,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (run_id) REFERENCES activities (run_id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // 5. 点赞表
  db.run(`
    CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(run_id, user_id),
      FOREIGN KEY (run_id) REFERENCES activities (run_id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);
  
  console.log('SQLite 数据表初始化完毕');
});

// 封装 promise 接口，方便 async/await 异步调用
export const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

export const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export default db;
