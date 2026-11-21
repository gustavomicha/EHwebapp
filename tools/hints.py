"""Detecta en el texto (OCR) de una carta los nombres y rasgos que conviene ver en inglés, y dónde están.

El OCR pega palabras y lee mal las VERSALITAS («PeRsEcucIoN», «AvuDA»), así que:
- nombres largos (Estados, Apoyos, Hechizos…): se buscan en el texto sin espacios;
- rasgos y nombres cortos: se toma la palabra que sigue a «Estado», «Apoyo (único)», «Hechizo», «que no sea»…
  y se compara de forma aproximada con la lista.

Cada acierto lleva los tramos del texto original donde aparece (índices de carácter), para dibujar el recuadro
sobre la carta. Si delante del nombre o rasgo está la palabra del tipo de carta («Estado Deuda», «Hechizo ENSALMO»),
el tramo la incluye.
"""
import re, unicodedata
from difflib import SequenceMatcher


def fold(s):
    s = unicodedata.normalize('NFKD', s or ''); s = ''.join(ch for ch in s if not unicodedata.combining(ch))
    return s.lower()


def squash(s): return re.sub(r'[^a-z0-9]', '', fold(s))


TRIG = re.compile(r'apoyos?\s*u?nicos?|que\s*no\s*sea|estados?|apoyos?|hechizos?|artefactos?|pertenencias?')
WORD = re.compile(r'\s*(?:\d\s*)?([a-z]{3,})')
NEG_TYPE = re.compile(r'(hechizos?|apoyos?\s*u?nicos?|apoyos?|estados?|artefactos?|pertenencias?)\s*$')
OR_NEXT =re.compile(r'\s+(?:o|u|y|ni)\s+([a-z]{3,})')
# lecturas del OCR de rasgos en VERSALITAS que quedan demasiado lejos para la comparación aproximada
TRAIT_OCR = {'rrrual': 'ritual', 'rrual': 'ritual', 'auado': 'aliado'}
# palabras frecuentes tras los disparadores que no son nombres ni rasgos
STOP = {'aleatorio', 'aleatoria', 'del', 'de', 'que', 'por', 'para', 'con', 'una', 'uno', 'los', 'las', 'este', 'esta',
        'tuyo', 'tienes', 'tenga', 'tengas', 'adicional', 'elegido', 'elegida', 'mas', 'como', 'sobre', 'cuando'}
# tipo de carta en inglés según la palabra que va delante
TRIG_EN = {'estado': 'Condition', 'estados': 'Conditions', 'apoyo': 'Asset', 'apoyos': 'Assets', 'apoyounico': 'Unique Asset', 'apoyosunicos': 'Unique Assets', 'apoyonico': 'Unique Asset',
           'pertenencia': 'possession', 'pertenencias': 'possessions',
           'hechizo': 'Spell', 'hechizos': 'Spells', 'artefacto': 'Artifact', 'artefactos': 'Artifacts'}

# nombres de una palabra que aparecen sin «Estado» delante («queda Detenido»)
WORD_OK = {'Detenido'}
# nombres que también son títulos o personajes: sólo cuentan con el tipo delante («Artefacto El Rey Amarillo»)
TRIG_ONLY = {'El Rey Amarillo'}
try:  # los nombres iguales en los dos idiomas sólo sirven para decir el tipo de carta
    from glossary import NAMES_FIX as _NF
    TRIG_ONLY |= {k for k, v in _NF.items() if k == v}
except ImportError:
    pass


def ratio(a, b): return SequenceMatcher(None, a, b).ratio()


def fuzzy_all(k, sq, thr=0.88):
    """Apariciones de k en sq con pequeñas diferencias de OCR: [(inicio, largo)] (ventanas que empiezan igual que k)."""
    n = len(k); start = k[:4]; out = []
    i = sq.find(start)
    while i >= 0:
        best = None
        for L in (n - 2, n - 1, n, n + 1, n + 2, n + 3):
            r = ratio(k, sq[i:i + L])
            if r >= thr and (not best or r > best[0]): best = (r, L)
        if best: out.append((i, best[1])); i = sq.find(start, i + best[1])
        else: i = sq.find(start, i + 1)
    return out


