const fs = require('fs');

let config = fs.readFileSync('src/config/firebase.ts', 'utf8');

// replace getFirestore(app) with getFirestore(app, databaseId)
config = config.replace(
  "export const db = getFirestore(app);",
  "const databaseId = getEnvVar('VITE_FIREBASE_FIRESTORE_DATABASE_ID');\nexport const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);"
);

fs.writeFileSync('src/config/firebase.ts', config);
console.log('Patched firebase config with databaseId');
