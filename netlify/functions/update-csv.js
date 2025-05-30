const fetch = require('node-fetch');

exports.handler = async (event) => {
  // Expect body: { index: number, drawing: '○' or '' }
  const { index, drawing } = JSON.parse(event.body);
  const owner = 'ansehddls';
  const repo  = 'coating-app';
  const path  = 'data.csv';
  const branch = 'main';

  const token = process.env.GITHUB_TOKEN;
  if (!token) return { statusCode: 500, body: 'GITHUB_TOKEN not set' };

  // 1) Get current file SHA & content
  const getUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
  const getRes = await fetch(getUrl, {
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }
  });
  if (!getRes.ok) return { statusCode: getRes.status, body: await getRes.text() };
  const { sha, content: encoded } = await getRes.json();
  const csv = Buffer.from(encoded, 'base64').toString('utf8').split('\r\n');

  // 2) Update CSV in memory
  const header = csv[0];
  const rows = csv.slice(1).map((line, i) => {
    let cols = line.split(',');
    if (i === index) {
      // last column is 도면
      cols[cols.length - 1] = drawing ? `"${drawing}"` : '';
    }
    return cols.join(',');
  });
  const newCsv = [header, ...rows].join('\r\n');
  const newEncoded = Buffer.from(newCsv, 'utf8').toString('base64');

  // 3) Commit updated CSV
  const commitRes = await fetch(getUrl, {
    method: 'PUT',
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
    body: JSON.stringify({
      message: `Toggle drawing at row ${index+1}`,
      content: newEncoded,
      sha,
      branch
    })
  });
  if (!commitRes.ok) return { statusCode: commitRes.status, body: await commitRes.text() };

  return { statusCode: 200, body: 'OK' };
};
