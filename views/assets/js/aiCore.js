// /assets/js/aiCore.js
const ENDPOINT = '/api/ai/message';
const START_KEY = 'fc_ai_started_v1';
let initPromise = null;

/* 내부 POST */
async function post(message) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });
  const json = await res.json().catch(() => ({ code: 500, message: 'Bad JSON', data: null }));
  return json; // { code, message, data }
}

/* 세션 초기화 1회 보장 */
export async function ensureStart(force = false) {
  if (!force && localStorage.getItem(START_KEY) === '1') return true;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const j = await post('$start$');
    if (j && j.code === 200) {
      localStorage.setItem(START_KEY, '1');
      return true;
    }
    localStorage.removeItem(START_KEY);
    return false;
  })().finally(() => { initPromise = null; });
  return initPromise;
}

/* 질문 전송 → 정규화된 응답 */
export async function ask(text) {
  // 세션 보장 (필요 시 강제 1회)
  if (!(await ensureStart())) await ensureStart(true);

  let j = await post(text);
  // 서버가 chat_log 미초기화라면 자동 복구 후 1회 재시도
  if (j.code !== 200 && (j.message || '').toLowerCase().includes('chatlog')) {
    localStorage.removeItem(START_KEY);
    if (await ensureStart(true)) j = await post(text);
  }

  if (j.code === 200) {
    const d = j.data || {};
    const reply =
      (typeof d === 'string' && d) ||
      d.reply || d.content || d.answer || d.text || '(응답 없음)';
    return {
      ok: true,
      reply,
      quick: Array.isArray(d.quick) ? d.quick : [],
      links: Array.isArray(d.links) ? d.links : []
    };
  }
  // 오류 코드/메시지 노출 방지: 사용자에게는 일반 문구만 표시
  return { ok: false, reply: '일시적 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', quick: [], links: [] };
}

/* 프롬프트 기반 첫 인사($start$) 전용 */
export async function greet() {
  const j = await post('$start$');
  if (j.code === 200) {
    const d = j.data || {};
    const reply =
      (typeof d === 'string' && d) ||
      d.reply || d.content || d.answer || d.text || '안녕하세요.';
    localStorage.setItem(START_KEY, '1');
    return {
      ok: true,
      reply,
      quick: Array.isArray(d.quick) ? d.quick : [],
      links: Array.isArray(d.links) ? d.links : []
    };
  }
  // 오류 코드/메시지 노출 방지: 사용자에게는 일반 문구만 표시
  return { ok: false, reply: '인사 메시지를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.', quick: [], links: [] };
}
