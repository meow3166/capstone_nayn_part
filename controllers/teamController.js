// controllers/teamController.js
const teamModel = require('../models/teamModel');

/* ===== 뷰 ===== */
exports.showCoach  = (req, res) => res.render('teaminfo/teaminfo_coach.html');
exports.showHitter = (req, res) => res.render('teaminfo/teaminfo_hitter.html');
exports.showPitcher= (req, res) => res.render('teaminfo/teaminfo_pitcher.html');
exports.showMain   = (req, res) => res.render('teaminfo/teaminfo_main.html');

/* ===== 선수 상세 ===== */
exports.playerDetail = async (req, res, next) => {
  try {
    const playerId = req.query.player_id && Number(req.query.player_id);
    if (!playerId) return res.status(400).send('player_id가 필요합니다.');
    const p = await teamModel.getPlayerById(playerId);
    if (!p) return res.status(404).send(`선수를 찾을 수 없습니다. (player_id=${playerId})`);
    res.render('teaminfo/playerinfodetail.html', { p });
  } catch (e) { next(e); }
};
