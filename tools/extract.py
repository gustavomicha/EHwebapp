"""Lee los dos mods de TTS y lista todas las cartas y losetas relevantes.

Salida: work/items.json  (una entrada por carta/loseta, con su contexto y URLs)
        work/urls.txt    (hojas de sprites a descargar)
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(HERE, 'work')
MODS = 'C:/Users/gusta/OneDrive/Dokumente/My Games/Tabletop Simulator/Mods/Workshop/'
ES = MODS + '2292194307.json'
EN = MODS + '2584626054.json'

# Contenedores del mod en español que interesan (juego base + 4 expansiones chicas)
ES_EXP_BAGS = {'11b12e': 'base', 'ce3ba9': 'fl', 'a4b0b7': 'sr', '2f0995': 'soc', '3e49b8': 'cir'}
ES_AOS = {'Azathoth': 'azathoth', 'Cthulhu': 'cthulhu', 'Shub-Niggurath': 'shub', 'Yog-Sothoth': 'yog',
          'Yig': 'yig', 'Sicigia': 'syzygy', 'Hastur': 'hastur', "Shudde M'ell": 'shudde'}
# Mazos "de mesa" del mod en español (son los del juego base, más los mazos fusionados de Estados, etc.)
ES_TOP = {
    '76bbe1': 'america', '81163f': 'europa', 'dc9ea2': 'asia', '526c63': 'general', '3092dc': 'expedicion',
    '00df6a': 'otros', '02ef24': 'mitos_verde', '0e735c': 'mitos_amarillo', '290a02': 'mitos_azul',
    'cdf4d5': 'ruinas', '4bce73': 'preludios',
    'c855c9': 'x_apoyo', 'aa2397': 'x_hechizo', '5e50b7': 'x_artefacto', 'e241cd': 'x_apoyo_unico',
    'c23a63': 'x_estado', '471037': 'x_estado', '65a93f': 'x_estado', '6aa667': 'x_estado', '712873': 'x_estado',
    '9f3f1b': 'x_estado', '719a27': 'x_estado', '0962d4': 'x_estado', '36f80d': 'x_estado', '7746dd': 'x_estado',
}
# Destino de cada variable de mazo en los scripts de las expansiones
DEST = {'mazo1': 'x_apoyo', 'mazo2': 'x_hechizo', 'mazo4': 'x_artefacto', 'mazo5': 'america', 'mazo6': 'europa',
        'mazo7': 'asia', 'mazo8': 'general', 'mazo9': 'otros', 'mazo10': 'expedicion', 'mazo11': 'mitos_verde',
        'mazo12': 'mitos_amarillo', 'mazo13': 'mitos_azul', 'mazo14': 'x_apoyo_unico', 'mazo15': 'preludios'}
NAMED = {'Encuentros de Devastación': 'devastacion', 'Cartas de Desastre': 'desastre', 'Aventuras': 'aventura',
         'Ruinas misticas': 'ruinas', 'Preludios': 'preludios'}

# Mazos del mod en inglés que sirven para emparejar
EN_DECKS = {'Easy Blue Mythos': 'mitos_azul:E', 'Medium Blue Mythos': 'mitos_azul:N', 'Hard Blue Mythos': 'mitos_azul:H',
            'Easy Yellow Mythos': 'mitos_amarillo:E', 'Medium Yellow Mythos': 'mitos_amarillo:N', 'Hard Yellow Mythos': 'mitos_amarillo:H',
            'Easy Green Mythos': 'mitos_verde:E', 'Medium Green Mythos': 'mitos_verde:N', 'Hard Green Mythos': 'mitos_verde:H',
            'DoubleSided': 'x_doble', 'Assets': 'x_apoyo', 'Artifacts': 'x_artefacto', 'Preludes': 'preludios'}
EN_AOS = {'Azathoth', 'Cthulhu', 'Shub-Niggurath', 'Yog-Sothoth', 'Yig', 'Syzygy', 'Hastur', 'Shudde Mell'}


def card_rec(o, parent):
    cid = o['CardID']; k = str(cid // 100)
    cd = (o.get('CustomDeck') or {}).get(k) or (parent.get('CustomDeck') or {}).get(k)
    return dict(face=cd['FaceURL'].strip(), back=cd['BackURL'].strip(), idx=cid % 100,
                nw=cd['NumWidth'], nh=cd['NumHeight'], ub=bool(cd.get('UniqueBack')),
                name=o.get('Nickname', '') or '', desc=o.get('Description', '') or '', sideways=bool(o.get('SidewaysCard')))


def cards_in(o):
    """Cartas de un Deck/Card (incluye estados alternativos)."""
    if o['Name'] in ('Card', 'CardCustom'):
        yield o, o
        for s in (o.get('States') or {}).values():
            if s['Name'] in ('Card', 'CardCustom'): yield s, s
    for x in o.get('ContainedObjects') or []:
        if x['Name'] in ('Card', 'CardCustom'):
            yield x, o
            for s in (x.get('States') or {}).values():
                if s['Name'] in ('Card', 'CardCustom'): yield s, o


def tile_rec(o):
    ci = o.get('CustomImage') or {}
    return dict(face=ci.get('ImageURL', '').strip(), back=ci.get('ImageSecondaryURL', '').strip(), name=o.get('Nickname', '') or '')


def main():
    items = []
    es = json.load(open(ES, encoding='utf-8'))
    top = {o['GUID']: o for o in es['ObjectStates']}
    for g, deck in ES_TOP.items():
        for c, par in cards_in(top[g]):
            items.append(dict(src='es', where='top', deck=deck, exp=None, **card_rec(c, par)))
    for g, exp in ES_EXP_BAGS.items():
        bag = top[g]; lua = bag.get('LuaScript', '')
        var2guid = dict(re.findall(r'(mazo\w+)\s*=\s*"(\w+)"', lua))
        guid2dest = {}
        for a, b in re.findall(r'getObjectFromGUID\(mazos\.(mazo\w+)\)\.putObject\(getObjectFromGUID\(mazos\.(mazo\w+)\)\)', lua):
            if a in DEST and b in var2guid: guid2dest[var2guid[b]] = DEST[a]
        for o in bag.get('ContainedObjects') or []:
            nm = o.get('Nickname', '') or ''
            if o['Name'] in ('Deck', 'DeckCustom', 'Card', 'CardCustom'):
                deck = guid2dest.get(o['GUID']) or NAMED.get(nm) or ('?' + nm)
                for c, par in cards_in(o):
                    items.append(dict(src='es', where='bag', deck=deck, exp=exp, bagdeck=nm, **card_rec(c, par)))
            elif o['Name'] == 'Custom_Tile':
                items.append(dict(src='es', where='bagtile', deck='tile', exp=exp, **tile_rec(o)))
            elif o['Name'] == 'Bag' and 'Monstruo' in nm:
                for t in o.get('ContainedObjects') or []:
                    if t['Name'] == 'Custom_Tile':
                        items.append(dict(src='es', where='monster', deck='epico' if 'pico' in nm else 'monstruo', exp=exp, **tile_rec(t)))
        # monstruos sueltos de las expansiones
        for o in bag.get('ContainedObjects') or []:
            if o['Name'] in ('Custom_Tile', 'Custom_Model') and o.get('CustomImage'):
                pass
    prim = top['813277']
    for b in prim['ContainedObjects']:
        nm = b.get('Nickname', '')
        if b['Name'] == 'Custom_Tile' and nm in ES_AOS:
            items.append(dict(src='es', where='aosheet', deck='aosheet', ao=ES_AOS[nm], **tile_rec(b)))
            for s in (b.get('States') or {}).values():
                items.append(dict(src='es', where='aosheet', deck='aosheet', ao=ES_AOS[nm], **tile_rec(s)))
        if b['Name'] != 'Bag' or nm not in ES_AOS: continue
        ao = ES_AOS[nm]
        for o in b['ContainedObjects']:
            dn = o.get('Nickname', '') or ''
            if o['Name'] == 'Custom_Tile':
                items.append(dict(src='es', where='aosheet', deck='aosheet', ao=ao, **tile_rec(o)))
                continue
            if o['Name'] not in ('Deck', 'DeckCustom'): continue
            kind = 'misterio' if dn.startswith('Misterio') else 'investigacion' if 'nvestigaci' in dn else 'especial'
            for c, par in cards_in(o):
                items.append(dict(src='es', where='ao', deck=kind, ao=ao, aodeck=dn, exp=None, **card_rec(c, par)))
    # monstruos del juego base (bolsa general) para traducir nombres
    en = json.load(open(EN, encoding='utf-8'))
    for o in en['ObjectStates']:
        nm = o.get('Nickname', '') or ''
        if o['Name'] in ('Deck', 'DeckCustom') and nm in EN_DECKS:
            for c, par in cards_in(o):
                items.append(dict(src='en', where='top', deck=EN_DECKS[nm], **card_rec(c, par)))
        if nm == 'Ancient Ones':
            for b in o['ContainedObjects']:
                if b.get('Nickname') not in EN_AOS: continue
                for x in b['ContainedObjects']:
                    dn = x.get('Nickname', '') or ''
                    if x['Name'] in ('Deck', 'DeckCustom'):
                        kind = 'misterio' if dn.startswith('Myster') else 'investigacion' if 'Research' in dn else 'especial'
                        for c, par in cards_in(x):
                            items.append(dict(src='en', where='ao', deck=kind, ao=b['Nickname'], aodeck=dn, **card_rec(c, par)))
                    elif x['Name'] == 'Custom_Tile':
                        items.append(dict(src='en', where='aosheet', deck='aosheet', ao=b['Nickname'], **tile_rec(x)))
        if nm in ('Monsters', 'Epic Monsters'):
            for t in o['ContainedObjects']:
                if t['Name'] == 'Custom_Tile':
                    items.append(dict(src='en', where='monster', deck='monstruo', **tile_rec(t)))
    for i, it in enumerate(items): it['i'] = i
    json.dump(items, open(os.path.join(WORK, 'items.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    urls = set()
    for it in items:
        for k in ('face', 'back'):
            if it.get(k): urls.add(it[k])
    open(os.path.join(WORK, 'urls.txt'), 'w').write('\n'.join(sorted(urls)))
    import collections
    print(len(items), 'items', len(urls), 'urls')
    for k, v in sorted(collections.Counter((it['src'], it['where'], it['deck']) for it in items).items()): print(v, k)


if __name__ == '__main__':
    main()
