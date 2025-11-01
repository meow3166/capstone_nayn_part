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
//         console.log("[🚀 API 호출 시작] 'nph-dfs_shrt_grd' (단기) API를 호출합니다...");
        
//         const authKey = '94LfPg3YQdaC3z4N2JHWbA'; // 사용자의 인증키
//         const daeguLionsPark = { nx: 89, ny: 90 }; // 대구 삼성 라이온즈 파크 좌표

//         // ★★★ 1. 'nph-dfs_shrt_grd' (단기)용 시간 계산 (3시간 주기) ★★★
//         const getShortTermTime = () => {
//             const now = new Date();
//             // 단기예보는 3시간 간격 발표 (02, 05, 08, 11, 14, 17, 20, 23시)
//             const baseTimes = [2, 5, 8, 11, 14, 17, 20, 23];
//             let checkDate = new Date(now.getTime());
//             let baseHour = checkDate.getHours();
            
//             // 현재 시간(시)보다 작거나 같은 가장 가까운 과거 발표 시각을 찾음 (tmfc)
//             // findLast를 사용하여 현재 시각보다 작은 값 중 가장 큰 값을 찾습니다.
//             let tmfcHourNum = baseTimes.findLast(h => h <= baseHour);

//             if (tmfcHourNum === undefined) {
//                 // 현재 시간이 0시, 1시인 경우, 전날 23시를 사용
//                 tmfcHourNum = 23;
//                 checkDate.setDate(checkDate.getDate() - 1); // 날짜를 하루 전으로 변경
//             }
            
//             const tmfcYear = checkDate.getFullYear();
//             const tmfcMonth = String(checkDate.getMonth() + 1).padStart(2, '0');
//             const tmfcDay = String(checkDate.getDate()).padStart(2, '0');
//             const tmfcHour = String(tmfcHourNum).padStart(2, '0');
            
//             // tmfc는 분(Minute) 정보 없이 시(Hour)까지만 사용 (단기예보 요구사항)
//             const tmfc = `${tmfcYear}${tmfcMonth}${tmfcDay}${tmfcHour}`;
            
//             // 2. tmef (발효시간) 계산: 1시간 뒤 예보 시각을 요청 (단기예보 요구사항)
//             const tmefDate = new Date(new Date().getTime() + 1 * 60 * 60 * 1000); 
//             const tmefMonth = String(tmefDate.getMonth() + 1).padStart(2, '0');
//             const tmefDay = String(tmefDate.getDate()).padStart(2, '0');
//             const tmefHour = String(tmefDate.getHours()).padStart(2, '0');
//             const tmef = `${tmefDate.getFullYear()}${tmefMonth}${tmefDay}${tmefHour}`;

//             return { tmfc, tmef, displayMonth: tmefMonth, displayDay: tmefDay, displayHour: tmefHour };
//         };

//         const { tmfc, tmef, displayMonth, displayDay, displayHour } = getShortTermTime();
//         console.log(`[로그 1] 계산된 API 요청 시간: tmfc=${tmfc}, tmef=${tmef}`);

//         // 2. 단기예보용 변수 
//         // TMP(기온), SKY(하늘), PTY(강수형태), POP(강수확률)
//         const vars = ['TMP', 'SKY', 'PTY', 'POP']; 
//         const promises = vars.map(v => {
//             // 3. 단기예보 URL
//             const url = `https://apihub.kma.go.kr/api/typ01/cgi-bin/url/nph-dfs_shrt_grd?tmfc=${tmfc}&tmef=${tmef}&vars=${v}&nx=${daeguLionsPark.nx}&ny=${daeguLionsPark.ny}&authKey=${authKey}`;
//             return axios.get(url).then(response => response.data);
//         });

//         const results = await Promise.all(promises);
        
//         // 🚨 디버깅을 위해 TMP 응답 원본 로그 출력
//         console.log("[디버그] TMP (기온) API 응답 원본:");
//         console.log(results[0]); 
//         console.log("-----------------------------------------");

//         // 4. 파싱 로직 (CSV 또는 그리드 데이터의 첫 번째 유효 라인 추출 시도)
//         const parseValueForTime = (data, timeStr, varName) => {
//             const lines = data.split('\n').map(line => line.trim()).filter(line => line.includes(',')); 
            
//             if (!lines || lines.length === 0) {
//                 console.warn(`[파싱 경고] ${varName} 응답에 유효한 데이터 라인이 없습니다.`);
//                 return '-99.00';
//             }

