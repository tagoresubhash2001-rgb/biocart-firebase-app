const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const targetDir = path.join(__dirname, 'legacy-patches');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const rootDir = path.resolve(__dirname, '..');
const files = fs.readdirSync(rootDir);

const patchRegex = /^(patch|fix|update|apply|check|repair|rewrite|remove|disable|organize|generate|wrap).*\.(cjs|js|py)$/;

let moved = 0;
files.forEach(f => {
  if (patchRegex.test(f) && f !== 'server.js') {
    const src = path.join(rootDir, f);
    const dest = path.join(targetDir, f);
    try {
      execSync(`git mv "${f}" "scripts/legacy-patches/${f}"`, { cwd: rootDir });
      moved++;
    } catch (e) {
      // If not in git, just move
      fs.renameSync(src, dest);
      moved++;
    }
  }
});

console.log(`Organized ${moved} legacy patch scripts into scripts/legacy-patches/`);
