/**
 * Injects PWA tags + service-worker registration into dist/index.html after
 * `expo export --platform web`. Runs as part of `build:web`.
 */
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const file = path.join(dist, 'index.html');
if (!fs.existsSync(file)) {
  console.error('patch-pwa-html: dist/index.html not found — run expo export first');
  process.exit(1);
}

let html = fs.readFileSync(file, 'utf8');

const tags = [
  '<link rel="manifest" href="/manifest.json"/>',
  '<meta name="theme-color" content="#DC2626"/>',
  '<meta name="apple-mobile-web-app-capable" content="yes"/>',
  '<meta name="mobile-web-app-capable" content="yes"/>',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>',
  '<meta name="apple-mobile-web-app-title" content="UCHIHA"/>',
  '<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png"/>',
  '<link rel="icon" href="/icons/icon-96.png"/>',
  '<meta name="description" content="UCHIHA Clan Messenger — private clan chat, rooms, war coordination."/>',
].join('\n    ');

html = html.replace('</head>', `    ${tags}\n  </head>`);

const swSnippet = [
  '<script>',
  "  if ('serviceWorker' in navigator) {",
  "    window.addEventListener('load', function () {",
  "      navigator.serviceWorker.register('/sw.js').catch(function () {});",
  '    });',
  '  }',
  '</script>',
].join('\n');
html = html.replace('</body>', `${swSnippet}\n  </body>`);

fs.writeFileSync(file, html);
console.log('patch-pwa-html: PWA tags + SW registration injected into dist/index.html');
