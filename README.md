# NMS Save Tracker

An unofficial, fan-made companion app for **No Man's Sky** on PC. It reads your save file to show your explored galaxy, inventories and progress, alongside recipe tools, a crafting planner, portal glyphs and a quest board.

> **Beta (2.9.0).** Expect rough edges.

> **Note:** Made with the help of AI and tested in my own game. Found a bug? Please [open an issue](../../issues/new?labels=bug) (or use **Settings & help → Report a bug** in the app) with what happened and how to repeat it. Comments about how it was made won't be responded to.

## Install on Windows
1. Download **NMS-Save-Tracker-Setup.exe** from [Releases](../../releases). This small installer always downloads and installs the newest version, so it needs an internet connection while it runs. Each release also has a full installer (**NMS-Save-Tracker-&lt;version&gt;-Setup.exe**) that works offline.
2. Run it. Windows may say "Windows protected your PC" because the app isn't code-signed: click **More info**, then **Run anyway**.
3. It installs for your user only (no admin needed), adds Start menu and desktop shortcuts, and can be removed from Windows Settings > Apps.
4. Open it: it finds your saves and game folder by itself. For the in-game overlay (F8), set No Man's Sky to **Borderless**.
5. Updates: the app checks GitHub for a newer version when it opens and shows an **Update** button at the top when there is one (turn this off in **Settings & help → Help**). Nothing about you or your save is sent.

Visit the Bountria Federation capital: **Portals** tab > saved addresses > *Bountria Prime · Verdantia* (Euclid).

## Features
- **Recipes:** every refiner, crafting and cooking recipe, sorted by value or profit, with pins and item cards that show how many of an item you own. Each recipe says how many you can make **now**, **with sub-crafts** (making missing ingredients one step down) and **from scratch** (all the way down to raw materials), with a crafting tree (what you have, what to make, what to gather), the steps in order, and what you'd need to gather for one more. Tick **Only recipes I can make now** to see what you can refine, craft or cook with the inventories you choose.
- **Inventory:** your exosuit, starships, corvettes (plus their built storage), freighter and base storage containers, laid out like the in-game screen. The **Everything** view has filters: item kinds (raw, refined, basic/advanced crafted, trade goods, curiosities, food, fish, tech, base parts, corvette parts), which inventories count, hide corvette parts, only things used in recipes, and worth selling.
- **Where to find:** a star class decoder (G7pf and so on), resources by star colour and biome, the freighter Stellar Extractor and gas sources, fish, and **Trade goods**: which economy sells each good, and the closest systems you've tagged (economy and wealth) near you, your freighter or a base.
- **Portals:** a glyph keypad with replace/insert editing, keyboard input and saved addresses, using the game's own glyph pictures from your install. **Your places** lists the portal address of where you are, your freighter and every base, and any address you enter shows whether you've been there, how far it is from you and your nearest base, and where it is on the map.
- **My galaxy:** a map of every system you've explored (kept across syncs, past the game's 512-visit memory), colourable by type, discoverer or the economy you tagged, with an **Exploration** card (discoveries today/this week/all time, and coverage by direction around any base with an arrow on the map), with top-down, angled, side and front views, adjustable height stretch, a galaxy switcher, hover details, a system view, and how many species you've scanned on each planet.
- **Collection:** every starship, multi-tool and exocraft with class, slots, supercharged slots, built-in bonuses and installed technology (and which ones have room for more upgrades); your frigates with role, class, expedition stats, fuel cost and traits, the best frigate for each kind of expedition, and expeditions under way; your companions with trust, traits, age and last egg; your freighter and its rooms; the settlements you run (population, effects, production, debt, decisions); ship and multi-tool seeds; and a **Needs your attention** card (also in the overlay) for settlement decisions, full production, damaged frigates, finished expeditions and discoveries you haven't uploaded.
- **Game data from your install:** item names, values and every refiner, crafting and cooking recipe are read from your own No Man's Sky files (like the icons), so they match your game, even right after a game update. The app also ships with a copy read from the game's files, used until then.
- **Game icons:** the real item icons, copied from your own No Man's Sky install the first time the app runs (no game artwork ships with the app), packed into one file so they all appear at start-up. A loading screen with tips shows while the app loads.
- **Quests:** a quest board with notes.
- **This session:** after each sync, a card shows what changed since you started playing: discoveries, units, nanites, quicksilver and items.
- **Goals sidebar:** press **Goals** (or G) for a side panel with your pinned recipes and your own goals. Add rows for items and amounts, money, recipes you want to be able to make, or quests to finish; every row updates from your save and ticks itself off.
- **Search everything:** Ctrl+K finds items, systems, bases, ships, frigates, settlements, companions, goals, tabs and settings. Number keys 1–9 switch tabs.
- **Little helpers:** recently viewed items, your own notes on any item, and Copy as text for crafting trees (handy for Discord).
- **Settings:** themes (with 5 custom slots), display options, auto-sync timing, and game/save folder detection.
- **Save tools (advanced, off by default):** for testing, restoring and fixing saves. Turn them on in **Settings & help → Game files → Advanced**. See below.

