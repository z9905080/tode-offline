#!/usr/bin/env bash
# Offline install of tode (terminal-code) + its pinned code-server from this repo (no root, no network).
# Usage: ./install.sh [--copy]
#   default : ~/.local/lib/tode and ~/.local/share/tode/code-server/<ver> are symlinks into this repo
#   --copy  : copy both into place instead (this repo can be deleted afterwards)
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")" && pwd)"
MODE=link
for arg in "$@"; do
  case "$arg" in
    --copy) MODE=copy ;;
    -h|--help) sed -n '2,5p' "$0"; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

VERSION="v0.4.3"
CHANNEL="stable"
CODE_SERVER_VERSION="4.132.0"

[ "$(uname -s)" = Linux ] || { echo "This bundle is for Linux only" >&2; exit 1; }
case "$(uname -m)" in
  x86_64|amd64)  ARCH=x86_64; TARGET=linux-x64 ;;
  aarch64|arm64) ARCH=arm64;  TARGET=linux-arm64 ;;
  *) echo "Unsupported architecture: $(uname -m)" >&2; exit 1 ;;
esac
SRC="$REPO_DIR/$ARCH"

# --- 1. rebuild the files that GitHub's 100 MB limit forced us to split --------
# SPLIT_FILES: "<sha256> <mode> <path>"; parts are <path>.part-00, -01, ...
while read -r sum mode path; do
  case "$path" in "$ARCH"/*) ;; *) continue ;; esac
  out="$REPO_DIR/$path"
  if [ -f "$out" ] && [ "$(sha256sum "$out" | cut -d' ' -f1)" = "$sum" ]; then continue; fi
  ls "$out".part-?? >/dev/null 2>&1 || { echo "Missing parts for $path" >&2; exit 1; }
  echo "assembling $path"
  cat "$out".part-?? > "$out.tmp"
  [ "$(sha256sum "$out.tmp" | cut -d' ' -f1)" = "$sum" ] \
    || { rm -f "$out.tmp"; echo "SHA256 mismatch for $path (repo damaged?)" >&2; exit 1; }
  chmod "$mode" "$out.tmp"
  mv -f "$out.tmp" "$out"
done < "$REPO_DIR/SPLIT_FILES"

[ -f "$SRC/tode/dist/main.js" ] || { echo "Missing $SRC/tode/dist/main.js" >&2; exit 1; }
[ -x "$SRC/code-server/bin/code-server" ] || { echo "Missing $SRC/code-server/bin/code-server" >&2; exit 1; }
grep -q "CODE_SERVER_VERSION = \"$CODE_SERVER_VERSION\"" "$SRC/tode/dist/codeserver/vendored.js" \
  || { echo "tode expects a different code-server version than the bundled $CODE_SERVER_VERSION" >&2; exit 1; }

# same locations as the official installer (https://tode.sh/install)
LIB_HOME="$HOME/.local/lib"
BIN_HOME="${XDG_BIN_HOME:-$HOME/.local/bin}"
STATE_HOME="${XDG_STATE_HOME:-$HOME/.local/state}"
DATA_HOME="${XDG_DATA_HOME:-$HOME/.local/share}"
APP="${TODE_INSTALL_ROOT:-$LIB_HOME/tode}"
CS="$DATA_HOME/tode/code-server/$CODE_SERVER_VERSION"
OFFLINE_STATE="$STATE_HOME/tode-offline"

# --- 2. stop a running tode (as the official installer does) ------------------
SERVER_STATE="$STATE_HOME/tode/server.json"
PIDS=""
for root in "$APP" "$(readlink -f "$APP" 2>/dev/null || true)" "$SRC/tode"; do
  [ -n "$root" ] || continue
  PIDS="$PIDS $(pgrep -f "$root/dist/app/daemon.js" 2>/dev/null || true)"
  PIDS="$PIDS $(pgrep -f "$root/dist/codeserver/injector-main.js" 2>/dev/null || true)"
done
if [ -f "$SERVER_STATE" ]; then
  PIDS="$PIDS $(grep -oE '"(pid|injectorPid)": *[0-9]+' "$SERVER_STATE" | grep -oE '[0-9]+$' || true)"
fi
for PID in $PIDS; do kill "$PID" 2>/dev/null || true; done
LEFT=""
for _ in $(seq 1 20); do
  LEFT=""
  for PID in $PIDS; do kill -0 "$PID" 2>/dev/null && LEFT="$LEFT $PID"; done
  [ -z "$LEFT" ] && break
  sleep 0.1
done
for PID in $LEFT; do kill -9 "$PID" 2>/dev/null || true; done
rm -f "$SERVER_STATE" "$STATE_HOME"/tode/daemon/*.sock "$STATE_HOME"/tode/daemon/*.pid

# --- 3. place a tree: symlink into the repo, or copy (atomic rename) ----------
place() { # place <src-dir> <dest>
  local src="$1" dest="$2"
  mkdir -p "$(dirname "$dest")"
  rm -rf "$dest.new" "$dest.old"
  if [ "$MODE" = copy ]; then
    cp -a "$src" "$dest.new"
    find "$dest.new" -name '*.part-[0-9][0-9]' -delete
    touch "$dest.new/.installed-by-tode-offline"
  else
    ln -s "$src" "$dest.new"
  fi
  if [ -e "$dest" ] || [ -L "$dest" ]; then mv "$dest" "$dest.old"; fi
  mv "$dest.new" "$dest"
  rm -rf "$dest.old"
}
place "$SRC/tode" "$APP"
# tode looks for code-server here before it would download it (dist/codeserver/vendored.js)
place "$SRC/code-server" "$CS"

mkdir -p "$BIN_HOME"
cp "$APP/bin/tode" "$BIN_HOME/tode.new"
chmod +x "$BIN_HOME/tode.new"
mv -f "$BIN_HOME/tode.new" "$BIN_HOME/tode"

mkdir -p "$STATE_HOME/tode" "$OFFLINE_STATE"
cat > "$STATE_HOME/tode/install.json" <<JSON
{
  "version": "$VERSION",
  "channel": "$CHANNEL",
  "target": "$TARGET",
  "root": "$APP",
  "installed": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
JSON
printf 'mode=%s\napp=%s\ncode_server=%s\nbin=%s\n' "$MODE" "$APP" "$CS" "$BIN_HOME/tode" > "$OFFLINE_STATE/install.env"

echo "tode $VERSION installed ($ARCH, mode: $MODE)"
echo "  program     : $APP"
echo "  code-server : $CS"
echo "  command     : $BIN_HOME/tode"

# --- 4. the vendored electron needs the usual chromium system libraries -------
MISSING="$(ldd "$APP/node_modules/@zenbu-labs/pixel/electron/dist/pixel" 2>/dev/null | awk '/not found/{print $1}' | sort -u || true)"
if [ -n "$MISSING" ]; then
  echo
  echo "warning: missing system libraries:" >&2
  printf '  %s\n' $MISSING >&2
  echo "  see README.md (Ubuntu 24.04 apt list and how to fetch the .deb files offline)" >&2
fi

case ":$PATH:" in
  *":$BIN_HOME:"*) echo; echo "run tode to get started" ;;
  *) echo
     echo "NOTE: $BIN_HOME is not on your PATH. Add this to ~/.bashrc (or ~/.zshrc):"
     echo "  export PATH=\"$BIN_HOME:\$PATH\"" ;;
esac
