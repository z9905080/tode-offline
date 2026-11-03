"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importedHolder = importedHolder;
exports.importedConflicts = importedConflicts;
exports.extensionClaims = extensionClaims;
exports.extensionHolder = extensionHolder;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const profile_1 = require("../profile");
function sameChord(a, b) {
    const canon = (chord) => chord
        .toLowerCase()
        .split("+")
        .map((part) => part.trim())
        .sort()
        .join("+");
    return canon(a) === canon(b);
}
function importedHolder(chord) {
    const found = (0, profile_1.foreignBindings)().find((entry) => !!entry.key &&
        !!entry.command &&
        !entry.command.startsWith("-") &&
        sameChord(entry.key, chord) &&
        !(0, profile_1.removalMasked)(entry.key, entry.command));
    return found?.command ?? null;
}
function importedConflicts() {
    const out = [];
    const seen = new Set();
    for (const bind of (0, profile_1.builtinKeybindings)()) {
        if (!bind.key || !bind.command || seen.has(bind.key))
            continue;
        seen.add(bind.key);
        const command = importedHolder(bind.key);
        if (command && command !== bind.command) {
            out.push({ key: bind.key, builtin: bind.command, command, claimant: "imported" });
            continue;
        }
        const carved = (claim) => !!claim.when && (bind.when ?? "").includes(`!(${claim.when})`);
        const held = extensionClaims(bind.key).find((claim) => claim.command !== bind.command && !carved(claim));
        if (held) {
            out.push({ key: bind.key, builtin: bind.command, ...held });
        }
    }
    return out;
}
function describeCommand(pkg, command) {
    const declared = pkg.contributes?.commands?.find((entry) => entry.command === command);
    if (declared?.title)
        return declared.title;
    return command.replace(/^extension\./, "").replace(/[_.]/g, " ");
}
let contributedCache = null;
function contributedKeybindings() {
    const manifest = node_path_1.default.join(profile_1.EXTENSIONS_DIR, "extensions.json");
    const mtime = (file) => {
        try {
            return node_fs_1.default.statSync(file).mtimeMs;
        }
        catch {
            return 0;
        }
    };
    const stamp = `${mtime(manifest)}:${mtime(profile_1.EXTENSIONS_DIR)}`;
    if (contributedCache && contributedCache.stamp === stamp)
        return contributedCache.bindings;
    const bindings = [];
    let listed = [];
    try {
        listed = JSON.parse(node_fs_1.default.readFileSync(manifest, "utf8"));
    }
    catch { }
    const dirs = new Set();
    for (const entry of listed) {
        const dir = entry.relativeLocation
            ? node_path_1.default.join(profile_1.EXTENSIONS_DIR, entry.relativeLocation)
            : entry.location?.path;
        if (dir)
            dirs.add(dir);
    }
    try {
        for (const entry of node_fs_1.default.readdirSync(profile_1.EXTENSIONS_DIR, { withFileTypes: true })) {
            if (entry.isDirectory())
                dirs.add(node_path_1.default.join(profile_1.EXTENSIONS_DIR, entry.name));
        }
    }
    catch { }
    for (const dir of dirs) {
        let pkg;
        try {
            pkg = JSON.parse(node_fs_1.default.readFileSync(node_path_1.default.join(dir, "package.json"), "utf8"));
        }
        catch {
            continue;
        }
        if (pkg.name === "tode-bridge")
            continue;
        for (const bind of pkg.contributes?.keybindings ?? []) {
            const key = (process.platform === "darwin" && bind.mac) || bind.key;
            if (!key || !bind.command)
                continue;
            bindings.push({
                key,
                command: bind.command,
                claimant: pkg.displayName ?? pkg.name ?? "an extension",
                when: bind.when,
                describes: describeCommand(pkg, bind.command),
            });
        }
    }
    contributedCache = { stamp, bindings };
    return bindings;
}
function extensionClaims(chord) {
    return contributedKeybindings()
        .filter((bind) => sameChord(bind.key, chord))
        .filter((bind) => !(0, profile_1.removalMasked)(chord, bind.command))
        .map(({ key: _key, ...claim }) => claim);
}
function extensionHolder(chord) {
    return extensionClaims(chord)[0] ?? null;
}
