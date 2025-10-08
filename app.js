// app.js (깨끗한 최종본)

// 1) 모듈 ---------------------------------------------------------
const express = require("express");
const nunjucks = require("nunjucks");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcrypt");
const pool = require("./DB"); // ./DB.js 에서 export한 pool.promise()

// 2) app 생성 -----------------------------------------------------
const app = express();

// 3) 미들웨어 -----------------------------------------------------
app.use(express.urlencoded({ extended: true })); // <form> POST 파싱
app.use(express.json());                         // JSON 파싱
app.use(session({
  secret: "change_this_secret",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true }
}));

// 4) 뷰 엔진/정적 파일 -------------------------------------------
app.set("view engine", "html");
const VIEWS_DIR = path.join(__dirname, "views");
app.set("views", VIEWS_DIR);

const env = nunjucks.configure(path.join(__dirname, 'views'), {
  autoescape: true,
  express: app,
  watch: true
});

// /assets/* 정적 리소스            
app.use("/assets", express.static(path.join(VIEWS_DIR, "assets")));



// 템플릿에서 로그인 유저 접근용(선택)
app.use((req, res, next) => {
  res.locals.me = req.session.user || null;
  next();
});


// 5) 라우트 -------------------------------------------------------
// 접근제어: 관리자 전용 페이지 보호
function requireLogin(req, res, next) {
  if (req.session?.user) return next();
  req.session.returnTo = req.originalUrl; // 로그인 후 돌아갈 경로 기억
  return res.send("<script>alert('관리자 전용 페이지입니다. 로그인 후 이용하세요.');location.href='/login';</script>");
}

// 세션 상태 확인(API) - 헤더 버튼 토글 등에 사용
app.get('/api/me', (req, res) => {
  const loggedIn = !!req.session?.user;
  res.json({ loggedIn, user: loggedIn ? req.session.user : null });
});

// 접근제어: 관리자 전용 페이지 보호
function requireLogin(req, res, next) {
  if (req.session?.user) return next();
  req.session.returnTo = req.originalUrl;
  return res.send("<script>alert('관리자 전용 페이지입니다. 로그인 후 이용하세요.');location.href='/login';</script>");
}

// 세션 상태 확인(API)
app.get('/api/me', (req, res) => {
  const loggedIn = !!req.session?.user;
  res.json({ loggedIn, user: loggedIn ? req.session.user : null });
});

// --------------------- 관리자 Router 시작 ---------------------
const admin = express.Router();
admin.use(requireLogin);

/** 관리자 허브 */
admin.get('/', requireLogin, (req, res) => {
  res.render('admin/admin_index.html', { me: req.session.user });
});

