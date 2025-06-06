// 1) 최신 CSV 불러오기
async function loadAndParseCSV() {
  const res = await fetch('data.csv', {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  });
  if (!res.ok) throw new Error(`CSV 로드 실패: ${res.status}`);
  const text = await res.text();
  return Papa.parse(text, { header: true, skipEmptyLines: true }).data;
}

// 2) 테이블 렌더링
function renderTable(items) {
  const tbody = document.querySelector('#data-table tbody');
  tbody.innerHTML = items.map((row, i) => `
    <tr onclick="toggle(${i})" style="cursor:pointer">
      <td>${i + 1}</td>
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

// 3) 도면 토글 (UI + 서버로 커밋 요청)
async function toggle(idx) {
  const has = !!items[idx]['도면']?.trim();
  if (!confirm(has ? '도면이 없습니까?' : '도면이 있습니까?')) return;

  // UI 반영
  items[idx]['도면'] = has ? '' : '○';
  renderTable(items);

  // 서버리스 함수 호출 (GitHub CSV 커밋)
  const res = await fetch('/.netlify/functions/update-csv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ index: idx, drawing: items[idx]['도면'] })
  });

  if (!res.ok) {
    alert(`저장 실패: ${await res.text()}`);
    // 실패 시 UI 복구
    items[idx]['도면'] = has ? '○' : '';
    renderTable(items);
  }
}

// 4) 검색
document.getElementById('search').addEventListener('input', e => {
  const q = e.target.value.trim();
  renderTable(q ? items.filter(r => r['부번'].includes(q)) : items);
});

// 5) 초기화
let items = [];
(async () => {
  items = await loadAndParseCSV();
  renderTable(items);
})();
