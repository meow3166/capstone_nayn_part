const notices = require('../models/noticeModel');

exports.adminHome = (req, res) => {
  res.render('admin/admin_index.html', { me: req.session.user });
};

exports.noticeList = async (req, res) => {
  const [rows] = await notices.list();
  res.render('admin/admin_announcement_list.html', { rows });
};
