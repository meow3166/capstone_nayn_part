// models/teamModel.js
const pool = require('../common/db');
const DB = process.env.SVR_DB_NAME || process.env.DB_NAME || 'myapp_db';

/* 선수 단건 조회: birthdate를 한글 포맷으로 가공하여 반환 */
exports.getPlayerById = async (playerId) => {
  const [rows] = await pool.query(
    `
    SELECT 
      pi.*,
      DATE_FORMAT(pi.birthdate, '%Y년 %c월 %e일') AS birthdate_kr
    FROM \`${DB}\`.player_info pi
    WHERE pi.player_id = ?
    LIMIT 1
    `,
    [playerId]
  );
  if (!rows.length) return null;
  const row = rows[0];
  const p = { ...row, birthdate: row.birthdate_kr };
  delete p.birthdate_kr;
  return p;
};
