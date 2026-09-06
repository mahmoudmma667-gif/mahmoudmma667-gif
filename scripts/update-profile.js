const https = require('https');
const fs = require('fs');
const path = require('path');

const USERNAME = 'mahmoudmma667-gif';

function fetchRepos(token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      port: 443,
      path: `/users/${USERNAME}/repos?sort=pushed&direction=desc&per_page=20`,
      method: 'GET',
      headers: {
        'User-Agent': 'Profile-Auto-Updater',
        'Accept': 'application/vnd.github.v3+json'
      }
    };
    if (token) {
      options.headers['Authorization'] = `token ${token}`;
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        } else {
          reject(new Error(`GitHub API error ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log(`Checking latest repositories for ${USERNAME}...`);
  const token = process.env.GITHUB_TOKEN;
  const repos = await fetchRepos(token);

  // Filter out the profile repo itself and forks
  const filtered = repos.filter(r => r.name.toLowerCase() !== USERNAME.toLowerCase() && !r.fork);
  const topRepos = filtered.slice(0, 6);

  console.log(`Found ${topRepos.length} active public repositories.`);

  let table = `| Project | Description | Tech Stack | Stars | Last Activity |\n`;
  table += `|:---|:---|:---:|:---:|:---:|\n`;

  topRepos.forEach(r => {
    const name = `[**${r.name}**](${r.html_url})`;
    const desc = r.description ? r.description.replace(/\|/g, '-') : 'Research & engineering codebase';
    const lang = r.language ? `\`${r.language}\`` : '`Multi`';
    const stars = r.stargazers_count > 0 ? `★ ${r.stargazers_count}` : '★ 0';
    const pushedDate = new Date(r.pushed_at).toISOString().split('T')[0];
    table += `| ${name} | ${desc} | ${lang} | ${stars} | \`${pushedDate}\` |\n`;
  });

  const readmePath = path.join(__dirname, '..', 'README.md');
  if (!fs.existsSync(readmePath)) {
    console.error('README.md not found at:', readmePath);
    return;
  }

  let readme = fs.readFileSync(readmePath, 'utf-8');

  const startMarker = '<!-- AUTO_REPOSITORIES_LIST:START -->';
  const endMarker = '<!-- AUTO_REPOSITORIES_LIST:END -->';

  const startIndex = readme.indexOf(startMarker);
  const endIndex = readme.indexOf(endMarker);

  if (startIndex !== -1 && endIndex !== -1) {
    const updatedContent = readme.slice(0, startIndex + startMarker.length) +
      '\n' + table.trim() + '\n' +
      readme.slice(endIndex);
    fs.writeFileSync(readmePath, updatedContent, 'utf-8');
    console.log('Successfully updated README with latest repositories list!');
  } else {
    console.log('Markers not found in README.md, skipping replacement.');
  }
}

run().catch(err => {
  console.error('Script error:', err.message);
  process.exit(1);
});