## In-game overlay (app window only)
- **Overlay**: a small window that stays on top of the game with your goals, what you still need for them, pinned recipes, units/nanites/quicksilver and where you are. It syncs by itself while you play. **F8** opens it and lets you click it (press F8 again any time to click back into it), **F9** closes it, Esc or clicking the game goes back to the game. Drag its title bar to move it and any edge to resize it; it can be see-through.
- **How to get it**: click anything under Still needed for the recipes that make it (best first, with how many you can run now) and where it's found.
- **Side panel** (**F10**): the whole app over part of the screen (left or right, width of your choice).
- Set it up in Settings & help › Overlay, including your own hotkeys. Closing the window keeps the app in the tray so the hotkeys keep working; right-click the tray icon to quit.
- No Man's Sky must run in **Borderless** mode. In exclusive Fullscreen, Windows can't show anything on top of the game.

## Save tools (advanced)
Hidden until you tick **Save tools** in **Settings & help → Game files → Advanced**. A **Save tools** tab then appears with:
- **Saves & backups:** back up any save, restore any backup, make an older save (a restore point) the one the game loads, **Undo last write**, and automatic clean-up of old backups.
- **Near-live mode:** edit without closing the game. Save in game, choose **Quit to Main Menu**, write your changes, then load the save again. If the game saved after you loaded the save, **Reload and redo** puts your changes back on top of the newer one. A one-time +1 nanite test checks it works on your PC.
- **Technology:** for the exosuit, every ship and corvette, multi-tools, the freighter and exocraft (shown by type, e.g. Minotaur, Nautilon, Living ship, Sentinel interceptor, Hauler). Click or right-click any slot for its menu: install, swap, move, repair, charge or remove. Only technology the game lets that craft install is offered (from the game's own data: Minotaur parts only on the Minotaur, living-ship organs only on living ships, no hyperdrive in the exosuit), and upgrades past the 3-per-technology limit or duplicate tech are marked. Also unlock tech slots, unlock tech slots, **Best layout** (groups matching tech and uses supercharged slots) and **Max it out** (adds S-class upgrades up to the game's limit of 3 per technology).
- **Compare:** any two saves or backups, in plain words (money, items, quests, settlements, exploring and more).
- **Inventories:** click (or right-click) a slot for its menu and pick any item that fits that inventory from a creative-menu style picker (categories, search, icons), then set the amount up to that item's stack limit (−1, +1, ¼, ½ or full stack). Items tied to quests come with a warning. Find any item across every inventory, split or duplicate stacks, and sort an inventory. Works on every inventory (exosuit, ships, freighter, storage containers, corvette workshop storage, exocraft and more), and can unlock or lock slots.
- **Currencies:** units, nanites and quicksilver.
- **Settlements:** name each plot (the app remembers), set a built plot (or every built plot at once) to Class C, B, A or S with the step patterns the game itself writes (confirmed in game), see which plots are behind, add or remove any effect (good or bad) by its in-game name, finish construction, clear debt, bring the next decision sooner or clear a waiting one, rename, and edit stats, building states, perks, production and timers, or the whole entry as raw JSON.
- **Quests:** grouped by questline with readable names (tracking, has progress, finished); change a mission's step, reset it, or restore quests from a backup.
- **Timers:** grouped with plain names (settlements, living ship, freighter and frigates, pets, quest cooldowns and more), with buttons to move them back like the clock trick.
- **Ships & multi-tools:** change the class (C/B/A/S) and the built-in bonuses (damage, shield, hyperdrive, manoeuvrability; damage, mining, scanning for multi-tools; hyperdrive and fleet for the freighter) of any ship, corvette, multi-tool or the freighter. The game's own ranges for each type and class are shown (read from your game files), with **Best rolls** and **Perfect S-class** buttons. Copies of the bonuses in the tech and cargo inventories are kept in step.
- **Experimental: looks.** Change the **seed** of a ship, multi-tool or the freighter (paste one, copy one from another of yours of the same type, or roll a random one), or pick **parts** like the game's starship customiser for fighters, haulers, explorers, solar ships and the staff multi-tool (the game's part names; written where the game's customiser keeps them). Corvettes are left out: they're built in the corvette workshop. The app can't preview the look: load the save to see it, and use Undo last write if you don't like it.
- **Bases:** export any base's building parts to a file (saved in `data\exports`) to keep or share, or import a base file into one of your bases, replacing what's built there. Build a base computer where you want it first; terrain changes don't come along.
- **Companions:** name any of your companions.
- **Show only what's active** (on by default) hides empty inventories, quests you haven't started, old timers and idle settlement plots.
- **Everything (raw):** browse and change any value in the save, with readable field names.

