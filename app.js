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
const axios = require('axios');
const app = express();

// ---------------------------------------------------------------------
// 1) 공통 미들웨어
// ---------------------------------------------------------------------
// app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'change_this_secret', // //.env 권장
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax' }
}));
// 날씨 api 부분 - api 오류 이슈로 개발 중단
// 현재 : nph-dfs_vsrt_grd - 70분 지연 초단기예보 사용
// app.use(async (req, res, next) => {
//     const cacheDuration = 30 * 60 * 1000; // 30분 캐시

//     // 1. 캐시 확인
//     if (req.session.weatherInfo && req.session.weatherTimestamp) {
//         const age = Date.now() - req.session.weatherTimestamp;
//         if (age < cacheDuration) {
//             res.locals.weatherInfo = req.session.weatherInfo;
//             return next();
//         }
//     }

//     try {
//         console.log("\n-----------------------------------------");
//         console.log("[🚀 API 호출 시작] 'nph-dfs_vsrt_grd' (초단기) API를 호출합니다...");

//         const authKey = '94LfPg3YQdaC3z4N2JHWbA'; // 사용자의 인증키
//         const daeguLionsPark = { nx: 89, ny: 90 }; // 대구 삼성 라이온즈 파크 좌표

//         // ★★★ 1. 'nph-dfs_vsrt_grd' (초단기)용 시간 계산 (70분 전 기준) ★★★
//         const getUltraShortTermTime = () => {
//             // 안정성을 위해 70분 전 시간을 기준으로 계산
//             const availableDate = new Date(new Date().getTime() - 70 * 60 * 1000); 

//             // 1. tmfc (발표시간): 연월일시분
//             const tmfcYear = availableDate.getFullYear();
//             const tmfcMonth = String(availableDate.getMonth() + 1).padStart(2, '0');
//             const tmfcDay = String(availableDate.getDate()).padStart(2, '0');
//             const tmfcHour = String(availableDate.getHours()).padStart(2, '0');
            
//             // 10분 단위로 '내림' (e.g., 55분-70분= -15 -> 12시 40분대 -> ...1240)
//             const tmfcMinute = String(Math.floor(availableDate.getMinutes() / 10) * 10).padStart(2, '0');
            
//             // 2. tmef (발효시간): 연월일시 (현재 시간 + 1시간)
//             const tmefDate = new Date(new Date().getTime() + 1 * 60 * 60 * 1000); // 1시간 뒤
//             const tmefYear = tmefDate.getFullYear();
//             const tmefMonth = String(tmefDate.getMonth() + 1).padStart(2, '0');
//             const tmefDay = String(tmefDate.getDate()).padStart(2, '0');
//             const tmefHour = String(tmefDate.getHours()).padStart(2, '0');

//             return {
//                 tmfc: `${tmfcYear}${tmfcMonth}${tmfcDay}${tmfcHour}${tmfcMinute}`, // API 요청용 발표시각
//                 tmef: `${tmefYear}${tmefMonth}${tmefDay}${tmefHour}`, // API 요청용 1시간 뒤 시각
//                 displayMonth: tmefMonth, // 화면 표시용
//                 displayDay: tmefDay,     // 화면 표시용
//                 displayHour: tmefHour    // 화면 표시용
//             };
//         };


//         const { tmfc, tmef, displayMonth, displayDay, displayHour } = getUltraShortTermTime();
//         console.log(`[로그 1] 계산된 API 요청 시간: tmfc=${tmfc}, tmef=${tmef}`);
        
//         // 2. 초단기예보용 변수
//         // T1H(기온), SKY(하늘), PTY(강수형태), RN1(1시간 강수량)
//         const vars = ['T1H', 'SKY', 'PTY', 'RN1']; 
        
//         const promises = vars.map(v => {
//             // 3. 초단기예보 URL
//             const url = `https://apihub.kma.go.kr/api/typ01/cgi-bin/url/nph-dfs_vsrt_grd?tmfc=${tmfc}&tmef=${tmef}&vars=${v}&nx=${daeguLionsPark.nx}&ny=${daeguLionsPark.ny}&authKey=${authKey}`;
//             return axios.get(url).then(response => response.data);
//         });

