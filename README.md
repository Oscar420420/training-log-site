# Training Log

Personal training log: Block → Week → Day → Exercise → Set. Mobile-first,
installable as a PWA, all data stored locally in IndexedDB (no backend, no
login, no sync between devices).

See `PROGRESS.md` for the data model and current feature status.

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Install as an app

Open the built site on your phone and use "Add to Home Screen" (iOS Safari)
or the install prompt (Android Chrome). It works offline once installed.
