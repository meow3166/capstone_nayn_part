// // 즉시 실행 함수로 전체 코드를 감싸서 전역 변수 충돌을 방지합니다.
// api 호출 횟수 제한 이슈로 실제 서비스 전까지 주석 처리
//         (function() {
//             // 1. DOM 요소 가져오기
//             const weatherInfo = document.getElementById('weather-info');

//             // 2. API 요청에 필요한 정보 설정
//             // 본인의 일반 인증키(Decoding)를 여기에 입력하세요.
//             const serviceKey = '94LfPg3YQdaC3z4N2JHWbA'; 
//             const nx = 89; // 대구의 X 격자 좌표
//             const ny = 90; // 대구의 Y 격자 좌표

//             // 3. API 요청을 위한 날짜 및 시간 계산
//             const now = new Date();
//             let year = now.getFullYear();
//             let month = now.getMonth() + 1;
//             let day = now.getDate();

//             // 월과 일이 한 자릿수일 경우 앞에 '0'을 붙여줍니다.
//             month = month < 10 ? '0' + month : month;
//             day = day < 10 ? '0' + day : day;

//             let baseDate = `${year}${month}${day}`; // 'YYYYMMDD' 형식

//             // 기상청 API는 특정 시간에 예보를 발표합니다 (2, 5, 8, 11, 14, 17, 20, 23시)
//             // 현재 시간에 맞춰 가장 가까운 과거 발표 시간을 base_time으로 설정해야 합니다.
//             const availableHours = [2, 5, 8, 11, 14, 17, 20, 23];
//             let currentHour = now.getHours();
//             let baseTime = '';

//             // 가장 최근의 예보 발표 시간을 찾습니다.
//             for (let i = availableHours.length - 1; i >= 0; i--) {
//                 if (currentHour >= availableHours[i]) {
//                     baseTime = availableHours[i] < 10 ? `0${availableHours[i]}00` : `${availableHours[i]}00`;
//                     break;
//                 }
//             }
//             // 만약 현재 시간이 새벽 2시 이전이라면, 어제 23시 예보를 사용해야 합니다.
//             if (baseTime === '') {
//                 now.setDate(now.getDate() - 1); // 날짜를 하루 전으로
//                 year = now.getFullYear();
//                 month = now.getMonth() + 1 < 10 ? '0' + (now.getMonth() + 1) : now.getMonth() + 1;
//                 day = now.getDate() < 10 ? '0' + now.getDate() : now.getDate();
//                 baseDate = `${year}${month}${day}`;
//                 baseTime = '2300'; // 어제 23시 예보
//             }

//             // 4. API URL 구성
//             const url = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=${serviceKey}&pageNo=1&numOfRows=100&dataType=JSON&base_date=${baseDate}&base_time=${baseTime}&nx=${nx}&ny=${ny}`;

//             // 5. API 호출 (fetch 사용)
//             fetch(url)
//                 .then(response => {
//                     // 응답이 성공적인지 확인
//                     if (!response.ok) {
//                         throw new Error(`HTTP error! status: ${response.status}`);
//                     }
//                     return response.json(); // 응답을 JSON 형태로 파싱
//                 })
//                 .then(data => {
//                     // 데이터 처리
//                     const items = data.response.body.items.item;
                    
//                     // 필요한 정보(기온, 강수확률 등)를 저장할 객체
//                     const weatherData = {};

//                     // API 응답에서 필요한 데이터만 추출
//                     items.forEach(item => {
//                         // 현재 시간과 가장 가까운 예보 시간의 데이터를 찾습니다.
//                         if (item.fcstTime === (currentHour < 10 ? `0${currentHour}00` : `${currentHour}00`)) {
//                              // TMP: 1시간 기온, POP: 강수확률, SKY: 하늘상태
//                             if (item.category === 'TMP' || item.category === 'POP' || item.category === 'SKY') {
//                                 weatherData[item.category] = item.fcstValue;
//                             }
//                         }
//                     });
                    
//                     // 하늘 상태 코드(SKY)를 텍스트로 변환
//                     let skyState = '';
//                     switch (weatherData.SKY) {
//                         case '1': skyState = '맑음'; break;
//                         case '3': skyState = '구름많음'; break;
//                         case '4': skyState = '흐림'; break;
//                         default: skyState = '정보없음';
//                     }

//                     // 6. HTML에 날씨 정보 표시
//                     const temperature = weatherData.TMP;
//                     const precipitation = weatherData.POP;
                    
//                     if (temperature && precipitation) {
//                         weatherInfo.innerText = `대구 삼성 라이온즈 파크 ${baseDate.substring(4,6)}월 ${baseDate.substring(6,8)}일 ${currentHour}시 날씨 : 기온 ${temperature}℃, 하늘 ${skyState}, 강수확률 ${precipitation}%`;
//                     } else {
//                         weatherInfo.innerText = '현재 시간의 예보 정보를 가져올 수 없습니다.';
//                     }
//                 })
//                 .catch(error => {
//                     // 에러 처리
//                     console.error('날씨 정보를 불러오는 데 실패했습니다:', error);
//                     weatherInfo.innerText = '날씨 정보를 불러오는 데 실패했습니다.';
//                 });
//         })();