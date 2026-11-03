"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ghosttyProvider = exports.INCLUDE_LINE = void 0;
exports.isGhostty = isGhostty;
exports.ghosttyBinary = ghosttyBinary;
exports.ghosttyConfigDir = ghosttyConfigDir;
exports.parseKeybinds = parseKeybinds;
exports.effectiveKeybinds = effectiveKeybinds;
exports.setListKeybindsForTest = setListKeybindsForTest;
exports.parseActionDocs = parseActionDocs;
exports.toTrigger = toTrigger;
exports.parseTrigger = parseTrigger;
exports.fromTrigger = fromTrigger;
exports.freedTriggers = freedTriggers;
exports.keybindsFileContents = keybindsFileContents;
exports.withInclude = withInclude;
exports.withoutInclude = withoutInclude;
exports.writeFreed = writeFreed;
exports.removeFreed = removeFreed;
exports.withEmits = withEmits;
exports.emitSequence = emitSequence;
exports.allConflicts = allConflicts;
exports.reloadGhostty = reloadGhostty;
const holds_1 = require("../holds");
const node_child_process_1 = require("node:child_process");
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const profile_1 = require("../../profile");
const store_1 = require("../store");
const vscode_keymap_1 = require("../vscode-keymap");
const words_1 = require("../words");
function isGhostty(env = process.env) {
    return env.TERM_PROGRAM === "ghostty" || !!env.GHOSTTY_RESOURCES_DIR;
}
function ghosttyBinary() {
    try {
        const found = (0, node_child_process_1.execFileSync)("which", ["ghostty"], { encoding: "utf8" }).trim();
        return found || null;
    }
    catch {
        return null;
    }
}
function candidateConfigDirs() {
    const configHome = process.env.XDG_CONFIG_HOME && node_path_1.default.isAbsolute(process.env.XDG_CONFIG_HOME)
        ? process.env.XDG_CONFIG_HOME
        : node_path_1.default.join(node_os_1.default.homedir(), ".config");
    return [
        node_path_1.default.join(configHome, "ghostty"),
        node_path_1.default.join(node_os_1.default.homedir(), "Library", "Application Support", "com.mitchellh.ghostty"),
    ];
}
function ghosttyConfigDir() {
    for (const dir of candidateConfigDirs()) {
        if (node_fs_1.default.existsSync(node_path_1.default.join(dir, "config")))
            return dir;
    }
    return candidateConfigDirs()[process.platform === "darwin" ? 1 : 0];
}
function parseKeybinds(output) {
    // okay 
    const table = new Map();
    for (const line of output.split("\n")) {
        const match = /^keybind\s*=\s*(.+?)=(.+)$/.exec(line.trim());
        if (!match)
            continue;
        table.set(match[1].trim(), match[2].trim());
    }
    return table;
}
function effectiveKeybinds(binary) {
    const output = (0, node_child_process_1.execFileSync)(binary, ["+list-keybinds"], { encoding: "utf8" });
    return parseKeybinds(output);
}
let effectiveCache = null;
let listKeybindsSource = null;
function setListKeybindsForTest(source) {
    listKeybindsSource = source;
    effectiveCache = null;
    scanCache = null;
}
function effective() {
    effectiveCache ??= listKeybindsSource
        ? parseKeybinds(listKeybindsSource())
        : effectiveKeybinds(ghosttyBinary());
    return effectiveCache;
}
function parseActionDocs(output) {
    const docs = new Map();
    let action = null;
    let lines = [];
    const flush = () => {
        if (!action || lines.length === 0)
            return;
        const text = lines.join(" ");
        const sentence = /^(.+?)\.(?:\s|$)/.exec(text)?.[1] ?? text;
        docs.set(action, sentence);
    };
    for (const line of output.split("\n")) {
        const head = /^([a-z0-9_]+):\s*$/.exec(line);
        if (head) {
            flush();
            action = head[1];
            lines = [];
            continue;
        }
        if (action && /^\s+\S/.test(line))
            lines.push(line.trim());
    }
    flush();
    return docs;
}
let docsCache = null;
function actionDocs() {
    if (docsCache)
        return docsCache;
    try {
        docsCache = parseActionDocs((0, node_child_process_1.execFileSync)(ghosttyBinary(), ["+list-actions", "--docs"], { encoding: "utf8" }));
    }
    catch {
        docsCache = new Map();
    }
    return docsCache;
}
/** Editor chord syntax to ghostty trigger syntax: cmd is super, arrows,
 * paging and the backtick are spelled out, everything else matches. This must
 * invert every spelling fromTrigger produces, or a move targeting such a
 * chord writes a key name ghostty cannot parse and silently never lands. */
