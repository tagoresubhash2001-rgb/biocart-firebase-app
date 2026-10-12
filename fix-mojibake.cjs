const fs = require('fs');
const path = require('path');

function replaceMojibake(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceMojibake(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('â‚¹')) {
        content = content.replace(/â‚¹/g, '₹');
        fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  }
}

replaceMojibake('biocart/src');
