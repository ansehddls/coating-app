
// 1) CSV 로딩 & 파싱 (cache: no-store)
// app.js

// 1) CSV 로딩 & 파싱 (GitHub Raw URL 사용)
// app.js

// 1) CSV 로딩 & 파싱
async function loadAndParseCSV() {
  // GitHub Raw URL: coating-app 리포 main 브랜치의 data.csv
  const url = 'https://raw.githubusercontent.com/ansehddls/coating-app/main/data.csv';

  // cache: 'no-store' 로 SW/브라우저 캐시 완전 우회
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`CSV load failed: ${res.status}`);
  const text = await res.text();
  return Papa.parse(text, { header: true, skipEmptyLines: true }).data;
}

// 이하 기존 renderTable, toggle, 검색, 초기화 로직 그대로
function renderTable(items) { /* ... */ }
async function toggle(idx) { /* ... */ }
document.getElementById('search').addEventListener('input', /* ... */);

let items = [];
(async () => {
  items = await loadAndParseCSV();
  renderTable(items);
})();


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
      <td>${row['도면']?.trim()?'○':''}</td>
    </tr>
  `).join('');
}

// 3) 도면 토글
async function toggle(idx) {
  const has = !!items[idx]['도면']?.trim();
  if (!confirm(has ? '도면이 없습니까?' : '도면이 있습니까?')) return;

  // 로컬 UI만 토글
  items[idx]['도면'] = has ? '' : '○';
  renderTable(items);

  // 백그라운드로 커밋 요청
  const res = await fetch('/.netlify/functions/update-csv', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ index: idx, drawing: items[idx]['도면'] })
  });
  if (!res.ok) {
    alert(`저장 실패: ${await res.text()}`);
    // 실패 시 복구
    items[idx]['도면'] = has ? '○' : '';
    renderTable(items);
  }
  // *여기선 다시 불러오지 않습니다.*
}

// 4) 검색
document.getElementById('search').addEventListener('input', e => {
  const q = e.target.value.trim();
  renderTable(q ? items.filter(r=>r['부번'].includes(q)) : items);
});

