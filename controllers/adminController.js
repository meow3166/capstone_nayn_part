// controllers/adminController.js
const pool = require('../common/db');
const DB = process.env.SVR_DB_NAME || process.env.DB_NAME || 'myapp_db';

/* ===== 관리자 메인 ===== */
exports.showAdminIndex = (req, res) => {
  res.render('admin/admin_index.html', { me: req.session.user });
};

exports.ping = (req, res) => {
  res.send('admin ok');
};

/* ===== 공지사항 관리 ===== */

// 공지사항 목록
exports.announcementList = async (req, res, next) => {
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
    res.render('admin/admin_announcement_list.html', { rows });
  } catch (e) { next(e); }
};

// 공지사항 작성 폼
exports.announcementForm = (req, res) => {
  res.render('admin/admin_announcement_form.html', {
    mode: 'create',
    item: { title: '', category: '일반', status: 'DRAFT', is_pinned: 0, publish_at: '', content_md: '' }
  });
};

// 공지사항 등록
exports.announcementCreate = async (req, res, next) => {
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
};

// 공지사항 수정 폼
exports.announcementEditForm = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [[item]] = await pool.query(
      `SELECT * FROM \`${DB}\`.notices WHERE notice_id=? AND deleted_at IS NULL`,
      [id]
    );
    if (!item) return res.status(404).send('공지 없음');
    res.render('admin/admin_announcement_form.html', { mode: 'edit', item });
  } catch (e) { next(e); }
};

// 공지사항 수정 저장
exports.announcementUpdate = async (req, res, next) => {
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
};

// 공지사항 발행
exports.announcementPublish = async (req, res, next) => {
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
};

// 공지사항 드래프트로 변경
exports.announcementDraft = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await pool.query(`UPDATE \`${DB}\`.notices SET status='DRAFT' WHERE notice_id=?`, [id]);
    res.redirect('/admin/announcements');
  } catch (e) { next(e); }
};

// 공지사항 삭제
exports.announcementDelete = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    
    if (!id || isNaN(id)) {
      return res.status(400).send('잘못된 ID입니다.');
    }
    
    const [result] = await pool.query(
      `DELETE FROM \`${DB}\`.notices WHERE notice_id=?`, 
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).send('공지를 찾을 수 없습니다.');
    }
    
    res.redirect('/admin/announcements');
  } catch (e) { 
    next(e); 
  }
};

/* ===== 라인업 관리 ===== */

// 라인업 관리 페이지
exports.showLineupManager = async (req, res, next) => {
  try {
    const [teams] = await pool.query(
      `SELECT team_code as team_id, team_name FROM \`${DB}\`.t_team_info ORDER BY team_name`
    );
    res.render('admin/admin_game_player_lineup.html', { teams });
  } catch (e) { next(e); }
};

// 라인업 저장
exports.saveLineup = async (req, res) => {
  try {
    const { game_date, game_time, venue, home_team_id, away_team_id } = req.body || {};
    if (!game_date || !game_time || !venue) return res.status(400).send('경기정보 누락');
    if (!home_team_id || !away_team_id) return res.status(400).send('팀 선택 누락');
    if (String(home_team_id) === String(away_team_id)) return res.status(400).send('홈/원정이 같습니다');

    // team_code를 숫자 ID로 변환 (games 테이블이 정수 타입이므로)
    const teamCodeToId = {
      'E': 1,      // 한화
      'LG': 2,     // LG
      'KIA': 3,    // KIA
      'SS': 4,     // 삼성
      'NC': 5,     // NC
      'KT': 6,     // KT
      'LT': 7,     // 롯데
      'OB': 8,     // 두산
      'HT': 9,     // 기아
      'WO': 10     // 키움
    };

    const homeTeamNumId = teamCodeToId[home_team_id] || 1;
    const awayTeamNumId = teamCodeToId[away_team_id] || 2;

    // 중복 경기 확인
    const [existingGames] = await pool.query(
      `SELECT game_id FROM \`${DB}\`.games 
       WHERE game_date = ? AND game_time = ? AND home_team_id = ? AND away_team_id = ?`,
      [game_date, game_time, homeTeamNumId, awayTeamNumId]
    );

    let gameId;
    if (existingGames.length > 0) {
      // 기존 경기가 있으면 해당 ID 사용
      gameId = existingGames[0].game_id;
      
      // 기존 라인업 삭제
      await pool.query(
        `DELETE FROM \`${DB}\`.lineups WHERE game_id = ?`,
        [gameId]
      );
    } else {
      // 1) 새 경기 생성 (숫자 ID 사용)
      const [r] = await pool.query(
        `INSERT INTO \`${DB}\`.games (game_date, game_time, venue, home_team_id, away_team_id, is_lineup_announced)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [game_date, game_time, venue, homeTeamNumId, awayTeamNumId]
      );
      gameId = r.insertId;
    }

    // 2) 라인업 생성 (1~10: 10=P) - 숫자 ID 사용
    async function insertLineup(teamCode, prefix) {
      const teamNumId = teamCodeToId[teamCode] || 1;
      for (let i = 1; i <= 10; i++) {
        const name = (req.body[`${prefix}_player_name_${i}`] || '').trim();
        const pos = (req.body[`${prefix}_position_${i}`] || '').trim();
        if (name && pos) {
          await pool.query(
            `INSERT INTO \`${DB}\`.lineups (game_id, team_id, order_num, player_name, position_kr)
             VALUES (?, ?, ?, ?, ?)`,
            [gameId, teamNumId, i, name, pos]
          );
        }
      }
    }
    await insertLineup(home_team_id, 'home');
    await insertLineup(away_team_id, 'away');

    res.redirect(`/game_player_lineup?game_id=${gameId}`);
  } catch (e) {
    console.error('[POST /admin/lineup/save]', e);
    res.status(500).send('라인업 등록 중 오류');
  }
};

/* ===== 경기 결과 관리 ===== */

// 경기 결과 입력 화면
exports.showGameResultAdmin = (req, res) => {
  res.render('admin/gameinfo_result_admin.html');
};

// 경기 수정 (PUT)
exports.updateGame = async (req, res) => {
  try {
    const { id } = req.params;
    const { payload } = req.body;
    if (!payload) return res.status(400).json({ error: 'payload가 필요합니다.' });

    const sql = `
      UPDATE game_page
      SET payload = ?, updated_at = CURRENT_TIMESTAMP
      WHERE game_id = ?
    `;
    const [result] = await pool.execute(sql, [JSON.stringify(payload), id]);

    if (result.affectedRows === 0) return res.status(404).json({ error: '해당 id 없음' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[PUT /api/game/:id] 오류:', err);
    res.status(500).json({ error: err.sqlMessage || 'DB 오류' });
  }
};

// 경기 조회 (GET)
exports.getGame = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute('SELECT * FROM game_page WHERE game_id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: '데이터 없음' });

    const row = rows[0];
    if (typeof row.payload === 'string') {
      try { row.payload = JSON.parse(row.payload); } catch { }
    }

    res.json(row);
  } catch (err) {
    console.error('[GET /api/game/:id] 오류:', err);
    res.status(500).json({ error: err.sqlMessage || 'DB 오류' });
  }
};
