#!/usr/bin/env bash
set -e
cd "/home/agent/workspace/Gira Smart Home/gira-smart-home-linux"

APP_NAME="gira-smart-home"
PRODUCT="Gira Smart Home"
VERSION="6.0.72"
WORK="/tmp/appimage-build"
APPDIR="$WORK/AppDir"

echo "==> Vorbereiten..."
rm -rf "$WORK"
mkdir -p "$APPDIR/resources/app" dist

echo "==> Electron extrahieren..."
unzip -q .electron-cache/electron-v27.2.1-linux-x64.zip -d "$WORK/electron"

echo "==> AppDir aufbauen..."
cp -r "$WORK/electron/." "$APPDIR/"
mv "$APPDIR/electron" "$APPDIR/$APP_NAME"
chmod +x "$APPDIR/$APP_NAME"
cp -r app/. "$APPDIR/resources/app/"

cat > "$APPDIR/$APP_NAME.desktop" <<EOF
[Desktop Entry]
Name=Gira Smart Home
Comment=Gira Smart Home App
Exec=$APP_NAME
Icon=$APP_NAME
Type=Application
Categories=Utility;
Terminal=false
EOF
cp build/icon.png "$APPDIR/$APP_NAME.png"

cat > "$APPDIR/AppRun" <<EOF
#!/bin/sh
HERE="\$(dirname "\$(readlink -f "\$0")")"
export LD_LIBRARY_PATH="\$HERE/usr/lib:\$HERE/usr/lib/x86_64-linux-gnu:\$HERE/lib:\$HERE/lib/x86_64-linux-gnu:\$LD_LIBRARY_PATH"
exec "\$HERE/$APP_NAME" "\$@"
EOF
chmod +x "$APPDIR/AppRun"

echo "==> appimagetool ausführen..."
chmod +x .electron-cache/appimagetool-x86_64.AppImage
if command -v fusermount >/dev/null 2>&1; then
  ARCH=x86_64 .electron-cache/appimagetool-x86_64.AppImage "$APPDIR" "dist/$PRODUCT-$VERSION.AppImage"
else
  echo "(kein FUSE - nutze --appimage-extract-and-run)"
  ARCH=x86_64 .electron-cache/appimagetool-x86_64.AppImage --appimage-extract-and-run "$APPDIR" "dist/$PRODUCT-$VERSION.AppImage"
fi

echo ""
echo "==> Ergebnis:"
ls -la dist/