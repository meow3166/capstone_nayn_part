// models/supportModel.js
const pool = require('../common/db');
const DB = process.env.SVR_DB_NAME || process.env.DB_NAME || 'myapp_db';

/* ===== 공지 ===== */
exports.getNotices = async ({ limit = 100, keyword = '', offset = 0 } = {}) => {
  let sql = `SELECT notice_id, title, category, is_pinned, view_count,
            IFNULL(publish_at, created_at) AS published_at
       FROM \`${DB}\`.notices
      WHERE status='PUBLISHED'
        AND deleted_at IS NULL`;
  
  const params = [];
  
  if (keyword) {
    sql += ` AND (title LIKE ? OR content_md LIKE ?)`;
    const likeKeyword = `%${keyword}%`;
    params.push(likeKeyword, likeKeyword);
  }
  
  sql += ` ORDER BY is_pinned DESC, published_at DESC, created_at DESC LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));
  
  const [rows] = await pool.query(sql, params);
  return rows;
};

exports.getNoticesCount = async ({ keyword = '' } = {}) => {
  let sql = `SELECT COUNT(*) as total
       FROM \`${DB}\`.notices
      WHERE status='PUBLISHED'
        AND deleted_at IS NULL`;
  
  const params = [];
  
  if (keyword) {
    sql += ` AND (title LIKE ? OR content_md LIKE ?)`;
    const likeKeyword = `%${keyword}%`;
    params.push(likeKeyword, likeKeyword);
  }
  
  const [[row]] = await pool.query(sql, params);
  return row ? row.total : 0;
};

exports.getNoticeById = async (id) => {
  const [[row]] = await pool.query(
    `SELECT notice_id, title, content_md, category, view_count,
            IFNULL(publish_at, created_at) AS published_at
       FROM \`${DB}\`.notices
      WHERE notice_id=?
        AND status='PUBLISHED'
        AND deleted_at IS NULL`,
    [id]
  );
  return row || null;
};

exports.bumpNoticeView = async (id) => {
  await pool.query(`UPDATE \`${DB}\`.notices SET view_count=view_count+1 WHERE notice_id=?`, [id]);
};

/* ===== FAQ ===== */
exports.getFaqs = async () => {
  const [rows] = await pool.query(
    `SELECT id, question, answer FROM \`${DB}\`.faqs ORDER BY id DESC`
  );
  return rows;
};

/* ===== 문의 ===== */
exports.insertInquiry = async ({ name, email, category, title, message }) => {
  const [r] = await pool.query(
    `INSERT INTO \`${DB}\`.inquiries (name,email,category,title,message)
     VALUES (?,?,?,?,?)`,
    [name, email, category, title, message]
  );
  return r.insertId;
};

exports.getInquiries = async () => {
  const [rows] = await pool.query(
    `SELECT id,name,email,category,title,message,status,created_at
       FROM \`${DB}\`.inquiries
      ORDER BY created_at DESC`
  );
  return rows;
};
