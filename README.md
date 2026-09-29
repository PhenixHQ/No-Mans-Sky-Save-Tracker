# NMS Save Tracker

An unofficial, fan-made companion app for **No Man's Sky** on PC. It reads your save file to show your explored galaxy, inventories and progress, alongside recipe tools, a crafting planner, portal glyphs and a quest board.

> **Alpha test build.** Expect rough edges. Please report bugs from inside the app: **Settings & help → Report a bug → Report on GitHub**.

## Features
- **Recipes:** every refiner, crafting and cooking recipe, sorted by value or profit, with pins and item cards that show how many of an item you own.
- **What can I make?:** shows what you can refine, craft or cook right now from the items in your synced inventories.
- **Inventory:** your exosuit, starships, corvettes (plus their built storage), freighter and base storage containers, laid out like the in-game screen.
- **Where to find:** resources by star colour and biome, plus fish.
- **Portals:** a glyph keypad with replace/insert editing, keyboard input and saved addresses.
- **My galaxy:** a map of the systems you've explored, with top-down, angled, side and front views, adjustable height stretch, a galaxy switcher, hover details and a system view.
- **Quests:** a quest board with notes.
- **Settings:** themes (with 5 custom slots), display options, auto-sync timing, and game/save folder detection.

## Install (Windows)
1. Download this repository (**Code → Download ZIP**) and unzip it anywhere.
2. Double-click **`NMS Save Tracker.vbs`**. The app opens in its own window using Microsoft Edge, which comes with Windows.
3. Press **Sync** to read your latest save. Turn on auto-sync to keep it updated while you play.

The app finds your saves in `%APPDATA%\HelloGames\NMS` automatically. If yours are somewhere else, pick the folder under **Settings & help → Game files**. Steam and GOG saves are supported; Game Pass saves use a different format and aren't yet.

## Privacy and safety
- The app **only reads** your save files. It never changes game files or saves.
- Everything runs on your PC. A small helper (`app\server.ps1`) serves the app to `127.0.0.1` only, so nothing is reachable from other devices.
- Your app data (pins, notes, settings, last sync) is stored in the `data\` folder next to the app. Nothing is uploaded.
- Bug reports only go out when you choose to submit one, and the attached log leaves out save data, names, coordinates and file paths.

## Folder layout
```
NMS Save Tracker.vbs   launcher
app\server.ps1         local helper (PowerShell)
web\                   the app (index.html is built from source\)
web\config.json        publisher settings (GitHub repo for bug reports)
source\                source code, build script and developer notes
data\                  created on first run: your personal app data (not in git)
```

## Building from source
Requires Python 3. Run `python source\build.py` to rebuild `web\index.html` from `source\src`. See `source\NOTES-FOR-CLAUDE.md` for how everything fits together.

## Credits
- Save decoding key map: [MBINCompiler](https://github.com/monkeyman192/MBINCompiler) `mapping.json`.
- Item and recipe data: extracted game data via [bradhave94/nms](https://github.com/bradhave94/nms).
- Galaxy names list: community sources.

## Disclaimer
NMS Save Tracker is an unofficial fan-made app. It is not affiliated with or endorsed by Hello Games. No Man's Sky is a trademark of Hello Games, and game data and text belong to their respective owners.
