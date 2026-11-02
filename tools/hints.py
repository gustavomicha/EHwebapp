"""Detecta en el texto (OCR) de una carta los nombres y rasgos que conviene ver en inglés.

El OCR pega palabras y lee mal las VERSALITAS («PeRsEcucIoN», «AvuDA»), así que:
- nombres largos (Estados, Apoyos, Hechizos…): se buscan en el texto sin espacios;
- rasgos y nombres cortos: se toma la palabra que sigue a «Estado», «Apoyo (único)», «Hechizo», «que no sea»…
  y se compara de forma aproximada con la lista.
"""
import re, unicodedata
from difflib import SequenceMatcher


def fold(s):
    s = unicodedata.normalize('NFKD', s or ''); s = ''.join(ch for ch in s if not unicodedata.combining(ch))
    return s.lower()


def squash(s): return re.sub(r'[^a-z0-9]', '', fold(s))


TRIG = re.compile(r'apoyo\s*unico|que\s*no\s*sea|estados?|apoyos?|hechizos?|artefactos?')
NEXT = re.compile(r'\s*(?:\d\s*)?([a-z]{3,})(?:\s+(?:o|u|y|ni)\s+([a-z]{3,}))?')
# palabras frecuentes tras los disparadores que no son nombres ni rasgos
STOP = {'aleatorio', 'aleatoria', 'del', 'de', 'que', 'por', 'para', 'con', 'una', 'uno', 'los', 'las', 'este', 'esta',
        'tuyo', 'tienes', 'tenga', 'tengas', 'adicional', 'elegido', 'elegida', 'mas', 'como', 'sobre', 'cuando'}


# nombres de una palabra que aparecen sin «Estado» delante («queda Detenido»)
WORD_OK = {'Detenido'}


def ratio(a, b): return SequenceMatcher(None, a, b).ratio()


def fuzzy_in(k, sq, thr=0.88):
    """¿Aparece k en sq con pequeñas diferencias de OCR? (ventanas que empiezan igual que k)"""
    n = len(k); start = k[:4]
    i = sq.find(start)
    while i >= 0:
        for L in (n - 2, n, n + 2, n + 3):
            if ratio(k, sq[i:i + L]) >= thr: return True
        i = sq.find(start, i + 1)
    return False


class Hinter:
    def __init__(self, es2en, traits, terms):
        self.names = [(es, en, squash(es)) for es, en in es2en.items()]
        self.traits = [(t, en, squash(t)) for t, en in traits.items()]
        self.terms = [(t, en, squash(t)) for t, en in terms.items()]

    def __call__(self, text, kind=None):
        ft = fold(text); sq = squash(text)
        hits = []
        seen = set()
        def add(es, en, k):
            key = squash(es)
            if key in seen: return
            if any(key in s for s in seen if len(s) > len(key)): return
            seen.add(key); hits.append([es, en, k])
        # nombres largos
        for es, en, k in sorted(self.names, key=lambda x: -len(x[2])):
            # los nombres de una palabra («Visiones», «Terror») sólo cuentan tras «Estado», «Apoyo»… (salvo WORD_OK)
            if (' ' not in es.strip() and es not in WORD_OK) or len(k) < 8: continue
            if k in sq or (len(k) >= 10 and fuzzy_in(k, sq)): add(es, en, 'n')
        # palabras tras los disparadores
        for t in TRIG.finditer(ft):
            m = NEXT.match(ft, t.end())
            if not m: continue
            for w in (m.group(1), m.group(2)):
                if not w or w in STOP: continue
                best = None
                for es, en, k in self.traits:
                    r = ratio(w, k)
                    if r >= 0.72 and abs(len(w) - len(k)) <= 3 and (not best or r > best[0]): best = (r, es, en, 'r')
                for es, en, k in self.names:
                    if ' ' in es.strip() or not w.startswith(k[:3]): continue
                    r = ratio(w, k)
                    if r >= 0.8 and (not best or r > best[0]): best = (r, es, en, 'n')
                if best: add(best[1], best[2], best[3])
        for es, en, k in self.terms:
            if len(k) >= 6 and k in sq: add(es, en, 't')
        return hits
