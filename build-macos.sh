#!/usr/bin/env bash
# Baut Gira Smart Home als macOS .app und DMG (ad-hoc signiert).
# Nutzung: ./build-macos.sh [x64|arm64]   (Standard: x64)
# Voraussetzungen in der Sandbox:
#   - .electron-cache/electron-v27.2.1-darwin-<arch>.zip
#   - kompiliertes libdmg-hfsplus (dmg + hfsplus Tools)
#   - mkfs.hfsplus (apt: hfsprogs)
#   - ldid (ad-hoc Signatur, in .electron-cache/ldid)
set -e
cd "/home/agent/workspace/Gira Smart Home/gira-smart-home-linux"
PROJECT_DIR="$(pwd)"

ARCH="${1:-x64}"
APP_NAME="Gira Smart Home"
BUNDLE_ID="com.gira.smart-home"
VERSION="6.0.72"
SUFFIX=""
[ "$ARCH" = "arm64" ] && SUFFIX="-arm64"
WORK="/tmp/macbuild-$ARCH"
APP="$WORK/$APP_NAME.app"
HFS_TOOL="/tmp/libdmg/libdmg-hfsplus-master/build/hfs/hfsplus"
DMG_TOOL="/tmp/libdmg/libdmg-hfsplus-master/build/dmg/dmg"
ZIP="$PROJECT_DIR/.electron-cache/electron-v27.2.1-darwin-$ARCH.zip"
OUT="$PROJECT_DIR/dist/$APP_NAME-$VERSION$SUFFIX.dmg"
LDID="/usr/local/bin/ldid"

if [ ! -f "$ZIP" ]; then
  echo "FEHLER: $ZIP fehlt in .electron-cache/"
  exit 1
fi
if [ ! -x "$DMG_TOOL" ] || [ ! -x "$HFS_TOOL" ]; then
  echo "FEHLER: libdmg-hfsplus Tools fehlen (dmg/hfsplus)."
  exit 1
fi
if [ ! -x "$LDID" ]; then
  echo "FEHLER: ldid fehlt (sudo cp .electron-cache/ldid /usr/local/bin/ldid)."
  exit 1
fi

echo "==> [$ARCH] .app-Bundle bauen..."
rm -rf "$WORK"
mkdir -p "$WORK"
unzip -q "$ZIP" -d "$WORK"
mv "$WORK/Electron.app" "$APP"
mv "$APP/Contents/MacOS/Electron" "$APP/Contents/MacOS/$APP_NAME"
chmod +x "$APP/Contents/MacOS/$APP_NAME"
cp -r app/. "$APP/Contents/Resources/app/"

python3 - "$APP" <<'PYEOF'
import struct, sys, os, plistlib
app = sys.argv[1]
png = open('/home/agent/workspace/Gira Smart Home/gira-smart-home-linux/build/icon.png','rb').read()
entry = b'ic09' + struct.pack('>I', 8 + len(png)) + png
icns = b'icns' + struct.pack('>I', 8 + len(entry)) + entry
open(os.path.join(app, 'Contents/Resources/app.icns'), 'wb').write(icns)
plist_path = os.path.join(app, 'Contents/Info.plist')
with open(plist_path, 'rb') as f:
    plist = plistlib.load(f)
plist['CFBundleDisplayName'] = 'Gira Smart Home'
plist['CFBundleExecutable'] = 'Gira Smart Home'
plist['CFBundleName'] = 'Gira Smart Home'
plist['CFBundleIdentifier'] = 'com.gira.smart-home'
plist['CFBundleShortVersionString'] = '6.0.72'
plist['CFBundleVersion'] = '6.0.72'
plist['CFBundleIconFile'] = 'app.icns'
plist['LSApplicationCategoryType'] = 'public.app-category.utilities'
plist.pop('ElectronAsarIntegrity', None)
with open(plist_path, 'wb') as f:
    plistlib.dump(plist, f)
print("Info.plist + Icon OK")
PYEOF

echo "==> [$ARCH] Ad-hoc signieren (ldid)..."
find "$APP" -type f | while read f; do
  if file "$f" | grep -q "Mach-O"; then
    "$LDID" -S "$f"
  fi
done
find "$APP" -type d -name "_CodeSignature" -exec rm -rf {} + 2>/dev/null || true
echo "Signiert: $(find "$APP" -type f | while read f; do file "$f" | grep -q "Mach-O" && echo x; done | wc -l) Binaries"

echo "==> [$ARCH] HFS+ Image erstellen..."
cd /tmp
rm -f gira-$ARCH.hfs
dd if=/dev/zero of=gira-$ARCH.hfs bs=1M count=500 2>/dev/null
mkfs.hfsplus -v "$APP_NAME" gira-$ARCH.hfs > /dev/null 2>&1

echo "==> [$ARCH] App ins Image kopieren..."
rm -rf /tmp/dmg-staging-$ARCH && mkdir -p /tmp/dmg-staging-$ARCH
cp -r "$APP" /tmp/dmg-staging-$ARCH/
$HFS_TOOL /tmp/gira-$ARCH.hfs addall /tmp/dmg-staging-$ARCH/ / > /dev/null 2>&1

echo "==> [$ARCH] DMG wrappen..."
rm -f "$OUT"
$DMG_TOOL build /tmp/gira-$ARCH.hfs "$OUT" > /dev/null 2>&1

echo ""
echo "==> [$ARCH] Fertig:"
ls -la "$OUT"