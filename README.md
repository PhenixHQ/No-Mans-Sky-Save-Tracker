# NMS Save Tracker

An unofficial, fan-made companion app for **No Man's Sky** on PC. It reads your save file to show your explored galaxy, inventories and progress, alongside recipe tools, a crafting planner, portal glyphs and a quest board.

> **Alpha test build.** Expect rough edges. Please report bugs from inside the app: **Settings & help → Report a bug → Report on GitHub**.

## Features
- **Recipes:** every refiner, crafting and cooking recipe, sorted by value or profit, with pins and item cards that show how many of an item you own. Each recipe says how many you can make **now**, **with sub-crafts** (making missing ingredients one step down) and **from scratch** (all the way down to raw materials), with a crafting tree (what you have, what to make, what to gather), the steps in order, and what you'd need to gather for one more. Tick **Only recipes I can make now** to see what you can refine, craft or cook with the inventories you choose.
- **Inventory:** your exosuit, starships, corvettes (plus their built storage), freighter and base storage containers, laid out like the in-game screen. The **Everything** view has filters: item kinds (raw, refined, basic/advanced crafted, trade goods, curiosities, food, fish, tech, base parts, corvette parts), which inventories count, hide corvette parts, only things used in recipes, and worth selling.
- **Where to find:** a star class decoder (G7pf and so on), resources by star colour and biome, plus fish.
- **Portals:** a glyph keypad with replace/insert editing, keyboard input and saved addresses.
- **My galaxy:** a map of the systems you've explored, with top-down, angled, side and front views, adjustable height stretch, a galaxy switcher, hover details, a system view, and how many species you've scanned on each planet.
- **Game icons:** the real item icons, copied from your own No Man's Sky install the first time the app runs (no game artwork ships with the app), packed into one file so they all appear at start-up. A loading screen with tips shows while the app loads.
- **Quests:** a quest board with notes.
- **Settings:** themes (with 5 custom slots), display options, auto-sync timing, and game/save folder detection.
- **Save tools (advanced, off by default):** for testing, restoring and fixing saves. Turn them on in **Settings & help → Game files → Advanced**. See below.

## Save tools (advanced)
Hidden until you tick **Save tools** in **Settings & help → Game files → Advanced**. A **Save tools** tab then appears with:
- **Saves & backups:** back up any save, restore any backup, or make an older save (a restore point) the one the game loads.
- **Inventories:** click a slot and pick any item from a creative-menu style picker (categories, search, icons), then set the amount up to that item's stack limit (−1, +1, ¼, ½ or full stack). Items tied to quests come with a warning. Works on every inventory (exosuit, ships, freighter, storage containers, corvette workshop storage, exocraft and more), and can unlock or lock slots.
- **Currencies:** units, nanites and quicksilver.
- **Settlements:** finish construction, clear debt, bring the next decision sooner or clear a waiting one, rename, and edit stats, building states, perks, production and timers, or the whole entry as raw JSON.
- **Quests:** grouped by questline with readable names (tracking, has progress, finished); change a mission's step, reset it, or restore quests from a backup.
- **Timers:** grouped with plain names (settlements, living ship, freighter and frigates, pets, quest cooldowns and more), with buttons to move them back like the clock trick.
- **Show only what's active** (on by default) hides empty inventories, quests you haven't started, old timers and idle settlement plots.
- **Everything (raw):** browse and change any value in the save, with readable field names.

How it keeps your save safe:
- Changes wait in a list until you press **Write to save**. Nothing is written before that.
- It refuses to write while No Man's Sky is running, or if the game saved again after you loaded the save into the editor.
- Every write backs the save (and its `mf_` manifest) up to `data\backups` first. Backups stay until you delete them.
- Only the values you changed are touched; the rest of the save stays byte-for-byte the same. The save is re-packed, the manifest is updated to match, and both are read back and checked after writing.

Use them at your own risk, and keep your own copy of anything important.

## Install (Windows)
1. Download this repository (**Code → Download ZIP**) and unzip it anywhere.
2. Double-click **`NMS Save Tracker.vbs`**. The app opens in its own window using Microsoft Edge, which comes with Windows.
3. Press **Sync** to read your latest save. Tick **Auto-sync** next to it to keep every tab updated while you play.

The app finds your saves in `%APPDATA%\HelloGames\NMS` automatically. If yours are somewhere else, pick the folder under **Settings & help → Game files**. Steam and GOG saves are supported; Game Pass saves use a different format and aren't yet.

## Privacy and safety
- The app **only reads** your game files and never changes them. Item icons are copied from your game install into the app's own `data\icons` folder.
- It **only reads** your saves too, unless you turn on the save tools and press **Write to save**. Then it writes only to the save you're editing, never while the game is running, and backs it up to `data\backups` first.
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
data\                  created on first run: your personal app data, icon cache and save backups (not in git)
```

## Building from source
Requires Python 3. Run `python source\build.py` to rebuild `web\index.html` from `source\src`. See `source\NOTES-FOR-CLAUDE.md` for how everything fits together.

## Credits
- Save decoding key map: [MBINCompiler](https://github.com/monkeyman192/MBINCompiler) `mapping.json`.
- Item and recipe data: extracted game data via [bradhave94/nms](https://github.com/bradhave94/nms).
- Galaxy names list: community sources.
- Game pack format: as documented by [HGPAKtool](https://github.com/monkeyman192/HGPAKtool) (MIT).
- zstd decoding: [fzstd](https://github.com/101arrowz/fzstd) by Arjun Barrett (MIT), included in `source/src/gameicons.js`.
- BC7 partition tables: [bcdec](https://github.com/iOrange/bcdec) by Sergii Kudlai (MIT).
- Save manifest format (XXTEA key and layout) and save compression (LZ4 blocks): as documented by the NMS modding community. The LZ4 packer in `source/src/savetools.js` is written for this app.

## Disclaimer
NMS Save Tracker is an unofficial fan-made app. It is not affiliated with or endorsed by Hello Games. No Man's Sky is a trademark of Hello Games, and game data and text belong to their respective owners.
