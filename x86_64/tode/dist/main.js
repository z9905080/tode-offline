#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const node_readline_1 = __importDefault(require("node:readline"));
const server_1 = require("./codeserver/server");
const vendored_1 = require("./codeserver/vendored");
const bridge_1 = require("./bridge");
const wizard_1 = require("./shortcuts/wizard");
const command_1 = require("./import/command");
const run_1 = require("./import/run");
const onboarding_1 = require("./onboarding");
const ipc_1 = require("./ipc");
const profile_1 = require("./profile");
const profile_2 = require("./profile");
const control_1 = require("./app/control");
const launch_1 = require("./launch");
const paths_1 = require("./runtime/paths");
const skill_1 = require("./skill");
const ssh_1 = require("./ssh");
const target_1 = require("./target");
const uninstall_1 = require("./uninstall");
const upgrade_1 = require("./upgrade");
const color_1 = require("./theme/color");
const generate_1 = require("./theme/generate");
// hm? does it ever get installed at home dir local?
function shimPath() {
    const binHome = process.env.XDG_BIN_HOME ?? node_path_1.default.join(node_os_1.default.homedir(), ".local", "bin");
    return node_path_1.default.join(binHome, "tode");
}
function todeCommand() {
    const shim = shimPath();
    if (node_fs_1.default.existsSync(shim))
        return [shim];
    return [process.execPath, process.argv[1]];
}
async function bootEditorUrl() {
    const { palette } = await (0, profile_2.readPalette)();
    (0, profile_2.ensureFont)();
    (0, profile_2.installTheme)(palette);
    (0, profile_2.installCss)(palette);
    (0, profile_2.installSettings)();
    (0, profile_2.setLiveTheme)((0, profile_2.currentTheme)(palette));
    (0, bridge_1.installBridge)(todeCommand());
    (0, profile_2.installKeybindings)();
    const server = await (0, server_1.ensureServer)();
    return (0, server_1.windowUrl)(server, (0, target_1.workbenchUrl)((0, server_1.origin)(server), (0, target_1.resolveTarget)(undefined, process.cwd())));
}
function fail(message) {
    process.stderr.write(`tode: ${message}\n`);
    process.exit(1);
}
function takeFlag(args, name) {
    const at = args.indexOf(name);
    if (at < 0)
        return undefined;
    const value = args[at + 1];
    if (value === undefined)
        fail(`${name} needs a value`);
    args.splice(at, 2);
    return value;
}
function takeAll(args, ...names) {
    const found = [];
    for (let at = 0; at < args.length;) {
        if (!names.includes(args[at])) {
            at += 1;
            continue;
        }
        const value = args[at + 1];
        if (value === undefined)
            fail(`${args[at]} needs a value`);
        found.push(value);
        args.splice(at, 2);
    }
    return found;
}
function takeBool(args, name) {
    const at = args.indexOf(name);
    if (at < 0)
        return false;
    args.splice(at, 1);
    return true;
}
const HELP = `Usage: tode [path...] [options]
       tode --<command>

  tode                  Open the folder in the current working directory
  tode <folder>         Open the specified folder
  tode <file>           Open the specified file


Options:
  -g, --goto <f:l:c>    Open a file at a line and column
  -a, --add <folder>    Add a folder to the active workspace
  -n, --new-window      Open a new pane even for a file
  -w, --wait            Wait until the file is closed again
  -d, --diff <a> <b>    Compare two files
  -r, --reuse-window    Open folder in this window rather than a new pane
  --install-extension   Install an extension by id or vsix path
  --uninstall-extension Remove an extension
  --list-extensions     List installed extensions
  --split <direction>   Open in a new pane: right, left, down, up
  --size <fraction>     The % a new split will take up (0.2 to 0.95)
  --timing              Report how long each stage of this open took
  --review              Open on the source control panel
  --ssh <user@host>     Run terminal-code on an ssh server

Commands, each as the first argument:
  --shortcut-setup      Resolve shortcut conflicts between terminal-code and the current terminal
  --timing              Profile terminal-code launch
  --import [editor]     Bring settings, keybindings, snippets and extensions
                        over from vscode compatible editors
  --theme [file]        Set editor theme
  --enable-transparency Make the editor transparent
  --disable-transparency Make the editor opaque again
  --serve [path]        Start code server and print its url
  --skill               An agent skill to assist with modifying terminal-code
  --upgrade [--check]   Upgrade terminal-code to the latest version
  --shutdown            Stop all terminal-code activities
  --uninstall [--yes]   Remove all terminal-code data from this machine
`;
/**
 * i dont think this stuff is necessary come back to this
 */
