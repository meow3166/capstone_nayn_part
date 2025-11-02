// controllers/weatherController.js
// exports.getWeather = async (req, res) => {
//     try {
//         const { lat, lon } = req.query;
        
//         if (!lat || !lon) {
//             return res.status(400).json({ 
//                 error: '위도(lat)와 경도(lon)가 필요합니다.' 
//             });
//         }

//         // 여기에 실제 날씨 API 호출 로직 구현
//         // 임시 더미 데이터 반환
//         const weatherData = {
//             temperature: 20,
//             description: '맑음',
//             humidity: 65
//         };

//         res.json(weatherData);
//     } catch (error) {
//         console.error('[GET /api/weather]', error);
//         res.status(500).json({ 
//             error: '날씨 정보를 가져오는데 실패했습니다.' 
//         });
//     }
// };