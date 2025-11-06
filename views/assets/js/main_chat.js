// /assets/js/main_chat.js
import { ensureStart, ask, greet } from '/assets/js/aiCore.js';

(function () {
  const $wrap = document.getElementById('fcChat');
  const $log = document.getElementById('chatLog');
  const $input = document.getElementById('chatInput');
  if (!$wrap || !$log || !$input) return;

  /* ---------- 유틸: 로그 열기(한 곳에서 관리) ---------- */
  function openLog() {
    if (!$wrap.classList.contains('active')) {
      $wrap.classList.add('active');
    }
  }

  /* ---------- 공통 렌더 ---------- */
  function row(role, text) {
    const wrap = document.createElement('div');
    wrap.className = `fc-row ${role}`;
    if (role === 'bot') {
      const avatar = document.createElement('div');
      avatar.className = 'fc-avatar';
      wrap.appendChild(avatar);
    }
    const bubble = document.createElement('div');
    bubble.className = 'fc-bubble';
    bubble.textContent = text;
    wrap.appendChild(bubble);
    $log.appendChild(wrap);
    $log.scrollTop = $log.scrollHeight;
  }

  function renderExtras(r) {
    // 빠른질문
    if (Array.isArray(r.quick) && r.quick.length) {
      const wrap = document.createElement('div');
      wrap.className = 'fc-quick';
      r.quick.forEach(label => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'fc-quick__btn';
        b.textContent = label;
        b.addEventListener('click', async () => {
          openLog();
          $input.value = label;
          await onSend();
        });
        wrap.appendChild(b);
      });
      $log.appendChild(wrap);
    }
    // 링크
    if (Array.isArray(r.links) && r.links.length) {
      const wrap = document.createElement('div');
      wrap.className = 'fc-links';
      r.links.forEach(link => {
        const a = document.createElement('a');
        a.href = link.href;
        a.textContent = link.label || link.href;
        a.className = 'fc-link';
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        wrap.appendChild(a);
      });
      $log.appendChild(wrap);
    }
    $log.scrollTop = $log.scrollHeight;
  }

  /* ---------- 전송 ---------- */
  async function onSend() {
    const text = ($input.value || '').trim();
    if (!text) return;

    openLog();

    let started = false;
    try {
      started = await ensureStart();
    } catch (e) { /* noop */ }
    if (!started) {
      row('bot', '초기화에 실패했습니다. 다시 시도해 주세요.');
      return;
    }

    row('user', text);
    $input.value = '';

    try {
      const r = await ask(text);
      row('bot', r.reply);
      renderExtras(r);
    } catch (e) {
      row('bot', '요청 처리 중 오류가 발생했습니다.');
    }
  }

  /* ---------- 첫 인사 1회 ---------- */
  let greeted = false;
  async function greetOnce() {
    if (greeted) return;
    greeted = true;

    openLog();

    try {
      await ensureStart();                  // 세션 보장
      const g = await greet();              // $start$ 인사
      row('bot', g.reply);
      renderExtras(g);
    } catch (e) {
      row('bot', '안내 메시지를 불러오지 못했습니다. 질문을 입력해 주세요.');
    }
  }

  /* ---------- 이벤트 ---------- */
  $input.addEventListener('focus', () => { greetOnce().catch(() => { }); openLog(); });
  $input.addEventListener('click', () => { greetOnce().catch(() => { }); openLog(); });

  // Enter 전송: 인사 전이면 먼저 인사 후 전송
  $input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    if (!greeted) {
      greetOnce().then(onSend).catch(onSend);
    } else {
      onSend();
    }
  });



})();
