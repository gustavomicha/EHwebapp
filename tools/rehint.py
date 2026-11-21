"""Recalcula sólo las ayudas en inglés (c['en'] y los recuadros c['hl']) de data.js, sin regenerar imágenes.
Mismo resultado que build_data.py para esos campos; sirve para ajustar hints.py / glossary.py rápido."""
import json, os
import build_data as B
from hints import Hinter
from glossary import TRAITS, TERMS, NAMES_FIX, NAMES_FIX_CAT


def main():
    p = os.path.join(B.APP, 'data.js'); s = open(p, encoding='utf-8').read()
    i = s.index(';\nwindow.EH_PRELUDE_FX')
    cards = json.loads(s[s.index('=') + 1:i])
    items = json.load(open(os.path.join(B.WORK, 'items.json'), encoding='utf-8'))
    ocr = B.load_ocr(); boxes = B.load_ocrbox()
    es2en, _, es2cat = B.build_names(items, ocr); es2en.update(NAMES_FIX); es2cat.update(NAMES_FIX_CAT)
    hint = Hinter(es2en, TRAITS, TERMS)
    for c in cards:
        if c['id'] >= 9000: continue
        c.pop('en', None); c.pop('hl', None)
        B.card_hints(c, B.lines(ocr, f"f{c['id']}"), boxes.get(f"f{c['id']}"), hint, es2cat)
    out = 'window.EH_CARDS=' + json.dumps(cards, ensure_ascii=False, separators=(',', ':')) + s[i:]
    open(p, 'w', encoding='utf-8').write(out)
    print(sum(len(c.get('hl', [])) for c in cards), 'apariciones')


if __name__ == '__main__':
    main()
