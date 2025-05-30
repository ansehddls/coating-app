const fetch = require('node-fetch');

exports.handler = async (event) => {
  const { index, drawing } = JSON.parse(event.body);
  const OWNER  = 'ansehddls';
  const REPO   = 'coating-app';
  const PATH   = 'data.csv';
  const BRANCH = 'main';
  const TOKEN  = process.env.GITHUB_TOKEN;
  if (!TOKEN) return { statusCode: 500, body: 'GITHUB_TOKEN not set' };

  // 1) 현재 CSV 가져오기
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}?ref=${BRANCH}`;
  const res1 = await fetch(url, {
    headers: { Authorization: `token ${TOKEN}`, Accept: 'application/vnd.github.v3+json' }
  });
  if (!res1.ok) {
    const err = await res1.text();
    return { statusCode: res1.status, body: err };
  }
  const { sha, content: b64 } = await res1.json();
  const csvText = Buffer.from(b64, 'base64').toString('utf8');
  const lines   = csvText.split(/\r?\n/);

  // 2) 헤더/데이터 분리
  const header   = lines[0];
  const dataRows = lines.slice(1);

  // 3) 인덱스 행만 “마지막 콤마 뒤”를 교체
  const newRows = dataRows.map((line, i) => {
    if (i !== index) return line;  // 수정 대상이 아니면 원본 그대로

    // 마지막 쉼표 위치 찾기
    const lastComma = line.lastIndexOf(',');
    // line.substr(0, lastComma) : 도면 직전까지 원본 그대로
    // drawing이 있으면 ,"○" 없으면 , (빈칸)
    const suffix = drawing ? `,"${drawing}"` : ',';
    return line.substr(0, lastComma) + suffix;
  });

  // 4) 새 CSV 조립 & base64 인코딩
  const newCsv = [header, ...newRows].join('\r\n');
  const newB64 = Buffer.from(newCsv, 'utf8').toString('base64');

  // 5) GitHub에 커밋
  const res2 = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `token ${TOKEN}`, Accept: 'application/vnd.github.v3+json' },
    body: JSON.stringify({
      message: `Toggle drawing at row ${index+1}`,
      content: newB64,
      sha,
      branch: BRANCH
    })
  });
  if (!res2.ok) {
    const err = await res2.text();
    return { statusCode: res2.status, body: err };
  }

  return { statusCode: 200, body: 'OK' };
};
