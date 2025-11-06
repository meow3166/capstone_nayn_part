// services/FullCountAiService.js
const axios = require('axios');

const P_TOGETHER_URL = "https://api.together.xyz/v1/chat/completions"; // 정확한 엔드포인트
const P_MODEL = process.env.LLM_MODEL || 'deepseek-ai/DeepSeek-V3';
const P_API_KEY = process.env.TOGETHER_API_KEY; // .env에 넣기

/**
 * LLM 응답 요청
 * @param {Array} P_messages - 채팅 메시지 배열 [{role, content}, ...]
 * @param {number} P_temperature - 창의성 (기본 0)
 */
exports.getLlmResponse = async (P_messages, P_temperature = 0) => {
  try {
    const P_payload = {
      model: P_MODEL,
      messages: P_messages,
      temperature: Number(P_temperature) || 0,
      top_p: 0,
      max_tokens: 800,
      // Together(OpenAI 호환)에서 지원 시 JSON 전용 응답 강제
      response_format: { type: 'json_object' }
    };

    const P_resp = await axios.post(P_TOGETHER_URL, P_payload, {
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${P_API_KEY}`
      },
      timeout: 60000
    });

    return { code: 200, message: 'success', data: P_resp.data };
  } catch (e) {
    console.error('[getLlmResponse]', e.response?.status, e.response?.data || e.message);
    return { code: 500, message: 'LLM API Response Error: Code(1)', data: e.response?.data || null };
  }
};
