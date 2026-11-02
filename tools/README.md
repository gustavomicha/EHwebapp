# Herramientas de generación

Scripts que produjeron `data.js` e `img/` a partir de los mods de Tabletop Simulator
«Eldritch Horror + Expansiones [Español] SCRIPTS» (Workshop 2292194307) y «Eldritch Horror Complete +» (2584626054).
No hacen falta para usar la app. Se corren desde esta carpeta con el entorno de Python de `C:/dev/AH3app/tools/.venv`
(Pillow, numpy, OpenCV, RapidOCR).

1. `extract.py` — recorre los dos mods y lista cartas, losetas y hojas de sprites (`work/items.json`, `work/urls.txt`).
   El destino de cada mazo de expansión sale de los scripts Lua de las bolsas del mod.
2. `dl.py` — descarga las hojas a `work/sheets/` (usa la caché de TTS si ya están).
3. `crop.py` — recorta cada carta (`work/crops/`) y guarda firmas de imagen (`work/sigs.npz`).
4. `icons.py` — expansión de cada carta por su ícono (esquina inferior izquierda) → `work/icons.json`.
   Sirve sobre todo para separar las cartas de Saber olvidado dentro de los mazos de los Primigenios básicos.
5. `difficulty.py` — dificultad de las cartas de Mitos (tentáculos = Difícil, estrella = Fácil) → `work/difficulty.json`.
   Se valida contra el mod en inglés, que ya trae los mazos separados por dificultad (214/217 aciertos; el resto se revisó a mano).
6. `ocr.py N 4` — OCR de las cartas en español en 4 procesos (`work/ocr_*.json`).
7. `pair.py` — empareja las cartas chicas en español con las del mod en inglés por la ilustración → `work/pairs.json`.
8. `build_data.py` — genera `data.js` e `img/` (caras, dorsos agrupados y hojas de Primigenio).
   Usa `glossary.py` (rasgos, términos, efectos de Preludios, correcciones) y `hints.py` (detección de nombres y rasgos en el texto).

`work/` guarda los datos intermedios; las hojas, recortes y firmas no se versionan (se regeneran con los pasos 2 y 3).
