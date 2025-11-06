// 모듈
const express = require('express');
const router = express.Router();
const pool = require('../common/db'); // 파일명 소문자
const teamController = require('../controllers/teamController');
const gameController = require('../controllers/gameController');
const locationController = require('../controllers/locationController');
const supportController = require('../controllers/supportController');
const rulesController = require('../controllers/rulesController');
const authController = require('../controllers/authController');

// ★ 환경변수 키는 대문자, 코드 상수명은 DB로 통일
const DB = process.env.SVR_DB_NAME || process.env.DB_NAME || 'myapp_db';

/* ===== 로그인 ===== */
router.get(
  ['/login', '/Login', '/login.html', '/Login.html', '/login/Login.html'],
  authController.showLogin
);

// 선수단/선수
router.get(['/teaminfo_coach',  '/teaminfo_coach.html'],  teamController.showCoach);
router.get(['/teaminfo_hitter', '/teaminfo_hitter.html'], teamController.showHitter);
router.get(['/teaminfo_pitcher','/teaminfo_pitcher.html'],teamController.showPitcher);
router.get(['/teaminfo_main',   '/teaminfo_main.html'],   teamController.showMain);
router.get('/playerinfodetail', teamController.playerDetail);



/* ===== 경기정보 ===== */
router.get(['/game_match_list', '/game_match_list.html'], gameController.showMatchList);
router.get(['/gameinfo_result', '/gameinfo_result.html'], gameController.showResult);
router.get('/gameinfo_result/:id', gameController.showResult); // ID를 URL 경로로 받는 라우트 추가

/* ===== 경기 일정 API ===== */
router.get('/api/schedules', gameController.getSchedules);

/** 생성: POST /api/game  → { ok:true, id } */
// /api/game : 날짜가 같으면 덮어쓰기, 아니면 새로 추가 (2단계 방식)
router.post('/api/game', gameController.createOrUpdateGame);


/** 수정: PUT /api/game/:id  (id = game_id) */
// ✅ PUT: payload만 수정. 날짜(game_date)는 절대 변경하지 않음.
//    그리고 몸체에 gameDate가 들어와도, DB의 기존 날짜와 다르면 409로 거부.
router.put('/api/game/:id', gameController.updateGame);



// 최신 한 건
router.get('/api/game/latest', gameController.getLatestGame);

// id로 조회
router.get('/api/game/:id', gameController.getGameById);

/* 날짜 가져오기 */
router.get('/api/game/:id/date', gameController.getGameDate);




/* ===== 라인업: 파일형 → 표준 경로 리다이렉트 및 렌더 ===== */
router.get(['/game_player_lineup', '/game_player_lineup.html'], gameController.showPlayerLineup);
/* ===== 경기일정 ===== */
router.get(['/schedule', '/schedule.html'], gameController.showSchedule);
router.get(['/gameinfo/schedule', '/gameinfo/schedule.html'], gameController.showSchedule);


/* ===== 야구 규칙 ===== */
router.get(['/rules_attack', '/rules_attack.html'], rulesController.showAttack);
router.get(['/rules', '/rules.html'], rulesController.showRules);

/* ===== 위치 안내 ===== */
router.get(['/location_come', '/location_come.html'], locationController.showDirections);
router.get(['/location', '/location.html'], locationController.showMap);
router.get('/poi', locationController.listPoi);

/* ===== 고객지원 루트 ===== */
router.get(['/support', '/support.html'], supportController.showSupport);
router.get('/faq', supportController.faqList);

/* ===== 과거 공지 목록 경로 → 동적 목록으로 리다이렉트 ===== */
router.get(
  ['/support/announcement_list', '/support/announcement_list.html'],
  supportController.redirectToAnnouncements
);

/* ===== 공지 목록 ===== */
router.get([
  '/announcements',
  '/support/announcements',
  '/announcement_list',
  '/announcement_list.html'
], supportController.announcementList);

/* ===== 공지 상세 ===== */
router.get([
  '/announcements/:id',
  '/support/announcements/:id',
  '/announcement_detail',
  '/announcement_detail.html'
], supportController.announcementDetail);

/* ===== 문의하기 페이지 ===== */
router.get(
  ['/inquiry', '/Inquiry_details', '/Inquiry_details.html', '/support/Inquiry_details.html'],
  supportController.inquiryForm
);
router.get(
  ['/inquiry/history', '/Inquiry_history', '/Inquiry_history.html', '/support/Inquiry_history.html'],
  supportController.inquiryHistory
);

/* ===== 문의 API ===== */
router.post('/api/inquiries', supportController.inquiryCreate);
router.get('/api/inquiries', supportController.inquiryList);

// 여기서 부터 추가한거  
/* ===== 경기결과 API (날짜별 조회) ===== */
router.get('/api/game-by-date', gameController.getGameByDate);

// 경기 상세 API (ID별 조회) 추가
/* ===== 경기 상세 페이지 (gameId 기반 조회) ===== */

/* ===== 날짜로 game_id 조회 ===== */
router.get('/api/game-id-by-date', gameController.getGameIdByDate);


/* ===== 루트 ===== */
router.get(['/', '/index', '/index.html'], (req, res) => res.render('index.html'));

module.exports = router;
