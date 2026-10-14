const fs = require('fs');

function removeGuards(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/<AuthGuard>\s*<RoleGuard.*?>/, '');
  content = content.replace(/<\/RoleGuard>\s*<\/AuthGuard>/, '');
  content = content.replace(/<AuthGuard>/g, '');
  content = content.replace(/<\/AuthGuard>/g, '');
  content = content.replace(/<RoleGuard.*?>/g, '');
  content = content.replace(/<\/RoleGuard>/g, '');
  fs.writeFileSync(file, content);
  console.log(file + ' guards removed.');
}

removeGuards('src/components/admin/AdminConsole.tsx');
removeGuards('src/components/vendor/VendorConsole.tsx');
