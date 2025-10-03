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

/* 카카오 지도 붙이는 예시
<script src="//dapi.kakao.com/v2/maps/sdk.js?appkey=YOUR_KEY&libraries=services"></script>
const map = new kakao.maps.Map(document.getElementById('mapInner'), {
  center: new kakao.maps.LatLng(37.515, 127.073), level: 4
});
*/

// ===== 모달(fab) =====
(() => {
  const modal = document.getElementById('chatModal');
  const fab = document.getElementById('fabBtn');
  const closeBtn = document.getElementById('chatClose');

  function openModal() {
    modal.hidden = false;
    fab.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    setTimeout(() => closeBtn?.focus(), 0);
  }
  function closeModal() {
    modal.hidden = true;
    fab.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
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
  const badge = { food: "먹거리", toilet: "화장실" };

  async function load() {
    try {
      listEl.innerHTML = '<p class="loading">불러오는 중...</p>';
      const res = await fetch("/poi");
      const rows = await res.json();

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


