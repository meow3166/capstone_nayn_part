// routers/public.js
const express = require('express');
const router = express.Router();

// Controllers
const authController = require('../controllers/authController');
const teamController = require('../controllers/teamController');
const gameController = require('../controllers/gameController');
const locationController = require('../controllers/locationController');
const supportController = require('../controllers/supportController');
const rulesController = require('../controllers/rulesController');

/* ==================== 페이지 라우트 ==================== */

// 메인
router.get(['/', '/index', '/index.html'], (req, res) => res.render('index.html'));

// 로그인
router.get(['/login', '/login.html', '/login/Login.html'], authController.showLogin);

// 선수단
router.get(['/teaminfo_main', '/teaminfo_main.html'], teamController.showMain);
router.get(['/teaminfo_coach', '/teaminfo_coach.html'], teamController.showCoach);
router.get(['/teaminfo_hitter', '/teaminfo_hitter.html'], teamController.showHitter);
router.get(['/teaminfo_pitcher', '/teaminfo_pitcher.html'], teamController.showPitcher);
router.get('/playerinfodetail', teamController.playerDetail);

// 경기정보
router.get(['/schedule', '/schedule.html'], gameController.showSchedule);
router.get(['/game_match_list', '/game_match_list.html'], gameController.showMatchList);
router.get(['/game_player_lineup', '/game_player_lineup.html'], gameController.showPlayerLineup);
router.get(['/gameinfo_result', '/gameinfo_result.html'], gameController.showResult);
router.get('/gameinfo_result/:id', gameController.showResult);

// 야구 규칙
router.get(['/rules', '/rules.html'], rulesController.showRules);
router.get(['/rules_attack', '/rules_attack.html'], rulesController.showAttack);

// 위치 안내
router.get(['/location', '/location.html'], locationController.showMap);
router.get(['/location_come', '/location_come.html'], locationController.showDirections);

// 고객지원
router.get(['/support', '/support.html'], supportController.showSupport);
router.get(['/announcements', '/announcement_list', '/announcement_list.html'], supportController.announcementList);
router.get(['/announcements/:id', '/announcement_detail', '/announcement_detail.html'], supportController.announcementDetail);
router.get(['/inquiry', '/Inquiry_details', '/Inquiry_details.html'], supportController.inquiryForm);
router.get(['/inquiry/history', '/Inquiry_history', '/Inquiry_history.html'], supportController.inquiryHistory);

// 구버전 URL 리다이렉트
router.get('/support/announcement_list', supportController.redirectToAnnouncements);
router.get('/support/announcements', (req, res) => res.redirect('/announcements'));
router.get('/support/announcements/:id', (req, res) => res.redirect(`/announcements/${req.params.id}`));

/* ==================== API 라우트 ==================== */

// 경기 API
router.post('/api/game', gameController.createOrUpdateGame);
router.put('/api/game/:id', gameController.updateGame);
router.get('/api/game/latest', gameController.getLatestGame);
router.get('/api/game/:id', gameController.getGameById);
router.get('/api/game/:id/date', gameController.getGameDate);
router.get('/api/game-by-date', gameController.getGameByDate);
router.get('/api/game-id-by-date', gameController.getGameIdByDate);
router.get('/api/schedules', gameController.getSchedules);

// 고객지원 API
router.get('/api/faq', supportController.faqList);
router.get('/faq', supportController.faqList); // 구버전 호환
router.post('/api/inquiries', supportController.inquiryCreate);
router.get('/api/inquiries', supportController.inquiryList);

// 위치 API
router.get('/api/poi', locationController.listPoi);
router.get('/api/places', locationController.listPoi);
router.get('/poi', locationController.listPoi); // 구버전 호환

module.exports = router;
