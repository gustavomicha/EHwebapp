"""Descarga las hojas de sprites de work/urls.txt a work/sheets (usa la caché de TTS si ya están)."""
import os, re, sys, shutil, hashlib, urllib.request
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
SHEETS = os.path.join(HERE, 'work', 'sheets')
CACHE = 'C:/Users/gusta/OneDrive/Dokumente/My Games/Tabletop Simulator/Mods/Images/'


def norm(u):
    u = u.strip()
    m = re.match(r'https?://cloud-3\.steamusercontent\.com/ugc/(\d+)/([0-9A-F]+)/?', u)
    if m: return f'https://steamusercontent-a.akamaihd.net/ugc/{m.group(1)}/{m.group(2)}/'
    return u.replace('http://', 'https://')


def fname(u):
    return hashlib.md5(u.strip().encode()).hexdigest()[:16]


_cache = None
def cached(u):
    global _cache
    if _cache is None: _cache = os.listdir(CACHE) if os.path.isdir(CACHE) else []
    for v in (u, norm(u)):
        k = re.sub(r'[^A-Za-z0-9]', '', v)
        for h in _cache:
            if h.startswith(k) and os.path.splitext(h)[0] == k: return CACHE + h
    return None


def get(u):
    p = os.path.join(SHEETS, fname(u))
    if os.path.exists(p) and os.path.getsize(p) > 1000: return p
    c = cached(u)
    if c: shutil.copyfile(c, p); return p
    req = urllib.request.Request(norm(u), headers={'User-Agent': 'Mozilla/5.0'})
    data = urllib.request.urlopen(req, timeout=120).read()
    open(p, 'wb').write(data); return p


def main():
    os.makedirs(SHEETS, exist_ok=True)
    us = [u for u in open(os.path.join(HERE, 'work', 'urls.txt')).read().split('\n') if u]
    def f(u):
        err = None
        for _ in range(3):
            try: get(u); return None
            except Exception as e: err = e
        return (u, str(err))
    with ThreadPoolExecutor(8) as ex:
        res = [r for r in ex.map(f, us) if r]
    print('total', len(us), 'failed', len(res))
    for r in res: print(r)


if __name__ == '__main__':
    main()
