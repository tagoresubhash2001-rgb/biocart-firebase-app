const fs = require('fs');
const file = 'biocart/src/components/vendor/VendorDashboardHome.tsx';
let content = fs.readFileSync(file, 'utf8');
if (!content.includes('import { AdminService }')) {
    content = "import { AdminService } from '../../services/AdminService';\n" + content;
    fs.writeFileSync(file, content);
}
