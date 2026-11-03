"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = void 0;
exports.connectDaemon = connectDaemon;
exports.linesOf = linesOf;
exports.ask = ask;
exports.alive = alive;
exports.kill = kill;
exports.openWindows = openWindows;
exports.shutdownDaemons = shutdownDaemons;
const node_child_process_1 = require("node:child_process");
const node_events_1 = require("node:events");
const node_fs_1 = __importDefault(require("node:fs"));
const node_net_1 = __importDefault(require("node:net"));
const node_path_1 = __importDefault(require("node:path"));
const paths_1 = require("../runtime/paths");
const protocol_1 = require("./protocol");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
exports.sleep = sleep;
function connectDaemon(socketPath) {
    return new Promise((resolve, reject) => {
        const socket = node_net_1.default.connect(socketPath);
        socket.once("connect", () => resolve(socket));
        socket.once("error", reject);
    });
}
const parsers = new WeakMap();
function linesOf(socket) {
    let emitter = parsers.get(socket);
    if (!emitter) {
        const target = new node_events_1.EventEmitter();
        socket.on("data", (0, protocol_1.lines)((line) => {
            let reply;
            try {
                reply = JSON.parse(line);
            }
            catch {
                return;
            }
            target.emit("line", reply);
        }));
        parsers.set(socket, target);
        emitter = target;
    }
    return emitter;
}
function ask(socket, request, timeoutMs) {
    return new Promise((resolve, reject) => {
        const emitter = linesOf(socket);
        const settle = (outcome) => {
            clearTimeout(timer);
            emitter.off("line", onLine);
            socket.off("close", onClose);
            outcome();
        };
        const onLine = (reply) => settle(() => resolve(reply));
        const onClose = () => settle(() => reject(new Error("the tode window process closed the connection")));
        const timer = setTimeout(() => settle(() => reject(new Error("the tode window process did not answer"))), timeoutMs);
        emitter.once("line", onLine);
        socket.once("close", onClose);
        socket.write(`${JSON.stringify(request)}\n`);
    });
}
function alive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    }
    catch {
        return false;
    }
}
async function gone(pid, within) {
    const deadline = Date.now() + within;
    while (Date.now() < deadline) {
        if (!alive(pid))
            return true;
        await (0, exports.sleep)(100);
    }
    return !alive(pid);
}
async function kill(pid) {
    try {
        process.kill(pid, "SIGTERM");
    }
    catch {
        return;
    }
    if (await gone(pid, 2000))
        return;
    try {
        process.kill(pid, "SIGKILL");
    }
    catch { }
    await gone(pid, 1000);
}
const DAEMON_ENTRY = node_path_1.default.join(paths_1.INSTALL_ROOT, "dist", "app", "daemon.js");
function isOurDaemon(command) {
    return command.includes("@zenbu-labs/pixel/dist/bootstrap.js") && command.includes(DAEMON_ENTRY);
}
function processTable() {
    const table = new Map();
    let listing;
    try {
        listing = (0, node_child_process_1.execFileSync)("ps", ["-axo", "pid=,command="], { encoding: "utf8" });
    }
    catch {
        return table;
    }
    for (const line of listing.split("\n")) {
        const match = /^\s*(\d+)\s+(.*)$/.exec(line);
        if (match)
            table.set(Number(match[1]), match[2]);
    }
    return table;
}
function daemons(table) {
    let names;
    try {
        names = node_fs_1.default.readdirSync(protocol_1.DAEMON_DIR);
    }
    catch {
        return [];
    }
    const versions = new Set();
    for (const name of names) {
        if (name.endsWith(".sock"))
            versions.add(name.slice(0, -".sock".length));
        else if (name.endsWith(".pid"))
            versions.add(name.slice(0, -".pid".length));
    }
    return [...versions].map((version) => {
        const pidFile = node_path_1.default.join(protocol_1.DAEMON_DIR, `${version}.pid`);
        let pid = null;
        try {
            const read = Number(node_fs_1.default.readFileSync(pidFile, "utf8").trim());
            if (Number.isInteger(read) && read > 0 && isOurDaemon(table.get(read) ?? ""))
                pid = read;
        }
        catch { }
        return { version, socket: node_path_1.default.join(protocol_1.DAEMON_DIR, `${version}.sock`), pidFile, pid };
    });
}
function forget(daemon) {
    for (const file of [daemon.socket, daemon.pidFile]) {
        try {
            node_fs_1.default.rmSync(file, { force: true });
        }
        catch { }
    }
}
async function openWindows() {
    const found = daemons(processTable());
    const answers = await Promise.all(found.map(async (daemon) => {
        let socket = null;
        try {
            socket = await connectDaemon(daemon.socket);
        }
        catch {
            return undefined;
        }
        try {
            const reply = await ask(socket, { cmd: "status" }, 1500);
            return "ok" in reply && reply.ok ? (reply.windows ?? 0) : null;
        }
        catch {
            return null;
        }
        finally {
            socket.destroy();
        }
    }));
    const windows = { count: 0, unknown: false };
    for (const answer of answers) {
        if (answer === null)
            windows.unknown = true;
        else if (answer !== undefined)
            windows.count += answer;
    }
    return windows;
}
async function stopOne(daemon, result) {
    let socket = null;
    try {
        socket = await connectDaemon(daemon.socket);
    }
    catch { }
    if (!socket) {
        if (daemon.pid !== null) {
            await kill(daemon.pid);
            result.daemons += 1;
            result.killed += 1;
        }
        forget(daemon);
        return;
    }
    let answer;
    try {
        answer = await ask(socket, { cmd: "shutdown" }, 2500);
    }
    catch (error) {
        answer = error.message.includes("closed") ? { ok: true, pid: daemon.pid ?? 0 } : null;
    }
    socket.destroy();
    result.daemons += 1;
    const pid = answer && "ok" in answer && answer.ok && answer.pid ? answer.pid : daemon.pid;
    if (answer && "ok" in answer && answer.ok) {
        result.windows += answer.windows ?? 0;
        if (pid && !(await gone(pid, 2000))) {
            await kill(pid);
            result.killed += 1;
        }
    }
    else if (pid) {
        await kill(pid);
        result.killed += 1;
    }
    forget(daemon);
}
async function shutdownDaemons() {
    const result = { daemons: 0, windows: 0, killed: 0 };
    const table = processTable();
    const known = daemons(table);
    await Promise.all(known.map((daemon) => stopOne(daemon, result)));
    const seen = new Set(known.map((daemon) => daemon.pid));
    const strays = [...table].filter(([pid, command]) => !seen.has(pid) && pid !== process.pid && isOurDaemon(command) && alive(pid));
    await Promise.all(strays.map(async ([pid]) => {
        await kill(pid);
        result.daemons += 1;
        result.killed += 1;
    }));
    return result;
}
