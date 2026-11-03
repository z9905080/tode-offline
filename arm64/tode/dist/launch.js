"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pane = void 0;
exports.registerSelf = registerSelf;
exports.launchBrowser = launchBrowser;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const terminal_1 = require("@zenbu-labs/pixel/terminal");
const control_1 = require("./app/control");
const protocol_1 = require("./app/protocol");
const server_1 = require("./codeserver/server");
const launcher_1 = require("./runtime/launcher");
const APP_NAME = "terminal-code";
const APP_ID = "terminal-code";
function windowCommand(url, options) {
    const command = [process.execPath, node_path_1.default.resolve(__dirname, "main.js"), "--window", url];
    if (options.proxy)
        command.push(`--proxy=${options.proxy}`);
    if (options.partition)
        command.push(`--partition=${options.partition}`);
    return command;
}
function spawnDaemon() {
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("PIXEL_") && key !== "ELECTRON_RUN_AS_NODE"));
    node_fs_1.default.mkdirSync(protocol_1.DAEMON_DIR, { recursive: true });
    const log = node_fs_1.default.openSync(node_path_1.default.join(protocol_1.DAEMON_DIR, "daemon.log"), "a");
    const child = (0, node_child_process_1.spawn)((0, launcher_1.electronBinary)(), [(0, launcher_1.bootstrapEntry)(), (0, launcher_1.daemonEntry)()], {
        detached: true,
        stdio: ["ignore", "ignore", log],
        env,
    });
    child.on("error", () => { });
    child.unref();
}
// Started by a program embedding tode in its own screen, or from inside
// another pixel app's pane: the window joins that host, so nothing here may
// probe or split the terminal.
function hosted(tty) {
    return Boolean(process.env.PIXEL_EMBED) || (0, terminal_1.findOwner)(tty) !== null;
}
function windowTty() {
    return process.env.PIXEL_TTY ?? (0, terminal_1.callerTty)().path;
}
const OPEN_TIMEOUT_MS = 20_000;
async function daemonConnection() {
    try {
        return await (0, control_1.connectDaemon)((0, protocol_1.daemonSocket)());
    }
    catch { }
    spawnDaemon();
    const deadline = Date.now() + OPEN_TIMEOUT_MS;
    while (Date.now() < deadline) {
        try {
            return await (0, control_1.connectDaemon)((0, protocol_1.daemonSocket)());
        }
        catch {
            await (0, control_1.sleep)(100);
        }
    }
    throw new Error("the tode window process did not start");
}
function stale(reply) {
    return "ok" in reply && !reply.ok && reply.error === "stale";
}
async function daemonGone(within) {
    const deadline = Date.now() + within;
    while (Date.now() < deadline) {
        try {
            (await (0, control_1.connectDaemon)((0, protocol_1.daemonSocket)())).destroy();
        }
        catch {
            return;
        }
        await (0, control_1.sleep)(100);
    }
}
async function openSession(request) {
    const build = (0, protocol_1.buildStamp)((0, launcher_1.daemonEntry)());
    let socket = await daemonConnection();
    let reply = await (0, control_1.ask)(socket, { ...request, build }, OPEN_TIMEOUT_MS);
    if (stale(reply)) {
        socket.destroy();
        await daemonGone(5000);
        socket = await daemonConnection();
        reply = await (0, control_1.ask)(socket, { ...request, build }, OPEN_TIMEOUT_MS);
    }
    return { socket, reply };
}
function attachWindow(url, options) {
    let send = (_request) => { };
    let closeRequested = false;
    const exited = (async () => {
        const tty = windowTty();
        if (!tty) {
            process.stderr.write("tode needs a terminal to draw on\n");
            return 1;
        }
        if (!hosted(tty)) {
            const check = await (0, terminal_1.checkTerminal)((0, terminal_1.detect)());
            if (check.graphics === "unsupported") {
                process.stderr.write((0, terminal_1.unsupportedGraphicsMessage)(process.stderr.isTTY === true));
                return 1;
            }
        }
        let session;
        try {
            session = await openSession({
                cmd: "open",
                tty,
                url,
                env: process.env,
                proxy: options.proxy,
                partition: options.partition,
                timingFile: `${server_1.CSS_FILE}.timing.json`,
            });
        }
        catch (error) {
            process.stderr.write(`could not open the tode window: ${error.message}\n`);
            return 1;
        }
        const { socket, reply } = session;
        send = (request) => {
            try {
                socket.write(`${JSON.stringify(request)}\n`);
            }
            catch { }
        };
        if ("ok" in reply && !reply.ok) {
            process.stderr.write(`could not open the tode window: ${reply.error}\n`);
            socket.destroy();
            return 1;
        }
        if (closeRequested) {
            send({ cmd: "close" });
            socket.end();
            return 0;
        }
        return new Promise((resolve) => {
            (0, control_1.linesOf)(socket).on("line", (event) => {
                if ("event" in event && event.event === "closed")
                    resolve(event.code);
            });
            socket.on("close", () => resolve(0));
            socket.on("error", () => resolve(1));
            process.on("SIGWINCH", () => send({ cmd: "resize" }));
            // The pane is going away either way; a window process that never
            // confirms the close must not keep this shell waiting.
            for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
                process.on(signal, () => {
                    send({ cmd: "close" });
                    setTimeout(() => resolve(130), 3000).unref();
                });
            }
        });
    })();
    return {
        exited,
        close() {
            closeRequested = true;
            send({ cmd: "close" });
        },
    };
}
function registerSelf() {
    const bin = node_path_1.default.join(process.env.XDG_BIN_HOME ?? node_path_1.default.join(node_os_1.default.homedir(), ".local", "bin"), "tode");
    if (!node_fs_1.default.existsSync(bin))
        return;
    const override = process.env.TERMINAL_BROWSER_INTEROP_DIR;
    const root = override && node_path_1.default.isAbsolute(override)
        ? override
        : node_path_1.default.join(node_os_1.default.homedir(), ".local", "share", "terminal-browser-interop");
    const record = {
        version: 1,
        id: APP_ID,
        name: APP_NAME,
        bin,
        args: ["."],
        registeredAt: Date.now(),
    };
    try {
        node_fs_1.default.mkdirSync(node_path_1.default.join(root, "apps"), { recursive: true });
        node_fs_1.default.writeFileSync(node_path_1.default.join(root, "apps", `${APP_ID}.json`), `${JSON.stringify(record, null, 2)}\n`);
    }
    catch { }
}
class Pane {
    options;
    exit = null;
    closeWindow = null;
    constructor(options = {}) {
        this.options = options;
    }
    close() {
        this.closeWindow?.();
    }
    owned() {
        return this.exit !== null;
    }
    open(url) {
        if (this.exit)
            return;
        try {
            node_fs_1.default.writeFileSync(`${server_1.CSS_FILE}.launch.json`, JSON.stringify({ spawnedAt: Date.now(), stages: this.options.stages ?? [] }));
        }
        catch { }
        this.exit = this.options.split ? this.openSplit(url, this.options.split) : this.openHere(url);
    }
    exited() {
        return this.exit ?? new Promise(() => { });
    }
    openHere(url) {
        const window = attachWindow(url, this.options);
        this.closeWindow = () => window.close();
        return window.exited;
    }
    async openSplit(url, direction) {
        const tty = windowTty();
        if (tty && hosted(tty)) {
            process.stderr.write("--split is not available inside another program's pane\n");
            return 1;
        }
        const terminal = (0, terminal_1.detect)();
        if (!(0, terminal_1.canSplit)(terminal)) {
            process.stderr.write(`${(0, terminal_1.cannotOpenPanes)(terminal)}\n`);
            return 1;
        }
        const from = await terminal.getCurrentPane?.({ tty, cwd: process.cwd() });
        if (!from) {
            process.stderr.write(`could not work out which ${terminal.name} pane this is\n`);
            return 1;
        }
        const size = Number(this.options.size);
        await terminal.split({
            from,
            direction: direction,
            command: windowCommand(url, this.options),
            size: Number.isFinite(size) && size > 0 ? size : null,
            tty,
        });
        return 0;
    }
}
exports.Pane = Pane;
function launchBrowser(url, _palette, options = {}) {
    const pane = new Pane(options);
    pane.open(url);
    return pane.exited();
}
