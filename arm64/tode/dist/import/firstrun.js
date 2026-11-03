"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importFirstRunStage = importFirstRunStage;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const appicon_1 = require("./appicon");
const command_1 = require("./command");
const editors_1 = require("./editors");
const run_1 = require("./run");
const web_1 = require("./web");
const profile_1 = require("../profile");
const paths_1 = require("../runtime/paths");
const INTRO_MARKER = node_path_1.default.join(paths_1.DATA_DIR, "import-intro");
function markShown() {
    try {
        node_fs_1.default.mkdirSync(paths_1.DATA_DIR, { recursive: true });
        node_fs_1.default.writeFileSync(INTRO_MARKER, `${new Date().toISOString()}\n`);
    }
    catch { }
}
async function importFirstRunStage(next, knownPalette) {
    if (node_fs_1.default.existsSync(INTRO_MARKER))
        return null;
    if (!process.stdin.isTTY || !process.stdout.isTTY)
        return null;
    const editors = (0, editors_1.findEditors)().filter((editor) => (0, editors_1.summarise)((0, editors_1.describe)(editor)) !== "nothing to import");
    if (editors.length === 0) {
        markShown();
        return null;
    }
    const palette = knownPalette ?? (await (0, profile_1.readPalette)()).palette;
    const page = await (0, web_1.startImportPage)({
        palette,
        editors: editors.map((editor) => ({ name: editor.name, iconPng: (0, appicon_1.editorIconPng)(editor.name) })),
        run(name) {
            const editor = editors.find((candidate) => candidate.name === name);
            return (0, command_1.reportRows)((0, run_1.runImport)(editor, () => { }));
        },
        next,
    });
    return {
        url: `http://127.0.0.1:${page.port}`,
        done: page.done,
        served: page.served,
        close: page.close,
        shown: markShown,
    };
}
