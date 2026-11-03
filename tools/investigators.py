"""Lista de investigadores para la partida compartida: nombre (mod en español), expansión (código de producto
del mod en inglés: EH01 = básico, EH04 = Vestigios extraños…) y retrato recortado de la hoja.
Salida: img/inv/<id>.webp e investigators.js.
"""
import json, os, re, unicodedata
from PIL import Image
from dl import get

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(HERE, 'work')
APP = os.path.dirname(HERE)
SCRATCH = 'C:/Users/gusta/AppData/Local/Temp/claude/C--dev/b56ad8a7-0a67-41b0-a0a2-0fbd57696a0a/scratchpad/eh/'
MODS = 'C:/Users/gusta/OneDrive/Dokumente/My Games/Tabletop Simulator/Mods/Workshop/'
PRODUCT = {'EH01': 'base', 'EH02': 'fl', 'EH03': 'mom', 'EH04': 'sr', 'EH05': 'utp', 'EH06': 'soc', 'EH07': 'dl', 'EH08': 'cir', 'EH09': 'mon'}
# nombres que cambian entre el mod en español y el inglés
ALIAS = {'hermana mary': 'sister mary', 'padre mateo': 'father mateo', 'ashcan pete': 'ashcan pete'}


def key(s):
    s = unicodedata.normalize('NFKD', s); s = ''.join(ch for ch in s if not unicodedata.combining(ch)).lower()
    s = re.sub(r'[^a-z ]', '', s).strip()
    return ALIAS.get(s, s)


def main():
    es = json.load(open(MODS + '2292194307.json', encoding='utf-8'))
    en = json.load(open(MODS + '2584626054.json', encoding='utf-8'))
    prod = {}
    for o in en['ObjectStates']:
        if o.get('Nickname') == 'Investigators':
            for c in o['ContainedObjects']: prod[key(c['Nickname'])] = PRODUCT.get((c.get('GMNotes') or '').strip())
    top = {o['GUID']: o for o in es['ObjectStates']}
    os.makedirs(os.path.join(APP, 'img', 'inv'), exist_ok=True)
    out = []
    for b in top['ebf869']['ContainedObjects']:
        bag = b['ContainedObjects'][0]; name = bag['Nickname'].replace('"', '«', 1).replace('"', '»', 1)
        tile = next(x for x in bag['ContainedObjects'] if x['Name'] == 'Custom_Tile')
        im = Image.open(get(tile['CustomImage']['ImageURL'])).convert('RGB')
        W, H = im.size
        # la foto del investigador ocupa la parte superior izquierda de la hoja
        ph = im.crop((round(W * .085), round(H * .085), round(W * .44), round(H * .50))).resize((240, 270), Image.LANCZOS)
        iid = re.sub(r'[^a-z]+', '-', key(bag['Nickname'])).strip('-')
        ph.save(os.path.join(APP, 'img', 'inv', f'{iid}.webp'), 'WEBP', quality=80, method=5)
        x = prod.get(key(bag['Nickname']))
        if not x: print('sin expansión:', bag['Nickname'])
        out.append({'id': iid, 'n': name, 'x': x or 'otro'})
    out.sort(key=lambda d: d['n'].strip('«').lower())
    json.dump(out, open(os.path.join(WORK, 'investigators_data.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    open(os.path.join(APP, 'investigators.js'), 'w', encoding='utf-8').write(
        '// Investigadores (generado por tools/investigators.py): id, nombre, expansión\nwindow.EH_INVESTIGATORS='
        + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
    import collections
    print(len(out), collections.Counter(d['x'] for d in out))
    print([d['n'] for d in out if d['x'] in ('sr', 'soc', 'cir')])


if __name__ == '__main__':
    main()
