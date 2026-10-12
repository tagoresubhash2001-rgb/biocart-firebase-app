const fs = require('fs');
const file = 'src/components/vendor/VendorOrders.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('updateDoc')) {
  content = content.replace(/import \{ collection, query, where, onSnapshot \} from 'firebase\/firestore';/, "import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';");
} else if (content.includes('onSnapshot, updateDoc, doc }')) {
  // wait, did it get mangled? Let's fix imports properly
  content = content.replace(/import \{.*?\} from 'firebase\/firestore';/, "import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';");
}

fs.writeFileSync(file, content);
console.log('VendorOrders.tsx patched.');
