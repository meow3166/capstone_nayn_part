const bcrypt = require('bcrypt');
const pool = require('../common/db');

exports.showLogin = (req, res) => {
  if (req.session?.user) return res.redirect('/admin');
  res.render('login/Login.html');
};

exports.login = async (req, res) => {
  const { username, password } = req.body;
  const [[user]] = await pool.query(
    'SELECT admin_id, username, password, name FROM admin_users WHERE username=? LIMIT 1',
    [username]
  );
  if (!user) return res.send("<script>alert('계정 없음');history.back();</script>");
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.send("<script>alert('비밀번호 오류');history.back();</script>");
  req.session.user = { id: user.admin_id, username: user.username, name: user.name };
  const dest = req.session.returnTo || '/admin';
  delete req.session.returnTo;
  res.send(`<script>alert('로그인 성공');location.href='${dest}';</script>`);
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.send("<script>alert('로그아웃');location.href='/';</script>");
  });
};
