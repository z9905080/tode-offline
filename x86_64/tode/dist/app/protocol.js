"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DAEMON_DIR = void 0;
exports.installVersion = installVersion;
exports.daemonSocket = daemonSocket;
exports.daemonPidFile = daemonPidFile;
exports.buildStamp = buildStamp;
exports.browserProfileDir = browserProfileDir;
exports.lines = lines;
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const paths_1 = require("../runtime/paths");
exports.DAEMON_DIR = node_path_1.default.join(paths_1.STATE_DIR, "daemon");
function installVersion() {
    try {
        return node_fs_1.default.readFileSync(node_path_1.default.join(paths_1.INSTALL_ROOT, "VERSION"), "utf8").trim() || "dev";
    }
    catch {
        return "dev";
    }
}
function daemonSocket() {
    return node_path_1.default.join(exports.DAEMON_DIR, `${installVersion()}.sock`);
}
function daemonPidFile() {
    return node_path_1.default.join(exports.DAEMON_DIR, `${installVersion()}.pid`);
}
function buildStamp(entry) {
    try {
        return String(Math.floor(node_fs_1.default.statSync(entry).mtimeMs));
    }
    catch {
        return "unknown";
    }
}
function browserProfileDir() {
    const key = node_crypto_1.default.createHash("sha1").update(paths_1.INSTALL_ROOT).digest("hex").slice(0, 8);
    return node_path_1.default.join(paths_1.DATA_DIR, "browser", key);
}
function lines(onLine) {
    let buffer = "";
    return (chunk) => {
        buffer += chunk.toString();
        let newline = buffer.indexOf("\n");
        while (newline !== -1) {
            onLine(buffer.slice(0, newline));
            buffer = buffer.slice(newline + 1);
            newline = buffer.indexOf("\n");
        }
    };
}
