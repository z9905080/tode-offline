"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runImport = runImport;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const jsonc_1 = require("../jsonc");
const profile_1 = require("../profile");
function copyTree(from, to) {
    node_fs_1.default.mkdirSync(node_path_1.default.dirname(to), { recursive: true });
    node_fs_1.default.rmSync(to, { recursive: true, force: true });
    try {
        // clones rather than copies on apfs, which matters for hundreds of megabytes
        (0, node_child_process_1.execFileSync)("cp", ["-Rc", from, to], { stdio: "ignore" });
        return true;
    }
    catch {
        try {
            (0, node_child_process_1.execFileSync)("cp", ["-R", from, to], { stdio: "ignore" });
            return true;
        }
        catch {
            return false;
        }
    }
}
function importSettings(editor) {
    const from = node_path_1.default.join(editor.userDir, "settings.json");
    if (!node_fs_1.default.existsSync(from))
        return null;
    const theirs = (0, jsonc_1.parseJsonc)(node_fs_1.default.readFileSync(from, "utf8"));
    if (!theirs)
        return null;
    const managed = (0, profile_1.managedSettings)();
    const target = node_path_1.default.join(profile_1.USER_DIR, "settings.json");
    let current = "{}";
    try {
        current = node_fs_1.default.readFileSync(target, "utf8") || "{}";
    }
    catch { }
    node_fs_1.default.mkdirSync(node_path_1.default.dirname(target), { recursive: true });
    node_fs_1.default.writeFileSync(target, (0, profile_1.applySettings)((0, jsonc_1.setKeys)(current, theirs)));
    return {
        imported: Object.keys(theirs).length,
        keptByTode: Object.keys(theirs).filter((key) => key in managed),
    };
}
function importKeybindings(editor) {
    const from = node_path_1.default.join(editor.userDir, "keybindings.json");
    if (!node_fs_1.default.existsSync(from))
        return null;
    const theirs = (0, jsonc_1.parseJsonc)(node_fs_1.default.readFileSync(from, "utf8"));
    if (!Array.isArray(theirs))
        return null;
    return (0, profile_1.mergeKeybindings)(theirs);
}
function importSnippets(editor) {
    const from = node_path_1.default.join(editor.userDir, "snippets");
    let names;
    try {
        names = node_fs_1.default.readdirSync(from);
    }
    catch {
        return [];
    }
    const to = node_path_1.default.join(profile_1.USER_DIR, "snippets");
    node_fs_1.default.mkdirSync(to, { recursive: true });
    const copied = [];
    for (const name of names) {
        try {
            node_fs_1.default.copyFileSync(node_path_1.default.join(from, name), node_path_1.default.join(to, name));
            copied.push(name);
        }
        catch { }
    }
    return copied;
}
function importTasks(editor) {
    const from = node_path_1.default.join(editor.userDir, "tasks.json");
    if (!node_fs_1.default.existsSync(from))
        return false;
    node_fs_1.default.mkdirSync(profile_1.USER_DIR, { recursive: true });
    node_fs_1.default.copyFileSync(from, node_path_1.default.join(profile_1.USER_DIR, "tasks.json"));
    return true;
}
function importExtensions(editor, onProgress) {
    const copied = [];
    const skipped = [];
    if (!editor.extensionsDir)
        return { copied, skipped };
    let listed;
    try {
        listed = JSON.parse(node_fs_1.default.readFileSync(node_path_1.default.join(editor.extensionsDir, "extensions.json"), "utf8"));
    }
    catch {
        return { copied, skipped: [{ id: "extensions.json", why: "could not be read" }] };
    }
    node_fs_1.default.mkdirSync(profile_1.EXTENSIONS_DIR, { recursive: true });
    const target = node_path_1.default.join(profile_1.EXTENSIONS_DIR, "extensions.json");
    let existing = [];
    try {
        existing = JSON.parse(node_fs_1.default.readFileSync(target, "utf8"));
    }
    catch { }
    const kept = new Map(existing.map((entry) => [entry.identifier.id, entry]));
    let done = 0;
    for (const entry of listed) {
        const folder = entry.relativeLocation ?? node_path_1.default.basename(entry.location?.path ?? "");
        const from = node_path_1.default.join(editor.extensionsDir, folder);
        done += 1;
        onProgress?.(done, listed.length, entry.identifier.id);
        if (!folder || !node_fs_1.default.existsSync(from)) {
            skipped.push({ id: entry.identifier.id, why: "its folder is missing" });
            continue;
        }
        const to = node_path_1.default.join(profile_1.EXTENSIONS_DIR, folder);
        if (!copyTree(from, to)) {
            skipped.push({ id: entry.identifier.id, why: "could not be copied" });
            continue;
        }
        kept.set(entry.identifier.id, {
            ...entry,
            relativeLocation: folder,
            location: { $mid: 1, path: to, scheme: "file" },
        });
        copied.push(entry.identifier.id);
    }
    node_fs_1.default.writeFileSync(target, `${JSON.stringify([...kept.values()], null, 2)}\n`);
    (0, profile_1.registerThemeExtension)();
    return { copied, skipped };
}
function runImport(editor, onProgress) {
    return {
        extensions: importExtensions(editor, onProgress),
        settings: importSettings(editor),
        keybindings: importKeybindings(editor),
        snippets: importSnippets(editor),
        tasks: importTasks(editor),
    };
}
