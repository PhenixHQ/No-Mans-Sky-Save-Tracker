# NMS Save Tracker: notes for Claude

Read this first in any new session. It explains how the app is put together and what has been decided, so you can make changes without rediscovering everything.

## Working with Jay (the owner)
- **Do not build or change files until Jay says "you can build".** Until then, collect requests, answer questions and say what you would do.
- Jay batches requests, then asks for one build. Keep a running list and confirm it before building.
- Jay prefers plain explanations; he is not a programmer. Keep replies short and concrete.
- Do not copy Hello Games artwork (item icons, glyphs) into the app. Wiki images are not free to use either. Icons are read from the player's own game install at runtime (see Game icons).
- Never mention or store personal names that appear in screenshots of Jay's Discord or game overlays.
- The app never writes to game files. It only reads saves, except through the opt-in **save tools** (1.8.0, Jay asked for the editor to be merged into the Tracker): hidden behind Settings & help > Game files > Advanced, writes only on "Write to save", refuses while NMS.exe runs, backs up first, verifies after.
- Jay's saves on his PC: back up first, edit only with the game closed, verify byte-for-byte after (`cmp`).

## What it is
An unofficial fan-made desktop companion for No Man's Sky (PC, Steam). Tabs: Recipes (with an "Only recipes I can make now" toggle; this replaced the old What can I make? tab in 1.7.0; since 1.8.0 every recipe shows make counts), Inventory (Everything view has filters), Where to find (with a star class decoder), Portals, My galaxy (with a species-per-planet table), Quests, Pinned, Save tools (only when turned on), plus a Settings & help drawer (Look, Display, Map colours, Sync, Game files, Report a bug, Help). The header has Sync and an Auto-sync tick box that keeps every tab updated.

