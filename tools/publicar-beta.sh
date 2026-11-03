#!/bin/sh
# Publica la beta de v2 en /beta/ de la página (rama main), sin tocar la versión publicada en la raíz.
# Uso (desde la raíz del repo, en main):  sh tools/publicar-beta.sh && git commit -am "Beta: ..." && git push
set -e
[ "$(git branch --show-current)" = "main" ] || { echo "Correr en la rama main"; exit 1; }
mkdir -p beta
git show v2:app.js > beta/app.js
git show v2:style.css > beta/style.css
git show v2:investigators.js > beta/investigators.js
git checkout v2 -- img/inv img/tok
# misma página de v2, pero con <base href="../"> para usar las imágenes y los datos de la raíz
git show v2:index.html | sed -e 's|<head>|<head>\n<base href="../">|' -e 's|href="style.css|href="beta/style.css|' \
  -e 's|src="investigators.js|src="beta/investigators.js|' -e 's|src="app.js|src="beta/app.js|' \
  -e 's|<title>Eldritch Horror · Mazos</title>|<title>Eldritch Horror · Mazos (beta)</title>|' > beta/index.html
git add beta img/inv img/tok
echo "Beta lista en beta/ (revisar y hacer commit)"
