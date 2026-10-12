const fs = require('fs');
let pkg = JSON.parse(fs.readFileSync('functions/package.json'));
pkg.devDependencies["typescript"] = "^5.0.0";
pkg.devDependencies["@types/node"] = "^18.15.11";
fs.writeFileSync('functions/package.json', JSON.stringify(pkg, null, 2));
