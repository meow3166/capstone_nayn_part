// controllers/rulesController.js

exports.showAttack = (req, res) => {
  res.render('rules/rules_attack.html');
};

exports.showRules = (req, res) => {
  res.render('rules/rules.html');
};