"""Detecta el ícono de expansión (esquina inferior izquierda) de cada carta en español.

Íconos: libro = Saber olvidado (fl), cabeza = Vestigios extraños (sr),
garabato = Señales de Carcosa (soc), signo «A» = Ciudades en ruinas (cir), sin ícono = juego base.
Salida: work/icons.json  {i: [exp, score]}
"""
import json, os
import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(HERE, 'work')
W = 400
THR = 0.6
EXPS = ['fl', 'sr', 'soc', 'cir']


# Mazos cuyas cartas están giradas en las hojas (se leen girando 90° a la izquierda)
ROTATED = {'misterio'}
MYST_REF = 1211  # un Misterio de Yog-Sothoth de Saber olvidado


def corner(i, rot=False):
    im = cv2.imread(os.path.join(WORK, 'crops', f'f{i}.png'), cv2.IMREAD_GRAYSCALE)
    if rot: im = cv2.rotate(im, cv2.ROTATE_90_COUNTERCLOCKWISE)
    h, w = im.shape
    im = cv2.resize(im, (W, round(h * W / w)), interpolation=cv2.INTER_AREA)
    h = im.shape[0]
    return im[int(h * .78):, :int(W * .24)]


# Recorte (x0, y0, x1, y1) del ícono dentro de la esquina de la carta de referencia
BOX = {'fl': (15, 95, 49, 119), 'sr': (11, 95, 45, 123), 'soc': (11, 93, 45, 122), 'cir': (18, 93, 48, 120)}


def template(i, e):
    x0, y0, x1, y1 = BOX[e]
    return corner(i)[y0:y1, x0:x1]


def main():
    items = json.load(open(os.path.join(WORK, 'items.json'), encoding='utf-8'))
    es = [it for it in items if it['src'] == 'es' and 'idx' in it and os.path.exists(os.path.join(WORK, 'crops', f"f{it['i']}.png"))]
    tpl = {}
    for e in EXPS:
        ref = next(it for it in es if it.get('exp') == e and it['deck'] == 'general')
        tpl[e] = template(ref['i'], e)
        cv2.imwrite(os.path.join(WORK, f'tpl_{e}.png'), tpl[e])
    out = {}
    for it in es:
        rot = it['deck'] in ROTATED
        c = corner(it['i'], rot)
        sc = {}
        for e, t in tpl.items():
            for s in ((0.42, 0.48, 0.54, 0.6, 0.66) if rot else (0.85, 0.92, 1.0, 1.08, 1.16)):
                tt = cv2.resize(t, None, fx=s, fy=s)
                if tt.shape[0] >= c.shape[0] or tt.shape[1] >= c.shape[1]: continue
                sc[e] = max(sc.get(e, -1), float(cv2.matchTemplate(c, tt, cv2.TM_CCOEFF_NORMED).max()))
        (e1, s1), (e2, s2) = sorted(sc.items(), key=lambda kv: -kv[1])[:2]
        out[it['i']] = [e1 if s1 >= THR else 'base', round(s1, 3), round(s1 - s2, 3)]
    # Misterios: el ícono es diminuto y está en la esquina; sólo hace falta distinguir Saber olvidado
    def reg(i):
        im = cv2.imread(os.path.join(WORK, 'crops', f'f{i}.png'), cv2.IMREAD_GRAYSCALE)
        im = cv2.rotate(im, cv2.ROTATE_90_COUNTERCLOCKWISE)
        h, w = im.shape; t = im[int(h * .86):, :int(w * .09)]
        return cv2.resize(t, (80, round(80 * t.shape[0] / t.shape[1])))
    book = reg(MYST_REF)[18:45, 27:67]
    for it in es:
        if it['deck'] != 'misterio': continue
        r = float(cv2.matchTemplate(reg(it['i']), book, cv2.TM_CCOEFF_NORMED).max())
        out[it['i']] = ['fl' if r >= 0.6 else 'base', round(r, 3), 0]
    json.dump(out, open(os.path.join(WORK, 'icons.json'), 'w'))
    import collections
    cnt = collections.Counter((it['where'], it['deck'], it.get('exp') or it.get('ao'), out[it['i']][0]) for it in es)
    for k, v in sorted(cnt.items(), key=lambda kv: [str(x) for x in kv[0]]): print(v, k)


if __name__ == '__main__':
    main()