How it keeps your save safe:
- Changes wait in a list until you press **Write to save**. Nothing is written before that.
- It refuses to write while No Man's Sky is running, or if the game saved again after you loaded the save into the editor.
- Every write backs the save (and its `mf_` manifest) up to `data\backups` first. Backups you make by hand stay until you delete them; automatic ones are trimmed to the newest 40 per save (adjustable).
- Changes that can alter how the game behaves (removing core tech, raw edits, experimental settlement changes) are called out before you write.
- Only the values you changed are touched; the rest of the save stays byte-for-byte the same. The save is re-packed, the manifest is updated to match, and both are read back and checked after writing.

Use them at your own risk, and keep your own copy of anything important.

## Run from source (Windows)
1. Download this repository (**Code → Download ZIP**) and unzip it anywhere.
2. Double-click **`NMS Save Tracker.exe`**. The app opens in its own window (Microsoft WebView2, part of Windows 10 and 11). The .exe isn't code-signed, so the first time Windows may say "Windows protected your PC": click **More info → Run anyway**. `NMS Save Tracker.vbs` still works too.
3. Press **Sync** to read your latest save. Tick **Auto-sync** next to it to keep every tab updated while you play.

The app finds your saves in `%APPDATA%\HelloGames\NMS` automatically. If yours are somewhere else, pick the folder under **Settings & help → Game files**. Steam and GOG saves are supported; Game Pass saves use a different format and aren't yet.

## Privacy and safety
- The app **only reads** your game files and never changes them. Item icons are copied from your game install into the app's own `data\icons` folder.
- It **only reads** your saves too, unless you turn on the save tools and press **Write to save**. Then it writes only to the save you're editing, never while the game is running, and backs it up to `data\backups` first.
- Everything runs on your PC. A small helper (`app\server.ps1`) serves the app to `127.0.0.1` only, so nothing is reachable from other devices.
- Your app data (pins, notes, settings, last sync) is stored in the `data\` folder next to the app. Nothing is uploaded.
- Bug reports only go out when you choose to submit one, and the attached log leaves out save data, names, coordinates and file paths.
- The only time the app goes online by itself is the update check: it asks GitHub for the latest release, and you can turn it off.

## Folder layout
```
NMS Save Tracker.exe   the app window (WebView2); starts the helper
NMS Save Tracker.vbs   older launcher (starts the .exe, or an Edge window without it)
app\server.ps1         local helper (PowerShell)
app\lib\               Microsoft WebView2 SDK libraries (BSD license)
web\                   the app (index.html is built from source\)
web\config.json        publisher settings (GitHub repo for bug reports)
source\                source code, build script and developer notes
data\                  created on first run: your personal app data, icon cache and save backups (not in git)
```

## Building from source
- Full installer: `makensis source/installer/setup.nsi` (NSIS 3) writes `release/NMS-Save-Tracker-<version>-beta-Setup.exe`.
- Web installer: `makensis source/installer/web-setup.nsi` writes `release/NMS-Save-Tracker-Setup.exe`. It has no app inside: it downloads the full installer from the newest GitHub release (matched by the name `NMS-Save-Tracker-<version>-Setup.exe`, checked against GitHub's SHA-256) and runs it silently. Attach both files to every release.

Requires Python 3. Run `python source\build.py` to rebuild `web\index.html` from `source\src`. The app window is built from `source\window\Window.cs` with `source/window/build.sh` (Mono `mcs`). See `source\NOTES-FOR-CLAUDE.md` for how everything fits together.

## License
The app's own code is under the [MIT License](LICENSE). Third-party parts keep their own licenses: see [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

## Credits
- Save decoding key map: [MBINCompiler](https://github.com/monkeyman192/MBINCompiler) `mapping.json`.
- Item, recipe and frigate data: read from No Man's Sky's own files (`source/src/gamedata.js`, `source/tools/mkgamedata.js`, `source/tools/mkfleet.js`), using the table layouts documented by [MBINCompiler](https://github.com/monkeyman192/MBINCompiler). Earlier versions used [bradhave94/nms](https://github.com/bradhave94/nms), which was very helpful for checking the new reader.
- Galaxy names list: community sources.
- Game pack format: as documented by [HGPAKtool](https://github.com/monkeyman192/HGPAKtool) (MIT).
- App window: [Microsoft WebView2 SDK](https://www.nuget.org/packages/Microsoft.Web.WebView2) (BSD 3-Clause).
- Fonts: Chakra Petch, IBM Plex Sans and IBM Plex Mono (SIL Open Font License), bundled so the app works offline.
- zstd decoding: [fzstd](https://github.com/101arrowz/fzstd) by Arjun Barrett (MIT), included in `source/src/gameicons.js`.
- BC7 partition tables: [bcdec](https://github.com/iOrange/bcdec) by Sergii Kudlai (MIT).
- Save manifest format (XXTEA key and layout) and save compression (LZ4 blocks): as documented by the NMS modding community. The LZ4 packer in `source/src/savetools.js` is written for this app.

## Disclaimer
NMS Save Tracker is an unofficial fan-made app. It is not affiliated with or endorsed by Hello Games. No Man's Sky is a trademark of Hello Games, and game data and text belong to their respective owners.
