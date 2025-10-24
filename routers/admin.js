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
    if (!home_team_id || !away_team_id) return res.status(400).send('팀 선택 누락');
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
        const pos = (req.body[`${prefix}_position_${i}`] || '').trim();
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

/* ------------------------------
   ✅ 1) 게임 저장 (POST /api/game)
   - 같은 날짜면 덮어쓰기
   - 다른 날짜면 새로 추가
-------------------------------- */
// 예: routes/admin.js (또는 해당 라우터 파일)
// 예: routers/public.js
// router.post('/api/game', async (req, res) => {
//   try {
//     const { gameDate, payload } = req.body;
//     if (!gameDate || !payload) {
//       return res.status(400).json({ error: 'gameDate, payload는 필수입니다.' });
//     }

//     const sql = `
//       INSERT INTO game_page (game_date, payload)
//       VALUES (DATE(?), ?)
//       ON DUPLICATE KEY UPDATE
//         game_date = DATE(VALUES(game_date)),
//         payload   = VALUES(payload),
//         updated_at = CURRENT_TIMESTAMP,
//         game_id  = LAST_INSERT_ID(game_id)
//     `;

//     const params = [gameDate, JSON.stringify(payload)];

//     console.log('[UPSERT SQL 실행]', params);

//     // 🚀 중요: execute() 사용
//     const [result] = await pool.execute(sql, params);

//     console.log('[UPSERT 결과]', result);

//     return res.json({ id: result.insertId });
//   } catch (err) {
//     console.error('[POST /api/game] error:', err);
//     return res.status(500).json({ error: err.sqlMessage || String(err) });
//   }
// });





/* ------------------------------
   ✅ 2) 특정 게임 수정 (PUT /api/game/:id)
-------------------------------- */
router.put('/api/game/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { payload } = req.body;
    if (!payload) return res.status(400).json({ error: 'payload가 필요합니다.' });

    const sql = `
      UPDATE game_page
      SET payload = ?, updated_at = CURRENT_TIMESTAMP
      WHERE game_id = ?
    `;
    const [result] = await db.execute(sql, [JSON.stringify(payload), id]);

    if (result.affectedRows === 0) return res.status(404).json({ error: '해당 id 없음' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[PUT /api/game/:id] 오류:', err);
    res.status(500).json({ error: err.sqlMessage || 'DB 오류' });
  }
});

/* ------------------------------
   ✅ 3) 특정 게임 불러오기 (GET /api/game/:id)
-------------------------------- */
router.get('/api/game/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute('SELECT * FROM game_page WHERE game_id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: '데이터 없음' });

    const row = rows[0];
    // payload가 JSON이므로 파싱해주면 프런트에서 바로 사용 가능
    if (typeof row.payload === 'string') {
      try { row.payload = JSON.parse(row.payload); } catch { }
    }

    res.json(row);
  } catch (err) {
    console.error('[GET /api/game/:id] 오류:', err);
    res.status(500).json({ error: err.sqlMessage || 'DB 오류' });
  }
});

module.exports = router;


