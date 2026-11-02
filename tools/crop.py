"""Recorta cada carta (cara y dorso) de las hojas de sprites.

ES: work/crops/f{i}.png y b{i}.png a resolución original.
Todas: firma de la ilustración en work/sigs.npz (para emparejar ES<->EN y agrupar duplicados).
"""
import json, os
import numpy as np
from PIL import Image
from dl import fname

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(HERE, 'work')
Image.MAX_IMAGE_PIXELS = None
_cache = {}


def sheet(u):
    if u not in _cache:
        if len(_cache) > 8: _cache.clear()
        _cache[u] = Image.open(os.path.join(WORK, 'sheets', fname(u))).convert('RGB')
    return _cache[u]


def cell(u, idx, nw, nh):
    im = sheet(u); W, H = im.size; w = W / nw; h = H / nh
    c = idx % nw; r = idx // nw
    return im.crop((round(c * w), round(r * h), round(c * w + w), round(r * h + h)))


def sig(im):
    g = im.convert('L').resize((40, 56), Image.BILINEAR)
    a = np.asarray(g, dtype=np.float32)
    return a


def main():
    items = json.load(open(os.path.join(WORK, 'items.json'), encoding='utf-8'))
    os.makedirs(os.path.join(WORK, 'crops'), exist_ok=True)
    sigs = {}; sizes = {}
    for it in items:
        i = it['i']
        try:
            if 'idx' in it:
                f = cell(it['face'], it['idx'], it['nw'], it['nh'])
                b = cell(it['back'], it['idx'], it['nw'], it['nh']) if it['ub'] else sheet(it['back'])
            else:
                f = sheet(it['face']); b = sheet(it['back']) if it.get('back') else None
        except FileNotFoundError:
            continue
        sigs[f'f{i}'] = sig(f)
        if b is not None: sigs[f'b{i}'] = sig(b)
        sizes[i] = f.size
        if it['src'] == 'es':
            f.save(os.path.join(WORK, 'crops', f'f{i}.png'))
            if b is not None: b.save(os.path.join(WORK, 'crops', f'b{i}.png'))
    np.savez_compressed(os.path.join(WORK, 'sigs.npz'), **sigs)
    json.dump(sizes, open(os.path.join(WORK, 'sizes.json'), 'w'))
    print('ok', len(sizes))


if __name__ == '__main__':
    main()
