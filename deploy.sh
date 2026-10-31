#!/bin/bash
# Публикация на GitHub Pages: собрать статический сайт и выложить out/ в ветку gh-pages.
# (Автодеплой через Actions требует права workflow у токена gh — пока выкладываем руками.)
set -euo pipefail
cd "$(dirname "$0")"
GITHUB_ACTIONS=true npx next build
touch out/.nojekyll # иначе Pages прячет папку _next
cd out
git init -q -b gh-pages
git add -A
git -c user.name="Arthur Krantsevich" -c user.email="47790194+ArthurKrantsevich@users.noreply.github.com" commit -qm "deploy"
git push -qf https://github.com/ArthurKrantsevich/neuropilot.git gh-pages
rm -rf .git
