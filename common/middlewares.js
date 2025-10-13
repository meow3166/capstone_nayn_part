function requireLogin(req, res, next) {
  if (req.session?.user) return next();
  req.session.returnTo = req.originalUrl;
  return res.send("<script>alert('관리자 전용입니다. 로그인하세요.');location.href='/login';</script>");
}

// function notFound(req, res) {
//   res.status(404).render('errors/404.html', { url: req.originalUrl });
// }

// function errorHandler(err, req, res, next) {
//   console.error('[ERROR]', err);
//   res.status(500).render('errors/500.html', { message: err.message });
// }
// , notFound, errorHandler 
module.exports = { requireLogin};
