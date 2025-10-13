// common/db.js (최종본)  // ← 파일명/폴더명은 너가 쓴 소문자 기준
require('dotenv').config();
const mysql = require('mysql2/promise');

// // 로컬/서버 DB 설정은 .env 에서 가져옴
const localCfg = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'myapp_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

const serverCfg = {
  host: process.env.SVR_DB_HOST,
  port: Number(process.env.SVR_DB_PORT || 3306),
  user: process.env.SVR_DB_USER,
  password: process.env.SVR_DB_PASS,
  database: process.env.SVR_DB_NAME || 'myapp_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// // APP_DB_TARGET=server 면 서버 DB, 아니면 로컬
const target = (process.env.APP_DB_TARGET || 'local').toLowerCase();
const cfg = target === 'server' ? serverCfg : localCfg;

// // promise 기반 풀 생성
const pool = mysql.createPool(cfg);

// // 선택: 부팅 로그
pool
  .query('SELECT DATABASE() AS db, @@hostname AS host, @@port AS port')
  .then(([rows]) => {
    const r = rows[0];
    console.log(`[DB] 연결 성공 → target=${target}, host=${cfg.host}, db=${r.db}`);
  })
  .catch((e) => {
    console.error('[DB] 연결 실패', e.message);
  });

// // ✅ 이걸 그대로 export 하면 require('../common/db') 가
// // 바로 pool 객체를 받고, pool.query(...) 사용 가능
module.exports = pool;





