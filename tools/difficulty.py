"""Dificultad de las cartas de Mitos según la marca de los bordes laterales (a media altura):
tentáculos = Difícil (H), estrella celeste/blanca = Fácil (E), sin marca = Normal (N).
Clasificador de vecinos más cercanos entrenado con el mod en inglés, cuyos mazos ya vienen separados
por dificultad (la marca no depende del idioma).
Salida: work/difficulty.json {i: 'E'|'N'|'H'}
"""
import json, os, collections
import numpy as np
from PIL import Image
from crop import cell

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(HERE, 'work')
K = 3
# Correcciones revisadas a ojo contra las imágenes
FIX = {89: 'E'}


def feats(im):
    w, h = im.size
    out = []
    for x0, x1 in ((0, .09), (.91, 1)):
        a = im.crop((int(w * x0), int(h * .30), int(w * x1), int(h * .62))).convert('RGB').resize((4, 12), Image.BILINEAR)
        out.append(np.asarray(a, dtype=np.float32).ravel() / 255)
    return np.concatenate(out)


def red_left(im):
    """Fracción de píxeles rojizos (tentáculos) en el borde izquierdo."""
    w, h = im.size
    a = np.asarray(im.crop((0, int(h * .30), int(w * .09), int(h * .62))).convert('RGB').resize((20, 60)), dtype=np.int16)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return ((r - g > 35) & (r - b > 35)).mean()


def decide(im, nn):
    # Los tentáculos se detectan muy bien por color; la estrella celeste, mejor por vecinos.
    if red_left(im) > 0.12: return 'H'
    return 'E' if nn == 'E' else 'N'


def knn(X, y, q, skip=None):
    d = ((X - q) ** 2).sum(1)
    if skip is not None: d[skip] = np.inf
    near = np.argsort(d)[:K]
    return collections.Counter(y[j] for j in near).most_common(1)[0][0]


def main():
    items = json.load(open(os.path.join(WORK, 'items.json'), encoding='utf-8'))
    en = [it for it in items if it['src'] == 'en' and it['deck'].startswith('mitos_')]
    X = np.stack([feats(cell(it['face'], it['idx'], it['nw'], it['nh'])) for it in en])
    y = [it['deck'][-1] for it in en]
    ims = [cell(it['face'], it['idx'], it['nw'], it['nh']) for it in en]
    loo = [decide(ims[k], knn(X, y, X[k], skip=k)) == y[k] for k in range(len(en))]
    print('validación (leave-one-out en el mod inglés):', sum(loo), '/', len(loo))
    out = {}
    for it in items:
        if it['src'] == 'es' and it['deck'].startswith('mitos_'):
            im = Image.open(os.path.join(WORK, 'crops', f"f{it['i']}.png"))
            out[it['i']] = FIX.get(it['i']) or decide(im, knn(X, y, feats(im)))
    json.dump(out, open(os.path.join(WORK, 'difficulty.json'), 'w'))
    print(collections.Counter(out.values()))


if __name__ == '__main__':
    main()
