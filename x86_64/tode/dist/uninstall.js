"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uninstallCommand = uninstallCommand;
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const node_readline_1 = __importDefault(require("node:readline"));
const control_1 = require("./app/control");
const server_1 = require("./codeserver/server");
const profile_1 = require("./profile");
const paths_1 = require("./runtime/paths");
const ghostty_1 = require("./shortcuts/backends/ghostty");
function confirm(question) {
    return new Promise((resolve) => {
        const ask = node_readline_1.default.createInterface({ input: process.stdin, output: process.stdout });
        ask.question(question, (answer) => {
            ask.close();
            resolve(/^y(es)?$/i.test(answer.trim()));
        });
    });
}
function removeDir(dir) {
    if (!node_fs_1.default.existsSync(dir))
        return false;
    node_fs_1.default.rmSync(dir, { recursive: true, force: true });
    return true;
}
function removeFont() {
    const target = node_path_1.default.join((0, profile_1.userFontsDir)(), profile_1.FONT_ASSET);
    try {
        const theirs = node_fs_1.default.readFileSync(target);
        const ours = node_fs_1.default.readFileSync((0, profile_1.assetPath)(profile_1.FONT_ASSET));
        if (!theirs.equals(ours))
            return false;
        node_fs_1.default.rmSync(target, { force: true });
        return true;
    }
    catch {
        return false;
    }
}
function removeShim() {
    const binHome = process.env.XDG_BIN_HOME && node_path_1.default.isAbsolute(process.env.XDG_BIN_HOME)
        ? process.env.XDG_BIN_HOME
        : node_path_1.default.join(node_os_1.default.homedir(), ".local", "bin");
    const shim = node_path_1.default.join(binHome, "tode");
    try {
        const contents = node_fs_1.default.readFileSync(shim, "utf8");
        if (!contents.includes("TODE_INSTALL_ROOT"))
            return false;
        node_fs_1.default.rmSync(shim, { force: true });
        return true;
    }
    catch {
        return false;
    }
}
function spinner(label) {
    if (!process.stdout.isTTY)
        return () => { };
    // dont think this actually works
    const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    let at = 0;
    const timer = setInterval(() => {
        process.stdout.write(`\r${frames[at++ % frames.length]} ${label}`);
    }, 80);
    return () => {
        clearInterval(timer);
        process.stdout.write("\r\x1b[K");
    };
}
async function uninstallCommand(args) {
    const yes = args.includes("--yes") || args.includes("-y");
    if (!yes) {
        if (!process.stdin.isTTY) {
            process.stderr.write("pass --yes to uninstall without a prompt\n");
            return 1;
        }
        if (!(await confirm("Uninstall terminal-code? [y/N] ")))
            return 0;
    }
    const stop = spinner("uninstalling");
    await (0, control_1.shutdownDaemons)();
    await (0, server_1.stopServer)();
    if ((0, ghostty_1.removeFreed)((0, ghostty_1.ghosttyConfigDir)()))
        (0, ghostty_1.reloadGhostty)();
    removeFont();
    for (const dir of [paths_1.DATA_DIR, paths_1.STATE_DIR, paths_1.CACHE_DIR])
        removeDir(dir);
    for (const root of new Set([paths_1.INSTALL_ROOT, paths_1.DEFAULT_INSTALL_ROOT])) {
        if (node_fs_1.default.existsSync(node_path_1.default.join(root, "VERSION")))
            removeDir(root);
    }
    removeShim();
    stop();
    process.stdout.write("done\n");
    return 0;
}