const IGNORED = [
    "--verbose",
    "--disable-gpu",
    "--disable-telemetry",
    "--disable-updates",
    "--no-sandbox",
    "--skip-release-notes",
    "--skip-welcome",
    "--disable-workspace-trust",
];
const IGNORED_WITH_VALUE = [
    "--log",
    "--locale",
    "--sync",
    "--profile",
    "--user-data-dir",
    "--extensions-dir",
];
const UNSUPPORTED = [
    ["--disable-extensions", "extensions are per code-server, not per window"],
    ["--disable-extension", "extensions are per code-server, not per window"],
];
function dropIgnored(args) {
    for (const flag of IGNORED_WITH_VALUE)
        takeAll(args, flag);
    for (const flag of IGNORED)
        takeBool(args, flag);
    for (const [flag, why] of UNSUPPORTED) {
        const had = takeBool(args, flag) || takeAll(args, flag).length > 0;
        if (had)
            process.stderr.write(`tode: ignoring ${flag}, ${why}\n`);
    }
}
async function openCommand(args) {
    dropIgnored(args);
    const adding = takeBool(args, "-a") || takeBool(args, "--add");
    const going = takeBool(args, "-g") || takeBool(args, "--goto");
    const diffing = takeBool(args, "-d") || takeBool(args, "--diff");
    const extensions = takeAll(args, "--install-extension");
    const removals = takeAll(args, "--uninstall-extension");
    if (extensions.length > 0 || removals.length > 0)
        return manageExtensions(extensions, removals);
    if (takeBool(args, "--list-extensions")) {
        return listExtensions(takeBool(args, "--show-versions"));
    }
    const newWindow = takeBool(args, "-n") || takeBool(args, "--new-window");
    const reuse = takeBool(args, "-r") || takeBool(args, "--reuse-window");
    const wait = takeBool(args, "-w") || takeBool(args, "--wait");
    const split = takeFlag(args, "--split");
    const size = takeFlag(args, "--size");
    const timing = takeBool(args, "--timing");
    const review = takeBool(args, "--review");
    const unknown = args.find((arg) => arg.startsWith("-"));
    if (unknown)
        fail(`unknown option ${unknown}`);
    if (size !== undefined && !split)
        fail("--size only applies with --split");
    if (diffing && args.length !== 2)
        fail("--diff takes two files");
    const pair = diffing ? args.map((f) => node_path_1.default.resolve(process.cwd(), f)) : [];
    const gotos = going && !diffing ? args.map(ipc_1.parseGoto) : [];
    const positional = diffing || going ? [] : args;
    const wanted = positional.map((argument) => (0, target_1.resolveTarget)(argument, process.cwd()));
    (0, launch_1.registerSelf)();
    const files = [
        ...wanted.filter((t) => t.file).map((t) => ({ path: t.file })),
        ...gotos.map((goto) => ({ ...goto, path: node_path_1.default.resolve(process.cwd(), goto.path) })),
    ];
    const folders = wanted
        .filter((t) => t.folder)
        .map((t) => t.folder)
        .filter((folder, at, all) => all.indexOf(folder) === at);
    const here = adding || reuse;
    const window = newWindow ? null : (0, ipc_1.runningWindow)();
    const sendFolders = here ? folders : [];
    const opensAPane = folders.length > 0 && !here;
    if (window &&
        !opensAPane &&
        (files.length > 0 || sendFolders.length > 0 || pair.length > 0 || review)) {
        await (0, ipc_1.sendToExtension)(window, {
            files,
            folders: sendFolders,
            add: adding,
            wait,
            diff: pair,
            ...(review ? { view: "scm" } : {}),
        }, wait ? 0 : 4000).catch((error) => fail(`could not reach the tode window: ${error.message}`));
        return 0;
    }
    const mark = Date.now();
    const stages = [];
    const done = (label) => stages.push([label, Date.now() - mark]);
    const target = wanted[0] ?? (0, target_1.resolveTarget)(undefined, process.cwd());
    // code-server is fetched here, while tode still owns the tty: the narrated
    // download must not interleave with a pane that has taken over the screen.
    // Installed already (every open but the first), this is one existsSync.
    await (0, vendored_1.ensureCodeServer)((0, vendored_1.narrateFetch)(`code-server ${vendored_1.CODE_SERVER_VERSION}`));
    const { palette } = await (0, profile_2.readPalette)();
    (0, profile_2.ensureFont)();
    (0, profile_2.installTheme)(palette);
    (0, profile_2.installCss)(palette);
    (0, profile_2.installSettings)();
    (0, profile_2.setLiveTheme)((0, profile_2.currentTheme)(palette));
    done("profile");
    (0, wizard_1.autoApplyShared)();
    let finalized = null;
    const finalize = () => (finalized ??= (async () => {
        (0, bridge_1.installBridge)(todeCommand());
        (0, profile_2.installKeybindings)();
        const server = await (0, server_1.ensureServer)();
        done("code-server");
        const startupFiles = files.filter((file) => file.line !== undefined || file.path !== target.file);
        if (review || startupFiles.length > 0 || pair.length > 0) {
            (0, bridge_1.requestStartupOpen)({
                ...(startupFiles.length > 0 ? { files: startupFiles } : {}),
                ...(pair.length > 0 ? { diff: pair } : {}),
                ...(review ? { view: "scm" } : {}),
            });
        }
        return (0, server_1.windowUrl)(server, (0, target_1.workbenchUrl)((0, server_1.origin)(server), target));
    })());
    void (0, server_1.ensureServer)().catch(() => { });
    const pane = new launch_1.Pane({ split, size, stages });
    await (0, onboarding_1.runOnboarding)(pane, finalize, palette);
    if (pane.owned())
        return pane.exited();
    const url = await finalize();
    if (timing) {
        for (const [label, ms] of stages)
            process.stderr.write(`  ${label.padEnd(12)} ${ms}ms\n`);
    }
    return (0, launch_1.launchBrowser)(url, palette, { split, size, stages }).catch((error) => fail(error.message));
}
function importProfile(dir) {
    const editor = { name: "this machine", userDir: dir, extensionsDir: null, lastUsed: 0 };
    process.stdout.write("importing settings\n");
    const report = (0, run_1.runImport)(editor);
    const parts = [];
    if (report.settings)
        parts.push(`${report.settings.imported} settings`);
    if (report.keybindings)
        parts.push(`${report.keybindings} keybindings`);
    if (report.snippets.length)
        parts.push(`${report.snippets.length} snippet files`);
    if (report.tasks)
        parts.push("tasks");
    if (parts.length)
        process.stdout.write(`imported ${parts.join(", ")}\n`);
    installExtensions(node_path_1.default.join(dir, "extensions.txt"));
}
function installExtensions(listFile) {
    let ids;
    try {
        ids = node_fs_1.default.readFileSync(listFile, "utf8").split("\n").map((line) => line.trim()).filter(Boolean);
    }
    catch {
        return;
    }
    const have = new Set(installedExtensions().map((id) => id.toLowerCase()));
    const missing = ids.filter((entry) => !have.has(entry.split("@")[0].toLowerCase()));
    if (missing.length === 0)
        return;
    process.stdout.write(`installing ${missing.length} extensions\n`);
    const args = missing.flatMap((id) => ["--install-extension", id]);
    if (extensionCommand(args) !== 0) {
        process.stderr.write("  some extensions could not be installed\n");
    }
    (0, profile_1.registerThemeExtension)();
}
function installedExtensions() {
    const result = (0, node_child_process_1.spawnSync)((0, server_1.codeServerBin)(), ["--list-extensions", "--extensions-dir", profile_1.EXTENSIONS_DIR, "--user-data-dir", node_path_1.default.join(profile_1.VSCODE_DIR, "user-data")], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    if (result.status !== 0 || !result.stdout)
        return [];
    return result.stdout.split("\n").map((line) => line.trim()).filter(Boolean);
}
function extensionCommand(args, quiet = false) {
    const result = (0, node_child_process_1.spawnSync)((0, server_1.codeServerBin)(), [...args, "--extensions-dir", profile_1.EXTENSIONS_DIR, "--user-data-dir", node_path_1.default.join(profile_1.VSCODE_DIR, "user-data")], { stdio: quiet ? ["ignore", "inherit", "ignore"] : "inherit" });
    return result.status ?? 1;
}
function listExtensions(withVersions) {
    return extensionCommand(withVersions ? ["--list-extensions", "--show-versions"] : ["--list-extensions"], true);
}
function manageExtensions(install, remove) {
    for (const id of remove) {
        const code = extensionCommand(["--uninstall-extension", id]);
        if (code !== 0)
            return code;
    }
    for (const id of install) {
        const code = extensionCommand(["--install-extension", id]);
        if (code !== 0)
            return code;
    }
    (0, profile_1.registerThemeExtension)();
    if (install.length > 0)
        process.stdout.write("open tode again to pick it up\n");
    return 0;
}
function swatch(color) {
    const [r, g, b] = [1, 3, 5].map((at) => parseInt(color.slice(at, at + 2), 16));
    return `\x1b[48;2;${r};${g};${b}m   \x1b[0m`;
}
async function themeCommand(file) {
    if (file) {
        const error = (0, profile_2.setThemeFile)(file);
        if (error) {
            process.stderr.write(`tode: ${error}\n`);
            return 1;
        }
        (0, bridge_1.installBridge)(todeCommand());
        process.stdout.write(`theme set from ${file} — open windows follow without a reload\n`);
        return 0;
    }
    const { palette, source } = await (0, profile_2.readPalette)();
    // slop copy fixme
    const where = {
        terminal: "read from this terminal",
        cache: "from the cache, this terminal did not answer",
        default: "built in default, no terminal answered and nothing cached",
    }[source];
    const accent = (0, generate_1.semanticColors)(palette);
    const line = (label, color) => `  ${swatch(color)} ${color}  ${label}\n`;
    process.stdout.write(`palette ${where}\n`);
    process.stdout.write(line("background", (0, color_1.hex)(palette.background)));
    process.stdout.write(line("foreground", (0, color_1.hex)(palette.foreground)));
    process.stdout.write(`  ${palette.ansi.map((c) => swatch((0, color_1.hex)(c))).join("")}  ansi 0-15\n`);
    for (const [name, color] of Object.entries(accent))
        process.stdout.write(line(name, (0, color_1.hex)(color)));
    const { changed, fingerprint } = (0, profile_2.installTheme)(palette);
    (0, profile_2.setLiveTheme)((0, profile_2.currentTheme)(palette));
    (0, bridge_1.installBridge)(todeCommand());
    (0, profile_2.installCss)(palette);
    (0, profile_2.installSettings)();
    (0, profile_2.installKeybindings)();
    process.stdout.write(`\ntheme ${fingerprint} ${changed ? "written" : "already current"}\nfont ${(0, profile_2.ensureFont)()}\n`);
    return 0;
}
const STAGES = [
    ["renderer started", "code/didStartRenderer"],
    ["workbench script loaded", "code/didLoadWorkbenchMain"],
    ["workbench starting", "code/willStartWorkbench"],
    ["editors restored", "code/didRestoreEditors"],
    ["workbench ready", "code/didStartWorkbench"],
    ["settled", "code/LifecyclePhase/Eventually"],
];
function timingCommand() {
    let page;
    try {
        page = JSON.parse(node_fs_1.default.readFileSync(`${server_1.CSS_FILE}.timing.json`, "utf8"));
    }
    catch {
        process.stdout.write("no page timing recorded yet, open tode once\n");
        return 0;
    }
    let launch = null;
    try {
        launch = JSON.parse(node_fs_1.default.readFileSync(`${server_1.CSS_FILE}.launch.json`, "utf8"));
    }
    catch { }
    const bar = (ms, of) => "\u2588".repeat(Math.max(1, Math.round((ms / of) * 34)));
    const total = Math.max(page.marks["code/didStartWorkbench"] ?? 0, page.loadEnd, 1);
    const seconds = Math.round((Date.now() - page.at) / 1000);
    process.stdout.write(`page load, ${seconds}s ago\n\n`);
    const beforeNavigation = launch ? page.origin - launch.spawnedAt : null;
    const rows = [
        ...(launch
            ? [
                ...launch.stages.map(([label, ms]) => [`tode: ${label}`, ms - launch.stages[launch.stages.length - 1][1]]),
            ]
            : []),
        ...(beforeNavigation !== null && beforeNavigation >= 0
            ? [["browser start to navigation", beforeNavigation]]
            : []),
        ["document arrived", page.responseEnd],
        ["dom interactive", page.domInteractive],
        ...STAGES.filter(([, mark]) => page.marks[mark] != null).map(([label, mark]) => [label, page.marks[mark]]),
    ];
    for (const [label, ms] of rows) {
        process.stdout.write(`  ${label.padEnd(24)} ${String(ms).padStart(5)}ms  ${bar(ms, total)}\n`);
    }
    return 0;
}
async function transparencyCommand(on) {
    const changed = (0, profile_2.setTransparency)(on);
    await Promise.all((0, ipc_1.windowSockets)().map((socket) => (0, ipc_1.sendToExtension)(socket, { files: [], folders: [], add: false, transparency: on }, 1500).catch(() => { })));
    const state = on ? "on" : "off";
    process.stdout.write(changed
        ? `transparency ${state}, reload open windows to apply\n`
        : `transparency already ${state}\n`);
    return 0;
}
async function shutdownCommand() {
    const stopped = await (0, control_1.shutdownDaemons)();
    const server = await (0, server_1.stopServer)();
    if (!server && stopped.daemons === 0) {
        process.stdout.write("nothing was running\n");
        return 0;
    }
    const notes = [];
    if (stopped.windows > 0)
        notes.push(`closed ${stopped.windows} window${stopped.windows === 1 ? "" : "s"}`);
    if (stopped.killed > 0)
        notes.push(`killed ${stopped.killed} that did not answer`);
    process.stdout.write(`tode stopped${notes.length > 0 ? `, ${notes.join(", ")}` : ""}\n`);
    return 0;
}
function windowCommand(args) {
    const flag = (name) => args.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
    const url = args.find((arg) => !arg.startsWith("--"));
    if (!url)
        fail("--window needs a url");
    const pane = new launch_1.Pane({ proxy: flag("--proxy"), partition: flag("--partition") });
    pane.open(url);
    return pane.exited();
}
async function upgradeCommand(args) {
    const check = takeBool(args, "--check");
    const version = takeFlag(args, "--version");
    let announced = false;
    let lastPercent = -1;
    const outcome = await (0, upgrade_1.upgrade)({
        check,
        version,
        confirm: confirmUpgrade,
        onStage: (stage, fraction) => {
            if (stage !== "downloading")
                return;
            if (!announced) {
                process.stderr.write("tode: downloading\n");
                announced = true;
            }
            const percent = Math.round(fraction * 100);
            if (percent === lastPercent)
                return;
            lastPercent = percent;
            process.stderr.write(`\r  ${percent}%${percent === 100 ? "\n" : ""}`);
        },
    });
    switch (outcome.kind) {
        case "not-an-install":
            fail(`${outcome.root} is a working tree, not an install — use git pull`);
        // eslint-disable-next-line no-fallthrough
        case "current":
            process.stdout.write(`tode ${outcome.version} is the newest on ${outcome.channel}\n`);
            return 0;
        case "available":
            process.stdout.write(`tode ${outcome.build.version} is available (you have ${outcome.from})\n`);
            return 0;
        case "cancelled":
            process.stdout.write("cancelled\n");
            return 0;
        case "upgraded": {
            process.stdout.write(`tode ${outcome.from} -> ${outcome.build.version}\n`);
            return 0;
        }
    }
}
async function confirmUpgrade(build, windows) {
    if (!process.stdin.isTTY || !process.stdout.isTTY)
        return true;
    const open = windows.count > 0
        ? `${windows.count} open tode window${windows.count === 1 ? "" : "s"}`
        : "any open tode windows";
    process.stdout.write(`upgrading to ${build.version} closes ${open}\n`);
    const ask = node_readline_1.default.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise((resolve) => {
        ask.question("continue? [Y/n] ", resolve);
        ask.on("close", () => resolve("n"));
    });
    ask.close();
    return /^(y|yes|)$/i.test(answer.trim());
}
function installedVersion() {
    try {
        return node_fs_1.default.readFileSync(node_path_1.default.join(paths_1.INSTALL_ROOT, "VERSION"), "utf8").trim() || "dev";
    }
    catch {
        return "dev";
    }
}
const FORWARDED_OVER_SSH = [
    "--install-extension",
    "--uninstall-extension",
    "--list-extensions",
    "--shutdown",
    "--upgrade",
];
async function sshCommand(target, args) {
    if (!target || target.startsWith("-"))
        fail("--ssh needs a value (user@host or an ssh alias)");
    if (args.some((arg) => FORWARDED_OVER_SSH.includes(arg)))
        return (0, ssh_1.sshForward)(target, args);
    const split = takeFlag(args, "--split");
    const size = takeFlag(args, "--size");
    const unsupported = args.find((arg) => arg.startsWith("-"));
    if (unsupported)
        fail(`${unsupported} is not supported with --ssh yet`);
    if (args.length > 1)
        fail("--ssh opens one folder or file");
    const { palette } = await (0, profile_2.readPalette)();
    return (0, ssh_1.sshOpen)(target, {
        remotePath: args[0],
        palette,
        version: installedVersion(),
        split,
        size,
    });
}
async function serveCommand(args) {
    const paletteFile = takeFlag(args, "--palette");
    const importDir = takeFlag(args, "--import");
    const prepare = takeBool(args, "--prepare");
    const requested = args.find((arg) => !arg.startsWith("-"));
    await (0, vendored_1.ensureCodeServer)((0, vendored_1.narrateFetch)(`code-server ${vendored_1.CODE_SERVER_VERSION}`));
    const palette = paletteFile
        ? JSON.parse(node_fs_1.default.readFileSync(paletteFile, "utf8"))
        : (await (0, profile_2.readPalette)()).palette;
    if (importDir)
        importProfile(importDir);
    (0, profile_2.ensureFont)();
    (0, profile_2.installTheme)(palette);
    (0, profile_2.installCss)(palette);
    (0, profile_2.installSettings)();
    (0, profile_2.setLiveTheme)((0, profile_2.currentTheme)(palette));
    (0, wizard_1.autoApplyShared)();
    if (prepare)
        return 0;
    (0, bridge_1.installBridge)(todeCommand());
    (0, profile_2.installKeybindings)();
    const server = await (0, server_1.ensureServer)();
    const target = (0, target_1.resolveTarget)(requested, process.cwd());
    process.stdout.write(`READY ${(0, server_1.windowUrl)(server, (0, target_1.workbenchUrl)((0, server_1.origin)(server), target))}\n`);
    return 0;
}
async function main() {
    const args = process.argv.slice(2);
    if (args[0] === "--version" || args[0] === "-v") {
        process.stdout.write(`${installedVersion()}\n`);
        return 0;
    }
    const sshAt = args.indexOf("--ssh");
    if (sshAt >= 0) {
        const target = args[sshAt + 1];
        args.splice(sshAt, 2);
        return sshCommand(target, args);
    }
    if (args[0] === "--serve")
        return serveCommand(args.slice(1));
    if (args[0] === "--help" || args[0] === "-h") {
        process.stdout.write(HELP);
        return 0;
    }
    if (args[0] === "--shortcut-setup") {
        const rest = args.slice(1);
        const noBoot = takeBool(rest, "--no-boot");
        const code = await (0, wizard_1.shortcutsCommand)(rest, noBoot ? undefined : bootEditorUrl);
        if (code === wizard_1.BOOT_AFTER_APPLY)
            return noBoot ? 0 : openCommand([]);
        return code;
    }
    if (args[0] === "--import")
        return (0, command_1.importCommand)(args.slice(1));
    if (args[0] === "--theme")
        return themeCommand(args[1]);
    if (args[0] === "--enable-transparency")
        return transparencyCommand(true);
    if (args[0] === "--disable-transparency")
        return transparencyCommand(false);
    // alone it reads the last load's story; next to a path it stays the open
    // option that reports this open's stages
    if (args[0] === "--timing" && args.length === 1)
        return timingCommand();
    if (args[0] === "--skill")
        return (0, skill_1.skillCommand)();
    if (args[0] === "--upgrade")
        return upgradeCommand(args.slice(1));
    if (args[0] === "--shutdown")
        return shutdownCommand();
    if (args[0] === "--window")
        return windowCommand(args.slice(1));
    if (args[0] === "--uninstall")
        return (0, uninstall_1.uninstallCommand)(args.slice(1));
    return openCommand(args);
}
void main()
    .then((code) => {
    if (code)
        process.exit(code);
})
    .catch((error) => fail(error instanceof Error ? error.message : String(error)));
