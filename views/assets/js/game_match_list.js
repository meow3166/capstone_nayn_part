(function () {
  const tbody = document.getElementById("scheduleBody");
  function getLocalDateString(isoDateString) {
    if (!isoDateString) return '';
    // '2025-09-03T...' 와 같은 문자열에서 T 이후를 제거하여 UTC가 아닌 로컬 시간으로 간주하게 함
    const date = new Date(isoDateString.slice(0, 10));
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  async function load() {
    try {
      tbody.innerHTML = `<tr><td colspan="7">불러오는 중...</td></tr>`;
      const res = await fetch('/api/schedules?month=2025-09');
      const json = await res.json();
      const rows = json.data || [];

      if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="7">표시할 항목이 없습니다.</td></tr>`;
        return;
      }

      tbody.innerHTML = rows.map(r => {
        // ⬇ 취소 경기 여부 확인
        const isCanceled =
          (r.note || '').includes('우천취소') ||
          (r.note || '').includes('그라운드사정');

        // ⬇ 리뷰 버튼은 취소 경기가 아닐 때만 표시
        const reviewUrlBase = "http://localhost/gameinfo_result?id=";

        const review =
          (!isCanceled && r.game_page_id) // review_url 대신 game_page_id가 존재하는지 확인
            ? `<a href="${reviewUrlBase}${r.game_page_id}" class="btn2">리뷰</a>`
            : '';
        return `
          <tr>
            <td>${r.game_date.slice(0, 10)}(${r.game_day || ''})</td>
            <td><b>${r.game_time ? r.game_time.slice(0, 5) : ''}</b></td>
            <td>${r.team_home} <em>${r.score_home ?? ''} : ${r.score_away ?? ''}</em> ${r.team_away}</td>
            <td>${review}</td>
            <td>${r.tv_channel || ''}</td>
            <td>${r.stadium || ''}</td>
            <td>${r.note || '-'}</td>
          </tr>`;
      }).join('');

    } catch (e) {
      console.error('load schedules error:', e);
      tbody.innerHTML = `<tr><td colspan="7">데이터를 불러오지 못했습니다.</td></tr>`;
    }
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', load)
    : load();
})();
