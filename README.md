# Gira Smart Home â€“ Linux (AppImage)

Gira Smart Home ist eine Electron-App (Chromium 27.2.1). Dieses Paket enthÃ¤lt
die Original-App (Version 6.0.72) aus der Windows-Installation, angepasst fÃ¼r
Linux â€“ **fertig gebaut als AppImage**.

## âœ… Fertiges AppImage

```
dist/Gira Smart Home-6.0.72.AppImage   (104 MB)
```

**AusfÃ¼hren unter Linux:**

```bash
chmod +x "dist/Gira Smart Home-6.0.72.AppImage"
./dist/Gira Smart Home-6.0.72.AppImage
```

Falls `libfuse2` fehlt (Debian/Ubuntu: `sudo apt install libfuse2`):

```bash
./dist/Gira Smart Home-6.0.72.AppImage --appimage-extract-and-run
```

## Was wurde angepasst?

| Ã„nderung | Grund |
|---|---|
| `keytar` durch reinen JS-Stub ersetzt | keytar ist ein Windows-Nativmodul. Die App nutzt lÃ¤ngst Electron `safeStorage` (gnome-keyring/kwallet) â€“ keytar wird nur noch fÃ¼r die Migration alter Daten gebraucht. |
| Linux-Icon unter `app/resources/linux/app.png` | Die App sucht auf Linux genau dort nach ihrem Icon. |
| `yarn`-AbhÃ¤ngigkeit entfernt | Wird von der App nicht benÃ¶tigt. |

## Systemvoraussetzungen

- Linux x64 mit Desktop-Umgebung (GTK, NSS, ALSA â€“ auf jedem Desktop-Linux vorhanden)
- `libfuse2` fÃ¼r AppImages (oder `--appimage-extract-and-run`)
- Ein Keyring (gnome-keyring/KWallet) fÃ¼r die Passwort-Speicherung

## Neu bauen (in der Docker-Sandbox)

Voraussetzungen in der Sandbox: `file`, `squashfs-tools`, `unzip`
(`sudo apt-get install -y file squashfs-tools unzip`).

```bash
./build-manual.sh
```

Das Skript:
1. Extrahiert `electron-v27.2.1-linux-x64.zip` aus `.electron-cache/`
2. Baut das AppDir (Electron-Runtime + `app/` + AppRun + Icon)
3. Erzeugt mit `appimagetool` das AppImage in `dist/`

### Cache-Dateien (`.electron-cache/`)

| Datei | Zweck |
|---|---|
| `electron-v27.2.1-linux-x64.zip` | Electron-Linux-Runtime (95 MB) |
| `appimagetool-x86_64.AppImage` | AppImage-Builder (8 MB) |

Beide wurden Ã¼ber den Firmen-Proxy von GitHub geladen und liegen lokal, damit
kein Internetzugang aus der Sandbox nÃ¶tig ist.


## 🍎 macOS (DMG)

**Fertiges DMG:**

```
dist/Gira Smart Home-6.0.72.dmg          (106 MB, Intel/x64)
```
dist/Gira Smart Home-6.0.72-arm64.dmg   (101 MB, Apple Silicon)
```

Auf dem Mac: DMG öffnen, `Gira Smart Home.app` in den Programme-Ordner ziehen.
Da die App nicht signiert ist, beim ersten Start: Rechtsklick → Öffnen (oder
`xattr -cr "/Applications/Gira Smart Home.app"` im Terminal).

### Neu bauen (in der Docker-Sandbox)

```bash
./build-macos.sh          # Intel (x64)
./build-macos.sh arm64    # Apple Silicon (ARM64)
```

Das Skript:
1. Baut das `.app`-Bundle (Electron-macOS + `app/` + Icon + Info.plist)
2. Erstellt ein HFS+-Image (500 MB) mit `mkfs.hfsplus`
3. Kopiert die App hinein (mit Symlink-Unterstützung)
4. Wrappt es mit `dmg` (libdmg-hfsplus) in ein UDZO-DMG

### Voraussetzungen in der Sandbox

- `.electron-cache/electron-v27.2.1-darwin-x64.zip` (Intel, 93 MB) und `electron-v27.2.1-darwin-arm64.zip` (Apple Silicon, 88 MB)
- Kompiliertes `libdmg-hfsplus` (dmg + hfsplus Tools) – siehe unten
- `mkfs.hfsplus` (`sudo apt-get install -y hfsprogs`)

### libdmg-hfsplus kompilieren (einmalig)

```bash
sudo apt-get install -y cmake zlib1g-dev
# zlib1g-dev ggf. manuell extrahieren (Version-Konflikt), siehe Hinweis
cd /tmp && tar xzf <libdmg-hfsplus.tar.gz> && cd libdmg-hfsplus-master
# CMakeLists.txt: cmake_minimum_required auf 3.10 patchen
# filevault.c + filevault.h durch Stubs ersetzen (OpenSSL-3.x-Inkompatibilität)
# hfslib.c: Symlink-Handling in addAllInFolder patchen (sonst wird Inhalt dupliziert)
mkdir build && cd build && cmake .. && make
```

> **Hinweis:** Die Patches sind nötig, weil das alte Projekt (2013) nicht mit
> OpenSSL 3.x und modernen cmake-Versionen kompiliert. Die Dateien
> `filevault.c`/`filevault.h` werden durch Stubs ersetzt (FileVault wird nicht
> gebraucht), und `addAllInFolder` in `hfslib.c` erkennt Symlinks per `lstat`
> und erzeugt echte HFS+-Symlinks statt den Inhalt zu duplizieren.

## Update auf eine neue Gira-Version

1. Aus der neuen Windows-Installation `resources\app` hier nach `app/` kopieren
2. `./build-manual.sh` ausfÃ¼hren
3. Fertig â€“ neues AppImage in `dist/`

## Hinweise

- **GerÃ¤tesuche:** Die App findet Gira-GerÃ¤te per SSDP-Multicast im lokalen
  Netzwerk. Das funktioniert unter Linux, sofern das Netzwerk Multicast erlaubt.
- **Zertifikate:** Die App ignoriert Zertifikatsfehler (selbstsignierte
  GerÃ¤te-Zertifikate) â€“ wie in der Windows-Version.
- **Daten:** Liegen unter `~/.config/Gira Smart Home/`.

## Struktur

```
gira-smart-home-linux/
â”œâ”€â”€ app/                  # die eigentliche App (aus resources\app)
â”œâ”€â”€ build/icon.png        # AppImage-Icon (512x512)
â”œâ”€â”€ dist/                 # fertiges AppImage
â”œâ”€â”€ .electron-cache/      # Electron-Runtime + appimagetool (fÃ¼r Rebuilds)
â”œâ”€â”€ build-manual.sh       # AppImage-Build-Skript
â””â”€â”€ README.md
```