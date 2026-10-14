const fs = require('fs');

const file = 'biocart/functions/src/index.ts';
let content = fs.readFileSync(file, 'utf8');

const lines = content.split('\n');
const fixedLines = lines.slice(0, 206);

fs.writeFileSync(file, fixedLines.join('\n'));
