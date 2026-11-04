# Fork maintenance

Canalis is a GPL-3.0-only fork of [Nectar](https://github.com/kua8/Nectar), which
is itself a fork of [Bloom](https://github.com/SehajveerSingh2005/bloom). The full
attribution is in [NOTICE.md](NOTICE.md).

## Repository layout

- `origin` — `https://github.com/wsalas19/Canalis.git` (this fork)
- `upstream` — `https://github.com/kua8/Nectar.git` (read-only for merges)
- `main` — the Canalis release branch

## Keeping up with upstream

Canalis keeps the upstream history and can merge Nectar changes selectively:

```bash
git fetch upstream
git merge upstream/main
```

After a merge, run:

```bash
grep -rn "kua8\|Nectar" src-tauri src installer-app index.html settings.html \
  calendar.html dock.html overlay.html scripts .github
```

Re-apply the fork identity where upstream reintroduced it. The files most likely
to conflict are:

- `src-tauri/tauri.conf.json` — product name, identifier, updater repo/pubkey
- `src-tauri/src/updater.rs` — `RELEASES_API`
- `src-tauri/src/main.rs` — single-instance mutex/event names, tray tooltip
- `src-tauri/src/native_uninstall.rs`, `uninstall.rs` (installer) — registry paths,
  shortcut names, `canalis.exe`
- `src-tauri/src/diagnostics.rs` — `%APPDATA%\io.github.wsalas19.canalis`
- `installer-app/src-tauri/src/registry.rs` — install/uninstall registry keys
- `scripts/release.ps1`, `.github/workflows/release.yml` — repo, asset names

Keep `nectar-*` setting keys, CSS variables and internal Rust command names unless
you are deliberately migrating user settings. They are implementation details;
changing them resets saved settings and creates noisy merge conflicts.

## Identity

| Item | Value |
| --- | --- |
| Product name | Canalis |
| Identifier | `io.github.wsalas19.canalis` |
| Installer identifier | `io.github.wsalas19.canalis.installer` |
| App data / logs | `%APPDATA%\io.github.wsalas19.canalis` |
| Install registry | `Software\wsalas19\canalis` |
| Uninstall registry | `Software\Microsoft\Windows\CurrentVersion\Uninstall\Canalis` |
| Binary | `canalis.exe` |
| Updater manifest | `https://github.com/wsalas19/Canalis/releases/latest/download/latest.json` |

The Windows identifier changes the config directory and installer identity. An
existing Nectar install is a separate product; uninstall Nectar first if you do
not want both.

## Signing and releases

The updater uses a Canalis-specific minisign key. The private key and password
live outside this repository:

- `C:\Users\wasal\.tauri\canalis-signing.key`
- `C:\Users\wasal\.tauri\canalis-signing.password.txt` (password, if one is set)

Add these as GitHub Actions secrets on `wsalas19/Canalis`:

- `TAURI_SIGNING_PRIVATE_KEY` — the contents of the `.key` file
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — the contents of the password file

Never commit either file. The public key is in `src-tauri/tauri.conf.json`.

To release:

```bash
bun run bump 1.8.0
git add -A
git commit -m "chore: release 1.8.0"
git tag v1.8.0
git push origin main --tags
```

Then run the **Release** workflow on the tag. It builds the signed NSIS updater
artifact, `latest.json`, the Canalis installer and the portable zip. Verify the
release assets before announcing it.

If you rotate the signing key, publish a transitional release signed with the old
key, then switch. Losing the private key means existing installs cannot auto-update.

## Upgrade note

Nectar installs trust kua8's update key and endpoint. They cannot auto-update to
Canalis. Install Canalis once manually; later Canalis releases update themselves
through the Canalis manifest.
