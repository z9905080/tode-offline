"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveTarget = resolveTarget;
exports.workbenchUrl = workbenchUrl;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
function resolveTarget(argument, cwd) {
    const requested = node_path_1.default.resolve(cwd, argument ?? ".");
    let stat;
    try {
        stat = node_fs_1.default.statSync(requested);
    }
    catch {
        return { folder: null, file: requested };
    }
    if (stat.isDirectory())
        return { folder: requested, file: null };
    return { folder: null, file: requested };
}
function workbenchUrl(origin, target) {
    const url = new URL(origin);
    if (target.folder)
        url.searchParams.set("folder", target.folder);
    if (target.file) {
        const uri = `vscode-remote://${url.host}${target.file}`;
        url.searchParams.set("payload", JSON.stringify([["openFile", uri]]));
    }
    return url.toString();
}