/** 공지 목록 페이지 (파일명 유지: views/admin/admin_announcement_list.html) */
admin.get(['/announcements/list', '/announcements'], async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT notice_id, title, category, status, is_pinned,
             IFNULL(publish_at, created_at) AS published_at,
             view_count
        FROM yuumi.notices
       WHERE deleted_at IS NULL
       ORDER BY is_pinned DESC, published_at DESC, created_at DESC
    `);
    res.render('admin/admin_announcement_list.html', { rows });
  } catch (e) { next(e); }
});

/** 공지 작성 폼 (파일명 유지: views/admin/admin_announcement_form.html) */
admin.get('/announcements/form', (req, res) => {
  res.render('admin/admin_announcement_form.html', {
    mode: 'create',
    item: { title: '', category: '일반', status: 'PUBLISHED', is_pinned: 0, publish_at: '', content_md: '' }
  });
});

/** 공지 등록 */
admin.post('/announcements/new', async (req, res, next) => {
  try {
    const { title, category, content_md, status, is_pinned, publish_at } = req.body;
    const pinned = (is_pinned === '1' || is_pinned === 'on') ? 1 : 0;
    const pub = publish_at ? new Date(publish_at) : null;

    const [r] = await pool.query(
      `INSERT INTO yuumi.notices (title, category, content_md, status, is_pinned, publish_at)
       VALUES (?,?,?,?,?,?)`,
      [title, category || '일반', content_md || '', status || 'DRAFT', pinned, pub]
    );
    res.redirect(`/admin/announcements/${r.insertId}/edit`);
  } catch (e) { next(e); }
});

/** 공지 수정 폼 (파일명 유지: views/admin/admin_announcement_form.html) */
admin.get('/announcements/:id/edit', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [[item]] = await pool.query(
      `SELECT * FROM yuumi.notices WHERE notice_id=? AND deleted_at IS NULL`, [id]
    );
    if (!item) return res.status(404).send('공지 없음');
    res.render('admin/admin_announcement_form.html', { mode: 'edit', item });
  } catch (e) { next(e); }
});

/** 공지 수정 저장 */
admin.post('/announcements/:id/update', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { title, category, content_md, status, is_pinned, publish_at } = req.body;
    const pinned = (is_pinned === '1' || is_pinned === 'on') ? 1 : 0;
    const pub = publish_at ? new Date(publish_at) : null;

    await pool.query(
      `UPDATE yuumi.notices
          SET title=?, category=?, content_md=?, status=?, is_pinned=?, publish_at=?
        WHERE notice_id=?`,
      [title, category || '일반', content_md || '', status || 'DRAFT', pinned, pub, id]
    );
    res.redirect('/admin/announcements/list');
  } catch (e) { next(e); }
});

/** 공지 발행/드래프트/삭제 */
admin.post('/announcements/:id/publish', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await pool.query(
      `UPDATE yuumi.notices
          SET status='PUBLISHED', publish_at = IFNULL(publish_at, NOW())
        WHERE notice_id=?`,
      [id]
    );
    res.redirect('/admin/announcements/list');
  } catch (e) { next(e); }
});

admin.post('/announcements/:id/draft', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await pool.query(`UPDATE yuumi.notices SET status='DRAFT' WHERE notice_id=?`, [id]);
    res.redirect('/admin/announcements/list');
  } catch (e) { next(e); }
});

admin.post('/announcements/:id/delete', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await pool.query(`UPDATE yuumi.notices SET deleted_at=NOW() WHERE notice_id=?`, [id]);
    res.redirect('/admin/announcements/list');
  } catch (e) { next(e); }
});

/** 라인업 등록/관리 페이지 (파일명 유지: views/admin/admin_game_player_lineup.html) */
admin.get('/lineup/manager', (req, res) => {
  res.render('admin/admin_game_player_lineup.html');
});

/** 라인업 저장 */
admin.post('/lineup/save', async (req, res) => {
  try {
    const { game_date, game_time, venue, home_team_id, away_team_id } = req.body;
    if (!game_date || !game_time || !venue) return res.status(400).send('경기정보 누락');
    if (!home_team_id || !away_team_id) return res.status(400).send('팀 선택 누락');
    if (home_team_id === away_team_id) return res.status(400).send('홈/원정이 같습니다');

    const [gameInsert] = await pool.query(`
      INSERT INTO yuumi.games (game_date, game_time, venue, home_team_id, away_team_id, is_lineup_announced)
      VALUES (?, ?, ?, ?, ?, 1)
    `, [game_date, game_time, venue, home_team_id, away_team_id]);

    const gameId = gameInsert.insertId;

    async function insertLineup(teamId, prefix) {
      for (let i = 1; i <= 10; i++) {
        const player = req.body[`${prefix}_player_name_${i}`];
        const pos = req.body[`${prefix}_position_${i}`];
        if (player && pos) {
          await pool.query(`
            INSERT INTO yuumi.lineups (game_id, team_id, order_num, player_name, position_kr)
            VALUES (?, ?, ?, ?, ?)
          `, [gameId, teamId, i, player, pos]);
        }
      }
    }
    await insertLineup(home_team_id, 'home');
    await insertLineup(away_team_id, 'away');

    res.redirect(`/game_player_lineup?game_id=${gameId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('라인업 등록 중 오류 발생');
  }
});

// Router 장착
app.use('/admin', admin);
// --------------------- 관리자 Router 끝 ---------------------


// 메인/기본
app.get("/", (req, res) => res.render("index.html"));
app.get(["/index", "/index.html"], (req, res) => res.redirect(301, "/"));