//             // 1) tmef로 시작하는 (정상 CSV 응답) 라인을 찾습니다.
//             const targetLine = lines.find(line => line.startsWith(timeStr));
            
//             // 2) 만약 못 찾았으면, 첫 번째 유효 라인(lines[0])을 사용합니다.
//             const actualLine = targetLine || lines[0];

//             if (!actualLine) {
//                 console.warn(`[파싱 경고] ${varName} 응답에서 라인 찾기 실패. (tmef: ${timeStr})`);
//                 return '-99.00';
//             }
            
//             const parts = actualLine.split(',');
            
//             // 3) 데이터의 값이 세 번째(index 2) 필드에 있다고 가정하고 추출 (정상 CSV)
//             if (parts.length > 2 && parts[2].trim() !== '') {
//                 console.log(`[파싱 성공] ${varName} (${targetLine ? '정상' : 'Fallback'}) 라인 사용: "${actualLine.substring(0, 30)}..." -> 값: ${parts[2].trim()}`);
//                 return parts[2].trim();
//             }
            
//             // 4) 그리드 데이터 형태일 경우 (숫자 배열), nx=89, ny=90의 위치를 대략적으로 파싱 시도 (비추천)
//             // 이 로직은 단기예보 API의 공식 응답 형식이 아닙니다.
//             // 제공된 로그처럼 숫자 배열만 있는 경우, 첫 번째 유효한 숫자(그리드 배열의 첫 번째 값)를 임시로 사용합니다.
//             if (parts.length > 0 && !isNaN(parseFloat(parts[0].trim())) && parseFloat(parts[0].trim()) !== 0 && !targetLine) {
//                  // 이 부분은 'TMP'에서 -99.00이 아닌 다른 값을 얻기 위한 임시적인 시도입니다.
//                  // 그리드 데이터가 1차원 배열로 왔다고 가정하고 3번째 값을 임시 추출 시도
//                  if (parts.length > 2) {
//                      console.log(`[파싱 시도] ${varName} 그리드 데이터로 추정. 3번째 값 사용: ${parts[2].trim()}`);
//                      return parts[2].trim(); 
//                  }
//             }

//             console.warn(`[파싱 경고] ${varName} API가 예상된 값을 반환하지 않았습니다. 라인: "${actualLine.substring(0, 30)}..."`);
//             return '-99.00';
//         };

//         const temperatureRaw = parseValueForTime(results[0], tmef, 'TMP'); 
//         const skyCode = parseValueForTime(results[1], tmef, 'SKY'); 
//         const ptyCode = parseValueForTime(results[2], tmef, 'PTY'); 
//         const precipitationRaw = parseValueForTime(results[3], tmef, 'POP'); 

//         console.log(`[로그 4] 파싱된 ${displayHour}시 데이터: 기온=${temperatureRaw}, 하늘=${skyCode}, 강수형태=${ptyCode}, 강수확률=${precipitationRaw}`);

//         // 5. 값 변환 및 텍스트 생성 
//         const temperature = parseFloat(temperatureRaw) < -90 ? "정보 없음" : `${temperatureRaw}℃`;

//         let precipitationText;
//         const popNum = parseFloat(precipitationRaw);
//         if (popNum < 0) {
//             precipitationText = "정보 없음";
//         } else if (popNum === 0) {
//             precipitationText = "강수없음 (0%)";
//         } else {
//             precipitationText = `강수확률 ${popNum}%`;
//         }

//         // 하늘 상태 (PTY 코드는 사용하지 않고 SKY와 PTY 코드를 결합하여 최종 상태 결정)
//         const getSkyState = (sky, pty) => {
//             const ptyInt = parseInt(pty);
//             const skyInt = parseInt(sky);
            
//             if (ptyInt > 0) { // PTY 코드가 0이 아니면 강수/눈/비로 판단 (단기 예보 기준)
//                 if (ptyInt === 1) return '비';
//                 if (ptyInt === 2) return '비/눈';
//                 if (ptyInt === 3) return '눈';
//                 if (ptyInt === 4) return '소나기'; // 단기예보에는 소나기 코드 4가 포함됨
//                 return '강수';
//             }

//             if (skyInt === 1) return '맑음';
//             if (skyInt === 3) return '구름많음';
//             if (skyInt === 4) return '흐림';
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
