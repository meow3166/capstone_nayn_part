// controllers/gameController.js
const pool = require('../common/db');
const gameModel = require('../models/gameModel');
const DB = process.env.SVR_DB_NAME || process.env.DB_NAME || 'myapp_db';

/* 서버 기동 시 테이블 보증 */
(async () => {
  await gameModel.ensureGamePage().catch(e => console.error('[ensure game_page]', e.message));
})();

/* ====== API ====== */
exports.getSchedules = async (req, res) => {
  try {
    const month = req.query.month; // YYYY-MM 형식
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        error: '월 정보가 필요합니다. (형식: YYYY-MM)'
      });
    }

    const schedules = await gameModel.getSchedules(month);
    // 클라이언트가 기대하는 형식으로 응답
    res.json({
      data: schedules,
      month: month
    });
  } catch (e) {
    console.error('[GET /api/schedules]', e);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};

/* ====== 뷰 ====== */
exports.showMatchList = (req, res) => res.render('gameinfo/game_match_list.html');
exports.showResult = (req, res) => res.render('gameinfo/gameinfo_result.html');
exports.showSchedule = (req, res) => res.render('gameinfo/schedule.html');

/* 라인업 보기 */
exports.showPlayerLineup = async (req, res) => {
  try {
    const gameId = Number(req.query.game_id || 0);
    const baseSQL = `
      SELECT g.game_id, g.game_date, g.game_time, g.venue,
             g.home_team_id, g.away_team_id, IFNULL(g.is_lineup_announced,0) AS is_lineup_announced,
             ht.team_name AS home_name, ht.team_logo AS home_logo, ht.color_primary AS home_color,
             at.team_name AS away_name, at.team_logo AS away_logo, at.color_primary AS away_color
        FROM \`${DB}\`.games g
        JOIN \`${DB}\`.teams ht ON ht.team_id = g.home_team_id
        JOIN \`${DB}\`.teams at ON at.team_id = g.away_team_id
    `;
    const [gameRows] = gameId
      ? await pool.query(baseSQL + ' WHERE g.game_id=?', [gameId])
      : await pool.query(baseSQL + ' ORDER BY g.game_date DESC, g.game_time DESC LIMIT 1');

    if (!gameRows.length)
      return res.render('gameinfo/game_player_lineup.html', { game: null, home: null, away: null, home_lineup: [], away_lineup: [], error: '경기 데이터가 없습니다.' });

    const g = gameRows[0];
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
    const isAnnounced = Number(g.is_lineup_announced) === 1 || (homeLineup.length && awayLineup.length);

    res.render('gameinfo/game_player_lineup.html', {
      game: g,
      home: { team_name: g.home_name, team_logo: g.home_logo },
      away: { team_name: g.away_name, team_logo: g.away_logo },
      home_lineup: homeLineup,
      away_lineup: awayLineup,
      error: null
    });
  } catch (e) {
    console.error('[GET /game_player_lineup]', e);
    res.status(500).send(`<pre>${e.sqlMessage || e.message}</pre>`);
  }
};

/* ====== API ====== */
exports.createOrUpdateGame = async (req, res) => {
  try {
    const body = req.body || {};
    const gameDate = body.gameDate;
    if (!gameDate) return res.status(400).json({ ok: false, error: 'gameDate는 필수입니다.' });

    const found = await gameModel.findByDate(gameDate);
    if (found) {
      await gameModel.update(found.game_id, body);
      res.json({ ok: true, id: found.game_id, mode: 'update' });
    } else {
      const id = await gameModel.insert(gameDate, body);
      res.json({ ok: true, id, mode: 'insert' });
    }
  } catch (e) {
    console.error('[POST /api/game]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
};

exports.updateGame = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'invalid id' });

    const row = await gameModel.findById(id);
    if (!row) return res.status(404).json({ ok: false, error: 'not_found' });

    const body = req.body || {};
    const incomingDate = body.gameDate || body.game_date || null;
    if (incomingDate && String(incomingDate).slice(0, 10) !== String(row.game_date).slice(0, 10))
      return res.status(409).json({ ok: false, error: 'date_mismatch' });

    await gameModel.update(id, body);
    res.json({ ok: true, updated: true });
  } catch (e) {
    console.error('[PUT /api/game/:id]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
};

exports.getLatestGame = async (req, res) => {
  try {
    const row = await gameModel.findLatest();
    if (!row) return res.status(404).json({ ok: false, error: 'not_found' });
    const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
    res.json({ ok: true, id: row.game_id, gameDate: row.game_date, ...payload });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};

exports.getGameById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'invalid id' });
    const row = await gameModel.findById(id);
    if (!row) return res.status(404).json({ ok: false, error: 'not_found' });
    const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
    res.json({ ok: true, id: row.game_id, gameDate: row.game_date, ...payload });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};

