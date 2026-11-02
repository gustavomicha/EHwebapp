"""OCR (RapidOCR) de las cartas en español.  Uso: python ocr.py SHARD NSHARDS
Salida: work/ocr_{SHARD}.json  {"f123": [[x, y, texto], ...], "b123": ...}  (x, y relativos)
"""
import json, os, sys
import numpy as np
from PIL import Image
from rapidocr_onnxruntime import RapidOCR

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(HERE, 'work')
SKIP = {'monstruo', 'epico', 'tile'}
BACKS = {'expedicion', 'ruinas', 'aosheet'}   # el dorso dice la ubicación / es la otra cara de la hoja


def load(k, deck):
    im = Image.open(os.path.join(WORK, 'crops', f'{k}.png')).convert('RGB')
    if deck in ('misterio', 'aventura') and im.size[0] < im.size[1]: im = im.rotate(90, expand=True)
    tw = 1100 if deck == 'aosheet' else 760
    if im.size[0] > tw: im = im.resize((tw, round(im.size[1] * tw / im.size[0])))
    return im


def main():
    sh, ns = int(sys.argv[1]), int(sys.argv[2])
    out_p = os.path.join(WORK, f'ocr_{sh}.json')
    items = json.load(open(os.path.join(WORK, 'items.json'), encoding='utf-8'))
    o = RapidOCR(); out = json.load(open(out_p, encoding='utf-8')) if os.path.exists(out_p) else {}
    todo = [it for it in items if it['src'] == 'es' and it['deck'] not in SKIP and it['i'] % ns == sh]
    for n, it in enumerate(todo):
        for s in ['f'] + (['b'] if it['deck'] in BACKS else []):
            k = f"{s}{it['i']}"
            if k in out or not os.path.exists(os.path.join(WORK, 'crops', k + '.png')): continue
            im = load(k, it['deck'])
            r, _ = o(np.asarray(im))
            out[k] = [[round(float(x[0][0][0]) / im.size[0], 3), round(float(x[0][0][1]) / im.size[1], 3), x[1]] for x in (r or [])]
        if n % 25 == 0:
            json.dump(out, open(out_p, 'w', encoding='utf-8'), ensure_ascii=False); print(sh, n, len(todo), flush=True)
    json.dump(out, open(out_p, 'w', encoding='utf-8'), ensure_ascii=False); print('done', sh)


if __name__ == '__main__':
    main()