class Text:
    """Texto de la carta con tres vistas alineadas al original: ft (sin tildes, minúsculas), sq (sólo letras y números)
    y sqc (como sq pero con las mayúsculas)."""

    def __init__(self, s):
        self.s = s or ''
        ft, fm, sq, sqc, sm = [], [], [], [], []
        for i, ch in enumerate(self.s):
            d = ''.join(c for c in unicodedata.normalize('NFKD', ch) if not unicodedata.combining(c))
            for c in d:
                lc = c.lower()
                if len(lc) != 1: lc = c
                ft.append(lc); fm.append(i)
                if re.match(r'[a-z0-9]', lc): sq.append(lc); sqc.append(c if len(c.lower()) == 1 else lc); sm.append(i)
        self.ft, self.fm = ''.join(ft), fm
        self.sq, self.sqc, self.sm = ''.join(sq), ''.join(sqc), sm

    def from_sq(self, a, b): return (self.sm[a], self.sm[min(b, len(self.sm)) - 1] + 1)
    def from_ft(self, a, b): return (self.fm[a], self.fm[min(b, len(self.fm)) - 1] + 1)


def overlaps(a, spans): return any(a[0] < b[1] and b[0] < a[1] for b in spans)


class Hinter:
    def __init__(self, es2en, traits, terms):
        self.names = [(es, en, squash(es)) for es, en in es2en.items()]
        self.traits = [(t, en, squash(t)) for t, en in traits.items()]
        self.terms = [(t, en, squash(t)) for t, en in terms.items()]

    def prefix(self, w):
        """Rasgo o nombre de una palabra al principio de w (el OCR suele pegarle la palabra siguiente:
        «aliadoaleatorio», «deudaparaobtener»). Devuelve (parecido, español, inglés, tipo, largo usado de w) o None."""
        best = None; shift = 0
        for bad, good in TRAIT_OCR.items():
            if w.startswith(bad): w = good + w[len(bad):]; shift = len(good) - len(bad); break
        def lens(k):
            out = {L for L in (len(k) - 1, len(k), len(k) + 1) if 3 <= L <= len(w)}
            if abs(len(w) - len(k)) <= 3: out.add(len(w))
            return out
        for es, en, k in self.traits:
            if w[0] != k[0]: continue  # sin esto «para» se parece a «arma» y «oscuro» a «locura»
            for L in lens(k):
                r = ratio(w[:L], k)
                if r >= 0.72 and (not best or (r, L) > (best[0], best[4])): best = (r, es, en, 'r', L)
        for es, en, k in self.names:
            if ' ' in es.strip() or not w.startswith(k[:2]): continue
            for L in lens(k):
                r = ratio(w[:L], k)
                if r >= 0.8 and (not best or (r, L) > (best[0], best[4])): best = (r, es, en, 'n', L)
        if best and shift: best = best[:4] + (max(1, best[4] - shift),)
        return best

    def __call__(self, text, kind=None):
        """[[español, inglés, tipo, [[ini, fin, palabra_delante], ...]], ...] con tipo n = nombre, r = rasgo, t = término.
        palabra_delante: tipo de carta en inglés si el tramo empieza con «Estado», «Hechizo»… ('' si no)."""
        T = text if isinstance(text, Text) else Text(text)
        sq, sqc = T.sq, T.sqc
        hits = {}; order = []; taken = []

        def add(es, en, k, span, trig=''):
            if overlaps(span, taken): return
            taken.append(span)
            key = squash(es)
            if key not in hits: hits[key] = [es, en, k, []]; order.append(key)
            hits[key][3].append([span[0], span[1], trig])

        def with_trigger(a):
            """Si en sq justo antes de la posición a está «Estado», «Apoyo único»… devuelve (nuevo inicio, tipo en inglés)."""
            pre = sq[max(0, a - 12):a]
            for w in sorted(TRIG_EN, key=len, reverse=True):
                # con mayúscula, como en las reglas: así no cuentan «manifestado», «contestado»…
                # (o, si el OCR la leyó en minúscula, que empiece palabra en el texto original)
                if not pre.endswith(w): continue
                o = T.sm[a - len(w)]
                if sqc[a - len(w)].isupper() or o == 0 or not T.s[o - 1].isalpha(): return a - len(w), TRIG_EN[w]
            return a, ''

        # nombres largos
        for es, en, k in sorted(self.names, key=lambda x: -len(x[2])):
            # los nombres de una palabra («Visiones», «Terror») sólo cuentan tras «Estado», «Apoyo»… (salvo WORD_OK)
            if (' ' not in es.strip() and es not in WORD_OK) or len(k) < 8: continue
            found = []
            i = sq.find(k)
            while i >= 0:
                if sqc[i].isupper(): found.append((i, len(k)))
                i = sq.find(k, i + 1)
            if not found and len(k) >= 10:
                found = [(i, L) for i, L in fuzzy_all(k, sq) if sqc[i].isupper()]
            caps = sum(ch.isupper() for ch in es)
            # un rasgo en VERSALITAS («Estado HERIDA. Intentas») no es «Heridas internas»
            found = [(i, L) for i, L in found if sum(ch.isupper() for ch in sqc[i:i + L]) <= caps + 1]
            for i, L in found:
                a, tr = with_trigger(i)
                if es in TRIG_ONLY and not tr: continue
                add(es, en, 'n', T.from_sq(a, i + L), tr)
        # palabras tras los disparadores
        for t in TRIG.finditer(T.ft):
            m = WORD.match(T.ft, t.end())
            if not m: continue
            tw = re.sub(r'\s', '', t.group(0))
            pos, w, first = m.start(1), m.group(1), True
            # «ApoyoSERVICIO»: la regex toma «Apoyos» + «ervicio»; si con la «s» el rasgo se parece más, es singular
            if tw.endswith('s') and tw[:-1] in TRIG_EN and T.ft[t.end() - 1] == 's' and pos == t.end():
                b1, b2 = self.prefix(w), self.prefix('s' + w)
                if b2 and (not b1 or b2[0] >= b1[0]): tw, pos, w = tw[:-1], pos - 1, 's' + w
            while w and w not in STOP:
                best = self.prefix(w)
                if not best: break
                r, es, en, k, L = best
                # el tramo incluye la palabra del tipo si va pegada al primer nombre
                if first and tw in TRIG_EN: typ = TRIG_EN[tw]; add(es, en, k, T.from_ft(t.start(), pos + L), typ)
                elif first and tw == 'quenosea' and (neg := NEG_TYPE.search(T.ft, 0, t.start())):
                    # «Hechizo que no sea RITUAL» -> «non-RITUAL Spell» (el tipo va con «!» delante)
                    typ = '!' + TRIG_EN.get(re.sub(r'\s', '', neg.group(1)), 'Asset')
                    add(es, en, k, T.from_ft(neg.start(), pos + L), typ)
                elif first: typ = ''; add(es, en, k, T.from_ft(pos, pos + L))
                # las siguientes («Estado ENFERMEDAD o HERIDA») llevan el mismo tipo, pero el recuadro es sólo la palabra
                else: add(es, en, k, T.from_ft(pos, pos + L), typ if k == 'r' else '')
                # «ENFERMEDAD o HERIDA», también pegado («ENFERMEDADoHERIDA»)
                rest = w[L:]; first = False
                if rest[:1] in ('o', 'u', 'y') and len(rest) > 3: pos, w = pos + L + 1, rest[1:]; continue
                m2 = OR_NEXT.match(T.ft, pos + L) if not rest else None
                if m2: pos, w = m2.start(1), m2.group(1); continue
                break
        for es, en, k in sorted(self.terms, key=lambda x: -len(x[2])):
            # términos: tal cual se escriben en las reglas, con sus mayúsculas («ficha de Arcano», «Monstruo épico»);
            # los más largos primero («Apoyo único» antes que «Apoyo», «Hechizos» antes que «Hechizo»)
            kc = re.sub(r'[^A-Za-z0-9]', '', ''.join(ch for ch in unicodedata.normalize('NFKD', es) if not unicodedata.combining(ch)))
            if len(k) < 5: continue
            i = sqc.find(kc)
            while i >= 0:
                # que no siga en minúscula una palabra más larga («Estadounidense»); el OCR pega palabras, así que
                # sólo se descarta si lo que sigue es parte de una palabra común conocida
                nxt = sq[i + len(kc):i + len(kc) + 4]
                if k in ('apoyo', 'estado', 'hechizo') and nxt.startswith(('unid', 'nico')):
                    i = sqc.find(kc, i + 1); continue
                span = T.from_sq(i, i + len(kc))
                # un término de una palabra no cruza espacios ni puntuación («el Estado, se…» no es «Estados»)
                if ' ' in es or re.fullmatch(r'[^\W\d_]+', T.s[span[0]:span[1]]): add(es, en, 't', span)
                i = sqc.find(kc, i + 1)
        return [hits[k] for k in order]