exports.getGameDate = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'invalid id' });
    const gameDate = await gameModel.getDateById(id);
    if (!gameDate) return res.status(404).json({ ok: false, error: 'not_found' });
    res.json({ ok: true, game_date: gameDate });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
exports.getGameByDate = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date)
      return res.status(400).json({ ok: false, error: '필수 입력 누락 (date)' });

    // 1) 날짜 문자열 정제 (괄호(…GMT+09:00) 제거 등)
    let cleanDate = date;
    if (typeof date === 'string' && date.includes('GMT')) {
      cleanDate = date.replace(/\(.*\)/, '').trim();
    }

    // 2) YYYY-MM-DD로 정규화
    const d = new Date(cleanDate);
    if (isNaN(d.getTime()))
      return res.status(400).json({ ok: false, error: '잘못된 날짜 형식' });

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const formatted = `${yyyy}-${mm}-${dd}`;
    // console.log('[DEBUG formattedDate]', formatted);

    // 3) DB 조회
  const game = await gameModel.getGameByDate(formatted);
    // console.log('[DEBUG game]', game);
    if (!game)
      return res.status(404).json({ ok: false, error: `해당 날짜(${formatted})의 경기가 없습니다.` });

    // ---------- 안전 포맷 유틸 ----------
    // 'YYYY-MM-DD' → 'YYYY년 M월 D일' (타임존 영향 없음)
    const toKoreanDate = (ymd) => {
      if (typeof ymd === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
        const [y, m, d] = ymd.split('-').map(Number);
        return `${y}년 ${m}월 ${d}일`;
      }
      const dt = new Date(ymd);
      return `${dt.getFullYear()}년 ${dt.getMonth() + 1}월 ${dt.getDate()}일`;
    };

    // 'HH:MM' | 'HH:MM:SS' | Date → 'HH:MM:SS'
    const toTimeHHMMSS = (val) => {
      if (!val) return '';
      if (typeof val === 'string') {
        if (/^\d{2}:\d{2}:\d{2}$/.test(val)) return val;
        if (/^\d{2}:\d{2}$/.test(val)) return `${val}:00`;
        return '';
      }
      if (val instanceof Date) {
        const hh = String(val.getHours()).padStart(2, '0');
        const mm = String(val.getMinutes()).padStart(2, '0');
        const ss = String(val.getSeconds()).padStart(2, '0');
        return `${hh}:${mm}:${ss}`;
      }
      return '';
    };
    // -----------------------------------


  const dateKr   = toKoreanDate(game.game_date);
  const timeFull = toTimeHHMMSS(game.game_time);
  // new model returns game_venue (COALESCE of home/away stadium); fall back to venue if present
  const venue    = game.game_venue || game.venue || '';
  const display  = `${dateKr}  ${timeFull} | ${venue}`;


    // 기본 로고(플레이스홀더) 경로 지정: 뷰 정적 디렉토리(/assets) 기준
    const placeholderLogo = '/assets/img/original_logo.png';
    if (!game.home_team_logo) game.home_team_logo = placeholderLogo;
    if (!game.away_team_logo) game.away_team_logo = placeholderLogo;

    res.json({ ok: true, display, game });
  } catch (e) {
    console.error('[GET /api/game-by-date]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
};
