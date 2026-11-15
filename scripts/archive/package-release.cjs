const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const srcDir = path.resolve(__dirname, '..');
const outZipPath = path.resolve(__dirname, '../../biocart-clean-release.zip');

console.log('Source directory:', srcDir);
console.log('Target ZIP path:', outZipPath);

if (fs.existsSync(outZipPath)) {
  fs.unlinkSync(outZipPath);
}

const output = fs.createWriteStream(outZipPath);
const archive = archiver('zip', {
  zlib: { level: 9 }
});

output.on('close', () => {
  console.log(`ZIP successfully created: ${archive.pointer()} total bytes.`);
  console.log(`Saved at: ${outZipPath}`);
});

archive.on('warning', (err) => {
  if (err.code === 'ENOENT') {
    console.warn(err);
  } else {
    throw err;
  }
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);

const EXCLUDE_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  '.firebase',
  '.vscode',
  '.idea',
  'coverage'
]);

function shouldExclude(relPath, dirent) {
  const parts = relPath.split(path.sep);
  for (const part of parts) {
    if (EXCLUDE_DIRS.has(part)) return true;
  }
  const fileName = dirent.name;
  if (fileName.endsWith('.zip')) return true;
  if (fileName.startsWith('.env') && fileName !== '.env.example') return true;
  if (fileName.endsWith('.local')) return true;
  if (fileName.startsWith('service-account') && fileName.endsWith('.json')) return true;
  if (parts.includes('scratch')) return true;
  return false;
}

let fileCount = 0;
function walkAndAdd(currentDir, relativeBase = '') {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    const relPath = relativeBase ? path.join(relativeBase, entry.name) : entry.name;

    if (shouldExclude(relPath, entry)) {
      continue;
    }

    if (entry.isDirectory()) {
      walkAndAdd(fullPath, relPath);
    } else if (entry.isFile()) {
      // Use POSIX forward slashes in ZIP
      const entryName = relPath.split(path.sep).join('/');
      archive.file(fullPath, { name: entryName });
      fileCount++;
    }
  }
}

walkAndAdd(srcDir);
console.log(`Queued ${fileCount} files for archiving.`);
archive.finalize();
