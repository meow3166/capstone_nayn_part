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
router.get('/admin_game_player_lineup', requireLogin, async (req, res, next) => {
  try {
    const [teams] = await pool.query(
      `SELECT team_id, team_name FROM \`${DB}\`.teams ORDER BY team_name`
    );
    // views/admin/admin_game_player_lineup.html 을 그대로 렌더
    res.render('admin/admin_game_player_lineup.html', { teams });
  } catch (e) { next(e); }
});

/** 라인업 저장 (폼 action은 /admin/lineup/save) */
router.post('/lineup/save', requireLogin, async (req, res) => {
  try {
    const { game_date, game_time, venue, home_team_id, away_team_id } = req.body || {};
    if (!game_date || !game_time || !venue) return res.status(400).send('경기정보 누락');
    if (!home_team_id || !away_team_id)     return res.status(400).send('팀 선택 누락');
    if (String(home_team_id) === String(away_team_id)) return res.status(400).send('홈/원정이 같습니다');

    // 1) 경기 생성
    const [r] = await pool.query(
      `INSERT INTO \`${DB}\`.games (game_date, game_time, venue, home_team_id, away_team_id, is_lineup_announced)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [game_date, game_time, venue, Number(home_team_id), Number(away_team_id)]
    );
    const gameId = r.insertId;

    // 2) 라인업 생성 (1~10: 10=P)
    async function insertLineup(teamId, prefix) {
      for (let i = 1; i <= 10; i++) {
        const name = (req.body[`${prefix}_player_name_${i}`] || '').trim();
        const pos  = (req.body[`${prefix}_position_${i}`]    || '').trim();
        if (name && pos) {
          await pool.query(
            `INSERT INTO \`${DB}\`.lineups (game_id, team_id, order_num, player_name, position_kr)
             VALUES (?, ?, ?, ?, ?)`,
            [gameId, Number(teamId), i, name, pos]
          );
        }
      }
    }
    await insertLineup(home_team_id, 'home');
    await insertLineup(away_team_id, 'away');

    // 저장 후 사용자 페이지로 이동
    res.redirect(`/game_player_lineup?game_id=${gameId}`);
  } catch (e) {
    console.error('[POST /admin/lineup/save]', e);
    res.status(500).send('라인업 등록 중 오류');
  }
});


/* ========================
   경기결과 관리자 페이지
   ======================== */
// 경기결과 입력 화면
router.get('/gameinfo_result_admin', requireLogin, (req, res) => {
  // 템플릿 경로: views/gameinfo/gameinfo_result_admin.html
  res.render('admin/gameinfo_result_admin.html');
});
module.exports = router;