Installed at `C:\NO MANS SKY COMPANION PROJECT\`:
```
NMS Save Tracker.vbs      launcher (runs app\server.ps1 hidden, -STA)
Voidigaunt Companion.vbs  old name, same launcher, kept for old shortcuts
app\server.ps1            PowerShell helper: HttpListener on 127.0.0.1:47831
web\index.html            the whole app, one file, built from source\
web\mapping.json          MBINCompiler key map to de-obfuscate save JSON
web\config.json           {"githubRepo": "owner/repo"} for bug reports (empty = GitHub button hidden)
web\icon.ico
data\                     user data (never overwrite): companion.json (+.bak), paths.json, icons\ (game icon cache + index.json + pack.bin), backups\ (save backups, one folder each with info.json), reports\, window\ (Edge profile), helper.log
source\                   this folder
```

## Build
`python source\build.py` writes `web\index.html` from:
- `src/head.html`: `<meta>`, title, font links and **all CSS**. Later blocks override earlier ones. The newest look is the "v1.6 refresh" block and the "game-style inventory panel" block near the end.
- `src/body.html`: markup and the main script (one IIFE). Placeholders: `__SAVESYNC__`, `__GAME__`, `__GALAXY__`.
- `src/savesync.js`: save reader (also usable in Node for tests: `require('./savesync.js')`).
- `src/savetools.js` (placeholder `__SAVETOOLS__`): SaveTools, the low-level save writer: one-char-per-byte text, `locate(text, path)` (exact span of a value), `applyEdits`, `literal` (keeps 1.0 style), LZ4 block packer + `pack()` (self-checks by unpacking), XXTEA manifest `mfOpen/mfUpdate`. Node-testable.
- `src/gameicons.js` (placeholder `__GAMEICONS__`): HGPAK pack reader + DDS decoder (BC1-5, BC7, RGBA) for the game icon loader. Includes fzstd (MIT) for zstd chunks and bcdec's BC7 partition table (MIT). Verified against Pillow on real game textures.
- `data/game.bundle.json`: game data (items, recipes, id maps, icon hints `ic`, icon paths `ip`: game id -> path under textures/ui/frontend/icons/, or a full path starting with /).
- `data/galaxy-snapshot.json`: a snapshot of Jay's parsed save, used only by the web version when there is no helper.

`python build.py --web` also writes `out/nms-save-tracker.html`, which is published as Jay's private claude.ai artifact (https://claude.ai/artifact/1Xq6gB4wFvUWRh6SKbPLqU).

To update the installed app, edit `src/*`, run the build, and copy `web\index.html` (and `app\server.ps1` if changed) into place. Jay must close the app and wait about a minute before reopening when `server.ps1` changes. Page-only changes just need a reopen.

Testing without Windows: `NMS_SAVEDIR=folder/with/save.hg+mf_save.hg NMS_GAME=folder/with/GAMEDATA/PCBANKS node tools/mock.js` runs a Node stand-in for the helper on port 47831 (icons go to tools/mock-icons, backups to tools/mock-backups; `NMS_RUNNING=1` pretends the game is running). The real helper runs under PowerShell 7 for Linux too: set `APPDATA` to any folder, comment out `Open-Window` and `Update-OldShortcut`, and point data\paths.json `saves` at a test folder. A process named `NMS` makes it refuse writes. PowerShell 7 for Linux can also run the real `server.ps1` (tested in 1.7.0 with a fake game folder). `tools/t5.js`, `t6.js`, `t7.js`, `tA.js` (auto-sync + can-make), `tC.js` (star guide), `tD.js` (species), `tF.js` (icons), `tG.js` (loading screen, inventory filters, make counts), `tH.js` (save tools end to end), `tI.js` (icon pack, backups/restore, quest restore, game-running guard; real helper, env PST) are Playwright scripts.

## Helper API (server.ps1), all under /api/, header `X-VC: 1` required
| endpoint | what |
|---|---|
| GET ping | `{ok, app, helper:6}` (page keeps pinging every 10 s; helper exits 45 s after the last ping) |
| GET saves | list of `{dir, name, size, mtime}`; dir is `st_…`/`DefaultUser` (auto) or `manual` / `manual:st_…` |
| GET save?dir&name | raw save*.hg bytes (shared read) |
| GET/POST data | whole app state JSON (`data\companion.json`, atomic write + .bak) |
| GET/POST paths | game and save folder status; POST `{game?:path|null, saves?:path|null}` (null = auto) |
| POST pickfolder?kind=game\|saves | native folder dialog, returns `{path}` |
| GET paks | `{ok, paks:[{name,size,mtime}]}` NMSARC.*.pak in the detected game's GAMEDATA\PCBANKS (detail when not found) |
| GET pak?name&off&len | read-only byte range (len <= 32 MB) of one pack; name must match `^NMSARC\.[A-Za-z0-9_]+\.pak$` |
| GET/POST icons?file= | GET returns data\icons\index.json; POST saves `<name>.webp` (<= 2 MB) or `index.json`. Files are served at /icons/<name> |
| GET gamerunning | `{running}` (Get-Process NMS) |
| GET savefiles?dir | `{dir, files:[{name,size,mtime}]}` save*.hg, accountdata.hg and their mf_ files |
| GET savefile?dir&name | raw bytes of one of those |
| POST savewrite?dir&name&expect&label | body = u32 LE save length, save bytes, mf bytes. Refuses if NMS runs (409), if the save's mtime moved more than 1.5 s from `expect` (409), if it isn't FEEDA1E5 or the mf size differs (400). Backs up save + mf, writes .tmp then moves, SHA-256 checks both. Returns `{ok, backup, mtime, size}` |
| GET backups / POST backups?action=create\|delete\|label\|open | list `info.json`s; create (dir, name, label), delete (id), rename (id, label), open the folder |
| GET backupfile?id&name | bytes of a file in one backup |
| POST iconpack | writes data\icons\pack.bin (<= 96 MB) |
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
- Name: **NMS Save Tracker** (renamed from "Voidigaunt Companion", which was Jay's corvette name). The save editor once planned as **NMS Toolkit** is now the Tracker's hidden save tools.
- Themes: no two presets share the same background+accent pair. There are 5 custom preset slots.
- Glyph and item icons are currently original drawings made for this app (GLYPH_SVG, KIND_SVG), with element-symbol tiles coloured from game data.
- Bug reports go to GitHub issues (prefilled URL; if the log is too long for the link it is copied to the clipboard). The template is in `source/github-issue-template/bug_report.md`; in the GitHub repo it goes at `.github/ISSUE_TEMPLATE/bug_report.md`. The report log is scrubbed of names, paths, IDs and coordinates.
- The inventory "Game view" mimics the in-game UI: tab row, currency strip, bordered colour tiles, symbol pill, amount (n or n / max), empty-slot markers.

## Game icons (1.7.0)
- On desktop start (2.5 s after load) the page loads data\icons\index.json. If it's missing, or the pack signature (name:size:mtime of every pack) changed after a game update, it rebuilds in the background: opens Tex*/UI packs (TexUI first), finds each `ip` path, decodes the DDS at <=128 px, draws it to a 96 px canvas, and saves WebP via POST /api/icons. Progress and errors show in Settings & help > Game files; `vcLog('icons', ...)` lines go into bug reports.
- `DSP.gameIcons` (Use game icons tick box) turns them off. Drawn icons stay as the fallback for items with no icon in the packs.
- PC packs are zstd (HGPAK v2, 0x10000 decompressed chunks, chunks padded to 16 bytes, file 0 = CRLF manifest of file names). Mac packs use LZ4 and Switch uses Oodle; not supported.
- Real icon output was not checked on Jay's PC before shipping (the TexUI pack is 627 MB, over the 400 MB staging limit); the pipeline was tested on real texture packs and a test pack with icon paths.

