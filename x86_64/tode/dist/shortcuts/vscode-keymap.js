"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalChord = canonicalChord;
exports.setKeymapPlatformForTest = setKeymapPlatformForTest;
exports.defaultBinding = defaultBinding;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const MODS = ["ctrl", "shift", "alt", "cmd"];
function canonicalChord(chord) {
    const opener = chord.trim().split(/\s+/)[0] ?? "";
    const parts = opener.toLowerCase().split("+").map((part) => part.trim()).filter(Boolean);
    if (parts.length === 0)
        return "";
    const key = parts.pop();
    const mods = new Set(parts.map((part) => (part === "meta" || part === "super" ? "cmd" : part)));
    return [...MODS.filter((mod) => mods.has(mod)), key].join("+");
}
let platformOverride = null;
function setKeymapPlatformForTest(platform) {
    platformOverride = platform;
    cache = null;
}
function keymapAsset() {
    const platform = platformOverride ?? (process.platform === "darwin" ? "mac" : "linux");
    const name = `vscode-${platform}.json`;
    for (let dir = __dirname;; dir = node_path_1.default.dirname(dir)) {
        const candidate = node_path_1.default.join(dir, "assets", "keymaps", name);
        if (node_fs_1.default.existsSync(candidate))
            return candidate;
        if (node_path_1.default.dirname(dir) === dir)
            return null;
    }
}
let cache = null;
function load() {
    if (cache)
        return cache;
    cache = new Map();
    const file = keymapAsset();
    if (!file)
        return cache;
    try {
        const parsed = JSON.parse(node_fs_1.default.readFileSync(file, "utf8"));
        for (const entry of parsed.bindings ?? []) {
            if (!entry.key || !entry.command || entry.command.startsWith("-"))
                continue;
            const chord = canonicalChord(entry.key);
            const list = cache.get(chord);
            if (list)
                list.push(entry);
            else
                cache.set(chord, [entry]);
        }
    }
    catch { }
    return cache;
}
function defaultBinding(chord) {
    const entries = load().get(canonicalChord(chord));
    if (!entries || entries.length === 0)
        return null;
    const core = (entry) => /^(editor\.|workbench\.|actions\.|cursor|list\.|search\.)/.test(entry.command);
    return (entries.find((entry) => !entry.when && core(entry)) ??
        entries.find((entry) => !entry.when) ??
        entries.find(core) ??
        entries[0]);
}
