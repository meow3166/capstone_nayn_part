const pool = require('../common/db');
const DB = process.env.SVR_DB_NAME || process.env.DB_NAME || 'myapp_db';

exports.getGameById = async (id) => {
    const [rows] = await pool.query(
        `SELECT game_id, game_date, payload
         FROM \`${DB}\`.game_page
         WHERE game_id=? LIMIT 1`,
        [id]
    );
    if (!rows.length) return null;
    return {
        ...rows[0],
        payload: typeof rows[0].payload === 'string' ? JSON.parse(rows[0].payload) : rows[0].payload
    };
};

exports.getGameByDate = async (date) => {
    const sql = `
        SELECT
            g.game_date,
            g.game_day,
            SUBSTRING(g.game_time, 1, 5) AS game_time,
            COALESCE(g.score_home, g.note) AS score_home,
            COALESCE(g.score_away, g.note) AS score_away,
            g.result,

            COALESCE(th.home_stadium, ta.home_stadium) AS game_venue,

            -- DB 기록 유무에 따른 game_status (간단 구현)
            CASE
                WHEN g.result IS NOT NULL THEN 1
                ELSE 2
            END AS game_status,

            -- 투수 정보: 필드가 없으므로 임시 문자열 반환
            '투수 정보' AS win_pitcher,
            '투수 정보' AS lose_pitcher,
            '투수 정보' AS save_pitcher,

            g.team_home AS home_team_name_in_list,
            g.team_away AS away_team_name_in_list,

            th.team_name AS home_team_name,
            ta.team_name AS away_team_name,
            th.logo_path AS home_team_logo,
            ta.logo_path AS away_team_logo,
            th.season_record AS home_team_record,
            ta.season_record AS away_team_record
        FROM \`${DB}\`.game_schedule_list g
        LEFT JOIN \`${DB}\`.t_team_info th ON g.team_home = th.short_name
        LEFT JOIN \`${DB}\`.t_team_info ta ON g.team_away = ta.short_name
        WHERE g.game_date = ?
        LIMIT 1
    `;

    const [rows] = await pool.query(sql, [date]);
    return rows[0] || null;
};

exports.getLineup = async (gameId, teamId) => {
    const sql = `
        SELECT l.order_num,
               CASE WHEN l.order_num=10 THEN 'P' ELSE CAST(l.order_num AS CHAR) END AS order_label,
               l.player_name, COALESCE(l.position_kr,'') AS position_kr
          FROM \`${DB}\`.lineups l
         WHERE l.game_id=? AND l.team_id=?
         ORDER BY l.order_num
    `;
    return pool.query(sql, [gameId, teamId]);
};

// 캘린더 - 검색용 키워드 추가 - 개발 완료 시 지울 예정
exports.getSchedules = async (month) => {
    const sql = `
        SELECT 
            id as game_id,
            game_date,
            game_day,
            game_time,
            team_home,
            team_away,
            COALESCE(score_home, note) AS score_home,
            COALESCE(score_away, note) AS score_away,
            tv_channel,
            stadium,
            note,
            result,
            review_url,
            CASE
                WHEN result IN ('win', 'lose', 'draw') THEN 1
                ELSE 0
            END as is_finished
        FROM \`${DB}\`.game_schedule_list
        WHERE DATE_FORMAT(game_date, '%Y-%m') = ?
        ORDER BY game_date ASC, game_time ASC
    `;
    const [rows] = await pool.query(sql, [month]);
    return rows;
};

exports.getLineup = async (gameId, teamId) => {
    const sql = `
        SELECT l.order_num,
               CASE WHEN l.order_num=10 THEN 'P' ELSE CAST(l.order_num AS CHAR) END AS order_label,
               l.player_name, COALESCE(l.position_kr,'') AS position_kr
          FROM \`${DB}\`.lineups l
         WHERE l.game_id=? AND l.team_id=?
         ORDER BY l.order_num
    `;
    return pool.query(sql, [gameId, teamId]);
};

/* ===== game_page 관련 유틸 (admin에서 사용하는 JSON 블롭 저장소) ===== */
exports.ensureGamePage = async () => {
    return pool.query(`
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
    `);
};

exports.findByDate = async (gameDate) => {
    const [rows] = await pool.query(
        `SELECT game_id, game_date, payload FROM \`${DB}\`.game_page WHERE game_date = DATE(?) LIMIT 1`,
        [gameDate]
    );
    return rows[0] || null;
};

exports.insert = async (gameDate, payload) => {
    const jsonBlob = JSON.stringify(payload);
    const [r] = await pool.execute(
        `INSERT INTO \`${DB}\`.game_page (game_date, payload) VALUES (DATE(?), ?)`,
        [gameDate, jsonBlob]
    );
    return r.insertId;
};

exports.update = async (id, payload) => {
    const jsonBlob = JSON.stringify(payload);
    const [r] = await pool.execute(
        `UPDATE \`${DB}\`.game_page SET payload = ?, updated_at = CURRENT_TIMESTAMP WHERE game_id = ?`,
        [jsonBlob, id]
    );
    return r.affectedRows > 0;
};

exports.findLatest = async () => {
    const [rows] = await pool.query(
        `SELECT game_id, game_date, payload FROM \`${DB}\`.game_page ORDER BY updated_at DESC, game_id DESC LIMIT 1`
    );
    return rows[0] || null;
};

exports.findById = async (id) => {
    const [rows] = await pool.query(
        `SELECT game_id, game_date, payload FROM \`${DB}\`.game_page WHERE game_id = ? LIMIT 1`,
        [id]
    );
    return rows[0] || null;
};

exports.getDateById = async (id) => {
    const [rows] = await pool.execute(
        `SELECT DATE_FORMAT(game_date, '%Y-%m-%d') AS game_date FROM \`${DB}\`.game_page WHERE game_id = ? LIMIT 1`,
        [id]
    );
    return rows.length ? rows[0].game_date : null;
};

exports.findScheduleByDate = async (date) => {
    const [rows] = await pool.query(
        `SELECT g.* FROM \`${DB}\`.game_schedule_list g WHERE g.game_date = ? LIMIT 1`,
        [date]
    );
    return rows[0] || null;
};