## 1.8.0 additions
- **Loading screen** (`#boot`, top of body.html): 51 original tips/jokes, shown only while loading. Hidden by `bootDone()` once icons (`BOOT.icons`) and the start-up sync (`BOOT.sync`) are done, or after 15 s.
- **Icon pack:** `data\icons\pack.bin` = `NMSTIP1\0`, u32 count, then per icon u16 name length + name (the `ip` path) + u32 size, then the WebP bytes in order. `giPreload()` loads it at start-up into blob URLs; index.json gets `pack: <stamp>`. Made after every icon build (`giMakePack`), or at start-up when the index has no pack. New builds do owned items first.
- **Inventory filters** (Everything view only): `S.iv.f = {cats, src, noCorv, rec, val}`. `itemCat(id)` sorts into raw, refined, basic, adv (a craft recipe uses a crafted ingredient), trade, curio, food, fish, tech, basepart, corv, other. Sources split corvette ships from corvette workshop storage (`corvstore`).
- **Make counts:** `makeCounts(r)` = now (`runs`), sub (depth 1), all (depth 8) via `obtain()` (takes from a pool, crafts the shortfall using `MAKERS`: craft, then refine, then cook recipes, max 4 tried, 25k-step budget) and a doubling + binary search in `maxMake`. `mkDetail` shows the tree (same recipe choice via `pickRecipe`), where each ingredient is stored and the shortfall for one more. `S.pl.mk` toggles it. HAVE = `stock()`, refreshed in `renderPlanner()` (now also after every sync).
- **Save tools** (tab `tools`, `ST.tools`): sections Saves & backups, Inventories, Currencies, Settlements, Quests, Timers, Everything (raw). Edits are kept as `{s, e, text}` spans of the original text (`ED.edits`), so untouched bytes never change; overlapping edits are refused. Inventory edits rebuild the Slots array reusing each untouched slot's original text (models kept per inventory in `ED.invModels`). New slots copy the shape of a real slot from the save. Currencies are signed 32-bit in the save. Settlement keys (not all in mapping.json): NKm name, 3?K owner, d3x building states, 3@T building start times, gUR stats [max pop, happiness, production, upkeep, sentinels, debt, alert, bug attack], OEf perks, HMQ.?SU pending decision, abj production, hiD/:Qn next upgrade, SS2 builders. "Finish construction" = start time minus 7 days (what was done by hand for Jay on 2 Oct 2026, which worked). Restore and "make the game load this" stamp mf v[89] with now.
- Manifest index: save.hg = 2, saveN.hg = N+1, accountdata.hg tried by checking the 0xEEEEEEBE magic.

## 1.9.0 additions
- **Crafting tree:** `plan()` builds a node tree (have / make / gather / short) using `pickRecipe`, which never picks a recipe that loops back to an item already being made, and gathers raw materials instead of refining them in circles. `nodeHTML` draws it with connector lines (`.ctree`); `planSteps` lists the steps deepest-first with the same recipe merged; `planGather` gives what to gather for one more.
- **Friendlier save tools:** "Show only what's active" (`ST.edAll` = 1 means show all; default is active only) hides empty inventories, not-started and tutorial quests, old timers and idle plots. Quests are grouped by questline (`QG` regexes) with readable names (`questName`) and states tracking / has progress / finished / not started (step -1 = not started, 2147483647 = finished repeatable job; the save keeps step numbers after a quest ends, so "has progress" can be done). Timers are grouped with plain labels (`timerInfo`).
- **Item picker:** creative-menu style modal (`pickerHTML`) with category tabs from `itemCat`, search and icons. Amount box `n / limit` with −1, +1, ¼, ½, full; amounts are clamped to `stackLimit()` (biggest stack of the item already in the save in the same StackSizeGroup; exosuit gets half of a ship stack; safe defaults otherwise). `questWarn()` warns for quest-linked items (`QITEMS`).

## Roadmap / ideas Jay asked about
- The save editor ("NMS Toolkit") was merged into the Tracker as the opt-in save tools in 1.8.0.
- Planet star class and system names are not in the save, so they can't be shown.

## GitHub
- Repo: `PhenixHQ/No-Mans-Sky-Save-Tracker` (private for now). The first alpha went to the `alpha` branch.
- In the repo, `source/data/galaxy-snapshot.json` is an empty snapshot, so no personal save data is committed. Jay's local copy has his real snapshot.
- Before going public, add third-party notices for fzstd and bcdec (both MIT) next to the LICENSE. Also check: Jay-specific defaults in `src/body.html` (QDEFAULT quests, PRESET planet notes for Bountria II, `defaultAddrs()`); licensing for the bradhave94/nms data (that repo has no license file) and for MBINCompiler's mapping.json; and adding a LICENSE file.
