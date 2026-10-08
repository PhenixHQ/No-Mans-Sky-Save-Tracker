# Third-party notices

NMS Save Tracker includes or builds on the following work by others. Each keeps its own license.

| Part | Where it's used | Author | License |
|---|---|---|---|
| [fzstd](https://github.com/101arrowz/fzstd) | zstd decoding of game packs, inside `source/src/gameicons.js` | Arjun Barrett | MIT |
| [bcdec](https://github.com/iOrange/bcdec) | BC7 partition tables for icon decoding, in `source/src/gameicons.js` | Sergii Kudlai | MIT (or Unlicense) |
| [HGPAKtool](https://github.com/monkeyman192/HGPAKtool) | Reference for the game pack (HGPAK) format; no code copied | monkeyman192 | MIT |
| [MBINCompiler](https://github.com/monkeyman192/MBINCompiler) `mapping.json` | Save key names, shipped as `web/mapping.json` | monkeyman192 and contributors | LGPL-3.0 |
| [Microsoft WebView2 SDK](https://www.nuget.org/packages/Microsoft.Web.WebView2) | App window, `app/lib/*.dll` | Microsoft | BSD 3-Clause |
| [Chakra Petch](https://fonts.google.com/specimen/Chakra+Petch) | Bundled font | Cadson Demak | SIL Open Font License 1.1 |
| [IBM Plex Sans / Mono](https://github.com/IBM/plex) | Bundled fonts | IBM | SIL Open Font License 1.1 |
| [bradhave94/nms](https://github.com/bradhave94/nms) | Item and recipe data (`source/data/game.bundle.json`) | bradhave94 | No license stated; used with credit |

Save manifest (XXTEA) and save compression (LZ4 block) layouts are as documented by the No Man's Sky modding community. The LZ4 packer in `source/src/savetools.js` was written for this app.

No Man's Sky is a trademark of Hello Games. Game data and text are theirs. No game artwork ships with this app: item icons and portal glyph pictures are read from the player's own game install at runtime and stay on their PC.

---

## MIT License (fzstd, bcdec, HGPAKtool)

fzstd: Copyright (c) 2020 Arjun Barrett.
bcdec: Copyright (c) 2022 Sergii Kudlai.
HGPAKtool: Copyright (c) monkeyman192.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## BSD 3-Clause License (Microsoft WebView2 SDK)

Copyright (C) Microsoft Corporation. All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
3. Neither the name of Microsoft Corporation nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

## LGPL-3.0 (MBINCompiler mapping.json)

`web/mapping.json` is an unmodified file from MBINCompiler's releases, distributed under the GNU Lesser General Public License v3.0. Full text: https://www.gnu.org/licenses/lgpl-3.0.txt. You can replace it with any newer `mapping.json` from https://github.com/monkeyman192/MBINCompiler/releases.

## SIL Open Font License 1.1 (Chakra Petch, IBM Plex)

Chakra Petch: Copyright 2018 The Chakra Petch Project Authors (https://github.com/cadsondemak/Chakra-Petch).
IBM Plex: Copyright © 2017 IBM Corp. with Reserved Font Name "Plex".

These fonts are licensed under the SIL Open Font License, Version 1.1. Full text: https://openfontlicense.org/open-font-license-official-text/. The fonts are bundled unmodified (as web fonts embedded in `web/index.html`) and may not be sold on their own.
