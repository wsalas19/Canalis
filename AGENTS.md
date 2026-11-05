# AGENTS.md — Canalis codebase gateway

Canalis is a Windows shell app built with **Tauri 2 + React 19 + TypeScript**.
The product is a notch (top) and a dock (bottom) that can replace the taskbar.
This file is a routing index, not a substitute for reading the code: use it to
find the owning module before inspecting large files.

## First rules

- Use `bun run tauri dev` for UI work. Do not run `tauri build` just to test UI.
- Restart the dev app only when Rust or Tauri config changes require it.
- Do not automate cursor or window interactions; test in the real app window.
- Check `tsc --noEmit` after TypeScript changes and `cargo check` after Rust changes.
- Test English and Turkish when touching user-facing strings.
- Reuse existing components, helpers, CSS and i18n keys before adding new ones.
- Avoid new dependencies unless they remove more code than they add.
- Watch bundle size and runtime cost when touching polling, wheel handling,
  window enumeration, Win32 hooks or animations.
- Keep `nectar-*` setting keys, CSS variables and Rust command names stable unless
  you are deliberately migrating settings.
- Every new `invoke("...")` needs the Rust command **and** its registration in
  `src-tauri/src/main.rs` (`tauri::generate_handler!`).
- Preserve GPL-3.0-only licensing and the Nectar/Bloom attribution. See
  `NOTICE.md`, `FORK.md`, `LICENSE`.

## Window / entry map

| Tauri label | HTML | React entry | Primary files |
|---|---|---|---|
| `main`, `main-<monitor>` | `index.html` | `src/main.tsx` → `App` | `src/App.tsx`, `src/App.css` |
| `settings` | `settings.html` | `src/Settings.tsx` (self-mounts) | `src/Settings.tsx`, `src/settings/*`, `src/Settings.css` |
| `calendar` | `calendar.html` | `src/Calendar.tsx` (self-mounts) | `src/Calendar.tsx`, `src/Calendar.css` |
| `overlay` | `overlay.html` | `src/Overlay.tsx` (self-mounts) | `src/Overlay.tsx`, `src/Overlay.css` |
| `dock`, `dock-<monitor>` | `dock.html` | `src/dock-main.tsx` → `Dock` | `src/Dock.tsx`, `src/Dock.css` |

Window labels, URLs and geometry live in `src-tauri/tauri.conf.json`.
Runtime sizing/positioning and per-monitor windows are owned by
`src-tauri/src/commands.rs`, `src-tauri/src/monitors.rs` and
`src-tauri/src/services.rs`; the notch cannot resize itself from React.

## Frontend index

| Area | File(s) | Read when… |
|---|---|---|
| Notch shell | `src/App.tsx` | Any notch mode, wheel, sizing, panel render, weather/caldav/media wiring |
| Notch calendar | `src/components/NotchCalendar.tsx` | Calendar panel inside the notch |
| Notch clock/timer | `src/components/NotchClock.tsx`, `src/hooks/useStopwatch.ts`, `src/clockFormat.ts` | Timer, stopwatch, progress |
| Notch shelf | `src/components/NotchShelf.tsx` | Drag/drop shelf |
| Notch tour/progress | `src/components/NotchTour.tsx`, `NotchProgressBorder.tsx` | Onboarding / progress ring |
| Status widgets | `src/components/StatusWidgetConfig.tsx` | Weather/battery/CPU/network pills |
| Control Center | `src/components/ControlCenterConfig.tsx`, `ConnectionsView.tsx` | CC tiles/buttons/sliders, WiFi/BT/audio subviews |
| Dock | `src/Dock.tsx` | Pinned/running apps, previews, menus, drives, taskview, reorder |
| Compact media | `src/CompactMediaPlayer.tsx`, `src/music/palette.ts` | Compact player, artwork tint/ambience |
| Overlays/HUD | `src/Overlay.tsx` | Volume, brightness, mixer, edge overlays |
| Calendar window | `src/Calendar.tsx` | Full calendar views |
| Weather panel | `src/WeatherPanel.tsx`, `src/hooks/useWeather.ts` | Weather dashboard, fetch/cache, WMO codes |
| Settings shell | `src/Settings.tsx`, `src/settings/index.ts` | Window shell, tab routing |
| Settings model | `src/settings/useSettings.ts` | Every `nectar-*` value/toggle/save/retry |
| Settings tabs | `src/settings/*Tab.tsx`, `CalendarSyncPage.tsx` | UI for a specific settings area |
| Settings primitives | `SettingRow`, `SettingSection`, `OrderList`, `Dropdown`, `usePerMonitor`, `InlineError` | New rows, selectors, ordering, errors |
| Global state | `src/state/appReducer.ts`, `AppProviders.tsx` | Media/System/Ui state, adding a field |
| Cross-window sync | `src/hooks/useSettingsSync.ts` | Reacting to `settings-changed` |
| Theme/type | `src/theme.ts`, `src/typography.css` | Colors, light/dark, font, type scale |
| i18n | `src/i18n.ts`, `src/locales/en.json`, `src/locales/tr.json` | Any user-facing string |
| Panel order | `src/panelOrder.ts` | Notch panel order / CC layout parsing |
| Dual clock | `src/dualClock.ts` | Timezone/second clock |
| Misc hooks | `useTrailingThrottle.ts`, `updater.ts` | Slider throttling, update result type |

