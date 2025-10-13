// 모듈
const express = require('express');
const router = express.Router();
const pool = require('../common/db'); // 파일명 소문자

// ★ 환경변수 키는 대문자, 코드 상수명은 DB로 통일
const DB = process.env.SVR_DB_NAME || process.env.DB_NAME || 'myapp_db';

/* ===== 로그인 ===== */
router.get(
  ['/login', '/Login', '/login.html', '/Login.html', '/login/Login.html'],
  (req, res) => res.render('login/Login.html')
);

/* ===== 선수단 정보 ===== */
router.get(['/teaminfo_coach', '/teaminfo_coach.html'],   (req, res) => res.render('teaminfo/teaminfo_coach.html'));
router.get(['/teaminfo_hitter', '/teaminfo_hitter.html'], (req, res) => res.render('teaminfo/teaminfo_hitter.html'));
router.get(['/teaminfo_pitcher', '/teaminfo_pitcher.html'], (req, res) => res.render('teaminfo/teaminfo_pitcher.html'));

/* ===== 경기정보 ===== */
router.get(['/game_match_list', '/game_match_list.html'], (req, res) => res.render('gameinfo/game_match_list.html'));
router.get(['/gameinfo_result', '/gameinfo_result.html'], (req, res) => res.render('gameinfo/gameinfo_result.html'));
// ─────────────────────────────────────────────
// 테이블 보증: game_page (PK: game_id)
// ─────────────────────────────────────────────
pool.query(`
  CREATE TABLE IF NOT EXISTS \`${DB}\`.\`game_page\` (
    game_id    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    game_date  DATE NULL,
    payload    JSON NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
               ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (game_id),
    KEY idx_game_date (game_date),
    KEY idx_updated_at (updated_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`).catch(e => console.error('[ensure game_page]', e.sqlMessage || e.message));

/** 생성: POST /api/game  → { ok:true, id } */
router.post('/api/game', async (req, res) => {
  try {
    const payload  = req.body || {};
    const gameDate = payload.gameDate || null; // 'YYYY-MM-DD'
    const [r] = await pool.query(
      `INSERT INTO \`${DB}\`.game_page (game_date, payload) VALUES (?, ?)`,
      [gameDate, JSON.stringify(payload)]
    );
    res.json({ ok: true, id: r.insertId });
  } catch (e) {
    console.error('[POST /api/game]', e);
    res.status(500).json({ ok:false, error: e.sqlMessage || e.message });
  }
});

/** 수정: PUT /api/game/:id  (id = game_id) */
router.put('/api/game/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok:false, error:'invalid id' });

    const payload  = req.body || {};
    const gameDate = payload.gameDate || null;

    const [r] = await pool.query(
      `UPDATE \`${DB}\`.game_page SET game_date=?, payload=? WHERE game_id=?`,
      [gameDate, JSON.stringify(payload), id]
    );
    if (r.affectedRows === 0) return res.status(404).json({ ok:false, error:'not_found' });
    res.json({ ok:true, updated:true });
  } catch (e) {
    console.error('[PUT /api/game/:id]', e);
    res.status(500).json({ ok:false, error: e.sqlMessage || e.message });
  }
});
// 최신 한 건
router.get('/api/game/latest', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT game_id, game_date, payload
         FROM \`${DB}\`.game_page
        ORDER BY updated_at DESC, game_id DESC
        LIMIT 1`
    );
    if (!rows.length) return res.status(404).json({ ok:false, error:'not_found' });
    const row = rows[0];
    const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
    res.json({ ok:true, id: row.game_id, gameDate: row.game_date, ...payload });
  } catch (e) { next(e); }
});

