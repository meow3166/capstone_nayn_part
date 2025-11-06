// 검색 초기화
document.getElementById('btnClear')?.addEventListener('click', () => {
  const q = document.getElementById('q');
  if (!q) return;
  q.value = '';
  q.focus();
  filterList('');
});

// 검색 입력 필터
document.getElementById('q')?.addEventListener('input', (e) => {
  filterList(e.target.value);
});

function filterList(term = '') {
  term = term.trim().toLowerCase();
  document.querySelectorAll('.item').forEach(it => {
    const text = it.innerText.toLowerCase();
    it.style.display = text.includes(term) ? '' : 'none';
  });
}

// 타입 필터(레일/칩 공통)
document.querySelectorAll('[data-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    const type = btn.getAttribute('data-filter'); // route|food|toilet
    document.querySelectorAll('.item').forEach(it => {
      it.style.display = (type === 'all' || it.dataset.type === type) ? '' : 'none';
    });
    // 모바일 칩 강조
    document.querySelectorAll('.chip').forEach(c => c.style.outline = '');
    if (btn.classList.contains('chip')) btn.style.outline = '2px solid var(--brand)';
  });
});

// 더미 지도(배경만). 실제 API 붙이면 아래 블록 삭제.
(function fakeMap() {
  const el = document.getElementById('mapInner');
  if (!el) return;
  el.style.background = "repeating-linear-gradient(45deg,#eef1f3,#eef1f3 20px,#f7f9fb 20px,#f7f9fb 40px)";
  el.style.border = "1px solid #e5e7eb";
  el.style.zIndex = "0";   // 👈 지도 레이아웃을 맨 뒤로
  el.style.position = "relative"
})();

/* 카카오 지도 붙이는 예시 */


// ===== 모달(fab) =====
(() => {
  const modal = document.getElementById('chatModal');
  const fab = document.getElementById('fabBtn');
  const closeBtn = document.getElementById('chatClose');

  function openModal() {
    modal.hidden = false;
    fab.setAttribute('aria-expanded', 'true');
    // 도킹형(dock) 챗봇은 페이지 스크롤을 막지 않음
    if (!modal.classList.contains('dock')) {
      document.body.style.overflow = 'hidden';
    }
    // 도킹형이면 애니메이션용 클래스 추가
    if (modal.classList.contains('dock')) {
      modal.classList.add('show');
    }
    setTimeout(() => closeBtn?.focus(), 0);
  }
  function closeModal() {
    modal.hidden = true;
    fab.setAttribute('aria-expanded', 'false');
    // 도킹형(dock) 챗봇은 스크롤 원복 불필요, 일반 모달만 원복
    if (!modal.classList.contains('dock')) {
      document.body.style.overflow = '';
    }
    if (modal.classList.contains('dock')) {
      modal.classList.remove('show');
    }
    fab.focus();
  }

  fab?.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => {
    if (e.target.matches('[data-dismiss="modal"], .modal__backdrop')) closeModal();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && !modal.hidden) closeModal();
  });
})();

// ---------------------------------------------------------------------------------------
(function () {
  const listEl = document.getElementById("resultList");
  const qEl = document.getElementById("q_m"); // ✅ 검색 input
  const clearBtn = document.getElementById("btnClear_m"); // ✅ x버튼
  const badge = { food: "먹거리", toilet: "화장실" };
  const state = { rows: [] };

  function render(rows) {
    if (!rows || rows.length === 0) {
      listEl.innerHTML = '<p class="empty">표시할 항목이 없습니다.</p>';
      return;
    }
    listEl.innerHTML = rows.map(r => {
      const imgStyle = r.image ? ` style="background-image:url('${r.image}');"` : "";
      return `
        <article class="item" data-type="${r.type}" data-id="${r.id}">
          <div class="thumb"${imgStyle}></div>
          <div class="meta">
            <h4 class="name">${r.name}</h4>
            <p class="desc">${r.items || ""}</p>
          </div>
          <span class="badge">${badge[r.type] || ""}</span>
        </article>`;
    }).join("");
  }

  // ✅ 검색어 필터
  function applyFilter() {
    const q = (qEl?.value || "").trim().toLowerCase();
    const filtered = state.rows.filter(r => {
      const text = `${r.name || ""} ${r.items || ""}`.toLowerCase();
      return !q || text.includes(q);
    });
    render(filtered);
  }

  // ✅ 입력 이벤트 (디바운스)
  let t;
  qEl?.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(applyFilter, 200);
  });

  // ✅ “×” 버튼 클릭 시 검색창 리셋 + 전체 표시
  clearBtn?.addEventListener("click", () => {
    qEl.value = "";
    applyFilter();
    qEl.focus();
  });

  // ✅ 데이터 불러오기
  async function load() {
    try {
      listEl.innerHTML = '<p class="loading">불러오는 중...</p>';
      const res = await fetch("/poi");
      // 서버 오류(비정상 응답)가 올 수 있으므로 res.ok 검사
      if (!res.ok) {
        // 시도: 응답이 JSON이면 그 내용을 읽어 에러 메시지를 사용
        let errText = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (body && body.error) errText = body.error;
        } catch (e) {
          // 파싱 실패 시 텍스트로 읽어본다
          try { errText = await res.text(); } catch (_) {}
        }
        throw new Error(errText);
      }

      const rows = await res.json();
      state.rows = Array.isArray(rows) ? rows : [];
      render(state.rows);
    } catch (e) {
      console.error("load error:", e);
      listEl.innerHTML = '<p class="error">목록을 불러오지 못했습니다.</p>';
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }
})();

