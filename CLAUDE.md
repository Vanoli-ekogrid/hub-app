# Hub – note per Claude

Rispondi all'utente in **italiano**.

## Cos'è
App contenitore personale ("Hub") in JavaScript vanilla, senza build step: PWA + app Android (Capacitor 8).
App interne: **Palestra** (`apps/palestra.js`: schede, allenamento in corso, storico, progressi) e **Cibo** (`apps/cibo.js`: piano alimentare settimanale).
Dati solo in `localStorage` (prefisso `hub:`), backup export/import JSON dalla home. Come aggiungere un'app: vedi `README.md`.

## Pubblicazione web
- Repo pubblico GitHub `Vanoli-ekogrid/hub-app`, GitHub Pages dal branch `main` (root): https://vanoli-ekogrid.github.io/hub-app/
- Deploy = commit + `git push origin main`. Quando cambiano i file web, incrementa `CACHE` in `sw.js` e aggiorna l'elenco `FILES`.
- `gh` è in `C:\Program Files\GitHub CLI\gh.exe` (già autenticato). L'email git del repo è l'indirizzo noreply di GitHub: non usare l'email di lavoro.

## App Android
- appId `io.github.vanoliekogrid.hub`, progetto in `android/`, web copiato in `www/` da `scripts/build-www.mjs`.
- Ambiente: `JAVA_HOME=C:\Program Files\Microsoft\jdk-21.0.13.21-hotspot`, `ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk`, Node in `C:\Program Files\nodejs`.
- Build: `npm run sync`, poi in `android/`: `.\gradlew.bat --no-daemon assembleRelease bundleRelease`.
- Prima di ogni nuova release incrementa `versionCode`/`versionName` in `android/app/build.gradle`.
- Chiave di firma e password in `Desktop\hub-firma` (copiata in `android/keystore.properties`, ignorato da git). **Mai committarla né pubblicarla.**
- Gli APK si pubblicano come GitHub Release (`v1.0` è la prima), copia locale in `Desktop\Hub-Android`.
- L'APK non è ancora stato provato su un telefono reale.

## iOS
Nessuna app nativa (servirebbero Mac + Apple Developer 99 $/anno): su iPhone si usa la PWA da Safari → "Aggiungi alla schermata Home".
