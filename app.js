// // app.js (정리본)
// require('dotenv').config();
// const path = require('path');
// const express = require('express');
// const session = require('express-session');
// const nunjucks = require('nunjucks');
// const morgan = require('morgan');

// const app = express();

// // ---------------------------------------------------------------------
// // 1) 공통 미들웨어
// // ---------------------------------------------------------------------
// app.use(morgan('dev'));
// app.use(express.urlencoded({ extended: true }));
// app.use(express.json());
// app.use(session({
//   secret: process.env.SESSION_SECRET || 'change_this_secret', // // 나중에 .env 에서 관리
//   resave: false,
//   saveUninitialized: false,
//   cookie: { httpOnly: true, sameSite: 'lax' }
// }));

// // ---------------------------------------------------------------------
// // 2) 뷰 엔진 / 정적파일 (여기서 env 생성!)
// // ---------------------------------------------------------------------
// app.set('view engine', 'html');
// const VIEWS_DIR = path.join(__dirname, 'views');

// // ✅ nunjucks 환경을 변수에 담아야 아래에서 env.addFilter 가능
// const env = nunjucks.configure(VIEWS_DIR, {
//   autoescape: true,
//   express: app,
//   watch: true
// });

// // 정적 리소스: /assets → views/assets
// app.use('/assets', express.static(path.join(VIEWS_DIR, 'assets')));

// // 템플릿 전역 로그인 유저
// app.use((req, res, next) => {
//   res.locals.me = req.session.user || null;
//   next();
// });

// // ---------------------------------------------------------------------
// // 3) nunjucks 커스텀 필터 (라우터 장착 전에 정의해도 OK)
// // ---------------------------------------------------------------------
// // 사용 예: {{ someDate | date('YYYY-MM-DD HH:mm') }}
// env.addFilter('date', function (value, fmt = 'YYYY-MM-DD HH:mm') {
//   if (!value) return '';

//   let d;
//   if (value instanceof Date) d = value;
//   else if (typeof value === 'string') {
//     const s = value.includes('T') ? value : value.replace(' ', 'T');
//     const t = Date.parse(s);
//     if (Number.isNaN(t)) return value; // 파싱 실패 시 원문 그대로
//     d = new Date(t);
//   } else if (typeof value === 'number') {
//     d = new Date(value); // timestamp(ms)
//   } else {
//     return '';
//   }

//   const pad = (n) => String(n).padStart(2, '0');
//   const YYYY = d.getFullYear();
//   const MM = pad(d.getMonth() + 1);
//   const DD = pad(d.getDate());
//   const HH = pad(d.getHours());
//   const mm = pad(d.getMinutes());
//   const ss = pad(d.getSeconds());

//   return fmt
//     .replace('YYYY', YYYY)
//     .replace('MM', MM)
//     .replace('DD', DD)
//     .replace('HH', HH)
//     .replace('mm', mm)
//     .replace('ss', ss);
// });

// // ---------------------------------------------------------------------
// // 4) 라우터
// app.use((req, _res, next) => {
//   console.log('[REQ]', req.method, req.url);
//   next();
// });
// // ---------------------------------------------------------------------
// app.use('/', require('./routers/public'));
// app.use('/', require('./routers/auth'));
// app.use('/admin', require('./routers/admin'));


// // 헬스체크
// app.get('/ping', (req, res) => res.send('pong'));

// // ---------------------------------------------------------------------
// // 5) 서버 시작
// // ---------------------------------------------------------------------
// // ⚠️ Windows에서 80포트는 관리자 권한 필요할 수 있음. 문제면 3000으로 바꾸세요.
// const PORT = process.env.PORT ? Number(process.env.PORT) : 80;
// const HOST = '0.0.0.0';

// app.listen(PORT, HOST, () => {
//   console.log(`✅ Server running at http://localhost:${PORT}`);
// });


// app.js (최종본)

require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const nunjucks = require('nunjucks');
const morgan = require('morgan');

const app = express();

// ---------------------------------------------------------------------
// 1) 공통 미들웨어
// ---------------------------------------------------------------------
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'change_this_secret', // //.env 권장
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax' }
}));

// ---------------------------------------------------------------------
// 2) 뷰 엔진 / 정적파일
// ---------------------------------------------------------------------
app.set('view engine', 'html');
const VIEWS_DIR = path.join(__dirname, 'views');

// ✅ nunjucks 환경 생성(한 번만)
const env = nunjucks.configure(VIEWS_DIR, {
  autoescape: true,
  express: app,
  watch: true
});

// 정적 리소스: /assets → views/assets
app.use('/assets', express.static(path.join(VIEWS_DIR, 'assets')));

// 템플릿 전역 로그인 유저
app.use((req, res, next) => {
  res.locals.me = req.session.user || null;
  next();
});

// ---------------------------------------------------------------------
// 3) nunjucks 커스텀 필터 (date)
//    사용 예: {{ someDate | date('YYYY-MM-DD HH:mm') }}
// ---------------------------------------------------------------------
env.addFilter('date', function (value, fmt = 'YYYY-MM-DD HH:mm') {
  if (!value) return '';

  let d;
  if (value instanceof Date) d = value;
  else if (typeof value === 'string') {
    const s = value.includes('T') ? value : value.replace(' ', 'T');
    const t = Date.parse(s);
    if (Number.isNaN(t)) return value; // 파싱 실패 시 원문 그대로
    d = new Date(t);
  } else if (typeof value === 'number') d = new Date(value);
  else return '';

  const pad = (n) => String(n).padStart(2, '0');
  const YYYY = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const DD = pad(d.getDate());
  const HH = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());

  return fmt
    .replace('YYYY', YYYY)
    .replace('MM', MM)
    .replace('DD', DD)
    .replace('HH', HH)
    .replace('mm', mm)
    .replace('ss', ss);
});

// ---------------------------------------------------------------------
// 4) 라우터
// ---------------------------------------------------------------------
app.use('/', require('./routers/public'));   // // 사용자/공지 라우트
app.use('/', require('./routers/auth'));     // // 로그인/로그아웃 등(있다면)
app.use('/admin', require('./routers/admin'));// // 관리자(있다면)

// 헬스체크
app.get('/ping', (req, res) => res.send('pong'));

// ---------------------------------------------------------------------
// 5) 서버 시작
// ---------------------------------------------------------------------
// ⚠️ Windows에서 80포트는 관리자 권한 필요할 수 있어요. 문제면 PORT=3000 으로 실행.
const PORT = process.env.PORT ? Number(process.env.PORT) : 80;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
