const fs = require('fs');
const vm = require('vm');
const path = require('path');

const base = path.resolve(__dirname, '..');
const targets = [
  'controllers/gameController.js',
  'models/gameModel.js',
  'routers/public.js',
  'controllers/teamController.js',
  'models/teamModel.js'
];

let ok = true;
for (const rel of targets) {
  const p = path.join(base, rel);
  try {
    const code = fs.readFileSync(p, 'utf8');
    new vm.Script(code, { filename: p });
    console.log('[PARSE OK]', rel);
  } catch (e) {
    ok = false;
    console.error('[PARSE ERROR]', rel, e && e.message);
  }
}
process.exit(ok ? 0 : 2);