// 위치 페이지
app.get(["/location", "/location.html"], (req, res) => {
  res.render("location/location.html");
});

// 로그인 페이지 (파일 위치가 views/login/Login.html 인 경우)
app.get(["/login", "/Login", "/login.html", "/Login.html", "/login/Login.html"], (req, res) => {
  res.render("login/Login.html");
});

// support 페이지
app.get(["/support", "/support.html", "/support/index.html"], (req, res) => {
  res.render("support/support.html");
});
app.get("/faq", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, question, answer FROM faqs ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error("[/faq]", err);
    res.status(500).send("DB 오류 발생");
  }
});
// 문의하기 / 문의내역
app.get(
  ['/inquiry', '/Inquiry_details', '/Inquiry_details.html', '/support/Inquiry_details.html'],
  (req, res) => res.render('support/Inquiry_details.html')
);

app.get(
  ['/inquiry/history', '/Inquiry_history', '/Inquiry_history.html', '/support/Inquiry_history.html'],
  (req, res) => res.render('support/Inquiry_history.html')
);


// routes/inquiries.js
const router = express.Router();

// 🔹 문의 등록
app.post("/api/inquiries", async (req, res) => {
  try {
    const { name, email, category, messagetitle, message } = req.body;

    if (!name || !email || !category || !messagetitle || !message) {
      return res.status(400).json({ ok: false, error: "필수 입력값이 누락되었습니다." });
    }

    const sql = `
      INSERT INTO inquiries (name, email, category, title, message)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [r] = await pool.query(sql, [name.trim(), email.trim(), category.trim(), messagetitle.trim(), message.trim()]);
    res.json({ ok: true, id: r.insertId });
  } catch (err) {
    console.error("문의 등록 오류:", err);
    res.status(500).json({ ok: false, error: "서버 오류" });
  }
});

// 🔹 문의 목록
app.get("/api/inquiries", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, name, email, category, title, message, status, created_at
      FROM inquiries
      ORDER BY created_at DESC
    `);
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error("문의 목록 오류:", err);
    res.status(500).json({ ok: false, error: "서버 오류" });
  }
});

// 목록 라우트
app.get(
  [
    '/announcements',
    '/support/announcements',
    '/announcement_list', '/announcement_list.html',
    '/support/announcement_list', '/support/announcement_list.html'
  ],
  async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        `SELECT notice_id, title, category, is_pinned, view_count,
                IFNULL(publish_at, created_at) AS published_at
           FROM notices
          WHERE status='PUBLISHED'
            AND (publish_at IS NULL OR publish_at <= NOW())
            AND (expire_at IS NULL OR expire_at > NOW())
            AND deleted_at IS NULL
          ORDER BY is_pinned DESC, published_at DESC, created_at DESC
          LIMIT 100`
      );
      res.render('support/announcement_list.html', { items: rows });
    } catch (e) { next(e); }
  }
);


// (2) 공지 상세: REST형(:id)와 파일형을 모두 동일 템플릿으로 렌더
// 선택: 숫자만 허용하고 싶으면 이 param 훅을 함께 추가
// 기존 상세 라우트를 아래로 교체
app.get(
  [
    '/announcements/:id',
    '/support/announcements/:id',
    '/announcement_detail', '/announcement_detail.html',
    '/support/announcement_detail', '/support/announcement_detail.html'
  ],
  async (req, res, next) => {
    try {
      const id = req.params.id || req.query.id;
      if (!id) return res.status(400).send('잘못된 요청');

      const [[item]] = await pool.query(
        `SELECT notice_id, title, content_md, category, view_count,
                IFNULL(publish_at, created_at) AS published_at
           FROM notices
          WHERE notice_id=?
            AND status='PUBLISHED'
            AND (publish_at IS NULL OR publish_at <= NOW())
            AND (expire_at IS NULL OR expire_at > NOW())
            AND deleted_at IS NULL`,
        [id]
      );
      if (!item) return res.status(404).send('공지를 찾을 수 없습니다.');

      // 조회수 +1 (실패해도 진행)
      pool.query(`UPDATE notices SET view_count=view_count+1 WHERE notice_id=?`, [id]).catch(() => { });

      res.render('support/announcement_detail.html', { item });
    } catch (e) { next(e); }
  }
);



