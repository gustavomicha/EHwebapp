"""OCR con la posición de cada letra, para resaltar en la carta las palabras que se traducen.
Uso: python ocrbox.py SHARD NSHARDS
Salida: work/ocrbox_{SHARD}.json  {"f123": [[texto, y0, y1, [x0, x1, x0, x1, ...]], ...]}
(coordenadas relativas a la imagen ya rotada, como la muestra la app; un par x0, x1 por carácter del texto)
Mismo motor y mismos parámetros que ocr.py, así que el texto de cada renglón coincide con work/ocr_*.json.
"""
import json, os, sys
import numpy as np
from rapidocr_onnxruntime import RapidOCR
from ocr import load, SKIP

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(HERE, 'work')


def main():
    sh, ns = int(sys.argv[1]), int(sys.argv[2])
    out_p = os.path.join(WORK, f'ocrbox_{sh}.json')
    items = json.load(open(os.path.join(WORK, 'items.json'), encoding='utf-8'))
    o = RapidOCR(); out = json.load(open(out_p, encoding='utf-8')) if os.path.exists(out_p) else {}
    todo = [it for it in items if it['src'] == 'es' and it['deck'] not in SKIP and it['deck'] != 'aosheet' and it['i'] % ns == sh]
    for n, it in enumerate(todo):
        k = f"f{it['i']}"
        if k in out or not os.path.exists(os.path.join(WORK, 'crops', k + '.png')): continue
        im = load(k, it['deck']); W, H = im.size
        r, _ = o(np.asarray(im), return_word_box=True)
        rows = []
        for x in (r or []):
            box, text = x[0], x[1]
            cb = x[3] if len(x) > 3 else None
            ys = [p[1] for p in box]
            if cb and len(cb) == len(text):
                xs = []
                for q in cb: xs += [round(min(p[0] for p in q) / W, 4), round(max(p[0] for p in q) / W, 4)]
                ys = ys + [p[1] for q in cb for p in q]
            else:
                # sin cajas por letra: se reparte el ancho del renglón en partes iguales
                x0, x1 = min(p[0] for p in box), max(p[0] for p in box); step = (x1 - x0) / max(1, len(text))
                xs = []
                for j in range(len(text)): xs += [round((x0 + j * step) / W, 4), round((x0 + (j + 1) * step) / W, 4)]
            rows.append([text, round(min(ys) / H, 4), round(max(ys) / H, 4), xs])
        out[k] = rows
        if n % 25 == 0:
            json.dump(out, open(out_p, 'w', encoding='utf-8'), ensure_ascii=False); print(sh, n, len(todo), flush=True)
    json.dump(out, open(out_p, 'w', encoding='utf-8'), ensure_ascii=False); print('done', sh)


if __name__ == '__main__':
    main()
