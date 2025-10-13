const pool = require('../common/db');

exports.list = () => pool.query(`
  SELECT notice_id, title, category, is_pinned, view_count,
         IFNULL(publish_at, created_at) AS published_at
    FROM notices
   WHERE status='PUBLISHED'
     AND (publish_at IS NULL OR publish_at <= NOW())
     AND (expire_at IS NULL OR expire_at > NOW())
     AND deleted_at IS NULL
   ORDER BY is_pinned DESC, published_at DESC, created_at DESC
   LIMIT 100
`);

exports.findById = (id) => pool.query(
  `SELECT * FROM notices WHERE notice_id=? AND deleted_at IS NULL LIMIT 1`, [id]
);

exports.create = (dto) => pool.query(
  `INSERT INTO notices (title, category, content_md, status, is_pinned, publish_at)
   VALUES (?,?,?,?,?,?)`,
  [dto.title, dto.category, dto.content_md, dto.status, dto.is_pinned, dto.publish_at]
);

exports.update = (id, dto) => pool.query(
  `UPDATE notices SET title=?, category=?, content_md=?, status=?, is_pinned=?, publish_at=? WHERE notice_id=?`,
  [dto.title, dto.category, dto.content_md, dto.status, dto.is_pinned, dto.publish_at, id]
);
