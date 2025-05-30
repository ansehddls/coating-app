// 1) CSV 로딩 & 파싱 (cache-bust 적용)
async function loadAndParseCSV(url) {
  const bust   = `?t=${Date.now()}`;    // 캐시 방지용 파라미터
  const res    = await fetch(url + bust);
  if (!res.ok) throw new Error(`CSV 로드 실패: ${res.status}`);
  const csvText = await res.text();
  const results = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true
  });
  return results.data;  // [{부번:..., 품명:..., 규격:..., …, 도면:...}, …]
}

// 2) 테이블 렌더링
function renderTable(list) {
  const tbody = document.querySelector('#data-table tbody');
  tbody.innerHTML = list.map((it, i) => `
    <tr onclick="toggleDrawing(${i})" style="cursor:pointer">
      <td>${i+1}</td>
      <td>${it['부번']}</td>
      <td>${it['품명']}</td>
      <td>${it['규격']}</td>
      <td>${it['코팅사양']}</td>
      <td>${it['코팅폭']}</td>
      <td>${it['코팅미도포구간']}</td>
      <td>${it['도면']?.trim() ? '○' : ''}</td>
    </tr>
  `).join('');
}

// 3) 도면 토글 + 서버리스 호출
async function toggleDrawing(idx) {
  const row = items[idx];
  const has = !!row['도면']?.trim();
  const msg = has ? '도면이 없습니까?' : '도면이 있습니까?';
  if (!confirm(msg)) return;

  // 화면만 먼저 토글
  row['도면'] = has ? '' : '○';
  renderTable(items);

  // Netlify Function 호출해 GitHub CSV 업데이트
  const res = await fetch('/.netlify/functions/update-csv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ index: idx, drawing: row['도면'] })
  });
  if (!res.ok) {
    alert(`저장 실패: ${await res.text()}`);
  } else {
    // 성공하면 최신 CSV를 다시 불러와 테이블을 완전히 리프레시
    items = await loadAndParseCSV('data.csv');
    renderTable(items);
  }
}

// 4) 검색 기능: 부번 필터
document.getElementById('search').addEventListener('input', e => {
  const q = e.target.value.trim();
  renderTable(
    q
      ? items.filter(it => it['부번'].includes(q))
      : items
  );
});

// 5) 초기화
let items = [];
(async () => {
  // PapaParse CDN이 index.html에 로드돼 있어야 합니다.
  items = await loadAndParseCSV('data.csv');
  renderTable(items);
})();
