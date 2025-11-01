// controllers/pagesController.js

exports.showIndex = (req, res) => {
  res.render('index.html');
};

exports.showSupport = (req, res) => {
  res.render('support/support.html');
};
