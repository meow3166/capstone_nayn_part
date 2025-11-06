const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/FullCountAiController'); // 철자: Count


// console.log('controllers:', require('fs').readdirSync(require('path').join(__dirname,'..','controllers'))); // suppressed per request
// console.log('models:', require('fs').readdirSync(require('path').join(__dirname,'..','models'))); // suppressed
// console.log('services:', require('fs').readdirSync(require('path').join(__dirname,'..','services'))); // suppressed

// PHP: /kiwu_ai/getMessage  (index.php에서 AJAX 호출)
router.post('/message', ctrl.getMessage);


module.exports = router;

