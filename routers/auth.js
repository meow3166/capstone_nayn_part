const express = require('express');
const router = express.Router();
const a = require('../controllers/authController');

router.get('/login', a.showLogin);
router.post('/login', a.login);
router.post('/logout', a.logout);

module.exports = router;
