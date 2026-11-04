# AGENTS.md

## Local testing

- Use `bun run tauri dev` for UI work. Do not run `tauri build` just to test UI.
- Restart the dev app only when Rust or Tauri config changes require it.
- Test in the real app window; do not automate cursor or window interactions.
- Check `tsc --noEmit` after TypeScript changes and `cargo check` after Rust changes.
- Test both English and Turkish for user-facing strings when touching locales.

## Size and reuse

- Reuse existing components, helpers, CSS and i18n keys before adding new ones.
- Keep new dependencies out unless they clearly remove more code than they add.
- Prefer small shared fixes over copy-pasted logic.
- Watch bundle size and runtime cost when touching polling, wheel handling,
  window enumeration or animations.
