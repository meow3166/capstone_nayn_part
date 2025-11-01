// --- 전역 캐시: 마지막 성공 응답을 보관 ---
let __rowsCache = [];   // API 성공 시 최신 rows 저장

// 안전한 API 호출
async function fetchPlaces(q) {
  const url = '/api/places?q=' + encodeURIComponent(q || '');
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const text = await res.text().catch(()=> '');
    throw new Error(`API ${res.status} — ${text.slice(0,120)}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const text = await res.text();
    throw new Error('Non-JSON response:\n' + text.slice(0, 200));
  }
  return res.json();
}

// 클라이언트 사이드 임시 필터(API 실패 시 대체)
function clientFilter(rows, q) {
  if (!q) return rows;
  const k = q.replace(/\s+/g, '').toLowerCase();
  return rows.filter(r => {
    const s = (r.name + (r.category||'') + (r.description||'')).replace(/\s+/g,'').toLowerCase();
    return s.includes(k);
  });
}

// UI 표시용 헬퍼
function setStatus(msg) {
  const $list = document.getElementById('resultList');
  if (!$list) return;
  $list.innerHTML = `<div class="empty">${msg}</div>`;
}

// === 메인 검색 실행 ===
async function runSearch() {
  const $input = document.getElementById('poiSearch');
  if (!$input) { console.warn('#poiSearch not found'); return; }
  const q = $input.value.trim();

  try {
    setStatus('검색 중...');
    const data = await fetchPlaces(q);
    const rows = (data && data.ok) ? (data.rows || []) : [];
    __rowsCache = rows;               // 성공 시 캐시 업데이트
    renderList(rows);
    updateMarkers(rows);
  } catch (err) {
    console.error('[runSearch] API 실패:', err.message);
    // API 실패했을 때: 캐시가 있으면 클라 필터로라도 반응
    if (__rowsCache.length) {
      const filtered = clientFilter(__rowsCache, q);
      renderList(filtered);
      updateMarkers(filtered);
      setTimeout(()=>{},0); // 렌더 완료 보장용 no-op
    } else {
      setStatus('검색 서버에 연결할 수 없습니다.');
    }
  }
}

// === 초기 로드 ===
async function bootSearch() {
  try {
    setStatus('초기 데이터 불러오는 중...');
    const data = await fetchPlaces('');
    __rowsCache = (data && data.ok) ? (data.rows || []) : [];
    renderList(__rowsCache);
    updateMarkers(__rowsCache);
  } catch (e) {
    console.error('[bootSearch] 초기 API 실패:', e.message);
    setStatus('초기 데이터를 불러오지 못했습니다.');
  }
}

// === 바인딩 ===
const runSearchDebounced = (function debounce(fn, ms){
  let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); };
})(runSearch, 150);

window.addEventListener('DOMContentLoaded', () => {
  const $i = document.getElementById('poiSearch');
  const $x = document.getElementById('poiSearchClear');

  if ($i) $i.addEventListener('input', runSearchDebounced);
  if ($x) $x.addEventListener('click', () => {
    if (!$i) return;
    $i.value = '';
    $i.focus();
    runSearch();
  });

  bootSearch();
});