### Notch mode anchors

Inside `src/App.tsx`, search for:

- `availableNotchModes` — panel list and filtering.
- `handleWheel` — one-mode-per-gesture wheel cycling.
- `getDynamicWidth` / `getDynamicHeight` — CSS-rendered notch size.
- `rememberedModeRef` — restore last panel on hover.
- `useWeather(...)` — weather hook wiring.
- media listener block (`media-update`, `media-sessions`) — SMTC state.
- mode render area (`nectarMode === '...'`) — panel content.

`NectarMode` is defined in `src/state/appReducer.ts`. Global providers are created
only in the notch window; `useMediaState`/`useSystemState`/`useUiState` are not
available in Dock/Settings/Calendar/Overlay.

### Settings flow

`src/settings/useSettings.ts` is the single settings model. It writes
`localStorage`, invokes `save_setting`, debounces slider writes, tracks failed
writes (`failedSaves`/`useFailedSaveCount`) and retries from the Settings banner.
Rust broadcasts `settings-changed`; a file watcher broadcasts
`settings-external-changed`. Windows consume them through `useSettingsSync`.
Adding a setting usually touches: `useSettings.ts`, the owning tab, the consumer
window’s sync map, `SETTINGS.md`, and both locales.

### Styling

Each window has one hand-written CSS file; there are no CSS modules and Tailwind
is not the source of truth. Import `typography.css` for `--text-*` tokens.
`theme.ts` writes `--nectar-*` tokens on `<html>`. Settings uses
`SettingRow`/`SettingSection`; dropdown menus are portalled to `body` to escape
`.setting-group { overflow: hidden }`. Preserve that positioning behavior.

## Backend index

| File | Responsibility |
|---|---|
| `src-tauri/src/main.rs` | Entry, single-instance, tray setup, plugin init, **all command registration**, worker startup, exit taskbar restore |
| `src-tauri/src/lib.rs` | Stub for Windows crate-type; no logic |
| `src-tauri/src/commands.rs` | Most Tauri commands: windows, settings persistence, apps/icons, shelf, process/window helpers, settings watcher |
| `src-tauri/src/services.rs` | Runtime workers: mouse/keyboard hooks, media/SMTC, volume/brightness, audio FFT, monitors/AppBar, window style guard, thumbnail capture, webview watchdog |
| `src-tauri/src/state.rs` | Global statics, per-monitor labels/maps, worker handles, caches |
| `src-tauri/src/types.rs` | Serde DTOs (`AppInfo`, `MediaInfo`, `MonitorInfo`, `SystemCommand`, rects) |
| `src-tauri/src/utils.rs` | Win32 helpers, shortcuts, icon→base64, settings cache, taskbar hide/restore, topmost |
| `src-tauri/src/monitors.rs` | Monitor enumeration, per-monitor targeting, monitor window sync |
| `src-tauri/src/updater.rs` | Update check/install, channels, rollout age, update state |
| `src-tauri/src/diagnostics.rs` | Logs, panic hook, diagnostics report |
| `src-tauri/src/native_uninstall.rs` | `--uninstall` flow: elevation, kill, shortcuts, registry, deferred delete |
| `src-tauri/src/uninstall_registry.rs` | Add/Remove Programs, install scope, uninstaller repair |
| `src-tauri/src/shelf.rs` | OLE drop target for notch shelf |
| `src-tauri/src/taskbar_pins.rs` | Reads Explorer pinned shortcuts |
| `src-tauri/src/tray_icons.rs` | Native tray flyout via UI Automation; tooltip/taskbar cleanup |
| `src-tauri/src/caldav.rs`, `calendar_sync.rs`, `ics.rs` | CalDAV/ICS accounts, cache, background sync |
| `src-tauri/src/connections.rs`, `audio_devices.rs` | WiFi/Bluetooth, audio endpoints/default device |
| `src-tauri/src/active_look.rs` | Window subclass procs |
| `src-tauri/src/i18n.rs` | Tray-menu translations from `src/locales/*.json` |
| `src-tauri/tauri.conf.json`, `src-tauri/capabilities/default.json` | Window config, updater endpoint/public key, permissions |

### Command surface

Commands live in `commands.rs`, `updater.rs`, `caldav.rs`, `calendar_sync.rs`,
`ics.rs`, `connections.rs` and `audio_devices.rs`. The only registration list is
`tauri::generate_handler![...]` in `main.rs`. A command missing from that list is
unreachable. Keep the JS `invoke("name")` string and Rust function name identical.

### Runtime ownership

Worker threads park on handles in `state.rs` and are woken by `services::wake_*`.
Do not replace them with polling loops. Major owners:

- Mouse/keyboard/hit-testing: `services.rs` hooks.
- Media/SMTC, volume, brightness, FFT: `services.rs`.
- AppBar/taskbar/monitor geometry: `services.rs`, `monitors.rs`, `commands.rs`.
- Tray: `main.rs::setup` + `tray_icons.rs`.
- Calendar sync: `calendar_sync.rs`; update check: `updater.rs`.

