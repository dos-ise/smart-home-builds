# Gira Smart Home – Linux (AppImage)

Gira Smart Home is an Electron app (Chromium 27.2.1). This package contains the original app (version 6.0.72) from the Windows installation, adapted for Linux – **ready-built as an AppImage**.

## ✅ Ready-built AppImage

```
dist/Gira Smart Home-6.0.72.AppImage   (104 MB)
```

**Run on Linux:**

```bash
chmod +x "dist/Gira Smart Home-6.0.72.AppImage"
./dist/Gira Smart Home-6.0.72.AppImage
```

If `libfuse2` is missing (Debian/Ubuntu: `sudo apt install libfuse2`):

```bash
./dist/Gira Smart Home-6.0.72.AppImage --appimage-extract-and-run
```

## What was changed?

| Change | Reason |
|---|---|
| `keytar` replaced with a pure JS stub | keytar is a Windows native module. The app has long used Electron `safeStorage` (gnome-keyring/kwallet) – keytar is only needed for migrating old data. |
| Linux icon at `app/resources/linux/app.png` | The app looks for its icon exactly there on Linux. |
| `yarn` dependency removed | Not needed by the app. |

## System requirements

- Linux x64 with a desktop environment (GTK, NSS, ALSA – present on every desktop Linux)
- `libfuse2` for AppImages (or `--appimage-extract-and-run`)
- A keyring (gnome-keyring/KWallet) for password storage

## Rebuilding (in the Docker sandbox)

Prerequisites in the sandbox: `file`, `squashfs-tools`, `unzip`
(`sudo apt-get install -y file squashfs-tools unzip`).

```bash
./build-manual.sh
```

The script:
1. Extracts `electron-v27.2.1-linux-x64.zip` from `.electron-cache/`
2. Builds the AppDir (Electron runtime + `app/` + AppRun + icon)
3. Creates the AppImage in `dist/` with `appimagetool`

### Cache files (`.electron-cache/`)

| File | Purpose |
|---|---|
| `electron-v27.2.1-linux-x64.zip` | Electron Linux runtime (95 MB) |
| `appimagetool-x86_64.AppImage` | AppImage builder (8 MB) |

Both were downloaded via the company proxy from GitHub and stored locally, so no internet access is needed from the sandbox.

## 🍎 macOS (DMG)

**Ready-built DMG:**

```
dist/Gira Smart Home-6.0.72.dmg          (106 MB, Intel/x64)
dist/Gira Smart Home-6.0.72-arm64.dmg   (101 MB, Apple Silicon)
```

On a Mac: open the DMG, drag `Gira Smart Home.app` into the Applications folder. Since the app is not signed, on first launch: right-click → Open (or run `xattr -cr "/Applications/Gira Smart Home.app"` in the terminal).

### Rebuilding (in the Docker sandbox)

```bash
./build-macos.sh          # Intel (x64)
./build-macos.sh arm64    # Apple Silicon (ARM64)
```

The script:
1. Builds the `.app` bundle (Electron macOS + `app/` + icon + Info.plist)
2. Signs the bundle ad-hoc with `rcodesign` (required for Apple Silicon, also creates the bundle seal). The **Electron Framework is not re-signed** (`--exclude`) so V8's code integrity is preserved.
3. Creates an HFS+ image (500 MB) with `mkfs.hfsplus`
4. Copies the app into it (with symlink support)
5. **Sets the execute permission** of all Mach-O binaries via `hfsplus chmod 755` – `addall` does not preserve Unix permissions; without `+x`, macOS reports "Launch failed / Error 111"
6. Wraps it with `dmg` (libdmg-hfsplus) into a UDZO DMG

### Prerequisites in the sandbox

- `.electron-cache/electron-v27.2.1-darwin-x64.zip` (Intel, 93 MB) and `electron-v27.2.1-darwin-arm64.zip` (Apple Silicon, 88 MB)
- Compiled `libdmg-hfsplus` (dmg + hfsplus tools) – see below
- `mkfs.hfsplus` (`sudo apt-get install -y hfsprogs`)
- `rcodesign` (ad-hoc signature, in `.electron-cache/rcodesign.tar.gz` → `/usr/local/bin/rcodesign`)

### Compiling libdmg-hfsplus (once)

```bash
sudo apt-get install -y cmake zlib1g-dev
# zlib1g-dev may need to be extracted manually (version conflict), see note
cd /tmp && tar xzf <libdmg-hfsplus.tar.gz> && cd libdmg-hfsplus-master
# CMakeLists.txt: patch cmake_minimum_required to 3.10
# Replace filevault.c + filevault.h with stubs (OpenSSL 3.x incompatibility)
# hfslib.c: patch symlink handling in addAllInFolder (otherwise content gets duplicated)
mkdir build && cd build && cmake .. && make
```

> **Note:** The patches are needed because the old project (2013) does not compile with OpenSSL 3.x and modern cmake versions. The files `filevault.c`/`filevault.h` are replaced with stubs (FileVault is not needed), and `addAllInFolder` in `hfslib.c` detects symlinks via `lstat` and creates real HFS+ symlinks instead of duplicating the content.

## Updating to a new Gira version

1. Copy `resources\app` from the new Windows installation here to `app/`
2. Run `./build-manual.sh`
3. Done – new AppImage in `dist/`

## Notes

- **Device discovery:** The app finds Gira devices via SSDP multicast on the local network. This works on Linux as long as the network allows multicast.
- **Certificates:** The app ignores certificate errors (self-signed device certificates) – same as the Windows version.
- **Data:** Stored under `~/.config/Gira Smart Home/`.

## Structure

```
gira-smart-home-linux/
├── app/                  # the actual app (from resources\app)
├── build/icon.png        # AppImage icon (512x512)
├── dist/                 # ready-built AppImage
├── .electron-cache/      # Electron runtime + appimagetool (for rebuilds)
├── build-manual.sh       # AppImage build script
├── paypal-qr.svg         # donation QR code
└── README.md
```

## ❤️ Donate / Support this project

If you find this project useful, please consider supporting it. Scan the QR code below to donate via PayPal:

<p align="center">
  <img src="paypal-qr.svg" alt="Donate via PayPal" width="200" />
</p>

Thank you for your support! 🙏