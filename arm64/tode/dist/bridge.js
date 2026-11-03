"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BRIDGE_DIR = exports.STARTUP_OPEN_FILE = void 0;
exports.requestStartupOpen = requestStartupOpen;
exports.quitHintMessage = quitHintMessage;
exports.bridgeSource = bridgeSource;
exports.installBridge = installBridge;
exports.registerBridge = registerBridge;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const extension_1 = require("./bridge/extension");
const paths_1 = require("./runtime/paths");
const protocol_1 = require("./app/protocol");
const profile_1 = require("./profile");
const store_1 = require("./shortcuts/store");
const BRIDGE_ID = "tode.tode-bridge";
const BRIDGE_VERSION = "1.6.0";
exports.STARTUP_OPEN_FILE = node_path_1.default.join(paths_1.DATA_DIR, "startup-open.json");
function requestStartupOpen(request) {
    node_fs_1.default.mkdirSync(paths_1.DATA_DIR, { recursive: true });
    node_fs_1.default.writeFileSync(exports.STARTUP_OPEN_FILE, `${JSON.stringify({ ...request, at: Date.now() })}\n`);
}
exports.BRIDGE_DIR = node_path_1.default.join(profile_1.EXTENSIONS_DIR, `${BRIDGE_ID}-${BRIDGE_VERSION}`);
function manifest() {
    const quitBinding = { command: store_1.QUIT_COMMAND, key: store_1.QUIT_CHORD, when: (0, store_1.quitWhen)() };
    const hintBinding = store_1.QUIT_CHORD === "ctrl+c"
        ? []
        : [{ command: "tode.quitHint", key: "ctrl+c", when: (0, store_1.hintWhen)() }];
    return {
        name: "tode-bridge",
        displayName: "terminal-code",
        publisher: "tode",
        version: BRIDGE_VERSION,
        engines: { vscode: "^1.80.0" },
        main: "./extension.js",
        activationEvents: ["*"],
        contributes: {
            commands: [
                { command: "tode.quit", title: "Quit", category: "terminal-code" },
                { command: "tode.enableTransparency", title: "Enable Transparency", category: "terminal-code" },
                { command: "tode.disableTransparency", title: "Disable Transparency", category: "terminal-code" },
            ],
            menus: {
                commandPalette: [
                    { command: "tode.enableTransparency", when: "!tode.transparent" },
                    { command: "tode.disableTransparency", when: "tode.transparent" },
                ],
            },
            configuration: {
                title: "terminal-code",
                properties: {
                    [profile_1.TRANSPARENCY_SETTING]: {
                        type: "boolean",
                        default: false,
                        description: "Make the editor transparent. Takes effect when the window is reloaded.",
                    },
                },
            },
            keybindings: [quitBinding, ...hintBinding],
        },
    };
}
function quitHintMessage() {
    const choices = (0, store_1.loadDecisions)()?.choices ?? {};
    const decision = choices[store_1.IMPORT_DECISION_ID] ?? choices[store_1.QUIT_CHORD];
    if (decision?.choice === "editor" && decision.key) {
        return `Press ${decision.key} to quit terminal-code`;
    }
    if (decision?.choice === "keep") {
        return `${store_1.QUIT_CHORD} is taken. Quit terminal-code from the command palette, or run: tode --shortcut-setup`;
    }
    return `Press ${store_1.QUIT_CHORD} to quit terminal-code`;
}
function bridgeSource(ctx) {
    return `"use strict";\n(${extension_1.bridgeMain.toString()})(${JSON.stringify(ctx)});\n`;
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
function installBridge(tode) {
    const wroteManifest = writeIfChanged(node_path_1.default.join(exports.BRIDGE_DIR, "package.json"), `${JSON.stringify(manifest(), null, 2)}\n`);
    const wroteSource = writeIfChanged(node_path_1.default.join(exports.BRIDGE_DIR, "extension.js"), bridgeSource({
        tode,
        liveThemeFile: profile_1.LIVE_THEME_FILE,
        quitHint: quitHintMessage(),
        startupOpenFile: exports.STARTUP_OPEN_FILE,
        daemonSocket: (0, protocol_1.daemonSocket)(),
        transparencySetting: profile_1.TRANSPARENCY_SETTING,
    }));
    registerBridge();
    return wroteManifest || wroteSource;
}
function registerBridge() {
    const file = node_path_1.default.join(profile_1.EXTENSIONS_DIR, "extensions.json");
    let listed = [];
    try {
        const parsed = JSON.parse(node_fs_1.default.readFileSync(file, "utf8"));
        if (Array.isArray(parsed))
            listed = parsed;
    }
    catch {
        return;
    }
    const entry = {
        identifier: { id: BRIDGE_ID },
        version: BRIDGE_VERSION,
        relativeLocation: node_path_1.default.basename(exports.BRIDGE_DIR),
        location: { $mid: 1, path: exports.BRIDGE_DIR, scheme: "file" },
        metadata: { isApplicationScoped: false, isMachineScoped: false, installedTimestamp: 0 },
    };
    const without = listed.filter((item) => item.identifier?.id !== BRIDGE_ID);
    node_fs_1.default.writeFileSync(file, `${JSON.stringify([...without, entry], null, 2)}\n`);
}
