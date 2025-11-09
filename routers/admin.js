// routers/admin.js
const express = require('express');
const router = express.Router();
const { requireLogin } = require('../common/middlewares');
const adminController = require('../controllers/adminController');

// 모든 관리자 라우트 보호
router.use(requireLogin);

/* ===== 관리자 메인 ===== */
router.get('/ping', adminController.ping);
router.get('/', adminController.showAdminIndex);

/* ===== 공지사항 관리 ===== */
router.get(['/announcements', '/announcements/list'], adminController.announcementList);
router.get('/announcements/form', adminController.announcementForm);
router.post('/announcements/new', adminController.announcementCreate);
router.get('/announcements/:id/edit', adminController.announcementEditForm);
router.post('/announcements/:id/update', adminController.announcementUpdate);
router.post('/announcements/:id/publish', adminController.announcementPublish);
router.post('/announcements/:id/draft', adminController.announcementDraft);
router.post('/announcements/:id/delete', adminController.announcementDelete);

/* ===== 라인업 관리 ===== */
router.get('/admin_game_player_lineup', adminController.showLineupManager);
router.post('/lineup/save', adminController.saveLineup);

/* ===== 경기 결과 관리 ===== */
router.get('/gameinfo_result_admin', adminController.showGameResultAdmin);
router.put('/api/game/:id', adminController.updateGame);
router.get('/api/game/:id', adminController.getGame);

module.exports = router;


