"""Genera data.js e img/ a partir de work/ (items, íconos, dificultad, OCR, emparejamientos).

data.js:
  EH_CARDS   [{id, k, x, ao?, sd?, c?, df?, ty?, n?, loc?, b, r, t}]
  EH_ES2EN   nombre de carta en español -> nombre en inglés (rasgos)
  EH_TRAITS  rasgo en español (VERSALITAS en las cartas) -> inglés
  EH_TERMS   términos de reglas español -> inglés
  EH_PRELUDE_FX  efectos de Preludios sobre los mazos
"""
import json, os, re, glob, collections, unicodedata
import numpy as np
from PIL import Image
from hints import Hinter
from glossary import MYTHOS_TOKENS

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(HERE, 'work')
APP = os.path.dirname(HERE)
AO_EXP = {'azathoth': 'base', 'cthulhu': 'base', 'shub': 'base', 'yog': 'base', 'yig': 'fl', 'syzygy': 'sr', 'hastur': 'soc', 'shudde': 'cir'}
SD = {'El vacio entre los mundos': 'El vacío entre los mundos'}
DECK2K = {'america': 'america', 'europa': 'europa', 'asia': 'asia', 'general': 'general', 'otros': 'otros', 'expedicion': 'expedicion',
          'mitos_verde': 'mitos', 'mitos_amarillo': 'mitos', 'mitos_azul': 'mitos', 'ruinas': 'ruinas', 'aventura': 'aventura',
          'devastacion': 'devastacion', 'desastre': 'desastre', 'preludios': 'preludio'}
COLOR = {'mitos_verde': 'g', 'mitos_amarillo': 'y', 'mitos_azul': 'b'}
ROT = {'misterio', 'aventura'}
# Cartas duplicadas en el mod (misma carta en dos hojas): imagen parecida y mismo texto
DUP_THR = 5.5
DUP_TXT = 0.6
BACK_THR = 6.0

# Correcciones manuales revisadas contra las imágenes: id -> campos
FIX = {
    820: {'loc': 'El corazón de África'},  # nombre en dos renglones
    1158: {'n': 'Descubrimiento de un alineamiento cósmico'},
    # Preludios (títulos en mayúsculas que el OCR pega)
    649: {'n': 'Alineamiento cósmico'}, 650: {'n': 'La tormenta que se avecina'}, 651: {'n': 'Oscuras bendiciones'},
    652: {'n': 'El horror de Dunwich'}, 895: {'n': 'Convertir las debilidades en fortalezas'}, 896: {'n': 'Pecados del pasado'},
    897: {'n': 'El Rey Amarillo'}, 898: {'n': 'Almacén del Crepúsculo de Plata'}, 987: {'n': 'Sabes lo que debes hacer'},
    988: {'n': 'El precio del prestigio'}, 989: {'n': 'La caída del hombre'}, 990: {'n': 'Se acerca el apocalipsis'},
}


def fold(s):
    s = unicodedata.normalize('NFKD', s or ''); s = ''.join(ch for ch in s if not unicodedata.combining(ch))
    return s.lower()


def load_ocr():
    o = {}
    for f in glob.glob(os.path.join(WORK, 'ocr_*.json')): o.update(json.load(open(f, encoding='utf-8')))
    return o


def lines(o, k): return o.get(k, [])


def title_top(L, ymax=0.12):
    c = [t for x, y, t in L if y < ymax and len(re.sub(r'[^A-Za-zÁÉÍÓÚÑáéíóúñ]', '', t)) >= 3]
    return c[0].strip() if c else None


def mythos_info(L):
    ty = None; ty_y = None
    for x, y, t in L:
        u = fold(t).replace(' ', '')
        if 'rumor' in u and y > 0.3 and len(u) < 16: ty, ty_y = 'rumor', y; break
        if u.startswith('activo') and y > 0.3 and len(u) < 16: ty, ty_y = 'activo', y; break
        if u.startswith('evento') and y > 0.3 and len(u) < 10: ty, ty_y = 'evento', y; break
    n = None
    if ty_y is not None:
        above = [(y, t) for x, y, t in L if ty_y - 0.17 < y < ty_y - 0.03 and len(t) > 3]
        if above: n = max(above)[1].strip()
    return ty, n


