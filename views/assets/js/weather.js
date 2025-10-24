// // HTML에 날씨 정보를 표시할 요소를 선택합니다.
// const weatherInfo = document.getElementById('weather-info');

// // 1. API 요청에 필요한 변수 설정
// const authKey = '94LfPg3YQdaC3z4N2JHWbA'; // 발급받은 인증키
// const daeguLionsPark = { nx: 89, ny: 90 }; // 대구 삼성 라이온즈 파크 격자 좌표

// // 2. 현재 날짜와 시간에 맞춰 API 요청 시간 계산
// const now = new Date();
// const year = now.getFullYear();
// const month = String(now.getMonth() + 1).padStart(2, '0');
// const day = String(now.getDate()).padStart(2, '0');
// const hours = String(now.getHours()).padStart(2, '0');

// const baseDate = `${year}${month}${day}`; // 요청할 날짜 (예: 20251016)
// const baseTime = `${hours}00`; // 요청할 시간 (예: 2300)

// // API 발표 시간에 맞춰 tmfc 값을 동적으로 설정
// // 기상청 API는 정해진 시간(2, 5, 8, 11, 14, 17, 20, 23시)에 예보를 발표합니다.
// // 현재 시간과 가장 가까운 과거의 발표 시간을 찾아야 합니다.
// const getTmfc = (currentHour) => {
//     const hour = parseInt(currentHour);
//     // 발표 시간 배열
//     const availableTimes = [2, 5, 8, 11, 14, 17, 20, 23];
//     let tmfcHour = availableTimes[availableTimes.length - 1]; // 기본값은 마지막 발표 시간

//     for (let i = availableTimes.length - 1; i >= 0; i--) {
//         if (hour >= availableTimes[i]) {
//             tmfcHour = availableTimes[i];
//             break;
//         }
//     }
//     // 만약 현재 시간이 새벽 2시 이전이라면, 어제 23시 발표 자료를 사용해야 함
//     if (hour < 2) {
//         const yesterday = new Date();
//         yesterday.setDate(now.getDate() - 1);
//         const yYear = yesterday.getFullYear();
//         const yMonth = String(yesterday.getMonth() + 1).padStart(2, '0');
//         const yDay = String(yesterday.getDate()).padStart(2, '0');
//         return `${yYear}${yMonth}${yDay}23`;
//     }

//     return `${baseDate}${String(tmfcHour).padStart(2, '0')}`;
// };

// const tmfc = getTmfc(hours);
// const tmef = `${baseDate}${hours}`; // 예보를 확인할 시간 (현재 시간)

// // 3. API 호출 함수
// async function getWeather() {
//     // 요청할 예보 변수들 (기온, 하늘상태, 강수형태, 강수확률)
//     const vars = ['TMP', 'SKY', 'PTY', 'POP'];
//     const promises = vars.map(v => {
//         const url = `https://apihub.kma.go.kr/api/typ01/cgi-bin/url/nph-dfs_shrt_grd?tmfc=${tmfc}&tmef=${tmef}&vars=${v}&nx=${daeguLionsPark.nx}&ny=${daeguLionsPark.ny}&authKey=${authKey}`;
//         return fetch(url).then(response => response.text());
//     });

//     try {
//         // 각 변수에 대한 API 호출을 동시에 실행하고 결과를 기다립니다.
//         const results = await Promise.all(promises);

//         // API 응답(텍스트)에서 필요한 데이터만 파싱합니다.
//         const temperature = results[0].split('\n')[4].split(',')[2].trim();
//         const skyCode = results[1].split('\n')[4].split(',')[2].trim();
//         const ptyCode = results[2].split('\n')[4].split(',')[2].trim();
//         const precipitation = results[3].split('\n')[4].split(',')[2].trim();

//         // 4. 파싱한 데이터를 사람이 읽기 좋은 형태로 변환
//         const getSkyState = (sky, pty) => {
//             if (pty !== '0') { // 강수형태가 '없음'이 아니면 강수 상태를 우선 표시
//                 if (pty === '1') return '비';
//                 if (pty === '2') return '비/눈';
//                 if (pty === '3') return '눈';
//                 if (pty === '4') return '소나기';
//             }
//             if (sky === '1') return '맑음';
//             if (sky === '3') return '구름많음';
//             if (sky === '4') return '흐림';
//             return '정보 없음';
//         };

//         const skyState = getSkyState(skyCode, ptyCode);

//         // 5. 최종 결과 문자열을 만들어 화면에 출력
//         weatherInfo.innerText = `대구 삼성 라이온즈 파크 ${month}월 ${day}일 ${hours}시 날씨 : 기온 ${temperature}℃, 하늘 ${skyState}, 강수확률 ${precipitation}%`;

//     } catch (error) {
//         console.error('날씨 정보를 가져오는 데 실패했습니다:', error);
//         weatherInfo.innerText = '날씨 정보를 불러올 수 없습니다.';
//     }
// }

// // 함수 실행
// getWeather();