// id로 조회
router.get('/api/game/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok:false, error:'invalid id' });
    const [rows] = await pool.query(
      `SELECT game_id, game_date, payload
         FROM \`${DB}\`.game_page
        WHERE game_id=? LIMIT 1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ ok:false, error:'not_found' });
    const row = rows[0];
    const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
    res.json({ ok:true, id: row.game_id, gameDate: row.game_date, ...payload });
  } catch (e) { next(e); }
});


/* ===== 라인업: 파일형 → 표준 경로 리다이렉트 ===== */
/** 과거 파일형 경로 → 표준 경로로 리다이렉트(유지하면 좋음) */
router.get(['/game_player_lineup.html'], (req, res) => {
  const q = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  res.redirect(301, '/game_player_lineup' + q);
});

/** 사용자 라인업 보기 (이미 있는 템플릿: views/gameinfo/game_player_lineup.html) */
router.get('/game_player_lineup', async (req, res) => {
  try {
    const gameId = Number(req.query.game_id || 0);

    const base = `
      SELECT g.game_id, g.game_date, g.game_time, g.venue,
             g.home_team_id, g.away_team_id, IFNULL(g.is_lineup_announced,0) AS is_lineup_announced,
             ht.team_name AS home_name, ht.team_logo AS home_logo, ht.color_primary AS home_color,
             at.team_name AS away_name, at.team_logo AS away_logo, at.color_primary AS away_color
        FROM \`${DB}\`.games g
        JOIN \`${DB}\`.teams ht ON ht.team_id = g.home_team_id
        JOIN \`${DB}\`.teams at ON at.team_id = g.away_team_id
    `;
    const [gameRows] = gameId
      ? await pool.query(base + ' WHERE g.game_id=?', [gameId])
      : await pool.query(base + ' ORDER BY g.game_date DESC, g.game_time DESC LIMIT 1');

    if (!gameRows.length) {
      return res.render('gameinfo/game_player_lineup.html', {
        game: null, home: null, away: null, home_lineup: [], away_lineup: [],
        error: '경기 데이터가 없습니다.'
      });
    }

    const g = gameRows[0];
    const d = new Date(g.game_date);
    const dateLabel = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
    const timeLabel = (t => typeof t === 'string' ? t.slice(0, 5)
      : `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`)(g.game_time);

    const lineupSQL = `
      SELECT l.order_num,
             CASE WHEN l.order_num=10 THEN 'P' ELSE CAST(l.order_num AS CHAR) END AS order_label,
             l.player_name, COALESCE(l.position_kr,'') AS position_kr
        FROM \`${DB}\`.lineups l
       WHERE l.game_id=? AND l.team_id=?
       ORDER BY l.order_num
    `;
    const [homeLineup] = await pool.query(lineupSQL, [g.game_id, g.home_team_id]);
    const [awayLineup] = await pool.query(lineupSQL, [g.game_id, g.away_team_id]);

    const isAnnounced = Number(g.is_lineup_announced) === 1 ||
                        (homeLineup.length > 0 && awayLineup.length > 0);

    res.render('gameinfo/game_player_lineup.html', {
      game: {
        game_id: g.game_id,
        game_date: dateLabel,
        game_time: timeLabel,
        venue: g.venue,
        is_lineup_announced: isAnnounced
      },
      home: { team_name: g.home_name, team_logo: g.home_logo, color_primary: g.home_color },
      away: { team_name: g.away_name, team_logo: g.away_logo, color_primary: g.away_color },
      home_lineup: homeLineup,
      away_lineup: awayLineup,
      error: null
    });
  } catch (e) {
    console.error('[GET /game_player_lineup]', e);
    res.status(500).send(`<pre>${e.sqlMessage || e.message || String(e)}</pre>`);
  }
});


/* ===== 야구 규칙 ===== */
router.get(['/rules_attack', '/rules_attack.html'], (req, res) => res.render('rules/rules_attack.html'));
router.get(['/rules', '/rules.html'],               (req, res) => res.render('rules/rules.html'));

/* ===== 위치 안내 ===== */
router.get(['/location_come', '/location_come.html'], (req, res) => res.render('location/location_come.html'));
router.get(['/location', '/location.html'],           (req, res) => res.render('location/location.html'));

/* ===== 고객지원 루트 ===== */
router.get(['/support', '/support.html'], (req, res) => res.render('support/support.html'));
// // FAQ 목록 API (support.js가 /faq로 호출)
router.get('/faq', async (req, res) => {
  try {
    const [rows] = await pool.query(
      // // 스키마명은 환경변수에서 받은 DB 사용
      `SELECT id, question, answer 
         FROM \`${DB}\`.faqs
        ORDER BY id DESC`
    );
    res.json(rows); // // support.js가 기대하는 JSON
  } catch (e) {
    console.error('[GET /faq]', e);
    res.status(500).json({ error: 'DB 오류' });
  }
});

