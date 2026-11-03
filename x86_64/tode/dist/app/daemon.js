"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_net_1 = __importDefault(require("node:net"));
const node_path_1 = __importDefault(require("node:path"));
const electron_1 = require("@zenbu-labs/pixel/electron");
const pixel_1 = require("@zenbu-labs/pixel");
const react_1 = require("react");
const ipc_1 = require("../ipc");
const livesync_1 = require("../livesync");
const profile_1 = require("../profile");
const messages_1 = require("./messages");
const protocol_1 = require("./protocol");
node_fs_1.default.mkdirSync((0, protocol_1.browserProfileDir)(), { recursive: true });
electron_1.app.setPath("userData", (0, protocol_1.browserProfileDir)());
electron_1.app.setPath("sessionData", (0, protocol_1.browserProfileDir)());
const IDLE_EXIT_MS = 15_000;
const SOCKET = (0, protocol_1.daemonSocket)();
const BUILD = (0, protocol_1.buildStamp)(__filename);
const windows = new Map();
let idle = null;
let lastPalette = null;
function scheduleIdleExit() {
    if (idle)
        clearTimeout(idle);
    idle = setTimeout(() => {
        if (windows.size === 0)
            electron_1.app.exit(0);
    }, IDLE_EXIT_MS);
}
electron_1.ipcMain.on(messages_1.MESSAGE_CHANNEL, (event, message) => {
    if (!message)
        return;
    if (message.type === "timing" && message.page) {
        const timingFile = [...windows.values()].find((window) => window.view?.webContents.id === event.sender.id)
            ?.request.timingFile;
        if (timingFile) {
            try {
                node_fs_1.default.writeFileSync(timingFile, JSON.stringify(message.page));
            }
            catch { }
        }
        return;
    }
    if (message.type !== "theme" || !message.colors)
        return;
    const palette = (0, livesync_1.parseRawColors)(JSON.stringify(message.colors));
    if (!palette)
        return;
    lastPalette = palette;
    broadcastTheme(palette);
});
function broadcastTheme(palette) {
    const theme = (0, profile_1.currentTheme)(palette);
    let names;
    try {
        names = node_fs_1.default.readdirSync((0, ipc_1.ipcSocketDir)());
    }
    catch {
        return;
    }
    for (const name of names) {
        if (!name.endsWith(".sock"))
            continue;
        const socket = node_path_1.default.join((0, ipc_1.ipcSocketDir)(), name);
        (0, ipc_1.sendToExtension)(socket, { files: [], folders: [], add: false, theme }).catch((error) => {
            if (error && (error.code === "ECONNREFUSED" || error.code === "ENOENT")) {
                try {
                    node_fs_1.default.rmSync(socket, { force: true });
                }
                catch { }
            }
        });
    }
}
function page(window, url) {
    return (0, react_1.createElement)(pixel_1.WebView, {
        key: window.transparent ? "clear" : "opaque",
        ref: (handle) => {
            window.view = handle;
        },
        src: url,
        style: { width: "100%", height: "100%" },
        preload: node_path_1.default.join(__dirname, "preload.js"),
        proxy: window.request.proxy,
        partition: window.request.partition,
        clipboardRead: true,
        onOpenWindow: "popup",
        onContextMenu: () => { },
        ...(window.transparent ? { browserWindowOptions: { transparent: true, backgroundColor: "#00000000" } } : {}),
    });
}
function applyTransparency(on) {
    const palette = lastPalette ?? (0, profile_1.cachedPalette)();
    if (palette) {
        (0, profile_1.installTheme)(palette, on);
        (0, profile_1.installCss)(palette, on);
        (0, profile_1.setLiveTheme)((0, profile_1.currentTheme)(palette, on));
    }
    for (const [root, window] of windows) {
        if (window.transparent === on)
            continue;
        const url = window.view?.state.url || window.request.url;
        window.transparent = on;
        window.view = null;
        root.render(page(window, url));
    }
}
function openWindow(request, onClosed) {
    const root = (0, pixel_1.createRoot)({
        name: "tode",
        tty: request.tty,
        sessionEnv: request.env,
        onExit(code) {
            if (!windows.delete(root))
                return;
            onClosed(code);
            scheduleIdleExit();
        },
    });
    const window = { view: null, request, transparent: (0, profile_1.transparencyEnabled)() };
    try {
        root.render(page(window, request.url));
        windows.set(root, window);
    }
    catch (error) {
        root.stop(1);
        throw error;
    }
    return root;
}
function serve() {
    node_fs_1.default.mkdirSync(node_path_1.default.dirname(SOCKET), { recursive: true });
    node_fs_1.default.rmSync(SOCKET, { force: true });
    try {
        node_fs_1.default.writeFileSync((0, protocol_1.daemonPidFile)(), String(process.pid));
        process.on("exit", () => {
            try {
                node_fs_1.default.rmSync((0, protocol_1.daemonPidFile)(), { force: true });
            }
            catch { }
        });
    }
    catch { }
    const server = node_net_1.default.createServer((connection) => {
        let root = null;
        const reply = (value) => {
            try {
                connection.write(`${JSON.stringify(value)}\n`);
            }
            catch { }
        };
        connection.on("data", (0, protocol_1.lines)((line) => {
            const request = JSON.parse(line);
            switch (request.cmd) {
                case "open":
                    if (root)
                        return;
                    if (request.build && request.build !== BUILD && windows.size === 0) {
                        reply({ ok: false, error: "stale" });
                        connection.end(() => setTimeout(() => electron_1.app.exit(0), 50));
                        return;
                    }
                    if (idle)
                        clearTimeout(idle);
                    try {
                        root = openWindow(request, (code) => {
                            reply({ event: "closed", code });
                            connection.end();
                        });
                        reply({ ok: true, pid: process.pid });
                    }
                    catch (error) {
                        reply({ ok: false, error: error instanceof Error ? error.message : String(error) });
                        connection.end();
                        scheduleIdleExit();
                    }
                    return;
                case "resize":
                    root?.nudgeResize();
                    return;
                case "close":
                    root?.stop();
                    return;
                case "shutdown":
                    reply({ ok: true, pid: process.pid, windows: windows.size });
                    connection.end();
                    for (const open of windows.keys())
                        open.stop();
                    setTimeout(() => electron_1.app.exit(0), 100);
                    return;
                case "status":
                    reply({ ok: true, pid: process.pid, windows: windows.size });
                    connection.end();
                    return;
                case "transparency":
                    applyTransparency(request.on);
                    reply({ ok: true, pid: process.pid });
                    connection.end();
                    return;
            }
        }));
        connection.on("error", () => { });
        connection.on("close", () => root?.stop());
    });
    server.on("error", (error) => {
        process.stderr.write(`tode window: socket error: ${error.message}\n`);
        electron_1.app.exit(1);
    });
    server.listen(SOCKET);
    scheduleIdleExit();
}
// A window process for this version may already be serving the socket.
const probe = node_net_1.default.connect(SOCKET);
probe.once("connect", () => {
    probe.destroy();
    electron_1.app.exit(0);
});
probe.once("error", () => serve());
for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
        for (const open of windows.keys())
            open.stop();
        setTimeout(() => electron_1.app.exit(0), 200);
    });
}
