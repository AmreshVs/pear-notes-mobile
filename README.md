# Pear Notes for iOS and Android

Private notes, encrypted on your devices and synced peer to peer. There's no account and no server: your devices find each other and sync directly.

Website and downloads: https://amreshvs.github.io/pear-notes/

## What's in the app

- Notes, folders, checklists, photos, scans, PDFs, voice recordings and file attachments
- Sync between your phones, tablets and computers over a peer-to-peer network (Holepunch: Hyperswarm, Autobase, Hyperdrive)
- Encryption at rest on every device, with the vault key kept in the system keychain
- Note lock with Face ID, fingerprint or a custom password, plus screenshot and app-switcher protection
- Encrypted backups
- On-device AI that never leaves the phone: voice typing, transcription, text extraction, summaries, translation, and Ask your notes

## Source-available, not open source

This repository is published so you can read and audit how the app works. It is licensed under the [PolyForm Strict License 1.0.0](LICENSE): you may read and study the code for non-commercial purposes, but you may not modify it, redistribute it, or publish it as an app. The name, logo and icon are covered separately by [TRADEMARK.md](TRADEMARK.md).

**This repository doesn't build on its own.** The backend, sync and encryption logic live in `@pear-notes/core`, which is private. The app installs it from a private repository, and `src/backend/backend.bundle.js` is a prebuilt, obfuscated copy of it.

Pull requests aren't accepted. Bug reports are welcome in Issues. For security issues, see [SECURITY.md](SECURITY.md).

## Layout

| Path | What it is |
|---|---|
| `src/app/` | Screens (expo-router) |
| `src/components/`, `src/hooks/`, `src/lib/`, `src/utils/` | UI components, hooks, platform logic and helpers. iOS and Android UIs are split into `Component.tsx` and `Component.android.tsx` that share one hook |
| `src/backend/` | The prebuilt core bundle that runs in a Bare worklet |
| `editor-bundle/` | The Tiptap editor that runs in a WebView |
| `modules/` | Local Expo native modules (PDF tools, share intake, context menu, on-device AI audio, reminders, background sync) |
| `scripts/` | Build, release and native addon setup scripts |

## License

Copyright 2026 Amresh Vs. Licensed under the [PolyForm Strict License 1.0.0](LICENSE). Third-party software, fonts and models are listed in [NOTICE.md](NOTICE.md).
