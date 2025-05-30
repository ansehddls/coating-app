let items = [];

// 1) fetch → PapaParse.parse
async function loadAndParseCSV(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CSV 로드 실패: ${res.status}`);
  const csvText = await res.text();
  const results = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    // CSV 내용이 잘못 섞여 있을 때 자동으로 quote나 delimiter 감지
    dynamicTyping: false
  });
  return results.data;  // array of objects keyed by header
}

// 2) 초기 로드
(async () => {
  // CSV 불러오기
  const raw = await loadAndParseCSV('data.csv');
  // 필요한 필드만 골라서 정제
  items = raw.map(row => ({
    code:     (row['부번']              || '').trim(),
    name:     (row['품명']              || '').trim(),
    spec:     (row['규격']              || '').trim(),
    coating:  (row['코팅사양']          || '').trim(),
    width:    (row['코팅폭']            || '').trim(),
    uncoated: (row['코팅미도포구간']    || '').trim(),
    drawing:  (row['도면']?.trim()      ? '○' : '')
  }));
  renderTable(items);
})().catch(err => alert(err.message));

// 3) 테이블 렌더링 (변경 없음)
function renderTable(list) {
  const tbody = document.querySelector('#data-table tbody');
  tbody.innerHTML = list.map((it, i) => `
    <tr onclick="toggleDrawing(${i})" style="cursor:pointer">
      <td>${i+1}</td>
      <td>${it.code}</td>
      <td>${it.name}</td>
      <td>${it.spec}</td>
      <td>${it.coating}</td>
      <td>${it.width}</td>
      <td>${it.uncoated}</td>
      <td>${it.drawing}</td>
    </tr>
  `).join('');
}

// 4) 도면 토글 (변경 없음)
function toggleDrawing(idx) {
  const has = items[idx].drawing === '○';
  const msg = has ? '도면이 없습니까?' : '도면이 있습니까?';
  if (!confirm(msg)) return;
  items[idx].drawing = has ? '' : '○';
  renderTable(items);
}

// 5) 검색 기능 (변경 없음)
document.getElementById('search')
  .addEventListener('input', e => {
    const q = e.target.value.trim();
    renderTable(q
      ? items.filter(it => it.code.includes(q))
      : items
    );
  });
