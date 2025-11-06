const P_model = require('../models/FullCountAiModel');
const P_ai = require('../services/FullCountAiService');


function P_sendResponse(res, code, message, data = null) {
  res.status(code === 200 ? 200 : 500).json({ code, message, data });
}

// PHP의 remove_text()와 동일 역할: ```json ~ ``` 껍데기 제거
function P_extractJson(text) {
  if (!text) return null;
  const m = text.match(/```json([\s\S]*?)```/i) || text.match(/```([\s\S]*?)```/i);
  const raw = m ? m[1] : text;
  try {
    return JSON.parse(raw.trim());
  } catch {
    // JSON 앞뒤 잡탕 제거 시도
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try { return JSON.parse(raw.slice(start, end + 1)); } catch { /* noop */ }
    }
    return null;
  }
}

exports.getMessage = async (req, res) => {
  try {
    const P_recev = (req.body && req.body.message || '').trim();

    // $start$: 시스템 프롬프트로 대화 시작
    if (P_recev === '$start$') {
      const P_prompt = await P_model.getPrompt(1); // PHP 동일: pkid=1
      if (!P_prompt) return P_sendResponse(res, 500, 'Prompt not found');

      const P_msgs = [
        { role: 'system', content: P_prompt.content }
      ];
      const P_resp = await P_ai.getLlmResponse(P_msgs, Number(P_prompt.free || 0));
      if (P_resp.code !== 200 || !P_resp.data?.choices) {
        return P_sendResponse(res, 500, 'LLM API Response Error: Code(4)');
      }


      const P_text = P_resp.data.choices[0].message?.content || '';
      const P_content = P_extractJson(P_text);
      if (!P_content) {
        // 개발 중: 원문 일부를 보여주어 왜 실패했는지 바로 확인
        return P_sendResponse(res, 500, 'LLM API Response Error: Code(3)', {
          sample: P_text.slice(0, 400)
        });
      }


      // TTS는 PHP에서도 주석 처리되어 있어 동일하게 비활성(원하면 services에서 enable)
      P_content.audio_url = '';

      const P_messagesLog = [
        { role: 'system', content: P_prompt.content },
        { role: 'assistant', content: JSON.stringify(P_content) }
      ];
      await P_model.updateChatLog(1, JSON.stringify(P_messagesLog));

      return P_sendResponse(res, 200, 'success', P_content);
    }

    // 일반 채팅: 기존 로그 불러와 user 추가 → LLM 호출 → assistant 추가 → 저장
    const P_dbMsg = await P_model.getChatLog(1);
    if (!P_dbMsg?.content) return P_sendResponse(res, 500, 'ChatLog not initialized');

    const P_messages = JSON.parse(P_dbMsg.content);
    P_messages.push({ role: 'user', content: P_recev });

    const P_resp = await P_ai.getLlmResponse(P_messages);
    if (P_resp.code !== 200 || !P_resp.data?.choices) {
      return P_sendResponse(res, 500, 'LLM API Response Error: Code(4)');
    }


    const P_text = P_resp.data.choices[0].message?.content || '';
    const P_content = P_extractJson(P_text);
    if (!P_content) return P_sendResponse(res, 500, 'LLM API Response Error: Code(3)');

    P_content.audio_url = ''; // TTS 비활성
    P_messages.push({ role: 'assistant', content: JSON.stringify(P_content) });
    await P_model.updateChatLog(1, JSON.stringify(P_messages));

    return P_sendResponse(res, 200, 'success', P_content);
  } catch (err) {
    console.error('[getMessage]', err);
    return P_sendResponse(res, 500, 'Server Error');
  }
};



