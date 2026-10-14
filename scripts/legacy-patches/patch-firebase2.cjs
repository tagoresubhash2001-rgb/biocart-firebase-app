const fs = require('fs');
const file = 'src/config/firebase.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /if \(missingKeys\.length > 0\) \{ console\.error\('Firebase config missing:', missingKeys\); \}\. Please configure your \.env file\.\`\);\s*\}/gs,
  "if (missingKeys.length > 0) { console.error('Firebase config missing:', missingKeys); }"
);

fs.writeFileSync(file, content);
