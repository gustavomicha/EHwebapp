"""Planillas para revisar a ojo los recuadros en inglés: un recorte del renglón de cada aparición, con el recuadro
dibujado y el texto del cartel al lado.  Uso: python review_hl.py [desde] [hasta]  ->  work/review/hl_NN.png
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__)); APP = os.path.dirname(HERE)
OUT = os.path.join(HERE, 'work', 'review'); os.makedirs(OUT, exist_ok=True)
PER = 28  # recortes por planilla
CW, CH = 560, 70  # tamaño del recorte en la planilla
FONT = ImageFont.truetype('arial.ttf', 15); SMALL = ImageFont.truetype('arial.ttf', 12)


def label(c, h):
    es, eng, k, *cat = c['en'][h[0]]
    main, sub = eng, ''
    if eng.endswith(')') and ' (' in eng: main, sub = eng[:-1].split(' (', 1)
    if k == 'r': main = main.upper()
    typ = h[1] or (cat[0] if (k == 'n' and cat) else '')
    if typ.startswith('!'): main, typ = 'non-' + main, typ[1:]
    return f"{main} {typ}".strip() + (f'  ({sub})' if sub else ''), es


def main():
    s = open(os.path.join(APP, 'data.js'), encoding='utf-8').read()
    cards = json.loads(s[s.index('=') + 1:s.index(';\nwindow.EH_PRELUDE_FX')])
    rows = []
    for c in sorted(cards, key=lambda c: (c['k'], c['id'])):
        for h in c.get('hl', []):
            rows.append((c, h))
    a = int(sys.argv[1]) if len(sys.argv) > 1 else 0; b = int(sys.argv[2]) if len(sys.argv) > 2 else len(rows)
    rows = rows[a:b]
    cache = {}
    for n in range(0, len(rows), PER):
        chunk = rows[n:n + PER]
        sheet = Image.new('RGB', (CW + 380, CH * len(chunk)), 'white'); d = ImageDraw.Draw(sheet)
        for j, (c, h) in enumerate(chunk):
            if c['id'] not in cache: cache[c['id']] = Image.open(os.path.join(APP, 'img', 'c', f"{c['id']}.webp")).convert('RGB')
            im = cache[c['id']]; W, H = im.size
            bx = [h[i:i + 4] for i in range(2, len(h), 4)]
            x0, y0, x1, y1 = bx[0]
            cy = (y0 + y1) / 2 * H; lh = (y1 - y0) * H
            top = max(0, cy - lh * 1.6); bot = min(H, top + lh * 3.2)
            cx = (x0 + x1) / 2 * W
            left = max(0, min(W - CW, cx - CW / 2)) if W > CW else 0
            crop = im.crop((left, top, left + min(CW, W), bot)).copy(); cd = ImageDraw.Draw(crop)
            for X0, Y0, X1, Y1 in bx:
                cd.rectangle((X0 * W - left - 2, Y0 * H - top - 1, X1 * W - left + 2, Y1 * H - top + 1), outline=(220, 0, 120), width=2)
            sc = min(1, CH / crop.size[1]); crop = crop.resize((int(crop.size[0] * sc), int(crop.size[1] * sc)))
            sheet.paste(crop, (0, j * CH))
            txt, es = label(c, h)
            d.text((CW + 8, j * CH + 8), txt, fill=(0, 0, 0), font=FONT)
            d.text((CW + 8, j * CH + 30), f"#{n + a + j}  carta {c['id']} {c['k']}  es: {es}  boxes {len(bx)}", fill=(90, 90, 90), font=SMALL)
            d.line((0, (j + 1) * CH - 1, CW + 380, (j + 1) * CH - 1), fill=(200, 200, 200))
        sheet.save(os.path.join(OUT, f'hl_{(n + a) // PER:03d}.png'))
    print(len(rows), 'apariciones')


if __name__ == '__main__':
    main()
