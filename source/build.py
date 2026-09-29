"""Builds the app page from source.

  python build.py          -> writes ../web/index.html (desktop app)
  python build.py --web    -> also writes out/nms-save-tracker.html (single-file web version)

src/head.html      <head> contents: title, fonts, all CSS
src/body.html      page markup + the main script, with placeholders:
                   __SAVESYNC__ (src/savesync.js), __GAME__ (data/game.bundle.json),
                   __GALAXY__ (data/galaxy-snapshot.json, only shown in the web version)
"""
import os, sys
here = os.path.dirname(os.path.abspath(__file__))
rd = lambda p: open(os.path.join(here, p), encoding='utf-8').read()
head, body = rd('src/head.html'), rd('src/body.html')
ss = rd('src/savesync.js'); assert '</script' not in ss
game = rd('data/game.bundle.json').replace('</', '<\\/')
gal = rd('data/galaxy-snapshot.json').replace('</', '<\\/')
page = head + body.replace('__SAVESYNC__', ss).replace('__GAME__', game).replace('__GALAXY__', gal)
out = os.path.join(here, '..', 'web', 'index.html')
open(out, 'w', encoding='utf-8', newline='\n').write('<!doctype html>\n<html lang="en">\n<head>\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' + page + '\n</html>\n')
print('wrote', os.path.normpath(out), len(page), 'chars')
if '--web' in sys.argv:
    os.makedirs(os.path.join(here, 'out'), exist_ok=True)
    open(os.path.join(here, 'out', 'nms-save-tracker.html'), 'w', encoding='utf-8', newline='\n').write(page)
    print('wrote out/nms-save-tracker.html')
