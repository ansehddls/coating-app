// 1) CSV + Papa Parse 불러오기 (cache-bust 포함)
async function loadCSV() {
  const bust   = `?t=${Date.now()}`;
  const res    = await fetch('data.csv' + bust);
  if (!res.ok) throw new Error(`CSV 로드 실패: ${res.status}`);
  const text   = await res.text();
  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    quoteChar: '"',
    dynamicTyping: false
  });
  return parsed.data;  // [{부번, 품명, 규격, 코팅사양, 코팅폭, 코팅미도포구간, 도면}, ...]
}

// 2) 테이블 렌더링
function renderTable(items) {
  const tbody = document.querySelector('#data-table tbody');
  tbody.innerHTML = items.map((row, i) => `
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

// 3) 도면 토글 + 서버리스 + 재로드
async function toggle(idx) {
  const has = !!items[idx]['도면']?.trim();
  const msg = has ? '도면이 없습니까?' : '도면이 있습니까?';
  if (!confirm(msg)) return;

  // 3-1) 우선 UI만 토글
  items[idx]['도면'] = has ? '' : '○';
  renderTable(items);

  // 3-2) 서버리스 호출
  const res = await fetch('/.netlify/functions/update-csv', {
    method:  'POST',
    headers: { 'Content-Type':'application/json' },
    body:    JSON.stringify({ index: idx, drawing: items[idx]['도면'] })
  });
  if (!res.ok) {
    alert(`저장 실패: ${await res.text()}`);
    return;
  }

  // 3-3) 변경된 CSV 다시 불러와서 완전히 리프레시
  items = await loadCSV();
  renderTable(items);
}

// 4) 검색 기능
document.getElementById('search').addEventListener('input', e => {
  const q = e.target.value.trim();
  renderTable(
    q
      ? items.filter(r => r['부번'].includes(q))
      : items
  );
});

// 5) 초기화
let items = [];
(async () => {
  items = await loadCSV();
  renderTable(items);
})();
