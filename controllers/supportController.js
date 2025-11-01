// controllers/supportController.js
const supportModel = require('../models/supportModel');

/* ===== 기본 페이지 ===== */
exports.showSupport = (req, res) => res.render('support/support.html');

/* ===== 리다이렉트 ===== */
exports.redirectToAnnouncements = (req, res) => {
  const q = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  res.redirect(301, '/announcements' + q);
};

/* ===== 공지 ===== */
exports.announcementList = async (req, res, next) => {
  try {
    const rows = await supportModel.getNotices({ limit: 100 });
    res.render('support/announcement_list.html', { notices: rows, items: rows });
  } catch (e) { next(e); }
};

exports.announcementDetail = async (req, res, next) => {
  try {
    const id = req.params.id || req.query.id;
    if (!id) return res.status(400).send('잘못된 요청');
    const item = await supportModel.getNoticeById(id);
    if (!item) return res.status(404).send('공지를 찾을 수 없습니다.');
    supportModel.bumpNoticeView(id).catch(()=>{});
    res.render('support/announcement_detail.html', { notice: item, item });
  } catch (e) { next(e); }
};

/* ===== FAQ ===== */
exports.faqList = async (req, res) => {
  try {
    const rows = await supportModel.getFaqs();
    res.json(rows);
  } catch (e) {
    console.error('[GET /faq]', e);
    res.status(500).json({ error: e.sqlMessage || e.message });
  }
};

/* ===== 문의 ===== */
exports.inquiryForm = (req, res) => res.render('support/Inquiry_details.html');
exports.inquiryHistory = (req, res) => res.render('support/Inquiry_history.html');

exports.inquiryCreate = async (req, res) => {
  try {
    const { name, email, category, messagetitle, message } = req.body || {};
    if (!name || !email || !category || !messagetitle || !message) {
      return res.status(400).json({ ok:false, error:'필수 입력 누락' });
    }
    const id = await supportModel.insertInquiry({
      name: name.trim(),
      email: email.trim(),
      category: category.trim(),
      title: messagetitle.trim(),
      message: message.trim(),
    });
    res.json({ ok:true, id });
  } catch (e) {
    console.error('[POST /api/inquiries]', e);
    res.status(500).json({ ok:false, error: e.sqlMessage || e.message });
  }
};

exports.inquiryList = async (req, res) => {
  try {
    const rows = await supportModel.getInquiries();
    res.json({ ok:true, data: rows });
  } catch (e) {
    res.status(500).json({ ok:false, error: e.sqlMessage || e.message });
  }
};
