const fs = require('fs');
const file = 'biocart/src/config/firebase.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  /export const db = databaseId \? getFirestore\(app, databaseId\) : getFirestore\(app\);/g,
  "export const db = (databaseId && databaseId !== '(default)') ? getFirestore(app, databaseId) : getFirestore(app);"
);
fs.writeFileSync(file, content);
console.log("firebase.ts fixed!");