//         const results = await Promise.all(promises);

//         // 4. 파싱 로직 (정확히 tmef 라인만 찾기)
//         const parseValueForTime = (data, timeStr) => {
//             const lines = data.split('\n').filter(line => line.includes(','));
//             if (!lines || lines.length === 0) {
//                 console.warn(`[파싱 경고] ${timeStr} 응답에 데이터 라인이 없습니다.`);
//                 return '-999';
//             }
//             // 이 API는 응답에 정확히 tmef 시간 하나만 줌
//             const targetLine = lines.find(line => line.startsWith(timeStr)); 
//             if (!targetLine) {
//                  console.warn(`[파싱 경고] 응답에서 timeStr=${timeStr}에 해당하는 라인을 찾지 못했습니다.`);
//                  return '-99.00';
//             }
//             const parts = targetLine.split(',');
//             if (parts.length > 2 && parts[2] !== undefined && parts[2].trim() !== '') {
//                 return parts[2].trim();
//             }
//             console.warn(`[파싱 경고] API가 유효한 값을 반환하지 않았습니다. 라인: "${targetLine}"`);
//             return '-99.00'; 
//         };

//         const temperatureRaw = parseValueForTime(results[0], tmef); // T1H
//         const skyCode = parseValueForTime(results[1], tmef);      // SKY
//         const ptyCode = parseValueForTime(results[2], tmef);      // PTY
//         const precipitationRaw = parseValueForTime(results[3], tmef); // RN1

//         console.log(`[로그 4] 파싱된 ${displayHour}시 데이터: 기온=${temperatureRaw}, 하늘=${skyCode}, 강수형태=${ptyCode}, 강수량=${precipitationRaw}`);

//         // 5. 값 변환
//         const temperature = parseFloat(temperatureRaw) < -90 ? "정보 없음" : `${temperatureRaw}℃`;

//         // RN1 (강수량) 텍스트 변환
//         let precipitationText;
//         const rn1Num = parseFloat(precipitationRaw);
//         if (rn1Num < 0) {
//             precipitationText = "정보 없음";
//         } else if (rn1Num === 0) {
//             precipitationText = "강수없음";
//         } else {
//             precipitationText = `${precipitationRaw}mm`;
//         }
        
//         // 하늘 상태 (초단기예보 PTY 코드는 0, 1, 2, 3, 5, 6, 7 사용)
//         const getSkyState = (sky, pty) => {
//             const ptyStr = String(parseInt(pty));
//             const skyStr = String(parseInt(sky));
//             if (parseFloat(pty) < 0 || parseFloat(sky) < 0) return "정보 없음";
//             if (ptyStr !== '0') {
//                 if (ptyStr === '1') return '비'; if (ptyStr === '2') return '비/눈';
//                 if (ptyStr === '3') return '눈'; if (ptyStr === '5') return '빗방울';
//                 if (ptyStr === '6') return '빗방울/눈날림'; if (ptyStr === '7') return '눈날림';
//                 return '강수';
//             }
//             if (skyStr === '1') return '맑음'; if (skyStr === '3') return '구름많음';
//             if (skyStr === '4') return '흐림';
//             return '정보 없음';
//         };
//         const skyState = getSkyState(skyCode, ptyCode);
        
//         // 6. 최종 텍스트
//         const weatherText = `대구 삼성 라이온즈 파크 ${displayMonth}월 ${displayDay}일 ${displayHour}시 예보 : 기온 ${temperature}, 하늘 ${skyState}, 강수 ${precipitationText}`;
//         console.log(`[✅ 최종 결과] 생성된 날씨 정보: ${weatherText}`);
        
//         req.session.weatherInfo = weatherText;
//         req.session.weatherTimestamp = Date.now();
//         res.locals.weatherInfo = weatherText;

//     } catch (error) {
//         console.error("날씨 정보 조회 실패:", error.message);
//         res.locals.weatherInfo = "날씨 정보를 불러올 수 없습니다.";
//     }
    
//     next();
// });
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
