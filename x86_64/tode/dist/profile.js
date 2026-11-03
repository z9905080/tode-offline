"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KEYBINDINGS_RECORD = exports.SEEDED_SETTINGS = exports.SETTINGS = exports.SETTINGS_FILE = exports.TRANSPARENCY_SETTING = exports.FONT_ASSET = exports.FONT_FAMILY = exports.LIVE_THEME_FILE = exports.PALETTE_CACHE = exports.THEME_EXTENSION_ID = exports.EXTENSIONS_DIR = exports.USER_DIR = exports.VSCODE_DIR = void 0;
exports.assetPath = assetPath;
exports.userFontsDir = userFontsDir;
exports.ensureFont = ensureFont;
exports.cachedPalette = cachedPalette;
exports.resolvePalette = resolvePalette;
exports.readPalette = readPalette;
exports.transparencyEnabled = transparencyEnabled;
exports.setTransparency = setTransparency;
exports.currentTheme = currentTheme;
exports.installTheme = installTheme;
exports.installThemeJson = installThemeJson;
exports.registerThemeExtension = registerThemeExtension;
exports.installCss = installCss;
exports.setLiveTheme = setLiveTheme;
exports.setThemeFile = setThemeFile;
exports.managedSettings = managedSettings;
exports.applySettings = applySettings;
exports.installSettings = installSettings;
exports.builtinKeybindings = builtinKeybindings;
exports.todeKeybindings = todeKeybindings;
exports.holdsStamp = holdsStamp;
exports.removalMasked = removalMasked;
exports.foreignBindings = foreignBindings;
exports.installKeybindings = installKeybindings;
exports.mergeKeybindings = mergeKeybindings;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const server_1 = require("./codeserver/server");
const inject_1 = require("./codeserver/inject");
const jsonc_1 = require("./jsonc");
const paths_1 = require("./runtime/paths");
const store_1 = require("./shortcuts/store");
const osc_1 = require("./terminal/osc");
const color_1 = require("./theme/color");
const generate_1 = require("./theme/generate");
exports.VSCODE_DIR = node_path_1.default.join(paths_1.DATA_DIR, "vscode");
exports.USER_DIR = node_path_1.default.join(exports.VSCODE_DIR, "user-data", "User");
exports.EXTENSIONS_DIR = node_path_1.default.join(exports.VSCODE_DIR, "extensions");
exports.THEME_EXTENSION_ID = "tode.tode-theme";
function themeExtensionDir(fingerprint) {
    return node_path_1.default.join(exports.EXTENSIONS_DIR, `${exports.THEME_EXTENSION_ID}-${fingerprint}`);
}
function forgetOldThemeExtensions(keep) {
    let entries = [];
    try {
        entries = node_fs_1.default.readdirSync(exports.EXTENSIONS_DIR);
    }
    catch {
        return;
    }
    const prefix = `${exports.THEME_EXTENSION_ID}-`;
    for (const entry of entries) {
        if (entry.startsWith(prefix) && entry !== keep) {
            node_fs_1.default.rmSync(node_path_1.default.join(exports.EXTENSIONS_DIR, entry), { recursive: true, force: true });
        }
    }
}
// hm
exports.PALETTE_CACHE = node_path_1.default.join(paths_1.DATA_DIR, "palette.json");
// hm
exports.LIVE_THEME_FILE = node_path_1.default.join(paths_1.DATA_DIR, "live-theme.json");
exports.FONT_FAMILY = "JetBrains Mono";
const FONT_FILE = "JetBrainsMono-Regular.ttf";
function assetPath(name) {
    for (let dir = __dirname;; dir = node_path_1.default.dirname(dir)) {
        const candidate = node_path_1.default.join(dir, "assets", "fonts", name);
        if (node_fs_1.default.existsSync(candidate))
            return candidate;
        if (node_path_1.default.dirname(dir) === dir)
            throw new Error(`bundled font missing: ${name}`);
    }
}
exports.FONT_ASSET = FONT_FILE;
// interesting, we actually install the font at a legimate location?
function userFontsDir() {
    if (process.platform === "darwin")
        return node_path_1.default.join(node_os_1.default.homedir(), "Library", "Fonts");
    const dataHome = process.env.XDG_DATA_HOME && node_path_1.default.isAbsolute(process.env.XDG_DATA_HOME)
        ? process.env.XDG_DATA_HOME
        : node_path_1.default.join(node_os_1.default.homedir(), ".local", "share");
    return node_path_1.default.join(dataHome, "fonts");
}
function ensureFont() {
    const target = node_path_1.default.join(userFontsDir(), FONT_FILE);
    if (node_fs_1.default.existsSync(target))
        return "present";
    node_fs_1.default.mkdirSync(node_path_1.default.dirname(target), { recursive: true });
    node_fs_1.default.copyFileSync(assetPath(FONT_FILE), target);
    if (process.platform !== "darwin") {
        try {
            (0, node_child_process_1.execFileSync)("fc-cache", ["-f", node_path_1.default.dirname(target)], { stdio: "ignore" });
        }
        catch { }
    }
    return "installed";
}
function cachedPalette() {
    try {
        return JSON.parse(node_fs_1.default.readFileSync(exports.PALETTE_CACHE, "utf8"));
    }
    catch {
        return null;
    }
}
function completeAnswer(asked) {
    return !!asked?.background && !!asked.foreground && asked.ansi.every((slot) => slot !== null);
}
function resolvePalette(asked, cached) {
    if (completeAnswer(asked))
        return { palette: (0, osc_1.withFallbacks)(asked), source: "terminal" };
    if (asked?.background) {
        const base = cached ?? (0, osc_1.withFallbacks)(null);
        return {
            palette: {
                background: asked.background,
                foreground: asked.foreground ?? base.foreground,
                ansi: base.ansi.map((slot, at) => asked.ansi[at] ?? slot),
            },
            source: cached ? "cache" : "default",
        };
    }
    if (cached)
        return { palette: cached, source: "cache" };
    return { palette: (0, osc_1.withFallbacks)(null), source: "default" };
}
async function readPalette() {
    const resolved = resolvePalette(await (0, osc_1.queryTerminal)(), cachedPalette());
    if (resolved.source === "terminal") {
        node_fs_1.default.mkdirSync(node_path_1.default.dirname(exports.PALETTE_CACHE), { recursive: true });
        node_fs_1.default.writeFileSync(exports.PALETTE_CACHE, `${JSON.stringify(resolved.palette, null, 2)}\n`);
    }
    return resolved;
}
function writeIfChanged(file, contents) {
    try {
        if (node_fs_1.default.readFileSync(file, "utf8") === contents)
            return false;
    }
    catch { }
    node_fs_1.default.mkdirSync(node_path_1.default.dirname(file), { recursive: true });
    node_fs_1.default.writeFileSync(file, contents);
    return true;
}
exports.TRANSPARENCY_SETTING = "tode.transparent";
exports.SETTINGS_FILE = node_path_1.default.join(exports.USER_DIR, "settings.json");
function readSettings() {
    try {
        return node_fs_1.default.readFileSync(exports.SETTINGS_FILE, "utf8") || "{}";
    }
    catch {
        return "{}";
    }
}
function transparencyEnabled() {
    return (0, jsonc_1.readKey)(readSettings(), exports.TRANSPARENCY_SETTING) === true;
}
function setTransparency(on) {
    node_fs_1.default.mkdirSync(exports.USER_DIR, { recursive: true });
    return writeIfChanged(exports.SETTINGS_FILE, (0, jsonc_1.setKey)(readSettings(), exports.TRANSPARENCY_SETTING, on));
}
function currentTheme(palette, transparent = transparencyEnabled()) {
    return (0, generate_1.generateTheme)(palette, { transparent });
}
function installTheme(palette, transparent = transparencyEnabled()) {
    const fingerprint = `${(0, generate_1.paletteFingerprint)(palette)}${transparent ? "-clear" : ""}`;
    return installThemeJson((0, generate_1.generateTheme)(palette, { transparent }), fingerprint);
}
function installThemeJson(theme, fingerprint) {
    const dir = themeExtensionDir(fingerprint);
    const already = node_fs_1.default.existsSync(node_path_1.default.join(dir, "themes", "tode-terminal.json"));
    if (!already) {
        const manifest = {
            name: "tode-theme",
            displayName: "terminal-code terminal theme",
            publisher: "tode",
            version: "1.0.0",
            engines: { vscode: "^1.80.0" },
            categories: ["Themes"],
            contributes: {
                themes: [
                    {
                        label: generate_1.THEME_NAME,
                        uiTheme: theme.type === "light" ? "vs" : "vs-dark",
                        path: "./themes/tode-terminal.json",
                    },
                ],
            },
        };
        node_fs_1.default.mkdirSync(node_path_1.default.join(dir, "themes"), { recursive: true });
        node_fs_1.default.writeFileSync(node_path_1.default.join(dir, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
        node_fs_1.default.writeFileSync(node_path_1.default.join(dir, "themes", "tode-terminal.json"), `${JSON.stringify(theme, null, 2)}\n`);
    }
    registerThemeExtension(dir);
    forgetOldThemeExtensions(node_path_1.default.basename(dir));
    return { changed: !already, fingerprint };
}
function newestThemeExtensionDir() {
    let entries = [];
    try {
        entries = node_fs_1.default.readdirSync(exports.EXTENSIONS_DIR);
    }
    catch {
        return null;
    }
    const prefix = `${exports.THEME_EXTENSION_ID}-`;
    const withMtime = entries
        .filter((entry) => entry.startsWith(prefix))
        .map((entry) => {
        const full = node_path_1.default.join(exports.EXTENSIONS_DIR, entry);
        try {
            return { full, mtime: node_fs_1.default.statSync(full).mtimeMs };
        }
        catch {
            return null;
        }
    })
        .filter((entry) => entry !== null);
    if (withMtime.length === 0)
        return null;
    withMtime.sort((a, b) => b.mtime - a.mtime);
    return withMtime[0].full;
}
function registerThemeExtension(dir) {
    const themeDir = dir ?? newestThemeExtensionDir();
    if (!themeDir)
        return;
    const manifest = node_path_1.default.join(exports.EXTENSIONS_DIR, "extensions.json");
    let listed = [];
    try {
        const parsed = JSON.parse(node_fs_1.default.readFileSync(manifest, "utf8"));
        if (Array.isArray(parsed))
            listed = parsed;
    }
    catch {
        return;
    }
    const folder = node_path_1.default.basename(themeDir);
    const entry = {
        identifier: { id: exports.THEME_EXTENSION_ID },
        version: "1.0.0",
        relativeLocation: folder,
        location: { $mid: 1, path: themeDir, scheme: "file" },
        metadata: { isApplicationScoped: false, isMachineScoped: false, installedTimestamp: 0 },
    };
    const without = listed.filter((item) => item.identifier?.id !== entry.identifier.id);
    node_fs_1.default.writeFileSync(manifest, `${JSON.stringify([...without, entry], null, 2)}\n`);
}
const FONT_STACK = `"${exports.FONT_FAMILY}", ${inject_1.FONT_FALLBACKS}`;
exports.SETTINGS = {
    "workbench.colorTheme": generate_1.THEME_NAME,
    "editor.fontFamily": FONT_STACK,
    "terminal.integrated.fontFamily": FONT_STACK,
    "chat.editor.fontFamily": FONT_STACK,
    "debug.console.fontFamily": FONT_STACK,
    "markdown.preview.fontFamily": FONT_STACK,
    "terminal.integrated.enableImages": true,
    "workbench.startupEditor": "none",
    "workbench.secondarySideBar.defaultVisibility": "hidden",
    "chat.commandCenter.enabled": false,
    // wait what
    "workbench.tips.enabled": false,
    "workbench.welcomePage.walkthroughs.openOnInstall": false,
    "window.commandCenter": false,
    // The default title format ends in ${appName} — "code-server". The folder is
    // already on the window above this bar, so the file name is the only part
    // left worth showing. ${dirty} puts a dot in front of unsaved work.
    "window.title": "${dirty}${activeEditorShort}",
    // wait why are we applying this?
    "editor.smoothScrolling": false,
    "workbench.list.smoothScrolling": false,
    // huh?
    "terminal.integrated.smoothScrolling": false,
    "update.mode": "none",
    "telemetry.telemetryLevel": "off",
    "workbench.enableExperiments": false,
};
exports.SEEDED_SETTINGS = {
    "workbench.activityBar.location": "top",
    "editor.fontSize": 13,
    "workbench.tree.indent": 12,
    "editor.cursorBlinking": "solid",
    "editor.minimap.enabled": false,
    "scm.defaultViewMode": "tree",
};
function installCss(palette, transparent = transparencyEnabled()) {
    return writeIfChanged(server_1.CSS_FILE, (0, inject_1.injectedCss)((0, color_1.hex)(palette.background), exports.FONT_FAMILY, transparent));
}
function setLiveTheme(theme) {
    return writeIfChanged(exports.LIVE_THEME_FILE, `${JSON.stringify(theme)}\n`);
}
function setThemeFile(file) {
    let source;
    try {
        source = node_fs_1.default.readFileSync(file, "utf8");
    }
    catch {
        return `could not read ${file}`;
    }
    const theme = (0, jsonc_1.parseJsonc)(source);
    if (!theme || typeof theme !== "object" || (!theme.colors && !theme.tokenColors)) {
        return `${file} is not a vscode theme (expected a json document with colors or tokenColors)`;
    }
    installThemeJson(theme, (0, generate_1.themeFingerprint)(theme));
    setLiveTheme(theme);
    return null;
}
function managedSettings() {
    return { ...exports.SETTINGS };
}
function applySettings(source) {
    const absent = Object.fromEntries(Object.entries(exports.SEEDED_SETTINGS).filter(([key]) => (0, jsonc_1.readKey)(source, key) === undefined));
    return (0, jsonc_1.setKeys)((0, jsonc_1.setKeys)(source, absent), exports.SETTINGS);
}
function installSettings() {
    const file = node_path_1.default.join(exports.USER_DIR, "settings.json");
    let source = "";
    try {
        source = node_fs_1.default.readFileSync(file, "utf8");
    }
    catch { }
    return writeIfChanged(file, applySettings(source || "{}"));
}
function builtinKeybindings() {
    return [
        { key: store_1.QUIT_CHORD, command: store_1.QUIT_COMMAND, when: (0, store_1.quitWhen)() },
        ...(0, store_1.hintBindings)(),
    ];
}
function todeKeybindings() {
    return [
        ...(0, store_1.quitBindings)(),
        ...(0, store_1.hintBindings)(),
        ...(0, store_1.fallbackBindings)().map(({ key, command, when }) => when ? { key, command, when } : { key, command }),
    ];
}
const KEYBINDINGS_FILE = node_path_1.default.join(exports.USER_DIR, "keybindings.json");
exports.KEYBINDINGS_RECORD = node_path_1.default.join(paths_1.DATA_DIR, "keybindings.tode.json");
function sameBinding(a, b) {
    return a.key === b.key && a.command === b.command && (a.when ?? "") === (b.when ?? "");
}
function readBindings(file) {
    try {
        const parsed = (0, jsonc_1.parseJsonc)(node_fs_1.default.readFileSync(file, "utf8"));
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}
function holdsStamp() {
    const stamp = (file) => {
        try {
            return node_fs_1.default.statSync(file).mtimeMs;
        }
        catch {
            return 0;
        }
    };
    return [
        stamp(KEYBINDINGS_FILE),
        stamp(exports.KEYBINDINGS_RECORD),
        stamp(node_path_1.default.join(exports.EXTENSIONS_DIR, "extensions.json")),
        stamp(exports.EXTENSIONS_DIR),
        (0, store_1.decisionsStamp)(),
    ].join(":");
}
function removalMasked(chord, command) {
    const canon = (value) => value.toLowerCase().split("+").map((part) => part.trim()).sort().join("+");
    const target = `${canon(chord)}:${command}`;
    const negative = (entry) => !!entry.key &&
        !!entry.command?.startsWith("-") &&
        `${canon(entry.key)}:${entry.command.slice(1)}` === target;
    return (readBindings(KEYBINDINGS_FILE).some(negative) ||
        [...(0, store_1.overrideBindings)(), ...(0, store_1.claimBindings)()].some(negative));
}
function foreignBindings() {
    const mine = [...todeKeybindings(), ...(0, store_1.overrideBindings)(), ...(0, store_1.claimBindings)()];
    const previouslyMine = readBindings(exports.KEYBINDINGS_RECORD);
    return readBindings(KEYBINDINGS_FILE).filter((entry) => !previouslyMine.some((old) => sameBinding(old, entry)) &&
        !mine.some((current) => sameBinding(current, entry)));
}
function installKeybindings() {
    return writeBindings(todeKeybindings(), foreignBindings());
}
function quitWinsBindings(theirs) {
    const choices = (0, store_1.loadDecisions)()?.choices ?? {};
    if (choices[store_1.IMPORT_DECISION_ID] || choices[store_1.CLAIM_DECISION_ID])
        return [];
    const canon = (chord) => chord.toLowerCase().split("+").sort().join("+");
    const shadowed = theirs.some((entry) => !!entry.key &&
        !!entry.command &&
        !entry.command.startsWith("-") &&
        canon(entry.key) === canon(store_1.QUIT_CHORD) &&
        entry.command !== store_1.QUIT_COMMAND);
    return shadowed ? [{ key: store_1.QUIT_CHORD, command: store_1.QUIT_COMMAND, when: (0, store_1.quitWhen)() }] : [];
}
function writeBindings(mine, theirs) {
    const winners = [...(0, store_1.overrideBindings)(), ...(0, store_1.claimBindings)(), ...quitWinsBindings(theirs)];
    node_fs_1.default.mkdirSync(exports.USER_DIR, { recursive: true });
    node_fs_1.default.mkdirSync(node_path_1.default.dirname(exports.KEYBINDINGS_RECORD), { recursive: true });
    node_fs_1.default.writeFileSync(exports.KEYBINDINGS_RECORD, `${JSON.stringify([...mine, ...winners], null, 2)}\n`);
    return writeIfChanged(KEYBINDINGS_FILE, `// \n${JSON.stringify([...mine, ...theirs, ...winners], null, 2)}\n`);
}
function mergeKeybindings(theirs) {
    const existing = foreignBindings();
    const added = theirs.filter((entry) => !existing.some((have) => sameBinding(have, entry)));
    writeBindings(todeKeybindings(), [...existing, ...added]);
    return added.length;
}
