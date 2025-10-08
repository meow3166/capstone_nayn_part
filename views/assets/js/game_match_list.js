(function () {
  const tbody = document.getElementById("scheduleBody");

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
        const review =
          (!isCanceled && r.review_url)
            ? `<a href="${r.review_url}" class="btn2">리뷰</a>`
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
