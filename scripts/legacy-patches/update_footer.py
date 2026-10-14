import re

with open('src/components/Footer.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_hook = "import { useHomepageCMS } from '../hooks/useHomepageCMS';\n"
if "useHomepageCMS" not in content:
    content = content.replace("import { useApp } from '../context/AppContext';", "import { useApp } from '../context/AppContext';\n" + import_hook)

if "const { cms } = useHomepageCMS();" not in content:
    content = content.replace("export const Footer: React.FC = () => {", "export const Footer: React.FC = () => {\n  const { cms } = useHomepageCMS();")

content = content.replace("Leading the transition to zero-plastic, zero-chemical horticulture with authentic organic agricultural outputs.", "{cms.footer.brandDescription}")
content = content.replace(">Follow Our Dispatch Journey<", ">{cms.footer.socialTitle}<")
content = content.replace(">Regenerating Indian Horticulture @BioCart<", ">{cms.footer.socialSubtitle}<")
content = content.replace("Ac 2026 BioCart. Sindulis Agro Products Private Limited. All Rights Reserved.", "{cms.footer.copyrightText}")

with open('src/components/Footer.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Footer.tsx updated.")
