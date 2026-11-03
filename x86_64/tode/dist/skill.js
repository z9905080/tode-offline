"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.skillText = skillText;
exports.skillCommand = skillCommand;
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const bridge_1 = require("./bridge");
const ipc_1 = require("./ipc");
const server_1 = require("./codeserver/server");
const vendored_1 = require("./codeserver/vendored");
const profile_1 = require("./profile");
const paths_1 = require("./runtime/paths");
const launcher_1 = require("./runtime/launcher");
const ghostty_1 = require("./shortcuts/backends/ghostty");
const kitty_1 = require("./shortcuts/backends/kitty");
const store_1 = require("./shortcuts/store");
function read(file) {
    try {
        return node_fs_1.default.readFileSync(file, "utf8").trim();
    }
    catch {
        return null;
    }
}
function listDir(dir) {
    try {
        return node_fs_1.default.readdirSync(dir).sort();
    }
    catch {
        return [];
    }
}
async function skillText() {
    const version = read(node_path_1.default.join(paths_1.INSTALL_ROOT, "VERSION"));
    const channel = read(node_path_1.default.join(paths_1.INSTALL_ROOT, "CHANNEL"));
    const install = version
        ? `release ${version} on channel ${channel ?? "unknown"}`
        : "a working tree, not a release (no VERSION file — upgrade and uninstall refuse it)";
    const binHome = process.env.XDG_BIN_HOME ?? node_path_1.default.join(node_os_1.default.homedir(), ".local", "bin");
    const shim = node_path_1.default.join(binHome, "tode");
    const server = await (0, server_1.currentServer)();
    const daemon = server
        ? `up ${Math.round((Date.now() - server.startedAt) / 60000)}m — code-server pid ${server.pid} on 127.0.0.1:${server.port}, ` +
            `injector pid ${server.injectorPid}; windows load ${(0, server_1.origin)(server)} (always the injector, never code-server directly)`
        : "not running — the next `tode` starts it";
    const codeServer = (0, vendored_1.installedCodeServer)();
    const sockets = listDir((0, ipc_1.ipcSocketDir)()).filter((entry) => entry.endsWith(".sock"));
    const inWindow = process.env.TODE_IPC;
    const extensions = listDir(profile_1.EXTENSIONS_DIR).filter((entry) => !entry.startsWith(".") && entry !== "extensions.json");
    const terminals = [
        ...((0, ghostty_1.isGhostty)() ? [`ghostty, config in ${(0, ghostty_1.ghosttyConfigDir)()}`] : []),
        ...((0, kitty_1.isKitty)() ? [`kitty, config in ${(0, kitty_1.kittyConfigDir)()}`] : []),
    ];
    return `---
name: tode
description: Working knowledge of this machine's tode install (the terminal code editor). Where its code-server profile, extensions, keybindings, themes, terminal shortcut overrides, logs and daemon state live, which files are safe to edit and which are regenerated, and how to reach running windows. Regenerate with \`tode --skill\` — every path is resolved live and the state section reflects the moment it ran.
---

# tode

tode is a code editor that runs in the terminal: one warm code-server serves
the VS Code workbench, an injecting proxy sits in front of it, and
pixel draws each window as a terminal pane. Everything below was
resolved on this machine when \`tode --skill\` ran — env overrides are already
applied, and the state section is live. Re-run it rather than trusting a copy.

## State right now

- install root: ${paths_1.INSTALL_ROOT} — ${install}
- shim: ${shim} ${node_fs_1.default.existsSync(shim) ? "(present)" : "(absent — run installs go through node directly)"}
- pixel ${(0, launcher_1.pixelVersion)()} (npm dependency; windows are pixel apps)
- code-server ${vendored_1.CODE_SERVER_VERSION}: ${codeServer ?? `not fetched yet — the first open puts it under ${(0, vendored_1.codeServerRoot)()}`}
- daemon: ${daemon}
- open windows: ${sockets.length} socket(s) in ${(0, ipc_1.ipcSocketDir)()}${sockets.length ? ` — ${sockets.join(", ")}` : ""}
- this shell ${inWindow ? `is inside a tode window (TODE_IPC=${inWindow})` : "is not inside a tode window (no TODE_IPC)"}
- terminal detected for shortcut overrides: ${terminals.length ? terminals.join("; ") : "none (ghostty and kitty are supported)"}
- installed extensions (${extensions.length}): ${extensions.length ? extensions.join(", ") : "none"}

## The editor profile — settings, keybindings, snippets, extensions

There is exactly one profile, under ${profile_1.VSCODE_DIR}. Flags like --profile and
--user-data-dir are deliberately swallowed; every window and every extension
operation uses this one.

- ${node_path_1.default.join(profile_1.USER_DIR, "settings.json")} — live settings. tode owns these keys
  and rewrites them on every open (edits to them are lost):
  ${Object.keys(profile_1.SETTINGS).join(", ")}.
  These keys were seeded once and an edit of yours wins:
  ${Object.keys(profile_1.SEEDED_SETTINGS).join(", ")}.
  Every other key is untouched — add or change freely.
- ${node_path_1.default.join(profile_1.USER_DIR, "keybindings.json")} — safe to edit. tode replaces only
  the entries it wrote last time (recorded in ${profile_1.KEYBINDINGS_RECORD}) and
  carries everything else through.
- ${node_path_1.default.join(profile_1.USER_DIR, "snippets")} and tasks.json — plain vscode files, never
  touched after an import.
- ${profile_1.EXTENSIONS_DIR} — the extensions tree plus its extensions.json registry.
  Manage with \`tode --install-extension <id|vsix>\`, \`--uninstall-extension\`,
  \`--list-extensions\` (these force the right dirs; a bare code-server call
  would land in the wrong profile). Two entries are generated by tode itself
  and rewritten on every open, so never hand-edit them: ${node_path_1.default.basename(bridge_1.BRIDGE_DIR)}
  (the IPC bridge) and ${profile_1.THEME_EXTENSION_ID}-<fingerprint> (the terminal theme).
- an open window picks extension changes up on its next reload.

## Theme

- \`tode --theme\` reads the terminal palette over OSC and rebuilds everything;
  \`tode --theme <file.json>\` sets a vscode theme document instead.
- ${profile_1.LIVE_THEME_FILE} — the full generated theme. Open windows watch it and
  restyle without a reload, so writing a valid vscode theme document here is
  the live-update path. It is regenerated from the palette on the next open.
- ${profile_1.PALETTE_CACHE} — cached terminal colours; delete to force a re-read.
- ${server_1.CSS_FILE} — css the proxy injects into every workbench page; regenerated
  on every open. Its siblings ${node_path_1.default.basename(server_1.CSS_FILE)}.timing.json and .launch.json feed \`tode --timing\`.

## Terminal shortcut overrides

The wizard (\`tode --shortcut-setup\`, \`--undo\` to revert) frees contested chords
by writing one tode-owned file into the terminal's config dir and a single
include line into the terminal's own config — nothing the user wrote is edited.

- decisions live in ${store_1.DECISIONS_FILE}
- ghostty: <config>/tode/keybinds.ghostty via \`config-file = ?tode/keybinds.ghostty\`
- kitty: <config>/tode/keybinds.kitty.conf via \`include tode/keybinds.kitty.conf\`
- prefer re-running the wizard over editing these; it reconciles against the
  live terminal keymap.

## Reaching a running window

Each window's bridge extension listens on a unix socket in ${(0, ipc_1.ipcSocketDir)()}
and exports its address as TODE_IPC into its integrated terminals. Protocol:
connect, send one JSON line, close. The shape:

  {"files":[{"path":"/abs","line":1,"column":1}],"folders":["/abs"],"add":false,"wait":false,"diff":["/a","/b"],"view":"scm","theme":{...}}

The tode CLI does this for you: inside a window, \`tode <file>\` opens there,
\`tode -r <folder>\` replaces the workspace, \`--review\` focuses source control.
${bridge_1.STARTUP_OPEN_FILE} is a one-shot marker with the parts of an open the url cannot carry (gotos, diffs, a view to focus); the bridge replays it once at startup.

## Daemon and processes

- ${server_1.STATE_FILE} — pids and ports of code-server and the injector; treat as
  read-only, \`tode --shutdown\` removes it properly.
- ${server_1.PORT_FILE} — the injector's sticky port, reused while free so saved
  workspaces and the chromium cache stay valid.
- ${node_path_1.default.join(paths_1.LOGS_DIR, "code-server.log")} — combined code-server + injector log, append-only.
- code-server runs with --auth password on 127.0.0.1 (the injector holds the credential), user-data ${node_path_1.default.join(profile_1.VSCODE_DIR, "user-data")},
  extensions ${profile_1.EXTENSIONS_DIR}.

## Homes on disk

- data ${paths_1.DATA_DIR} — profile, theme, generated scripts, fetched code-server
  (${node_path_1.default.join(paths_1.DATA_DIR, "code-server")})
- state ${paths_1.STATE_DIR} — daemon state, logs, ipc sockets, install receipt (install.json)
- cache ${paths_1.CACHE_DIR} — converted app icons and the browser's cache
- \`tode --uninstall\` removes all of the above plus the install root, shim,
  font and ghostty overrides.

## Environment variables

- TODE_IPC — set inside tode windows; the window's socket
- TODE_INSTALL_ROOT — overrides the install tree
- TODE_CODE_SERVER — use your own code-server binary
- TODE_RELEASE_ORIGIN — where upgrades come from
- XDG_DATA_HOME / XDG_STATE_HOME / XDG_CACHE_HOME / XDG_BIN_HOME — move tode's homes and the shim

## Commands

open: \`tode [path...]\` (-g goto, -d diff, -a add, -r reuse, -n new pane, -w wait,
--split/--size, --review, --install-extension, --list-extensions). Every bare
word is a path; commands are flags in first position: --shortcut-setup,
--import, --theme, --enable-transparency/--disable-transparency (sets
tode.transparent in the editor's settings.json for good; open windows follow
live; the palette has the same two commands), --timing (alone: the last page
load), --upgrade, --shutdown, --uninstall, --skill (this document).
`;
}
async function skillCommand() {
    process.stdout.write(await skillText());
    return 0;
}
