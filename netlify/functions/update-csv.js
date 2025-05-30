const fetch = require('node-fetch');

// CSV 한 줄을 “쉼표, 따옴표” 규칙에 맞게 split
function splitCsvLine(line) {
  // regex: 콤마(,) 다음에 짝수 개의 따옴표가 있으면 split
  return line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(field =>
    // 양쪽 따옴표 제거
    field.replace(/^"(.*)"$/, '$1')
  );
}

exports.handler = async (event) => {
  const { index, drawing } = JSON.parse(event.body);
  const owner  = 'ansehddls';
  const repo   = 'coating-app';
  const path   = 'data.csv';
  const branch = 'main';

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('GITHUB_TOKEN not set');
    return { statusCode: 500, body: 'GITHUB_TOKEN not set' };
  }

  // 1) 현재 CSV SHA & content 가져오기
  const getUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
  const getRes = await fetch(getUrl, {
    headers: {
      Authorization: `token ${token}`,
      Accept:        'application/vnd.github.v3+json'
    }
  });
  if (!getRes.ok) {
    const err = await getRes.text();
    console.error('GET contents error', getRes.status, err);
    return { statusCode: getRes.status, body: err };
  }
  const { sha, content: encoded } = await getRes.json();

  // 2) CSV 디코드 + 파싱
  const csvText = Buffer.from(encoded, 'base64').toString('utf8');
  const lines   = csvText.split(/\r?\n/);
  const header  = lines[0];
  const dataRows = lines.slice(1).filter(l => l.trim() !== '');

  // 3) 수정할 행 디버깅용 로그
  console.log('Before row:', dataRows[index]);

  // 4) 각 행 split & 수정
  const newRows = dataRows.map((line, i) => {
    const cols = splitCsvLine(line);
    if (i === index) {
      // 마지막 필드(도면) 교체
      cols[cols.length - 1] = drawing || '';
    }
    const joined = cols.map(f => `"${f.replace(/"/g, '""')}"`).join(',');
    if (i === index) console.log('After  row:', joined);
    return joined;
  });

  // 5) 다시 CSV 조립 & base64 인코딩
  const newCsvText = [header, ...newRows].join('\r\n');
  const newEncoded = Buffer.from(newCsvText, 'utf8').toString('base64');

  // 6) GitHub에 PUT 요청 (커밋)
  const commitRes = await fetch(getUrl, {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      Accept:        'application/vnd.github.v3+json'
    },
    body: JSON.stringify({
      message: `Toggle drawing at row ${index + 1}`,
      content: newEncoded,
      sha,
      branch
    })
  });
  if (!commitRes.ok) {
    const err = await commitRes.text();
    console.error('PUT commit error', commitRes.status, err);
    return { statusCode: commitRes.status, body: err };
  }

  return { statusCode: 200, body: 'OK' };
};
