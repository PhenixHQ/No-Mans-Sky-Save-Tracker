# NMS Save Tracker: notes for Claude

Read this first in any new session. It explains how the app is put together and what has been decided, so you can make changes without rediscovering everything.

## Working with Jay (the owner)
- **Do not build or change files until Jay says "you can build".** Until then, collect requests, answer questions and say what you would do.
- Jay batches requests, then asks for one build. Keep a running list and confirm it before building.
- Jay prefers plain explanations; he is not a programmer. Keep replies short and concrete.
- Do not copy Hello Games artwork (item icons, glyphs) into the app. Wiki images are not free to use either. The plan is to read icons from the player's own game install at runtime (see Roadmap).
- Never mention or store personal names that appear in screenshots of Jay's Discord or game overlays.
- The app only **reads** saves. It never writes to game files or saves.

## What it is
An unofficial fan-made desktop companion for No Man's Sky (PC, Steam). Tabs: Recipes, What can I make?, Inventory, Where to find, Portals, My galaxy, Quests, Pinned, plus a Settings & help drawer (Look, Display, Map colours, Sync, Game files, Report a bug, Help).

Installed at `C:\NO MANS SKY COMPANION PROJECT\`:
```
NMS Save Tracker.vbs      launcher (runs app\server.ps1 hidden, -STA)
Voidigaunt Companion.vbs  old name, same launcher, kept for old shortcuts
app\server.ps1            PowerShell helper: HttpListener on 127.0.0.1:47831
web\index.html            the whole app, one file, built from source\
web\mapping.json          MBINCompiler key map to de-obfuscate save JSON
web\config.json           {"githubRepo": "owner/repo"} for bug reports (empty = GitHub button hidden)
web\icon.ico
data\                     user data (never overwrite): companion.json (+.bak), paths.json, reports\, window\ (Edge profile), helper.log
source\                   this folder
```

## Build
`python source\build.py` writes `web\index.html` from:
- `src/head.html`: `<meta>`, title, font links and **all CSS**. Later blocks override earlier ones. The newest look is the "v1.6 refresh" block and the "game-style inventory panel" block near the end.
- `src/body.html`: markup and the main script (one IIFE). Placeholders: `__SAVESYNC__`, `__GAME__`, `__GALAXY__`.
- `src/savesync.js`: save reader (also usable in Node for tests: `require('./savesync.js')`).
- `data/game.bundle.json`: game data (items, recipes, id maps, icon hints).
- `data/galaxy-snapshot.json`: a snapshot of Jay's parsed save, used only by the web version when there is no helper.

`python build.py --web` also writes `out/nms-save-tracker.html`, which is published as Jay's private claude.ai artifact (https://claude.ai/artifact/1Xq6gB4wFvUWRh6SKbPLqU).

To update the installed app, edit `src/*`, run the build, and copy `web\index.html` (and `app\server.ps1` if changed) into place. Jay must close the app and wait about a minute before reopening when `server.ps1` changes. Page-only changes just need a reopen.

Testing without Windows: `NMS_SAVE=path/to/save.hg node tools/mock.js` runs a Node stand-in for the helper on port 47831. `tools/t5.js`, `t6.js` and `t7.js` are Playwright scripts (screenshots plus console error checks).

## Helper API (server.ps1), all under /api/, header `X-VC: 1` required
| endpoint | what |
|---|---|
| GET ping | `{ok, app, helper:4}` (page keeps pinging every 10 s; helper exits 45 s after the last ping) |
| GET saves | list of `{dir, name, size, mtime}`; dir is `st_…`/`DefaultUser` (auto) or `manual` / `manual:st_…` |
| GET save?dir&name | raw save*.hg bytes (shared read) |
| GET/POST data | whole app state JSON (`data\companion.json`, atomic write + .bak) |
| GET/POST paths | game and save folder status; POST `{game?:path|null, saves?:path|null}` (null = auto) |
| POST pickfolder?kind=game\|saves | native folder dialog, returns `{path}` |
| POST open?url | opens a `https://github.com/<o>/<r>/issues/new?…` link in the default browser (nothing else allowed) |
| POST report | saves text to `data\reports\bug-<time>.txt` |
| POST openreports, shortcut, quit | as named |

Game auto-detect: Steam registry, then `libraryfolders.vdf`, then GOG registry, then common folders. Valid means the folder has `GAMEDATA\PCBANKS\*.pak`.

## Save format (what savesync.js does)
- save*.hg is LZ4 block chunks, each with a 16-byte header `FEEDA1E5, compSize, uncompSize, 0`. The output is JSON with obfuscated keys; `deob()` renames them using `mapping.json`.
- Addresses: discovery/base UA = planet(4) system(12) galaxy(8) Y(8) Z(12) X(12). VisitedSystems = X(12) | Y(8)<<12 | Z(12)<<20 | system(12)<<32 (galaxy not stored, so it is inferred from matching records or neighbouring visits). Portal hex = P SSS YY ZZZ XXX, keypad number = hex+1.
- `build()` returns `{v:3, sys:[…], cur, path, stats, inv}`. System entries: x,y,z,s,v(visited), g (galaxy, omitted when 0), n (name), dn (name from station), by ('you'/player/''), P (planets: n, by, bio, fa/fl/mi counts, wp), b (bases), t (teleporters).
- `inv` groups: exo, ships, corv (corvette ships use BIGGS model plus `CorvetteStorageInventory`), freighter, base (Chest1..10 = "Storage Container 0..9", plus special chests), exocraft. Items are `[id, amount, max, isSubstance, x, y]`; containers have `w`, `h`, `vs` (valid cell indices y*w+x); unnamed ships/exocraft have `un:1`.
- Bumping the `v` number makes the app resync on next launch.

## Page state (S, saved via /api/data or localStorage key `voidigaunt-companion:v1`, kept for continuity)
pins, inv (manual planner list), pl (planner source), iv (inventory tab), addr (saved portals), pnotes, quests, mapv (camera), settings (theme/preset/custom[5]/nav/size/map colours/autosync/syncEvery/disp{gIcon,gNum,gName,gHex,big,loc,invView,gridNames}), galaxy (last parsed save), lastSync, usage, diag (errors for bug reports).

## Decisions made
- Name: **NMS Save Tracker** (renamed from "Voidigaunt Companion", which was Jay's corvette name). A future save editor would be **NMS Toolkit**.
- Themes: no two presets share the same background+accent pair. There are 5 custom preset slots.
- Glyph and item icons are currently original drawings made for this app (GLYPH_SVG, KIND_SVG), with element-symbol tiles coloured from game data.
- Bug reports go to GitHub issues (prefilled URL; if the log is too long for the link it is copied to the clipboard). The template is in `source/github-issue-template/bug_report.md`; in the GitHub repo it goes at `.github/ISSUE_TEMPLATE/bug_report.md`. The report log is scrubbed of names, paths, IDs and coordinates.
- The inventory "Game view" mimics the in-game UI: tab row, currency strip, bordered colour tiles, symbol pill, amount (n or n / max), empty-slot markers.

## Roadmap / ideas Jay asked about
- **Real icons from the player's own install** (Jay wants this used everywhere possible). The helper would unpack textures from `GAMEDATA\PCBANKS` (HGPAK format since 2024, textures are DDS/BC) into `data\icons\` plus an index, using an existing open-source unpacker if one fits. `game.bundle.json` source data has IconPath for every item (e.g. `textures/ui/frontend/icons/u4substances/substance.fuel.1.dds`); the extraction step would need to keep that mapping. Keep the stand-in icons as a fallback.
- NMS Toolkit (save editor), a separate app later.
- Planet star class and system names are not in the save, so they can't be shown.

## GitHub
- Repo: `PhenixHQ/No-Mans-Sky-Save-Tracker` (private for now). The first alpha went to the `alpha` branch.
- In the repo, `source/data/galaxy-snapshot.json` is an empty snapshot, so no personal save data is committed. Jay's local copy has his real snapshot.
- Before going public, check: Jay-specific defaults in `src/body.html` (QDEFAULT quests, PRESET planet notes for Bountria II, `defaultAddrs()`); licensing for the bradhave94/nms data (that repo has no license file) and for MBINCompiler's mapping.json; and adding a LICENSE file.
