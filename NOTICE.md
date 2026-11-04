# Notice and attribution

**Canalis** (this repository) is a modified version of **Nectar**.

## Upstream projects

| | |
| --- | --- |
| Project | Nectar |
| Author / maintainer | kua8 |
| Repository | <https://github.com/kua8/Nectar> |
| Fork point | commit `c75a790` (Nectar 1.7.2) |
| License | GNU General Public License v3.0 |

Nectar itself is a fork of [Bloom](https://github.com/SehajveerSingh2005/bloom) by
Sehajveer Singh. The concept and a large part of the codebase originate there.

## This fork's changes

Canalis is maintained by [wsalas19](https://github.com/wsalas19). The changes made
on top of upstream Nectar are listed in [FORK.md](FORK.md). In summary: the Canalis
identity, icons and installer artwork, an independent update channel and signing
key, error-handling improvements, the weather dashboard, the centralized type
scale, and the window-chrome fixes.

## Copyright and license

- The original code, architecture and documentation are the work of the upstream
  authors and remain their copyright.
- Upstream copyright notices are retained in this repository, including the
  `authors` field in `src-tauri/Cargo.toml` (`kua8`, `wsalas19`).
- The combined work is distributed under the **GNU General Public License v3.0**
  (`GPL-3.0-only`) — see [LICENSE](LICENSE). There is no separate license for the
  Canalis modifications; the GPL applies to the whole work.
- If you redistribute this software or a modified version of it, the GPL requires
  that you keep the license, provide the corresponding source, and preserve the
  notices in this file.

## Names and marks

“Nectar” and “Bloom” are the names of their respective projects and belong to
their authors. **Canalis is not affiliated with, endorsed by, or supported by the
Nectar or Bloom maintainers.** Report Canalis issues
[here](https://github.com/wsalas19/Canalis/issues) rather than upstream.

## Third-party components

This application builds on open-source software, including Tauri, React,
framer-motion, lucide, and the Inter typeface, each under its own license as
recorded in `Cargo.lock`, `bun.lock` and `public/fonts`. The Windows installer can
fetch Microsoft's WebView2 bootstrapper during setup on systems without the
runtime, subject to Microsoft's terms.
