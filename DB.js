// DB.js
const mysql = require("mysql2");

const pool = mysql.createPool({
  host: "localhost",
  user: "yuumi",           // 또는 yuumi 계정
  password: "yuumi!@#$",
  database: "yuumi",      // ← poi가 실제로 들어있는 DB 이름으로!
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool.promise();

// 부팅 시 연결 체크(로그만 출력)
(async () => {
  try {
    const conn = await module.exports.getConnection();
    await conn.query("SELECT 1");
    console.log("[DB] 연결 OK");
    conn.release();
  } catch (e) {
    console.error("[DB] 연결 실패:", e.message);
  }
})();