## Data and identity

Config directory: `%APPDATA%\io.github.wsalas19.canalis\`.

- `settings.json` — flat JSON, `nectar-*` keys; contract documented in `SETTINGS.md`.
- `icons/`, `icons_cache.json`, `custom_icons/`, `pinned_apps.json`.
- `calendar_cache.json`, `calendar_links.json`, `update-state.json`.
- `taskbar_hidden.flag` — crash/restart taskbar recovery.
- Keyring services: `Canalis CalDAV`, `Canalis Calendar Link`.
- Logs: `logs/canalis.log`, `logs/canalis.old.log`, `logs/diagnostics.txt`.

App identity is **Canalis** / `io.github.wsalas19.canalis`; binary `canalis.exe`;
installer identity `io.github.wsalas19.canalis.installer`. Do not reuse Nectar
paths or registry keys. The `nectar-*` keys remain only as internal compatibility.

## Task routing

| If the task is… | Read first | Likely change |
|---|---|---|
| Notch mode/panel/wheel/size | `App.tsx` anchors above, `state/appReducer.ts` | `App.tsx`, `App.css`, locales |
| Add/change a setting | `settings/useSettings.ts`, owning `*Tab.tsx` | those, consumer sync map, `SETTINGS.md`, locales |
| Dock running/pinned apps | `Dock.tsx`, `services.rs::enum_windows_proc` | `Dock.tsx`, `DockTab.tsx`, `services.rs` |
| Dock launch/preview/menu | `Dock.tsx`, relevant `commands.rs` commands | both |
| Overlay/HUD | `Overlay.tsx`, `services.rs` volume/brightness workers | those, `OverlaysTab.tsx` |
| Weather | `hooks/useWeather.ts`, `WeatherPanel.tsx`, `App.tsx` wiring | those, locales |
| Calendar/CalDAV | `useCaldav.ts`, `Calendar.tsx` or `NotchCalendar.tsx`, backend `caldav.rs`/`calendar_sync.rs`/`ics.rs` | chosen surface + backend |
| Media/SMTC | media listener block in `App.tsx`, `CompactMediaPlayer.tsx`, `music/palette.ts`, `services.rs` media worker | those |
| Tray/hidden icons | `main.rs::setup`, `tray_icons.rs` | those, locales/i18n |
| Window chrome/geometry | `tauri.conf.json`, `commands.rs`, `monitors.rs`, `services.rs` | Rust |
| Settings persistence/migration | `commands.rs` (`save_setting`/`load_settings`), `utils.rs`, `state.rs`, `useSettings.ts` | those + `SETTINGS.md` |
| Update/release | `updater.rs`, `tauri.conf.json`, `scripts/bump-version.mjs`, `.github/workflows/release.yml` | those |
| Installer/uninstall | `native_uninstall.rs`, `uninstall_registry.rs`, `installer-app/*`, `installer/*` | those |
| Theme/type scale | `theme.ts`, `typography.css`, `AppearanceTab.tsx` | those |
| i18n | `i18n.ts`, `locales/en.json`, `locales/tr.json`, `src-tauri/src/i18n.rs` | all relevant |

## Checks and commands

```bash
# frontend
npx tsc --noEmit

# run the real app (UI iteration)
bun run tauri dev

# Rust
cd src-tauri && cargo check
cd src-tauri && cargo test --bin canalis

# release packaging only when asked
bun run tauri build --no-bundle
bun run bump <major.minor.patch>
```

Release artifacts and identity are documented in `FORK.md`. The signed updater
endpoint and public key live in `src-tauri/tauri.conf.json`; the private key is
outside the repo. The custom installer lives in `installer-app/`; the NSIS
artifact exists only for the updater. The Release workflow is manual
(`workflow_dispatch`): run it with a `v*` tag selected.

## Gotchas / known state

- `App.tsx`, `Dock.tsx`, `useSettings.ts`, `commands.rs` and `services.rs` are the
  largest files. Use function anchors rather than line numbers.
- Calendar views and some formatting/marquee logic are duplicated between the
  notch and standalone windows; reuse where practical.
- `useTrailingThrottle` must keep the final slider value; do not replace it with a
  leading-only throttle.
- Settings key fallbacks are intentional (legacy names). Keep `nectar-*` keys and
  their `localStorage` mirrors in sync; rename only with a migration.
- Rust window filtering appears in `services.rs`; app-install scanning also exists
  in `commands.rs`. Check both before changing dedup.
- `tray_icons.rs` re-parks the native taskbar and cleans up tray tooltips after
  the native flyout. The native “Show hidden icons” tooltip is a known parked
  issue: reproduce before changing it.
- `services.rs` has a small `SKIP_RUNNING_APPS` list because apps using
  `ITaskbarList::DeleteTab` keep `WS_EX_APPWINDOW` and cannot be detected from
  window styles. Extend the list only with a clear reason.
- Generated output (`dist/`, `src-tauri/target/`) is never edited by hand.
- This index should be updated when a new window, major module or data path is
  introduced.