/* ===== 과거 공지 목록 경로 → 동적 목록으로 리다이렉트 ===== */
router.get(
  ['/support/announcement_list', '/support/announcement_list.html'],
  (req, res) => {
    const q = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    res.redirect(301, '/announcements' + q);
  }
);

/* ===== 공지 목록 ===== */
router.get([
  '/announcements',
  '/support/announcements',
  '/announcement_list',
  '/announcement_list.html'
], async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
         notice_id, title, category, is_pinned, view_count,
         IFNULL(publish_at, created_at) AS published_at
       FROM \`${DB}\`.notices
       WHERE status='PUBLISHED'
         AND (publish_at IS NULL OR publish_at <= CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+09:00'))
         AND (expire_at  IS NULL OR expire_at  >  CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+09:00'))
         AND deleted_at IS NULL
       ORDER BY is_pinned DESC, published_at DESC, created_at DESC
       LIMIT 100`
    );

    res.render('support/announcement_list.html', {
      notices: rows,
      items: rows // 호환용(다른 include에서 items 참조 시)
    });
  } catch (e) { next(e); }
});

/* ===== 공지 상세 ===== */
router.get([
  '/announcements/:id',
  '/support/announcements/:id',
  '/announcement_detail',
  '/announcement_detail.html'
], async (req, res, next) => {
  try {
    const id = req.params.id || req.query.id;
    if (!id) return res.status(400).send('잘못된 요청');

    const [[item]] = await pool.query(
      `SELECT 
         notice_id, title, content_md, category, view_count,
         IFNULL(publish_at, created_at) AS published_at
       FROM \`${DB}\`.notices
       WHERE notice_id=?
         AND status='PUBLISHED'
         AND (publish_at IS NULL OR publish_at <= CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+09:00'))
         AND (expire_at  IS NULL OR expire_at  >  CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+09:00'))
         AND deleted_at IS NULL`,
      [id]
    );

    if (!item) return res.status(404).send('공지를 찾을 수 없습니다.');

    // 조회수 +1 (실패 무시)
    pool.query(`UPDATE \`${DB}\`.notices SET view_count=view_count+1 WHERE notice_id=?`, [id]).catch(()=>{});

    res.render('support/announcement_detail.html', {
      notice: item,
      item   : item // 호환용
    });
  } catch (e) { next(e); }
});

/* ===== 문의하기 페이지 ===== */
router.get(
  ['/inquiry', '/Inquiry_details', '/Inquiry_details.html', '/support/Inquiry_details.html'],
  (req, res) => res.render('support/Inquiry_details.html')
);
router.get(
  ['/inquiry/history', '/Inquiry_history', '/Inquiry_history.html', '/support/Inquiry_history.html'],
  (req, res) => res.render('support/Inquiry_history.html')
);

/* ===== 문의 API ===== */
router.post('/api/inquiries', async (req, res) => {
  try {
    const { name, email, category, messagetitle, message } = req.body || {};
    if (!name || !email || !category || !messagetitle || !message) {
      return res.status(400).json({ ok: false, error: '필수 입력 누락' });
    }
    const [r] = await pool.query(
      `INSERT INTO \`${DB}\`.inquiries (name,email,category,title,message) VALUES (?,?,?,?,?)`,
      [name.trim(), email.trim(), category.trim(), messagetitle.trim(), message.trim()]
    );
    res.json({ ok: true, id: r.insertId });
  } catch (e) {
    console.error('[POST /api/inquiries]', e);
    res.status(500).json({ ok: false, error: e.sqlMessage || e.message });
  }
});

router.get('/api/inquiries', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id,name,email,category,title,message,status,created_at
         FROM \`${DB}\`.inquiries
        ORDER BY created_at DESC`
    );
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.sqlMessage || e.message });
  }
});

/* ===== 루트 ===== */
router.get(['/', '/index', '/index.html'], (req, res) => res.render('index.html'));

module.exports = router;