// 공지사항 관리자
env.addFilter('date', function (value, fmt = 'YYYY-MM-DD HH:mm') {
  if (!value) return '';

  // 1) Date로 파싱
  let d;
  if (value instanceof Date) {
    d = value;
  } else if (typeof value === 'string') {
    // 'YYYY-MM-DD HH:mm:ss' 형태 → ISO로 변환
    const s = value.includes('T') ? value : value.replace(' ', 'T');
    const t = Date.parse(s);
    if (Number.isNaN(t)) return value; // 파싱 실패 시 원문 반환
    d = new Date(t);
  } else if (typeof value === 'number') {
    d = new Date(value);
  } else {
    return '';
  }

  const pad = (n) => String(n).padStart(2, '0');
  const YYYY = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const DD = pad(d.getDate());
  const HH = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());

  // 2) 간단 토큰 치환
  return fmt
    .replace('YYYY', YYYY)
    .replace('MM', MM)
    .replace('DD', DD)
    .replace('HH', HH)
    .replace('mm', mm)
    .replace('ss', ss);
});
// 숫자 id 검증(선택)
app.param('id', (req, res, next, id) => {
  if (!/^\d+$/.test(id)) return res.status(404).send('Not Found');
  next();
});






// 리스트 
app.get(
  ['/game_match_list', '/game_match_list.html', '/gameinfo/game_match_list.html'],
  (req, res) => {
    res.render('gameinfo/game_match_list.html');
  }
);

// ✅ 경기 일정 API 리스트  (DB에서 가져오기)
app.get('/api/schedules', async (req, res) => {
  try {
    const { month } = req.query; // ex) 2025-09
    let sql = 'SELECT * FROM game_schedule';
    const params = [];

    if (month) {
      sql += ' WHERE DATE_FORMAT(game_date, "%Y-%m") = ?';
      params.push(month);
    }
    sql += ' ORDER BY game_date ASC, game_time ASC';

    const [rows] = await pool.query(sql, params);
    res.json({ data: rows });
  } catch (err) {
    console.error('[GET /api/schedules]', err);
    res.status(500).json({ error: 'DB 조회 오류' });
  }
});

// /gameinfo/game_player_lineup → 표준 경로로 리디렉트
app.get('/gameinfo/game_player_lineup', (req, res) => res.redirect(301, '/game_player_lineup'));

// 폼 데이터 파싱 (POST용) - 한 번만 선언되어 있으면 생략 가능
app.use(express.urlencoded({ extended: true }));

/** 과거/실수 경로 → 표준 경로로 리다이렉트 */
app.get('/gameinfo/game_player_lineup', (req, res) => {
  const q = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  res.redirect(301, '/game_player_lineup' + q);
});
app.get('/game_player_lineup.html', (req, res) => {
  const q = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  res.redirect(301, '/game_player_lineup' + q);
});

