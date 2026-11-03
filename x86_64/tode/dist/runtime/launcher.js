"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pixelRoot = pixelRoot;
exports.pixelVersion = pixelVersion;
exports.electronBinary = electronBinary;
exports.bootstrapEntry = bootstrapEntry;
exports.daemonEntry = daemonEntry;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
function pixelRoot() {
    return node_path_1.default.dirname(require.resolve("@zenbu-labs/pixel/package.json"));
}
function pixelVersion() {
    try {
        return JSON.parse(node_fs_1.default.readFileSync(node_path_1.default.join(pixelRoot(), "package.json"), "utf8")).version;
    }
    catch {
        return "unknown";
    }
}
function electronBinary() {
    const dist = node_path_1.default.join(pixelRoot(), "electron", "dist");
    return process.platform === "darwin"
        ? node_path_1.default.join(dist, "Electron.app", "Contents", "MacOS", "pixel")
        : node_path_1.default.join(dist, "pixel");
}
function bootstrapEntry() {
    return node_path_1.default.join(pixelRoot(), "dist", "bootstrap.js");
}
function daemonEntry() {
    return node_path_1.default.resolve(__dirname, "..", "app", "daemon.js");
}
