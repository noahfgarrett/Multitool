#!/bin/bash
set -euo pipefail

# deploy-pages.sh — Build Multitool and deploy to GitHub Pages as a PWA
# Usage: ./deploy-pages.sh

REPO="https://github.com/noahfgarrett/Multitool.git"
DEPLOY_DIR=".gh-pages-temp"

echo "==> Building Multitool..."
npm run build

echo "==> Preparing gh-pages content..."
rm -rf "$DEPLOY_DIR"
mkdir "$DEPLOY_DIR"

# Copy the built HTML as index.html (GitHub Pages serves index.html by default)
cp dist/Multitool.html "$DEPLOY_DIR/index.html"

# Inject PWA tags into <head>
# Using a temp file approach for reliable multi-line sed on macOS
node -e "
const fs = require('fs');
const html = fs.readFileSync('$DEPLOY_DIR/index.html', 'utf-8');
const pwaHead = \`
<link rel=\"manifest\" href=\"manifest.json\">
<meta name=\"theme-color\" content=\"#14B8A6\">
<meta name=\"apple-mobile-web-app-capable\" content=\"yes\">
<meta name=\"apple-mobile-web-app-status-bar-style\" content=\"black-translucent\">
<meta name=\"apple-mobile-web-app-title\" content=\"Multitool\">
<link rel=\"apple-touch-icon\" href=\"icon-192.png\">
<script>
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then(function(reg) {
    reg.addEventListener('updatefound', function() {
      var newWorker = reg.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', function() {
          if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
            console.log('Multitool updated — refresh for the latest version');
          }
        });
      }
    });
  });
  // Listen for update-available messages from the service worker
  navigator.serviceWorker.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
      if (confirm('A new version of Multitool is available. Reload now?')) {
        window.location.reload();
      }
    }
  });
}
<\\/script>\`;

const updated = html.replace('<head>', '<head>' + pwaHead);
fs.writeFileSync('$DEPLOY_DIR/index.html', updated);
console.log('  PWA tags injected into index.html');
"

# Copy PWA assets
cp sw.js manifest.json "$DEPLOY_DIR/"
cp icon-192.png icon-512.png "$DEPLOY_DIR/"

echo "==> Deploying to gh-pages branch..."
cd "$DEPLOY_DIR"
git init -q
git checkout -q -b gh-pages
git add -A
git commit -q -m "Deploy Multitool PWA to GitHub Pages"
git remote add origin "$REPO"
git push -f origin gh-pages

cd ..
rm -rf "$DEPLOY_DIR"

echo ""
echo "==> Deployed! Configuring GitHub Pages..."

# Enable GitHub Pages (create or update)
gh api repos/noahfgarrett/Multitool/pages \
  -X POST \
  -f "source[branch]=gh-pages" \
  -f "source[path]=/" 2>/dev/null || \
gh api repos/noahfgarrett/Multitool/pages \
  -X PUT \
  -f "source[branch]=gh-pages" \
  -f "source[path]=/" 2>/dev/null || \
echo "  (Pages may already be configured — check https://github.com/noahfgarrett/Multitool/settings/pages)"

echo ""
echo "==> Done! Your PWA will be live at:"
echo "    https://noahfgarrett.github.io/Multitool/"
echo ""
echo "    It may take 1-2 minutes for GitHub Pages to deploy."
echo "    Verify: manifest.json, sw.js, and Install prompt in Chrome."
