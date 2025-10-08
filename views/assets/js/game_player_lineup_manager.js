(function(){
  const POSITIONS = ['투수','포수','1루수','2루수','3루수','유격수','좌익수','중견수','우익수','지명타자'];
  const homeBody = document.getElementById('homeBody');
  const awayBody = document.getElementById('awayBody');
  const homeTeam = document.getElementById('homeTeam');
  const awayTeam = document.getElementById('awayTeam');
  const form = document.getElementById('lineupForm');

  // 오늘 날짜 기본값
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth()+1).padStart(2,'0');
  const d = String(today.getDate()).padStart(2,'0');
  form.game_date.value = `${y}-${m}-${d}`;
  if (!form.game_time.value) form.game_time.value = '18:30';

  // 구장 직접입력 토글
  const venueSel = document.getElementById('venueSelect');
  const venueCustomToggle = document.getElementById('venueCustomToggle');
  const venueCustomInput = document.getElementById('venueCustomInput');
  venueCustomToggle.addEventListener('change', () => {
    if (venueCustomToggle.checked) {
      venueCustomInput.style.display = 'inline-block';
      venueSel.disabled = true;
      venueSel.required = false;
      venueCustomInput.required = true;
      venueSel.value = '';
    } else {
      venueCustomInput.style.display = 'none';
      venueSel.disabled = false;
      venueSel.required = true;
      venueCustomInput.required = false;
      venueCustomInput.value = '';
    }
  });
  // 제출 시 venue 값 정리
  form.addEventListener('submit', (e)=>{
    if (venueCustomToggle.checked) {
      if (!venueCustomInput.value.trim()) {
        alert('구장을 입력해 주세요.');
        venueCustomInput.focus();
        e.preventDefault();
        return;
      }
      // name="venue" 인 select에 값 주입 위해 hidden input 생성
      if (!venueSel.disabled) venueSel.value = venueCustomInput.value.trim();
      else {
        // select가 disabled면 전송 안되므로 hidden으로 보냄
        let h = document.createElement('input');
        h.type='hidden'; h.name='venue'; h.value=venueCustomInput.value.trim();
        form.appendChild(h);
      }
    }
  });

  // 옵션 엘리먼트 생성
  function positionSelect(name){
    const sel = document.createElement('select');
    sel.name = name;
    sel.required = true;
    POSITIONS.forEach(p=>{
      const o=document.createElement('option');
      o.value=p; o.textContent=p;
      sel.appendChild(o);
    });
    return sel;
  }

  function makeRow(idx, prefix){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="border:1px solid #eee;padding:6px;text-align:center;">${idx===10?'P':idx}</td>
      <td style="border:1px solid #eee;padding:6px;"><input type="text" name="${prefix}_player_name_${idx}" required></td>
      <td style="border:1px solid #eee;padding:6px;" data-pos-cell></td>
    `;
    const posCell = tr.querySelector('[data-pos-cell]');
    const sel = positionSelect(`${prefix}_position_${idx}`);
    if (idx===10){ sel.value='투수'; }
    posCell.appendChild(sel);
    return tr;
  }

  // 1~9 + 10(P) 생성
  for (let i=1;i<=10;i++){
    homeBody.appendChild(makeRow(i,'home'));
    awayBody.appendChild(makeRow(i,'away'));
  }

  // 홈→원정 복사
  document.getElementById('copyHomeToAway').addEventListener('click', ()=>{
    for(let i=1;i<=10;i++){
      const nHome = form[`home_player_name_${i}`];
      const pHome = form[`home_position_${i}`];
      const nAway = form[`away_player_name_${i}`];
      const pAway = form[`away_position_${i}`];
      if (nHome && pHome && nAway && pAway){
        nAway.value = nHome.value;
        pAway.value = pHome.value;
      }
    }
  });

  // 전체 초기화
  document.getElementById('clearAll').addEventListener('click', ()=>{
    if(!confirm('모든 입력을 비우시겠습니까?')) return;
    form.reset();
    // 날짜/시간 기본값 재설정
    form.game_date.value = `${y}-${m}-${d}`;
    form.game_time.value = '18:30';
  });

  // 같은 팀 선택 방지
  function syncTeamOptions(){
    const h = homeTeam.value;
    const a = awayTeam.value;
    [...awayTeam.options].forEach(o => o.disabled = (o.value && o.value===h));
    [...homeTeam.options].forEach(o => o.disabled = (o.value && o.value===a));
  }
  homeTeam.addEventListener('change', syncTeamOptions);
  awayTeam.addEventListener('change', syncTeamOptions);

  // Enter로 다음 입력칸 이동 (textarea 제외)
  form.addEventListener('keydown', (e)=>{
    if (e.key==='Enter' && e.target.tagName==='INPUT'){
      e.preventDefault();
      const inputs = [...form.querySelectorAll('input,select,button')].filter(el=>!el.disabled && el.type!=='hidden');
      const idx = inputs.indexOf(e.target);
      if (idx>-1 && idx<inputs.length-1) inputs[idx+1].focus();
    }
  });

  // 제출 전 검증
  function validateLineup(prefix){
    for(let i=1;i<=10;i++){
      const n = form[`${prefix}_player_name_${i}`];
      const p = form[`${prefix}_position_${i}`];
      if(!n.value.trim() || !p.value.trim()){
        alert(`${prefix==='home'?'홈':'원정'} 라인업 ${i===10?'P':'#'+i} 입력을 확인해 주세요.`);
        n.focus();
        return false;
      }
    }
    return true;
  }
  form.addEventListener('submit',(e)=>{
    // 팀 중복 방지 서버쪽도 있지만, 클라에서도 한 번 더
    if (homeTeam.value && homeTeam.value===awayTeam.value){
      alert('홈팀과 원정팀이 같습니다.');
      awayTeam.focus();
      e.preventDefault();
      return;
    }
    if (!validateLineup('home') || !validateLineup('away')){
      e.preventDefault();
      return;
    }
  });

  // 임시저장 (localStorage)
  const DRAFT_KEY = 'lineupDraft-v1';
  function collectData(){
    const data = {};
    const fd = new FormData(form);
    fd.forEach((v,k)=>{ data[k]=v; });
    return data;
  }
  function applyData(data){
    Object.keys(data).forEach(k=>{
      if (form[k]!==undefined){
        form[k].value = data[k];
      }
    });
    syncTeamOptions();
  }
  // 자동 저장 (입력 변경 시)
  form.addEventListener('input', ()=>{
    localStorage.setItem(DRAFT_KEY, JSON.stringify(collectData()));
  });
  // 수동 저장/복원/삭제
  document.getElementById('saveDraft').addEventListener('click', ()=>{
    localStorage.setItem(DRAFT_KEY, JSON.stringify(collectData()));
    alert('임시저장 완료');
  });
  document.getElementById('restoreDraft').addEventListener('click', ()=>{
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return alert('저장된 임시데이터가 없습니다.');
    applyData(JSON.parse(raw));
    alert('임시저장 불러오기 완료');
  });
  document.getElementById('clearDraft').addEventListener('click', ()=>{
    localStorage.removeItem(DRAFT_KEY);
    alert('임시저장 삭제 완료');
  });

})();
