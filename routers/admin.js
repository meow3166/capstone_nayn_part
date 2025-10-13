// routers/admin.js
const express = require('express');
const router = express.Router();
const { requireLogin } = require('../common/middlewares');
const pool = require('../common/db');

// 접속 DB 명시(혼동 방지)
const DB = process.env.SVR_DB_NAME || process.env.DB_NAME || 'myapp_db';

// 모든 관리자 라우트 보호
router.use(requireLogin);

// 스모크
router.get('/ping', (req, res) => res.send('admin ok'));

// 관리자 메인
router.get('/', (req, res) => {
  // views/admin/admin_index.html 이 존재해야 함
  res.render('admin/admin_index.html', { me: req.session.user });
});

/* ========================
   공지사항 (notices)
   ======================== */

// 목록
router.get(['/announcements', '/announcements/list'], async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT notice_id, title, category, status, is_pinned,
             IFNULL(publish_at, created_at) AS published_at,
             view_count
        FROM \`${DB}\`.notices
       WHERE deleted_at IS NULL
       ORDER BY is_pinned DESC, published_at DESC, created_at DESC
       LIMIT 200
    `);
    // views/admin/admin_announcement_list.html 필요
    res.render('admin/admin_announcement_list.html', { rows });
  } catch (e) { next(e); }
});

// 작성폼
router.get('/announcements/form', (req, res) => {
  // views/admin/admin_announcement_form.html 필요
  res.render('admin/admin_announcement_form.html', {
    mode: 'create',
    item: { title: '', category: '일반', status: 'DRAFT', is_pinned: 0, publish_at: '', content_md: '' }
  });
});

// 등록
router.post('/announcements/new', async (req, res, next) => {
  try {
    const { title, category, content_md, status, is_pinned, publish_at } = req.body;
    const pinned = (is_pinned === '1' || is_pinned === 'on') ? 1 : 0;
    const pub = publish_at ? new Date(publish_at) : null;

    const [r] = await pool.query(
      `INSERT INTO \`${DB}\`.notices (title, category, content_md, status, is_pinned, publish_at)
       VALUES (?,?,?,?,?,?)`,
      [title, category || '일반', content_md || '', status || 'DRAFT', pinned, pub]
    );
    res.redirect(`/admin/announcements/${r.insertId}/edit`);
  } catch (e) { next(e); }
});

// 수정폼
router.get('/announcements/:id/edit', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [[item]] = await pool.query(
      `SELECT * FROM \`${DB}\`.notices WHERE notice_id=? AND deleted_at IS NULL`,
      [id]
    );
    if (!item) return res.status(404).send('공지 없음');
    res.render('admin/admin_announcement_form.html', { mode: 'edit', item });
  } catch (e) { next(e); }
});

// 수정 저장
router.post('/announcements/:id/update', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { title, category, content_md, status, is_pinned, publish_at } = req.body;
    const pinned = (is_pinned === '1' || is_pinned === 'on') ? 1 : 0;
    const pub = publish_at ? new Date(publish_at) : null;

    await pool.query(
      `UPDATE \`${DB}\`.notices
          SET title=?, category=?, content_md=?, status=?, is_pinned=?, publish_at=?
        WHERE notice_id=?`,
      [title, category || '일반', content_md || '', status || 'DRAFT', pinned, pub, id]
    );
    res.redirect('/admin/announcements');
  } catch (e) { next(e); }
});

// 발행/드래프트/삭제
router.post('/announcements/:id/publish', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await pool.query(
      `UPDATE \`${DB}\`.notices
          SET status='PUBLISHED', publish_at = IFNULL(publish_at, NOW())
        WHERE notice_id=?`,
      [id]
    );
    res.redirect('/admin/announcements');
  } catch (e) { next(e); }
});
router.post('/announcements/:id/draft', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await pool.query(`UPDATE \`${DB}\`.notices SET status='DRAFT' WHERE notice_id=?`, [id]);
    res.redirect('/admin/announcements');
  } catch (e) { next(e); }
});
router.post('/announcements/:id/delete', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await pool.query(`UPDATE \`${DB}\`.notices SET deleted_at=NOW() WHERE notice_id=?`, [id]);
    res.redirect('/admin/announcements');
  } catch (e) { next(e); }
});


/* ========================
   라인업 관리자 페이지
   ======================== */
router.get("/lineup/manager", requireLogin, async (req, res, next) => {
  try {
    const DB = process.env.SVR_DB_NAME || process.env.DB_NAME || "myapp_db";
    const [teams] = await pool.query(
      `SELECT team_id, team_name FROM \`${DB}\`.teams ORDER BY team_name`
    );
    res.render("admin/admin_game_player_lineup.html", { teams });
  } catch (e) {
    next(e);
  }
});

/* ========================
   라인업 저장 (폼 action과 일치)
   ======================== */



module.exports = router;