def squash(s): return re.sub(r'[^a-z0-9]', '', fold(s))


PRELUDE_RULES = re.compile(r'^(antes|durante|despues|tras|al final)')


def rules_text(c, L):
    """Sólo el texto de reglas de la carta (sin título ni texto de ambientación), para las ayudas en inglés."""
    k = c['k']
    if k == 'mitos':
        # el texto de ambientación y el título van arriba de la línea del tipo (EVENTO / RUMOR / ACTIVO)
        ty_y = next((y for x, y, t in L if y > 0.3 and re.match(r'^(evento|activo|rumor)', fold(t).replace(' ', ''))), None)
        if ty_y is not None: L = [l for l in L if l[1] > ty_y + 0.005]
    elif k == 'misterio':
        # título arriba, ambientación en el recuadro del medio y reglas en el de abajo: corta en el salto más grande
        L = sorted([l for l in L if l[1] > 0.16], key=lambda l: l[1])
        gaps = [(L[i + 1][1] - L[i][1], i + 1) for i in range(len(L) - 1)]
        if gaps:
            g, at = max(gaps)
            if g > 0.08: L = L[at:]
    elif k == 'preludio':
        at = next((i for i, l in enumerate(L) if PRELUDE_RULES.match(fold(l[2]).strip())), None)
        if at is not None: L = L[at:]
    elif k == 'desastre':
        L = [l for l in L if l[1] > 0.56]
    elif k == 'aventura':
        L = [l for l in L if l[1] > 0.1]
    return ' '.join(t for x, y, t in L)


CITY_CAPS = ['Buenos Aires', 'San Francisco', 'Londres', 'Roma', 'Tokio', 'Shanghái', 'Sídney', 'Arkham', 'Estambul']


def polish(s):
    """Arregla palabras pegadas, «¡» leída como «i» y tildes frecuentes en títulos."""
    from glossary import TITLE_GLUE, TITLE_WORDS
    s = re.sub(r'^i\s*(?=\S)', '¡', s.strip(), flags=re.I) if re.match(r'^i\s*[A-ZÁÉÍÓÚÑ]', s.strip(), re.I) and s.strip().endswith('!') else s.strip()
    s = s.replace('"', '').replace("'", "'").strip()
    for a, b in TITLE_GLUE.items():
        if a in s and b not in s: s = s.replace(a, b)
    def word(m):
        w = m.group(0); r = TITLE_WORDS.get(w.lower())
        if not r: return w
        return r[0].upper() + r[1:] if w[0].isupper() else r
    s = re.sub(r'[A-Za-zñÑ]+', word, s)
    for city in CITY_CAPS:
        s = re.sub(fold(city).replace('a', '[aá]').replace('i', '[ií]'), city, s, flags=re.I) if fold(city) in fold(s) else s
    if s.startswith('¡') and len(s) > 1: return '¡' + s[1].upper() + s[2:]
    return s[0].upper() + s[1:] if s else s


def pretty(s):
    """Arregla espacios perdidos por el OCR en títulos cortos (minúscula seguida de mayúscula)."""
    s = re.sub(r'(?<=[a-záéíóúñ])(?=[A-ZÁÉÍÓÚÑ])', ' ', s or '')
    return re.sub(r'\s+', ' ', s).strip()