/** 사용자용 라인업 페이지 (표준 핸들러는 이거 하나만) */
app.get('/game_player_lineup', async (req, res) => {
  try {
    const gameId = Number(req.query.game_id || 0);

    // 1) 경기 + 팀 데이터 조회 (game_id 있으면 해당 경기, 없으면 최신 경기)
    const [gameRows] = gameId
      ? await pool.query(`
          SELECT g.*,
                 ht.team_name AS home_name, ht.team_logo AS home_logo, ht.color_primary AS home_color,
                 at.team_name AS away_name, at.team_logo AS away_logo, at.color_primary AS away_color
          FROM yuumi.games g
          JOIN yuumi.teams ht ON ht.team_id = g.home_team_id
          JOIN yuumi.teams at ON at.team_id = g.away_team_id
          WHERE g.game_id = ?`,
        [gameId]
      )
      : await pool.query(`
          SELECT g.*,
                 ht.team_name AS home_name, ht.team_logo AS home_logo, ht.color_primary AS home_color,
                 at.team_name AS away_name, at.team_logo AS away_logo, at.color_primary AS away_color
          FROM yuumi.games g
          JOIN yuumi.teams ht ON ht.team_id = g.home_team_id
          JOIN yuumi.teams at ON at.team_id = g.away_team_id
          ORDER BY g.game_date DESC, g.game_time DESC
          LIMIT 1
        `);

    if (!gameRows.length) return res.status(404).send('경기 데이터가 없습니다.');
    const game = gameRows[0];

    // 2) 날짜/시간 포맷
    const d = new Date(game.game_date);
    const formattedDate = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
    const formattedTime = typeof game.game_time === 'string'
      ? game.game_time.slice(0, 5)
      : `${String(game.game_time.getHours()).padStart(2, '0')}:${String(game.game_time.getMinutes()).padStart(2, '0')}`;

    // 3) 라인업
    const [homeLineup] = await pool.query(`
      SELECT l.order_num,
             CASE WHEN l.order_num = 10 THEN 'P' ELSE CAST(l.order_num AS CHAR) END AS order_label,
             l.player_name, l.position_kr
      FROM yuumi.lineups l
      WHERE l.game_id = ? AND l.team_id = ?
      ORDER BY l.order_num`,
      [game.game_id, game.home_team_id]
    );

    const [awayLineup] = await pool.query(`
      SELECT l.order_num,
             CASE WHEN l.order_num = 10 THEN 'P' ELSE CAST(l.order_num AS CHAR) END AS order_label,
             l.player_name, l.position_kr
      FROM yuumi.lineups l
      WHERE l.game_id = ? AND l.team_id = ?
      ORDER BY l.order_num`,
      [game.game_id, game.away_team_id]
    );

    const isAnnounced =
      Number(game.is_lineup_announced) === 1 ||
      (homeLineup.length > 0 && awayLineup.length > 0);

    // 4) 렌더
    res.render('gameinfo/game_player_lineup.html', {
      game: {
        game_id: game.game_id,
        game_date: formattedDate,
        game_time: formattedTime,
        venue: game.venue,
        is_lineup_announced: isAnnounced
      },
      home: { team_name: game.home_name, team_logo: game.home_logo, color_primary: game.home_color },
      away: { team_name: game.away_name, team_logo: game.away_logo, color_primary: game.away_color },
      home_lineup: homeLineup,
      away_lineup: awayLineup
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('라인업 불러오기 중 오류 발생');
  }
});

/** 관리자 페이지 (라인업 등록) */
app.get(
  ['/admin/lineup/manager', '/admin/lineup/manager.html'],
  requireLogin,
  async (req, res) => {
    // (선택) 팀 목록을 DB에서 불러와 select에 채우고 싶다면 아래 사용
    // const [teams] = await pool.query('SELECT team_id, team_name FROM yuumi.teams ORDER BY team_name');
    // res.render('gameinfo/admin_game_player_lineup.html', { teams });
    res.render('admin/lineup_manager.html');
  }
);

/** 라인업 저장 처리 */
app.post('/admin/lineup/save', requireLogin, async (req, res) => {
  try {
    const { game_date, game_time, venue, home_team_id, away_team_id } = req.body;
    if (!game_date || !game_time || !venue) return res.status(400).send('경기정보 누락');
    if (!home_team_id || !away_team_id) return res.status(400).send('팀 선택 누락');
    if (home_team_id === away_team_id) return res.status(400).send('홈/원정이 같습니다');

    const [gameInsert] = await pool.query(`
      INSERT INTO yuumi.games (game_date, game_time, venue, home_team_id, away_team_id, is_lineup_announced)
      VALUES (?, ?, ?, ?, ?, 1)
    `, [game_date, game_time, venue, home_team_id, away_team_id]);

    const gameId = gameInsert.insertId;

    async function insertLineup(teamId, prefix) {
      for (let i = 1; i <= 10; i++) {
        const player = req.body[`${prefix}_player_name_${i}`];
        const pos = req.body[`${prefix}_position_${i}`];
        if (player && pos) {
          await pool.query(`
            INSERT INTO yuumi.lineups (game_id, team_id, order_num, player_name, position_kr)
            VALUES (?, ?, ?, ?, ?)
          `, [gameId, teamId, i, player, pos]);
        }
      }
    }
    await insertLineup(home_team_id, 'home');
    await insertLineup(away_team_id, 'away');

    // 표준 경로로 이동
    res.redirect(`/game_player_lineup?game_id=${gameId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('라인업 등록 중 오류 발생');
  }
});








// DB 테스트: poi 목록(JSON)
app.get("/poi", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM poi");
    res.json(rows);
  } catch (err) {
    console.error("[/poi]", err);
    res.status(500).send("DB 오류 발생");
  }
});

// 관리자 전체(검사용)
app.get("/admin_users", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM admin_users");
    res.json(rows);
  } catch (err) {
    console.error("[/admin_users]", err);
    res.status(500).send("DB 오류 발생");
  }
});

// 로그인: 성공 시 alert 후 메인으로 이동
app.post("/login", async (req, res) => {
  // ⚠️ 폼 input name은 username / password 여야 함!
  const { username, password } = req.body;
  if (!username || !password) {
    return res.send("<script>alert('아이디와 비밀번호를 입력하세요');history.back();</script>");
  }

  try {
    const [rows] = await pool.query(
      "SELECT admin_id, username, password, name FROM admin_users WHERE username=?",
      [username]
    );
    if (rows.length === 0) {
      return res.send("<script>alert('존재하지 않는 계정입니다');history.back();</script>");
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.send("<script>alert('비밀번호가 틀렸습니다');history.back();</script>");
    }

    // 로그인 성공 → 세션 저장
    req.session.user = { id: user.admin_id, username: user.username, name: user.name };

    // 알림 후 원래 페이지(없으면 /admin)로 이동
    const dest = req.session.returnTo || '/admin';
    delete req.session.returnTo;
    return res.send(`<script>alert('로그인 성공!');location.href='${dest}';</script>`);



  } catch (e) {
    console.error("[LOGIN]", e);
    return res.send("<script>alert('DB 오류 발생');history.back();</script>");
  }
});
// 과거 지원 경로 하위호환 (GET은 301, POST는 307)
app.get(['/support/admin/announcements', '/support/admin/announcements.html'], (req, res) => {
  const q = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  res.redirect(301, '/admin/announcements' + q);
});
app.get('/support/admin/announcements/new', (req, res) => res.redirect(301, '/admin/announcements/new'));
app.get('/support/admin/announcements/:id/edit', (req, res) => res.redirect(301, `/admin/announcements/${req.params.id}/edit`));
app.post('/support/admin/announcements/new',         (req, res) => res.redirect(307, '/admin/announcements/new'));
app.post('/support/admin/announcements/:id/update',  (req, res) => res.redirect(307, `/admin/announcements/${req.params.id}/update`));
app.post('/support/admin/announcements/:id/publish', (req, res) => res.redirect(307, `/admin/announcements/${req.params.id}/publish`));
app.post('/support/admin/announcements/:id/draft',   (req, res) => res.redirect(307, `/admin/announcements/${req.params.id}/draft`));
app.post('/support/admin/announcements/:id/delete',  (req, res) => res.redirect(307, `/admin/announcements/${req.params.id}/delete`));

app.get(['/game_player_lineup_manager', '/gameinfo/game_player_lineup_manager.html'], (req, res) => {
  const q = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  res.redirect(301, '/admin/lineup/manager' + q);
});
app.post('/gameinfo/lineup/save', (req, res) => res.redirect(307, '/admin/lineup/save'));


// 로그아웃
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('[LOGOUT]', err);
      return res.send("<script>alert('로그아웃 중 오류');history.back();</script>");
    }
    res.clearCookie('connect.sid');
    return res.send("<script>alert('로그아웃 되었습니다');location.href='/';</script>");
  });
});
// 6) 서버 시작 ---------------------------------------------------
// 헬스체크(선택) — 브라우저에서 http://localhost/ping 확인용
app.get('/ping', (req, res) => res.send('pong'));

// ★ 80포트로 고정
const PORT = 80;
const HOST = '0.0.0.0'; // 외부접속 필요 없으면 'localhost'도 OK

app.listen(PORT, HOST, () => {
  console.log(`✅ Server running at http://localhost`);
});