function toTrigger(chord) {
    return chord
        .split("+")
        .map((part) => {
        if (part === "cmd")
            return "super";
        if (["left", "right", "up", "down"].includes(part))
            return `arrow_${part}`;
        if (part === "pageup")
            return "page_up";
        if (part === "pagedown")
            return "page_down";
        if (part === "`")
            return "grave_accent";
        return part;
    })
        .join("+");
}
/** Ghostty key names that the editor spells differently. Media keys (copy,
 * paste) have no editor chord at all and map to null. */
const TRIGGER_KEYS = {
    arrow_left: "left",
    arrow_right: "right",
    arrow_up: "up",
    arrow_down: "down",
    page_up: "pageup",
    page_down: "pagedown",
    grave_accent: "`",
    copy: null,
    paste: null,
};
function parseTrigger(raw) {
    let trigger = raw.trim();
    let passesThrough = false;
    for (;;) {
        const found = /^(global|all|unconsumed|performable|physical):/.exec(trigger);
        if (!found)
            break;
        if (found[1] === "unconsumed" || found[1] === "performable")
            passesThrough = true;
        trigger = trigger.slice(found[0].length);
    }
    return { trigger, passesThrough };
}
function fromTrigger(trigger) {
    const parts = trigger.split("+").map((part) => {
        if (part === "super")
            return "cmd";
        if (/^digit_(\d)$/.test(part))
            return part.slice("digit_".length);
        if (part in TRIGGER_KEYS)
            return TRIGGER_KEYS[part];
        return part;
    });
    if (parts.some((part) => part === null))
        return null;
    return (0, vscode_keymap_1.canonicalChord)(parts.join("+"));
}
const HEADER = "# written by tode --shortcut-setup — frees the chords the editor needs from ghostty\n";
exports.INCLUDE_LINE = "config-file = ?tode/keybinds.ghostty";
const KEYBINDS_FILE = ["tode", "keybinds.ghostty"];
function freedTriggers(configDir) {
    try {
        const contents = node_fs_1.default.readFileSync(node_path_1.default.join(configDir, ...KEYBINDS_FILE), "utf8");
        return new Set([...parseKeybinds(contents).entries()]
            .filter(([, action]) => action === "unbind" || /^(esc:|csi:|text:)/.test(action))
            .map(([trigger]) => trigger));
    }
    catch {
        return new Set();
    }
}
function keybindsFileContents(moves) {
    const lines = moves.flatMap((move) => [
        `keybind = ${move.trigger}=${move.emit ?? "unbind"}`,
        ...(move.to && move.action ? [`keybind = ${toTrigger(move.to)}=${move.action}`] : []),
    ]);
    return `${HEADER}${lines.join("\n")}\n`;
}
function withInclude(config) {
    if (config.split("\n").some((line) => line.trim() === exports.INCLUDE_LINE))
        return config;
    const separated = config.length > 0 && !config.endsWith("\n") ? `${config}\n` : config;
    return `${separated}${exports.INCLUDE_LINE}\n`;
}
function withoutInclude(config) {
    return config
        .split("\n")
        .filter((line) => line.trim() !== exports.INCLUDE_LINE)
        .join("\n");
}
function writeFreed(configDir, moves) {
    const keybindsFile = node_path_1.default.join(configDir, ...KEYBINDS_FILE);
    const configFile = node_path_1.default.join(configDir, "config");
    if (moves.length === 0) {
        removeFreed(configDir);
        return keybindsFile;
    }
    node_fs_1.default.mkdirSync(node_path_1.default.dirname(keybindsFile), { recursive: true });
    node_fs_1.default.writeFileSync(keybindsFile, keybindsFileContents(moves));
    let config = "";
    try {
        config = node_fs_1.default.readFileSync(configFile, "utf8");
    }
    catch { }
    node_fs_1.default.mkdirSync(configDir, { recursive: true });
    node_fs_1.default.writeFileSync(configFile, withInclude(config));
    return keybindsFile;
}
function removeFreed(configDir) {
    const keybindsFile = node_path_1.default.join(configDir, ...KEYBINDS_FILE);
    const configFile = node_path_1.default.join(configDir, "config");
    let changed = false;
    if (node_fs_1.default.existsSync(keybindsFile)) {
        node_fs_1.default.rmSync(keybindsFile, { force: true });
        changed = true;
    }
    try {
        const config = node_fs_1.default.readFileSync(configFile, "utf8");
        const stripped = withoutInclude(config);
        if (stripped !== config) {
            node_fs_1.default.writeFileSync(configFile, stripped);
            changed = true;
        }
    }
    catch { }
    return changed;
}
// sus read into
const HARMLESS_ACTION = /^(unbind$|ignore$|text:|csi:|esc:|copy_to_clipboard|paste_from_clipboard|paste_from_selection|adjust_selection|scroll_to_selection|search_selection|end_search|navigate_search|jump_to_prompt|scroll_to_prompt)/;
// sus readinot
const MACOS_APP_LEVEL_ACTION = /^(next_tab|previous_tab)\b/;
function withEmits(moves) {
    if (process.platform !== "darwin")
        return moves;
    return moves.map((move) => {
        if (move.emit || !move.action || !MACOS_APP_LEVEL_ACTION.test(move.action))
            return move;
        const chord = fromTrigger(move.trigger);
        const emit = chord ? emitSequence(chord) : null;
        return emit ? { ...move, emit } : move;
    });
}
function emitSequence(chord) {
    const parts = chord.split("+");
    const key = parts.pop();
    const codepoint = key === "tab" ? 9 : key === "enter" ? 13 : key === "escape" ? 27 : key === "space" ? 32
        : key.length === 1 ? key.charCodeAt(0) : null;
    if (codepoint === null)
        return null;
    const mods = 1 +
        (parts.includes("shift") ? 1 : 0) +
        (parts.includes("alt") ? 2 : 0) +
        (parts.includes("ctrl") ? 4 : 0) +
        (parts.includes("cmd") ? 8 : 0);
    return `esc:[27;${mods};${codepoint}~`;
}
function decidedAction(chord) {
    const choices = (0, store_1.loadDecisions)()?.choices ?? {};
    const direct = choices[chord]?.action;
    if (direct)
        return direct;
    for (const [id, decision] of Object.entries(choices)) {
        const owns = id === `claim:${chord}` || id.startsWith(`claim:${chord}:`);
        if (owns && decision.owner === "terminal" && decision.action) {
            return decision.action;
        }
    }
    return null;
}
function allConflicts(effective, freed, holds = (0, holds_1.makeEditorHolds)(), past = decidedAction, docs = actionDocs()) {
    const seen = new Set();
    const conflicts = [];
    const consider = (raw, action) => {
        const { trigger, passesThrough } = parseTrigger(raw);
        if (passesThrough)
            return;
        if (action !== null && HARMLESS_ACTION.test(action))
            return;
        const chord = fromTrigger(trigger);
        if (!chord || seen.has(chord))
            return;
        if (process.platform === "darwin" &&
            action !== null &&
            MACOS_APP_LEVEL_ACTION.test(action) &&
            !emitSequence(chord)) {
            return;
        }
        const held = holds(chord);
        if (held.length === 0)
            return;
        const [primary, ...others] = held;
        seen.add(chord);
        const ran = action ?? past(chord);
        // slop copy
        const doing = ran ? (0, words_1.words)(ran) : "what it ran before";
        const described = ran ? (docs.get(ran.split(":")[0]) ?? doing) : doing;
        conflicts.push({
            editorId: chord,
            trigger,
            current: ran,
            editor: {
                means: primary.describes ?? (0, words_1.words)(primary.command),
                command: primary.command,
                guard: primary.guard,
            },
            others,
            short: described,
            inTerminal: `runs ${doing} in Ghostty, so ${primary.describes ?? (0, words_1.words)(primary.command)} never reaches the editor`,
            freed: `${doing} goes`,
            tradeoff: `Ghostty's ${doing} stops working`,
        });
    };
    for (const [raw, action] of effective) {
        const { trigger } = parseTrigger(raw);
        consider(raw, freed.has(trigger) ? null : action);
    }
    for (const raw of freed) {
        if (!effective.has(raw))
            consider(raw, null);
    }
    return conflicts;
}
function processInfo(pid) {
    try {
        const out = (0, node_child_process_1.execFileSync)("ps", ["-o", "ppid=,comm=", "-p", String(pid)], {
            encoding: "utf8",
        }).trim();
        const match = /^(\d+)\s+(.*)$/.exec(out);
        if (!match)
            return null;
        return { ppid: Number(match[1]), command: match[2] };
    }
    catch {
        return null;
    }
}
function reloadGhostty(info = processInfo, signal = (pid) => process.kill(pid, "SIGUSR2")) {
    let pid = process.pid;
    for (let hop = 0; hop < 16; hop++) {
        const me = info(pid);
        if (!me || me.ppid <= 1)
            return false;
        const parent = info(me.ppid);
        if (!parent)
            return false;
        const basename = parent.command.split("/").pop() ?? parent.command;
        if (basename.toLowerCase() === "ghostty") {
            try {
                signal(me.ppid);
                return true;
            }
            catch {
                return false;
            }
        }
        pid = me.ppid;
    }
    return false;
}
let scanCache = null;
exports.ghosttyProvider = {
    id: "ghostty",
    name: "Ghostty",
    detect: isGhostty,
    ready() {
        return ghosttyBinary() ? null : "the ghostty cli is not on PATH, so its keybinds cannot be read";
    },
    scan() {
        const stamp = (0, profile_1.holdsStamp)();
        if (scanCache?.stamp !== stamp) {
            scanCache = { stamp, conflicts: allConflicts(effective(), freedTriggers(ghosttyConfigDir())) };
        }
        return scanCache.conflicts;
    },
    takenAs(chord) {
        for (const [raw, action] of effective()) {
            const { trigger, passesThrough } = parseTrigger(raw);
            if (passesThrough)
                continue;
            if (action === "unbind" || action === "ignore" || HARMLESS_ACTION.test(action))
                continue;
            if (fromTrigger(trigger) === chord)
                return action;
        }
        return null;
    },
    trigger: toTrigger,
    describe(action) {
        return actionDocs().get(action.split(":")[0]) ?? (0, words_1.words)(action);
    },
    apply(moves) {
        effectiveCache = null;
        scanCache = null;
        return writeFreed(ghosttyConfigDir(), withEmits(moves));
    },
    onApplied() {
        return reloadGhostty();
    },
    undo() {
        effectiveCache = null;
        scanCache = null;
        return removeFreed(ghosttyConfigDir());
    },
    // porque?
    reloadHint() {
        const chord = process.platform === "darwin" ? "cmd+shift+," : "ctrl+shift+,";
        return `reload ghostty (${chord}) or restart it for this to take effect`;
    },
};
