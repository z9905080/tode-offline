"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findEditors = findEditors;
exports.describe = describe;
exports.summarise = summarise;
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const KNOWN_EXTENSION_DIRS = {
    Code: ".vscode",
    "Code - Insiders": ".vscode-insiders",
    "code-oss-dev": ".vscode-oss",
    VSCodium: ".vscode-oss",
};
function slug(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}
function findExtensionsDir(name) {
    const home = node_os_1.default.homedir();
    const candidates = [
        KNOWN_EXTENSION_DIRS[name],
        `.${slug(name)}`,
        `.${slug(name.split(/\s+/)[0])}`,
    ].filter(Boolean);
    for (const candidate of candidates) {
        const dir = node_path_1.default.join(home, candidate, "extensions");
        if (node_fs_1.default.existsSync(node_path_1.default.join(dir, "extensions.json")))
            return dir;
    }
    return null;
}
function modified(file) {
    try {
        return node_fs_1.default.statSync(file).mtimeMs;
    }
    catch {
        return 0;
    }
}
function findEditors() {
    const support = process.platform === "darwin"
        ? node_path_1.default.join(node_os_1.default.homedir(), "Library", "Application Support")
        : process.env.XDG_CONFIG_HOME && node_path_1.default.isAbsolute(process.env.XDG_CONFIG_HOME)
            ? process.env.XDG_CONFIG_HOME
            : node_path_1.default.join(node_os_1.default.homedir(), ".config");
    let names;
    try {
        names = node_fs_1.default.readdirSync(support);
    }
    catch {
        return [];
    }
    return names
        .map((name) => ({ name, userDir: node_path_1.default.join(support, name, "User") }))
        .filter((entry) => node_fs_1.default.existsSync(node_path_1.default.join(entry.userDir, "globalStorage", "state.vscdb")))
        .map((entry) => ({
        ...entry,
        extensionsDir: findExtensionsDir(entry.name),
        lastUsed: modified(node_path_1.default.join(entry.userDir, "globalStorage", "state.vscdb")),
    }))
        .sort((a, b) => b.lastUsed - a.lastUsed);
}
function countExtensions(dir) {
    if (!dir)
        return 0;
    try {
        const listed = JSON.parse(node_fs_1.default.readFileSync(node_path_1.default.join(dir, "extensions.json"), "utf8"));
        return Array.isArray(listed) ? listed.length : 0;
    }
    catch {
        return 0;
    }
}
function describe(editor) {
    const at = (name) => node_path_1.default.join(editor.userDir, name);
    let snippets = 0;
    try {
        snippets = node_fs_1.default.readdirSync(at("snippets")).filter((f) => f.endsWith(".json") || f.endsWith(".code-snippets")).length;
    }
    catch { }
    return {
        settings: node_fs_1.default.existsSync(at("settings.json")),
        keybindings: node_fs_1.default.existsSync(at("keybindings.json")),
        snippets,
        tasks: node_fs_1.default.existsSync(at("tasks.json")),
        extensions: countExtensions(editor.extensionsDir),
    };
}
function summarise(contents) {
    const parts = [
        contents.extensions ? `${contents.extensions} extensions` : null,
        contents.settings ? "settings" : null,
        contents.keybindings ? "keybindings" : null,
        contents.snippets ? `${contents.snippets} snippet files` : null,
        contents.tasks ? "tasks" : null,
    ].filter(Boolean);
    return parts.length ? parts.join(", ") : "nothing to import";
}
