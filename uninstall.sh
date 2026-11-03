#!/usr/bin/env bash
# Remove what install.sh created. Leaves this repo and your tode data
# (~/.local/share/tode profile/extensions/database, ~/.local/state/tode logs) untouched.
# To wipe all tode data as well, run `tode --uninstall` BEFORE this script.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")" && pwd)"
STATE_HOME="${XDG_STATE_HOME:-$HOME/.local/state}"
OFFLINE_STATE="$STATE_HOME/tode-offline"
[ -f "$OFFLINE_STATE/install.env" ] || { echo "Nothing to uninstall (no $OFFLINE_STATE/install.env)"; exit 0; }
app="$(sed -n 's/^app=//p' "$OFFLINE_STATE/install.env")"
cs="$(sed -n 's/^code_server=//p' "$OFFLINE_STATE/install.env")"
bin="$(sed -n 's/^bin=//p' "$OFFLINE_STATE/install.env")"

# stop tode's daemon / code-server first
if [ -x "$bin" ]; then timeout 15 "$bin" --shutdown >/dev/null 2>&1 || true; fi

ours() { # ours <path>: a symlink into this repo, or a copy made by install.sh
  { [ -L "$1" ] && case "$(readlink "$1")" in "$REPO_DIR"/*) true ;; *) false ;; esac; } \
    || [ -f "$1/.installed-by-tode-offline" ]
}
for p in "$app" "$cs"; do
  if ours "$p"; then rm -rf "$p" && echo "removed $p"; fi
done
if [ -f "$bin" ] && grep -q 'ELECTRON_RUN_AS_NODE' "$bin"; then rm -f "$bin" && echo "removed $bin"; fi
rm -f "$STATE_HOME/tode/install.json"
rm -rf "$OFFLINE_STATE"
echo "tode uninstalled"
