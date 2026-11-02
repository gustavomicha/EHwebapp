"""Empareja cartas chicas en español (Estados, Apoyos, Hechizos, Artefactos, Apoyos únicos) con las del mod en inglés
comparando la ilustración. Salida: work/pairs.json  {i_es: [nombre_en, rasgos_en, distancia, i_en]}
"""
import json, os
import numpy as np
from PIL import Image
from crop import cell

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(HERE, 'work')
ES_DECKS = {'x_estado', 'x_hechizo', 'x_apoyo_unico', 'x_apoyo', 'x_artefacto'}
EN_DECKS = {'x_doble', 'x_apoyo', 'x_artefacto'}


def art(im):
    w, h = im.size
    a = im.crop((round(w * .06), round(h * .19), round(w * .94), round(h * .46))).convert('RGB').resize((32, 12), Image.BILINEAR)
    a = np.asarray(a, dtype=np.float32)
    a = (a - a.mean()) / (a.std() + 1e-6)
    return a.ravel()


def main():
    items = json.load(open(os.path.join(WORK, 'items.json'), encoding='utf-8'))
    es = [it for it in items if it['src'] == 'es' and it['deck'] in ES_DECKS]
    en = [it for it in items if it['src'] == 'en' and it['deck'] in EN_DECKS]
    A = np.stack([art(Image.open(os.path.join(WORK, 'crops', f"f{it['i']}.png"))) for it in es])
    B = np.stack([art(cell(it['face'], it['idx'], it['nw'], it['nh'])) for it in en])
    D = ((A[:, None, :] - B[None, :, :]) ** 2).mean(-1)
    out = {}
    for k, it in enumerate(es):
        j = int(D[k].argmin())
        out[it['i']] = [en[j]['name'], en[j]['desc'], round(float(D[k, j]), 3), en[j]['i']]
    json.dump(out, open(os.path.join(WORK, 'pairs.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    d = sorted(v[2] for v in out.values())
    print(len(out), 'dist pct', [round(d[int(len(d) * p)], 3) for p in (.1, .5, .8, .9, .95, .99)], d[-1])


if __name__ == '__main__':
    main()
