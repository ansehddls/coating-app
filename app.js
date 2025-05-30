// 1) CSV 로딩 & 파싱 (cache-bust)
async function loadAndParseCSV(url) {
  const bust    = `?t=${Date.now()}`;
  const res     = await fetch(url + bust);
  if (!res.ok) throw new Error(`CSV 로드 실패: ${res.status}`);
  const text    = await res.text();
  const parsed  = Papa.parse(text, {
    header: true,
    skipEmptyLines: true
  });
  return parsed.data;
}

// 2) 테이블 렌더링
function renderTable(items) {
  const tbody = document.querySelector('#data-table tbody');
  tbody.innerHTML = items.map((row,i)=>`
    <tr onclick="toggle(${i})" style="cursor:pointer">
      <td>${i+1}</td>
      <td>${row['부번']}</td>
      <td>${row['품명']}</td>
      <td>${row['규격']}</td>
      <td>${row['코팅사양']}</td>
      <td>${row['코팅폭']}</td>
      <td>${row['코팅미도포구간']}</td>
      <td>${row['도면']?.trim() ? '○':''}</td>
    </tr>
  `).join('');
}

// 3) 도면 토글 (UI만 변경, 서버는 백그라운드로)
// app.js 에서 toggle()만 이걸로 교체하세요

async function toggle(idx) {
  const has = !!items[idx]['도면']?.trim();
  const msg = has ? '도면이 없습니까?' : '도면이 있습니까?';
  if (!confirm(msg)) return;

  // 1) UI만 토글 (로컬 상태 반영)
  items[idx]['도면'] = has ? '' : '○';
  renderTable(items);

  // 2) 백그라운드에서 CSV 커밋 요청
  const res = await fetch('/.netlify/functions/update-csv', {
    method:  'POST',
    headers: { 'Content-Type':'application/json' },
    body:    JSON.stringify({ index: idx, drawing: items[idx]['도면'] })
  });
  if (!res.ok) {
    alert(`저장 실패: ${await res.text()}`);
    // 실패 시 원복
    items[idx]['도면'] = has ? '○' : '';
    renderTable(items);
    return;
  }

  // 3) 커밋이 끝나면 잠깐 대기 → 최신 CSV 다시 로드
  setTimeout(async () => {
    items = await loadAndParseCSV('data.csv');
    renderTable(items);
  }, 1000);  // 1초 기다리세요 (네트워크 상황에 따라 조정 가능)
}


// 4) 검색 기능
document.getElementById('search')
  .addEventListener('input', e=>{
    const q = e.target.value.trim();
    renderTable(q ? items.filter(r=>r['부번'].includes(q)) : items);
  });

// 5) 초기화: 페이지 로드 시 한 번만 CSV 읽고 렌더
let items = [];
(async ()=>{
  items = await loadAndParseCSV('data.csv');
  renderTable(items);
})();
