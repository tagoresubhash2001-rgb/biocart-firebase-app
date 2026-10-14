const fs = require('fs');

const file = 'biocart/src/types/index.ts';
let content = fs.readFileSync(file, 'utf8');

if (content.includes("'homepage' | 'order' | 'faq' | 'review'") && !content.includes("'page'")) {
    content = content.replace(
        "'homepage' | 'order' | 'faq' | 'review'", 
        "'homepage' | 'order' | 'faq' | 'review' | 'page'"
    );
    fs.writeFileSync(file, content);
}
