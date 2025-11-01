// models/locationModel.js
const pool = require('../common/db');
const DB = process.env.SVR_DB_NAME || process.env.DB_NAME || 'myapp_db';

/**
 * POI 목록 조회
 * - columns 예시: poi_id, name, type, desc, lat, lng, image_url 등
 * - 선택 필터: type, q(이름/설명 키워드)
 */
exports.getPoiList = async ({ type, q } = {}) => {
  const where = [];
  const params = [];

  if (type) {
    where.push('type = ?');
    params.push(type);
  }
  if (q) {
    where.push('(name LIKE ? OR description LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }

  // 안전한 정렬 컬럼 선택: 테이블에 존재하는 후보 컬럼 중 하나를 사용
  const candidates = ['poi_id', 'id', 'created_at', 'updated_at'];
  const colsQuery = `
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME IN (${candidates.map(()=>'?').join(',')})
  `;
  const colsParams = [DB, 'poi', ...candidates];
  const [cols] = await pool.query(colsQuery, colsParams);
  const present = new Set((cols || []).map(c => c.COLUMN_NAME));
  const orderCol = candidates.find(c => present.has(c));

  const sql = `
    SELECT *
      FROM \`${DB}\`.poi
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ${orderCol ? 'ORDER BY ' + orderCol + ' DESC' : ''}
  `;

  const [rows] = await pool.query(sql, params);
  // Map DB columns to frontend-friendly keys expected by locatino.js:
  // { id, type, name, items, image, lat, lng, floor }
  return rows.map(r => ({
    // handle multiple possible column names to be robust against schema differences
    id: r.poi_id || r.id,
    type: r.type || r.category || '',
    name: r.name || r.title || '',
    items: r.description || r.desc || r.items || '',
    image: r.image_url || r.image || r.img || '',
    lat: r.lat || r.latitude || null,
    lng: r.lng || r.longitude || null,
    floor: r.floor || r.level || ''
  }));
};