def main():
    items = json.load(open(os.path.join(WORK, 'items.json'), encoding='utf-8'))
    icons = json.load(open(os.path.join(WORK, 'icons.json')))
    diff = json.load(open(os.path.join(WORK, 'difficulty.json')))
    ocr = load_ocr()
    sigs = np.load(os.path.join(WORK, 'sigs.npz'))
    cards = []
    for it in items:
        if it['src'] != 'es': continue
        i = it['i']; w = it['where']; d = it['deck']
        c = None
        if w == 'top' and d in DECK2K and d not in ('ruinas', 'preludios'):
            c = dict(k=DECK2K[d], x='base')
        elif w == 'bag' and d in DECK2K:
            c = dict(k=DECK2K[d], x=it['exp'])
        elif w == 'ao':
            x = AO_EXP[it['ao']]
            if x == 'base': x = icons[str(i)][0] if icons[str(i)][0] == 'fl' else 'base'
            c = dict(k=d, x=x, ao=it['ao'])
            if d == 'especial': c['sd'] = SD.get(it['aodeck'], it['aodeck'])
        if c is None: continue
        if d in COLOR: c['c'] = COLOR[d]; c['df'] = diff[str(i)]
        c['id'] = i
        cards.append(c)
    # duplicados dentro del mismo mazo
    groups = collections.defaultdict(list)
    for c in cards: groups[(c['k'], c['x'], c.get('ao'), c.get('sd'))].append(c)
    def grams(i):
        t = re.sub(r'[^a-z]', '', fold(' '.join(t for x, y, t in lines(ocr, f'f{i}'))))
        return {t[k:k + 3] for k in range(len(t) - 2)}
    def same(a, b):
        d = np.abs(sigs[f"f{a}"] - sigs[f"f{b}"]).mean()
        ga, gb = grams(a), grams(b)
        if not ga or not gb: return d < 2.0
        jac = len(ga & gb) / len(ga | gb)
        # texto casi idéntico = misma carta aunque el escaneo sea distinto
        return jac > 0.9 or (d < DUP_THR and jac > DUP_TXT)
    keep = []; ndup = 0
    for g, cs in groups.items():
        kept = []
        for c in cs:
            if any(same(c['id'], k['id']) for k in kept): ndup += 1; continue
            kept.append(c)
        keep += kept
    cards = keep
    print('duplicados quitados:', ndup)
    # texto y campos derivados
    for c in cards:
        i = c['id']; L = lines(ocr, f'f{i}')
        c['t'] = ' '.join(t for x, y, t in L)
        if c['k'] == 'mitos':
            ty, n = mythos_info(L)
            if ty: c['ty'] = ty
            if n: c['n'] = polish(pretty(n))
        elif c['k'] == 'desastre':
            # título en VERSALITAS a media altura, a veces en dos renglones («¡UN TSUNAMI / DESTRUYE TOKIO!»)
            n = ' '.join(t for x, y, t in L if 0.47 < y < 0.56)
            if n: c['n'] = polish(n.capitalize())
        elif c['k'] in ('misterio', 'preludio', 'aventura'):
            n = title_top(L, 0.12 if c['k'] != 'misterio' else 0.16)
            if n: c['n'] = polish(pretty(n).capitalize() if n.isupper() else pretty(n))
        elif c['k'] in ('expedicion', 'ruinas'):
            n = title_top(L, 0.08)
            if n: c['loc'] = polish(pretty(n))
        c.update(FIX.get(i, {}))
        c.update(MYTHOS_TOKENS.get(i, {}))
    # imágenes
    os.makedirs(os.path.join(APP, 'img', 'c'), exist_ok=True)
    import shutil
    shutil.rmtree(os.path.join(APP, 'img', 'b'), ignore_errors=True)
    os.makedirs(os.path.join(APP, 'img', 'b'), exist_ok=True)
    keep_ids = {f"{c['id']}.webp" for c in cards}
    for fn in os.listdir(os.path.join(APP, 'img', 'c')):
        if fn not in keep_ids: os.remove(os.path.join(APP, 'img', 'c', fn))
    backs = {}
    for c in cards:
        i = c['id']
        f = Image.open(os.path.join(WORK, 'crops', f'f{i}.png')).convert('RGB')
        bp = os.path.join(WORK, 'crops', f'b{i}.png')
        b = Image.open(bp).convert('RGB') if os.path.exists(bp) else None
        if c['k'] in ROT and f.size[0] < f.size[1]:
            f = f.rotate(90, expand=True)
            if b is not None: b = b.rotate(90, expand=True)
        c['r'] = round(f.size[0] / f.size[1], 3)
        tw = 900 if c['r'] > 1 else 700
        if f.size[0] > tw: f = f.resize((tw, round(f.size[1] * tw / f.size[0])), Image.LANCZOS)
        fp = os.path.join(APP, 'img', 'c', f'{i}.webp')
        if not os.path.exists(fp): f.save(fp, 'WEBP', quality=80, method=5)
        if b is not None:
            # dorsos iguales (escaneados en hojas distintas) se agrupan por parecido
            bs = sigs[f'b{i}']
            h = next((k for k, (ref, _) in backs.items() if ref.shape == bs.shape and np.abs(ref - bs).mean() < BACK_THR and _ == c['k']), None)
            if h is None:
                h = len(backs); backs[h] = (bs, c['k'])
                bw = 560 if c['r'] > 1 else 420
                if b.size[0] > bw: b = b.resize((bw, round(b.size[1] * bw / b.size[0])), Image.LANCZOS)
                b.save(os.path.join(APP, 'img', 'b', f'{h}.webp'), 'WEBP', quality=75, method=5)
            c['b'] = h
    print('dorsos', len(backs))
    # hojas de Primigenio (las de imgur en vertical tienen anverso y reverso)
    os.makedirs(os.path.join(APP, 'img', 'ao'), exist_ok=True)
    sizes = json.load(open(os.path.join(WORK, 'sizes.json')))
    for ao in AO_EXP:
        cand = [it for it in items if it['src'] == 'es' and it['deck'] == 'aosheet' and it['ao'] == ao and str(it['i']) in sizes
                and sizes[str(it['i'])][1] > sizes[str(it['i'])][0] and os.path.exists(os.path.join(WORK, 'crops', f"b{it['i']}.png"))]
        best = max(cand, key=lambda it: sizes[str(it['i'])][0] * sizes[str(it['i'])][1])
        for side, fn in (('a', 'f'), ('b', 'b')):
            im = Image.open(os.path.join(WORK, 'crops', f"{fn}{best['i']}.png")).convert('RGB')
            if im.size[0] > 900: im = im.resize((900, round(im.size[1] * 900 / im.size[0])), Image.LANCZOS)
            im.save(os.path.join(APP, 'img', 'ao', f'{ao}{side}.webp'), 'WEBP', quality=82, method=5)
    # orden estable
    # cartas que faltan en el mod en español: se toman del mod en inglés (con traducción propia)
    from crop import cell
    by_i = {it['i']: it for it in items}
    for c in EXTRA:
        src = by_i[c.pop('en_item')]
        im = cell(src['face'], src['idx'], src['nw'], src['nh']).convert('RGB')
        c['r'] = round(im.size[0] / im.size[1], 3)
        if im.size[0] > 700: im = im.resize((700, round(im.size[1] * 700 / im.size[0])), Image.LANCZOS)
        im.save(os.path.join(APP, 'img', 'c', f"{c['id']}.webp"), 'WEBP', quality=80, method=5)
        twin = next((k for k in cards if k['k'] == c['k'] and k.get('b') is not None), None)
        if twin: c['b'] = twin['b']
        cards.append(c)
    cards.sort(key=lambda c: c['id'])
    es2en, traits_seen = build_names(items, ocr)
    from glossary import TRAITS, TERMS, PRELUDE_FX, NAMES_FIX
    es2en.update(NAMES_FIX)
    hint = Hinter(es2en, TRAITS, TERMS)
    for c in cards:
        h = hint(rules_text(c, lines(ocr, f"f{c['id']}")) if c['id'] < 9000 else c['t'])
        if c['k'] == 'mitos': h = [x for x in h if x[0] not in ('EVENTO', 'ACTIVO', 'RUMOR')]
        if h: c['en'] = h
    json.dump(es2en, open(os.path.join(WORK, 'es2en.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0, sort_keys=True)
    out = 'window.EH_CARDS=' + json.dumps(cards, ensure_ascii=False, separators=(',', ':')) + ';\n'
    out += 'window.EH_PRELUDE_FX=' + json.dumps(PRELUDE_FX, ensure_ascii=False) + ';\n'
    open(os.path.join(APP, 'data.js'), 'w', encoding='utf-8').write(out)
    cnt = collections.Counter((c['k'], c['x']) for c in cards)
    for k, v in sorted(cnt.items()): print(v, k)
    json.dump(sorted(traits_seen.items()), open(os.path.join(WORK, 'traits_seen.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)


# Cartas que faltan en el mod en español (en su lugar trae una repetida); van en inglés con una traducción propia.
EXTRA = [
    {'id': 9001, 'en_item': 1914, 'k': 'mitos', 'x': 'cir', 'c': 'g', 'df': 'N', 'ty': 'evento', 'n': 'El laberinto invisible',
     'tr': 'Traducción (la carta falta en el mod en español): «The Invisible Maze» — EVENTO. Cada investigador tira 1 dado '
           'y resuelve el efecto correspondiente: 1–2: queda Retrasado. 3–5: muévete a una casilla aleatoria. 6: sin efecto.',
     't': 'Each investigator rolls 1 die and resolves the corresponding effect: 1-2: Become Delayed. 3-5: Move to a random space. 6: No effect.'},
]

# Distancia máxima de ilustración para aceptar un emparejamiento (revisados a mano los de 0,12–0,6; el siguiente, 0,89, es erróneo)
PAIR_THR = 0.6
# Títulos que el OCR cortó y que darían falsos positivos
NAMES_DROP = {'servicio de', 'regimen de', 'el rey amarillo'}
SKIP_DESC = {'Spells', 'Assets', 'Unique Assets', 'Artifacts', 'ReckPosCond', 'Condition', 'Conditions'}


def build_names(items, ocr):
    """Nombre en español (OCR del título) -> nombre en inglés y rasgos (del mod en inglés, por ilustración)."""
    pairs = json.load(open(os.path.join(WORK, 'pairs.json'), encoding='utf-8'))
    by_i = {it['i']: it for it in items}
    names = collections.defaultdict(collections.Counter); traits_seen = collections.defaultdict(collections.Counter)
    for i, (en, desc, dist, j) in pairs.items():
        if dist > PAIR_THR: continue
        L = ocr.get(f'f{i}', [])
        tl = [t for x, y, t in L if y < 0.092 and len(re.sub(r'[^A-Za-z]', '', t)) >= 2 and not re.fullmatch(r'\d+', t.strip())]
        if not tl: continue
        es = pretty(' '.join(tl))
        # fuera el costo (número) y los subtítulos «Estado» / «Apoyo único» que a veces caen en el mismo renglón
        es = re.sub(r'(?<![\w.])(\d+|I)(?![\w.])', ' ', es)
        es = re.sub(r'\s*(Estado|Apoyo\s*\S*nico)\s*$', '', es).strip(' .')
        es = re.sub(r'\s+', ' ', es)
        if fold(es) in NAMES_DROP: continue
        en = en.split(' - ')[0].strip()
        tr = [t for t in desc.split(';') if t and t not in SKIP_DESC and t != 'Common' and not t.startswith('Cost') and not t.startswith('Reck')]
        names[es][f"{en}{f' ({chr(0x2014).join(tr)})' if tr and by_i[int(i)]['deck'] == 'x_estado' else ''}"] += 1
        tl = [t for x, y, t in L if 0.5 < y < 0.6]
        if tl: traits_seen[tl[0]][';'.join(tr)] += 1
    es2en = {}; best = {}
    for es, cnt in names.items():
        en = cnt.most_common(1)[0][0]
        if len(fold(es)) < 4 or fold(es) == fold(en): continue
        k = squash(es)
        # variantes con palabras pegadas por el OCR: se queda la que tiene más espacios
        if k not in best or es.count(' ') > best[k].count(' '): best[k] = es
        es2en[k] = en
    es2en = {polish(best[k]): v for k, v in es2en.items()}
    return es2en, {k: dict(v) for k, v in traits_seen.items()}


if __name__ == '__main__':
    main()
