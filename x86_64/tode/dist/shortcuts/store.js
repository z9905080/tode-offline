"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLAIM_DECISION_ID = exports.IMPORT_DECISION_ID = exports.QUIT_COMMAND = exports.QUIT_CHORD = exports.DECISIONS_FILE = void 0;
exports.decisionsStamp = decisionsStamp;
exports.loadDecisions = loadDecisions;
exports.saveDecisions = saveDecisions;
exports.clearDecisions = clearDecisions;
exports.claimBindings = claimBindings;
exports.overrideBindings = overrideBindings;
exports.quitWhen = quitWhen;
exports.hintWhen = hintWhen;
exports.hintBindings = hintBindings;
exports.quitBindings = quitBindings;
exports.fallbackBindings = fallbackBindings;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const paths_1 = require("../runtime/paths");
exports.DECISIONS_FILE = node_path_1.default.join(paths_1.DATA_DIR, "shortcuts.json");
/** The decision file's mtime, for cache keys that must react to an apply. */
function decisionsStamp() {
    try {
        return node_fs_1.default.statSync(exports.DECISIONS_FILE).mtimeMs;
    }
    catch {
        return 0;
    }
}
function loadDecisions() {
    try {
        const parsed = JSON.parse(node_fs_1.default.readFileSync(exports.DECISIONS_FILE, "utf8"));
        return parsed && parsed.version === 1 && parsed.choices ? parsed : null;
    }
    catch {
        return null;
    }
}
function saveDecisions(decisions) {
    node_fs_1.default.mkdirSync(paths_1.DATA_DIR, { recursive: true });
    node_fs_1.default.writeFileSync(exports.DECISIONS_FILE, `${JSON.stringify(decisions, null, 2)}\n`);
}
function clearDecisions() {
    node_fs_1.default.rmSync(exports.DECISIONS_FILE, { force: true });
}
exports.QUIT_CHORD = process.platform === "darwin" ? "ctrl+c" : "ctrl+q";
exports.QUIT_COMMAND = "tode.confirmQuit";
exports.IMPORT_DECISION_ID = `import:${exports.QUIT_CHORD}`;
exports.CLAIM_DECISION_ID = `claim:${exports.QUIT_CHORD}`;
function claimBindings() {
    const choices = loadDecisions()?.choices ?? {};
    const out = [];
    for (const [id, decision] of Object.entries(choices)) {
        if (!id.startsWith("claim:"))
            continue;
        if (decision.owner === "terminal")
            continue;
        if (decision.choice !== "terminal" || !decision.action)
            continue;
        const rest = id.slice("claim:".length);
        const named = rest.indexOf(":");
        const chord = named === -1 ? rest : rest.slice(0, named);
        out.push({ key: chord, command: `-${decision.action}` });
        if (decision.key)
            out.push({ key: decision.key, command: decision.action, when: decision.guard });
    }
    return out;
}
function overrideBindings() {
    const choices = loadDecisions()?.choices ?? {};
    const out = [];
    for (const [id, decision] of Object.entries(choices)) {
        if (!id.startsWith("import:"))
            continue;
        if (decision.choice !== "editor" || !decision.key)
            continue;
        const command = decision.command ?? (id === exports.IMPORT_DECISION_ID ? exports.QUIT_COMMAND : null);
        if (!command)
            continue;
        out.push({ key: decision.key, command, when: "!terminalFocus" });
    }
    return out;
}
/** Where tode's ctrl+c bindings may fire at all: never in the terminal, never
 * over a selection or an input box. inputFocus is true inside the editor too,
 * so it must not veto editor focus — only genuine input boxes (inputFocus
 * without editorTextFocus). */
const HINT_BASE = "!terminalFocus && !editorHasSelection && (!inputFocus || editorTextFocus)";
function quitWhen() {
    return exports.QUIT_CHORD === "ctrl+c" ? HINT_BASE : "!terminalFocus";
}
/** The guard on the ctrl+c redirect hint, where ctrl+c is not itself quit —
 * uncarved for the same reason quit is. */
function hintWhen() {
    return HINT_BASE;
}
// what is a hint binding? i dont think thats a thing??
function hintBindings() {
    if (exports.QUIT_CHORD === "ctrl+c")
        return [];
    return [{ key: "ctrl+c", command: "tode.quitHint", when: hintWhen() }];
}
function quitBindings() {
    const choices = loadDecisions()?.choices ?? {};
    const decision = choices[exports.IMPORT_DECISION_ID] ?? choices[exports.QUIT_CHORD];
    if (decision?.choice === "editor" || decision?.choice === "keep")
        return [];
    return [{ key: exports.QUIT_CHORD, command: exports.QUIT_COMMAND, when: quitWhen() }];
}
function fallbackBindings() {
    const decisions = loadDecisions();
    if (!decisions)
        return [];
    return Object.entries(decisions.choices).flatMap(([id, decision]) => {
        if (id.startsWith("claim:") || id.startsWith("import:"))
            return [];
        if (decision.choice !== "editor" || !decision.key || !decision.command)
            return [];
        return [{ key: decision.key, command: decision.command, when: "!terminalFocus" }];
    });
}
