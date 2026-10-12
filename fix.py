import os

with open('src/index.css', 'r', encoding='utf-8') as f:
    content = f.read()

importOld = "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Space+Grotesk:wght@400;500;600;700&display=swap');"
importNew = "@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap');"

content = content.replace(importOld, importNew)

themeOld = '''@theme {
  --font-sans: "Inter", "Outfit", system-ui, sans-serif;
  --font-display: "Space Grotesk", system-ui, sans-serif;
  --font-serif: "Playfair Display", Georgia, serif;

  --color-nature-900: #062413;
  --color-nature-800: #0F3D2E;
  --color-nature-700: #0F8A43;
  --color-nature-600: #10a34e;
  --color-nature-500: #1dbf5e;
  --color-nature-400: #4ade80;
  --color-nature-300: #86efac;
  --color-nature-200: #bbf7d0;
  --color-nature-100: #dcfce7;
  --color-nature-50: #f0fdf4;

  --color-earth-900: #451a03;
  --color-earth-800: #78350f;
  --color-earth-700: #b45309;
  --color-earth-600: #d97706;
  --color-earth-500: #f59e0b;
  --color-earth-200: #fde68a;
  --color-earth-100: #fef3c7;
  --color-earth-50: #fffbeb;

  --color-charcoal-950: #0b0f12;
  --color-charcoal-900: #12181d;
  --color-charcoal-800: #1e252b;
  --color-charcoal-700: var(--charcoal-700);
  --color-charcoal-600: var(--charcoal-600);
  --color-charcoal-500: var(--charcoal-500);
  --color-charcoal-400: var(--charcoal-400);
  --color-slate-400: var(--slate-400);
  --color-gray-400: var(--gray-400);
}

:root {
  --charcoal-700: #2E2E2E;
  --charcoal-600: #2E2E2E;
  --charcoal-500: #2E2E2E;
  --charcoal-400: #4b5660;
  --slate-400: #4b5660;
  --gray-400: #4b5660;
}

.dark {
  --charcoal-700: #cbd5e1;
  --charcoal-600: #cbd5e1;
  --charcoal-500: #cbd5e1;
  --charcoal-400: #cbd5e1;
  --slate-400: #cbd5e1;
  --gray-400: #cbd5e1;
}'''

themeNew = '''@theme {
  --font-sans: "Poppins", system-ui, sans-serif;
  --font-serif: "Playfair Display", Georgia, serif;

  --color-primary: var(--primary);
  --color-primary-hover: var(--primary-hover);
  --color-primary-tint: var(--primary-tint);
  --color-bg: var(--bg);
  --color-card: var(--card);
  --color-border: var(--border);
  --color-text: var(--text);
  --color-muted: var(--muted);
  --color-on-primary: var(--on-primary);

  --color-success: #2F7D5B;
  --color-warning: #B7791F;
  --color-error: #A63A3A;
  --color-info: #2D5F7A;
  --color-accent: #B8924A;
}

/* Storefront theme — "Cyprus + Sand" (blueprint 5.1) */
:root {
  --primary: #004643;
  --primary-hover: #003532;
  --primary-tint: #E3EDEA;
  --bg: #F0EDE5;
  --card: #F8F6F1;
  --border: #E4DFD2;
  --text: #1C2B2A;
  --muted: #5B6B69;
  --on-primary: #F0EDE5;
}

/* Vendor/Admin panel theme — "Plum + Milk" (blueprint 5.1).
   Add class="panel" to the root element of AdminLayout and VendorLayout. */
.panel {
  --primary: #310A31;
  --primary-hover: #240723;
  --primary-tint: #EDE4EC;
  --bg: #F4ECD6;
  --card: #FAF6EA;
  --border: #E8DEC2;
  --text: #2A1429;
  --muted: #6E5A6D;
  --on-primary: #F4ECD6;
}'''

content = content.replace(themeOld, themeNew)

bodyOld = '''  body {
    @apply transition-colors duration-300;
    color: #000000;
    background-color: #FDFBD4 !important;
  }

  .dark body {
    color: #e2e8f0;
    background-color: var(--color-charcoal-950) !important;
  }

  h1, h2, h3, h4, h5, h6 {
    color: #0F3D2E;'''

bodyNew = '''  body {
    @apply transition-colors duration-300;
    color: var(--text);
    background-color: var(--bg) !important;
  }

  h1, h2, h3, h4, h5, h6 {
    color: var(--text);'''

content = content.replace(bodyOld, bodyNew)

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(content)
print('index.css updated')
