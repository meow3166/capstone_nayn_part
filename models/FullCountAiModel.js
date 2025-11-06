const pool = require('../common/db');

// PHP: prompt(pkid, content, free), chat_log(pkid, content)
exports.getPrompt = async (P_pkid) => {
  const [rows] = await pool.query(
    `SELECT pkid, content, free FROM prompt WHERE pkid=? LIMIT 1`,
    [P_pkid]
  );
  return rows[0];
};

exports.getChatLog = async (P_pkid) => {
  const [rows] = await pool.query(
    `SELECT content FROM chat_log WHERE pkid=? LIMIT 1`,
    [P_pkid]
  );
  return rows[0];
};

exports.updateChatLog = async (P_pkid, P_content) => {
  const [ret] = await pool.query(
    `UPDATE chat_log SET content=? WHERE pkid=?`,
    [P_content, P_pkid]
  );
  return ret.affectedRows;
};


