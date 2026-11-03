"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runningWindow = runningWindow;
exports.sendToExtension = sendToExtension;
exports.parseGoto = parseGoto;
exports.windowSockets = windowSockets;
exports.ipcSocketDir = ipcSocketDir;
const node_fs_1 = __importDefault(require("node:fs"));
const node_net_1 = __importDefault(require("node:net"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
function runningWindow() {
    const socket = process.env.TODE_IPC;
    if (!socket)
        return null;
    try {
        return node_fs_1.default.statSync(socket).isSocket() ? socket : null;
    }
    catch {
        return null;
    }
}
function sendToExtension(socket, request, timeoutMs = 4000) {
    return new Promise((resolve, reject) => {
        const connection = node_net_1.default.connect(socket);
        const timer = timeoutMs
            ? setTimeout(() => {
                connection.destroy();
                reject(new Error("the tode window did not answer"));
            }, timeoutMs)
            : null;
        let buffer = "";
        const settle = (error) => {
            if (timer)
                clearTimeout(timer);
            connection.destroy();
            if (error)
                reject(error);
            else
                resolve();
        };
        connection.on("connect", () => connection.write(`${JSON.stringify(request)}\n`));
        connection.on("data", (chunk) => {
            buffer += chunk.toString("utf8");
            if (!buffer.includes("\n"))
                return;
            try {
                const reply = JSON.parse(buffer.split("\n")[0]);
                settle(reply.ok ? null : new Error(reply.error ?? "the window refused"));
            }
            catch {
                settle(new Error("the window sent something unreadable"));
            }
        });
        connection.on("error", (error) => settle(error));
    });
}
function parseGoto(argument) {
    if (node_fs_1.default.existsSync(argument))
        return { path: argument };
    const match = /^(.*?):(\d+)(?::(\d+))?$/.exec(argument);
    if (!match)
        return { path: argument };
    return {
        path: match[1],
        line: Number(match[2]),
        column: match[3] ? Number(match[3]) : 1,
    };
}
function windowSockets() {
    try {
        return node_fs_1.default
            .readdirSync(ipcSocketDir())
            .filter((name) => name.endsWith(".sock"))
            .map((name) => node_path_1.default.join(ipcSocketDir(), name));
    }
    catch {
        return [];
    }
}
function ipcSocketDir() {
    const stateHome = process.env.XDG_STATE_HOME && node_path_1.default.isAbsolute(process.env.XDG_STATE_HOME)
        ? process.env.XDG_STATE_HOME
        : node_path_1.default.join(node_os_1.default.homedir(), ".local", "state");
    return node_path_1.default.join(stateHome, "tode", "ipc");
}
