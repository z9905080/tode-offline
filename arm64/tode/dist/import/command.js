"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importCommand = importCommand;
exports.reportRows = reportRows;
const appicon_1 = require("./appicon");
const editors_1 = require("./editors");
const run_1 = require("./run");
const select_1 = require("../terminal/select");
const bold = (text) => `\x1b[1m${text}\x1b[0m`;
const dim = (text) => `\x1b[2m${text}\x1b[0m`;
const green = (text) => `\x1b[32m${text}\x1b[0m`;
const yellow = (text) => `\x1b[33m${text}\x1b[0m`;
/** One row per editor, most recently used first (findEditors already sorts) —
 * the name is the decision, so the name is all a row says. */
async function choose(editors) {
    const picked = await (0, select_1.select)("Import from which editor?", editors.map((editor) => ({ label: editor.name, iconPng: (0, appicon_1.editorIconPng)(editor.name) })));
    return picked === null ? null : editors[picked];
}
async function importCommand(args) {
    const editors = (0, editors_1.findEditors)();
    if (editors.length === 0) {
        process.stdout.write("no vscode-family editors found on this machine\n");
        return 0;
    }
    const wanted = args.find((arg) => !arg.startsWith("-"));
    let editor;
    if (wanted) {
        editor =
            editors.find((candidate) => candidate.name.toLowerCase() === wanted.toLowerCase()) ?? null;
        if (!editor) {
            process.stderr.write(`tode: no editor called ${wanted}. Found: ${editors.map((e) => e.name).join(", ")}\n`);
            return 1;
        }
    }
    else if (process.stdin.isTTY) {
        editor = await choose(editors);
    }
    else {
        process.stdout.write(`${editors.map((e) => `  ${e.name}  ${dim((0, editors_1.summarise)((0, editors_1.describe)(e)))}`).join("\n")}\n`);
        process.stdout.write("\nrun tode import <name>, or run this command inside a terminal\n");
        return 0;
    }
    if (!editor) {
        process.stdout.write("cancelled\n");
        return 0;
    }
    const contents = (0, editors_1.describe)(editor);
    process.stdout.write(`\nimporting from ${bold(editor.name)}\n`);
    let lastLine = 0;
    const report = (0, run_1.runImport)(editor, (done, total, id) => {
        if (!process.stdout.isTTY)
            return;
        const now = Date.now();
        if (done !== total && now - lastLine < 40)
            return;
        lastLine = now;
        process.stdout.write(`\r  extensions ${done}/${total} ${id.slice(0, 40).padEnd(42)}`);
    });
    if (process.stdout.isTTY && contents.extensions)
        process.stdout.write("\r".padEnd(60) + "\r");
    for (const row of reportRows(report)) {
        const mark = row.kind === "warn" ? yellow("!") : green("✓");
        process.stdout.write(`  ${mark} ${row.label.padEnd(13)} ${row.value}\n`);
    }
    return 0;
}
function reportRows(report) {
    const rows = [];
    if (report.extensions.copied.length) {
        rows.push({ kind: "ok", label: "extensions", value: `${report.extensions.copied.length} copied` });
    }
    for (const { id, why } of report.extensions.skipped) {
        rows.push({ kind: "warn", label: "skipped", value: `${id} — ${why}` });
    }
    if (report.settings) {
        rows.push({ kind: "ok", label: "settings", value: `${report.settings.imported} entries` });
    }
    if (report.keybindings) {
        rows.push({ kind: "ok", label: "keybindings", value: `${report.keybindings} entries` });
    }
    if (report.snippets.length) {
        rows.push({ kind: "ok", label: "snippets", value: report.snippets.join(", ") });
    }
    if (report.tasks)
        rows.push({ kind: "ok", label: "tasks", value: "tasks.json" });
    return rows;
}
