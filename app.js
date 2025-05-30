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
      <td>${row['도면']?.trim() ? '○' : ''}</td>
    </tr>
  `).join('');
}

// 3) 도면 토글 (UI 유지, 서버에만 커밋 요청)
// app.js 에서 toggle 함수만 교체

// app.js의 toggle만 교체
async function toggle(idx) {
  const has = !!items[idx]['도면']?.trim();
  const msg = has ? '도면이 없습니까?' : '도면이 있습니까?';
  if (!confirm(msg)) return;

  // 1) UI 즉시 토글
  items[idx]['도면'] = has ? '' : '○';
  renderTable(items);

  // 2) 서버리스 호출 & JSON 응답 수신
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

  // 3) 응답으로 받은 CSV 텍스트로 즉시 덮어쓰기
  const { csv } = await res.json();   // { csv: newCsvText }
  const parsed = Papa.parse(csv, { header:true, skipEmptyLines:true }).data;
  items = parsed;
  renderTable(items);
}



// 4) 검색 기능
document.getElementById('search')
  .addEventListener('input', e=>{
    const q = e.target.value.trim();
    renderTable(q 
      ? items.filter(r=>r['부번'].includes(q)) 
      : items
    );
  });

// 5) 초기화 (한 번만 로드)
let items = [];
(async ()=>{
  items = await loadAndParseCSV('data.csv');
  renderTable(items);
})();
