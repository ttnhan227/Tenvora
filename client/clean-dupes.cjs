const fs = require('fs');
const path = require('path');

const locales = ['en', 'vi', 'es', 'fr', 'de', 'pt-BR', 'id'];

for (const code of locales) {
  const filePath = path.join(__dirname, 'src', 'locales', `${code}.ts`);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\r\n');
  const seen = new Set();
  const cleanLines = [];

  for (const line of lines) {
    const match = line.match(/^\s*"([^"]+)":/);
    if (match) {
      const key = match[1];
      if (seen.has(key)) {
        console.log(`[${code}] Removed duplicate key: ${key}`);
        continue;
      }
      seen.add(key);
    }
    cleanLines.push(line);
  }

  fs.writeFileSync(filePath, cleanLines.join('\r\n'), 'utf8');
}
