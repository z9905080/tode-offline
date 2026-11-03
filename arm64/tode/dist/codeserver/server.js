"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PORT_FILE = exports.CSS_FILE = exports.STATE_FILE = void 0;
exports.codeServerBin = codeServerBin;
exports.answering = answering;
exports.freePort = freePort;
exports.currentServer = currentServer;
exports.ensureServer = ensureServer;
exports.available = available;
exports.startInjector = startInjector;
exports.stopServer = stopServer;
exports.origin = origin;
exports.windowUrl = windowUrl;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = __importDefault(require("node:fs"));
const node_net_1 = __importDefault(require("node:net"));
const node_path_1 = __importDefault(require("node:path"));
const control_1 = require("../app/control");
const paths_1 = require("../runtime/paths");
const inject_1 = require("./inject");
const vendored_1 = require("./vendored");
const VSCODE_DIR = node_path_1.default.join(paths_1.DATA_DIR, "vscode");
exports.STATE_FILE = node_path_1.default.join(paths_1.STATE_DIR, "server.json");
/**
 * this is odd i would say
 */
exports.CSS_FILE = node_path_1.default.join(paths_1.DATA_DIR, "inject.css");
// kept apart from the run state, which is cleared on every stop
exports.PORT_FILE = node_path_1.default.join(paths_1.DATA_DIR, "injector.port");
function fontAsset() {
    for (let dir = __dirname;; dir = node_path_1.default.dirname(dir)) {
        const candidate = node_path_1.default.join(dir, "assets", "fonts", "JetBrainsMono-Regular.ttf");
        if (node_fs_1.default.existsSync(candidate))
            return candidate;
        if (node_path_1.default.dirname(dir) === dir)
            return "";
    }
}
function codeServerBin() {
    const found = (0, vendored_1.installedCodeServer)();
    if (found)
        return found;
    throw new Error(`code-server ${vendored_1.CODE_SERVER_VERSION} not found`);
}
function readState() {
    try {
        return JSON.parse(node_fs_1.default.readFileSync(exports.STATE_FILE, "utf8"));
    }
    catch {
        return null;
    }
}
function writeState(state) {
    node_fs_1.default.mkdirSync(node_path_1.default.dirname(exports.STATE_FILE), { recursive: true });
    node_fs_1.default.writeFileSync(exports.STATE_FILE, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
    node_fs_1.default.chmodSync(exports.STATE_FILE, 0o600);
}
function running(pid) {
    try {
        process.kill(pid, 0);
        return true;
    }
    catch {
        return false;
    }
}
function answering(port, timeout = 400) {
    return new Promise((resolve) => {
        const socket = node_net_1.default.connect({ port, host: "127.0.0.1" });
        const settle = (value) => {
            socket.destroy();
            resolve(value);
        };
        socket.setTimeout(timeout, () => settle(false));
        socket.once("connect", () => settle(true));
        socket.once("error", () => settle(false));
    });
}
function freePort() {
    return new Promise((resolve, reject) => {
        const probe = node_net_1.default.createServer();
        probe.once("error", reject);
        probe.listen(0, "127.0.0.1", () => {
            const address = probe.address();
            probe.close(() => {
                if (address && typeof address === "object")
                    resolve(address.port);
                else
                    reject(new Error("no port assigned"));
            });
        });
    });
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function currentServer() {
    const state = readState();
    if (!state || !running(state.pid) || !running(state.injectorPid))
        return null;
    if (!state.secret)
        return null;
    const [up, proxied] = await Promise.all([answering(state.port), answering(state.injectorPort)]);
    return up && proxied ? state : null;
}
function serverVersion(bin) {
    return new Promise((resolve) => {
        (0, node_child_process_1.execFile)(bin, ["--version"], { encoding: "utf8" }, (error, stdout) => {
            resolve(error ? "unknown" : stdout.split("\n")[0].trim());
        });
    });
}
let booting = null;
function ensureServer() {
    if (!booting) {
        booting = startServer();
        booting.catch(() => {
            booting = null;
        });
    }
    return booting;
}
async function startServer() {
    const existing = await currentServer();
    if (existing)
        return existing;
    if (readState()?.secret === undefined)
        await stopServer();
    const bin = await (0, vendored_1.ensureCodeServer)((0, vendored_1.narrateFetch)(`code-server ${vendored_1.CODE_SERVER_VERSION}`));
    // asked now, awaited after the injector is up — the version is a detail for
    // `tode daemon status`, not something the boot should stall on
    const version = serverVersion(bin);
    const port = await freePort();
    const secret = (0, inject_1.newSecret)();
    const codeServerSecret = (0, inject_1.newSecret)();
    node_fs_1.default.mkdirSync(paths_1.LOGS_DIR, { recursive: true });
    const log = node_fs_1.default.openSync(node_path_1.default.join(paths_1.LOGS_DIR, "code-server.log"), "a");
    const child = (0, node_child_process_1.spawn)(bin, [
        "--auth",
        "password",
        "--bind-addr",
        `127.0.0.1:${port}`,
        "--user-data-dir",
        node_path_1.default.join(VSCODE_DIR, "user-data"),
        "--extensions-dir",
        node_path_1.default.join(VSCODE_DIR, "extensions"),
        "--app-name",
        "tode",
        "--disable-telemetry",
        "--disable-update-check",
        "--disable-workspace-trust",
        "--disable-getting-started-override",
        "--ignore-last-opened",
    ], {
        detached: true,
        stdio: ["ignore", log, log],
        env: {
            ...process.env,
            PASSWORD: undefined,
            HASHED_PASSWORD: codeServerSecret,
            EXTENSIONS_GALLERY: JSON.stringify({
                serviceUrl: "https://marketplace.visualstudio.com/_apis/public/gallery",
                itemUrl: "https://marketplace.visualstudio.com/items",
                cacheUrl: "https://vscode.blob.core.windows.net/gallery/index",
                controlUrl: "",
            }),
        },
    });
    child.unref();
    if (!child.pid)
        throw new Error("could not start code-server");
    const injector = await startInjector(port, log, { session: secret, codeServer: codeServerSecret });
    void codeServerReady(port, child.pid).then((up) => {
        if (up)
            void warmUp(injector.port, secret);
    });
    const state = {
        pid: child.pid,
        port,
        injectorPid: injector.pid,
        injectorPort: injector.port,
        secret,
        version: await version,
        startedAt: Date.now(),
    };
    writeState(state);
    return state;
}
async function codeServerReady(port, pid) {
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
        if (await answering(port))
            return true;
        if (!running(pid))
            return false;
        await sleep(60);
    }
    return false;
}
async function injectorPort(portFile) {
    let previous = 0;
    try {
        previous = Number(node_fs_1.default.readFileSync(portFile, "utf8").trim());
    }
    catch { }
    const port = previous && (await available(previous)) ? previous : await freePort();
    node_fs_1.default.mkdirSync(node_path_1.default.dirname(portFile), { recursive: true });
    node_fs_1.default.writeFileSync(portFile, String(port));
    return port;
}
function available(port) {
    return new Promise((resolve) => {
        const probe = node_net_1.default.createServer();
        probe.once("error", () => resolve(false));
        probe.listen(port, "127.0.0.1", () => probe.close(() => resolve(true)));
    });
}
async function startInjector(upstream, log, auth, portFile = exports.PORT_FILE) {
    const port = await injectorPort(portFile);
    const script = node_path_1.default.join(__dirname, "injector-main.js");
    const font = fontAsset();
    // the secrets travel in the environment: arguments show up in `ps` for everyone
    const child = (0, node_child_process_1.spawn)(process.execPath, [script, String(upstream), String(port), exports.CSS_FILE, font], {
        detached: true,
        stdio: ["ignore", log, log],
        env: {
            ...process.env,
            TODE_SESSION_SECRET: auth.session,
            TODE_CODE_SERVER_SECRET: auth.codeServer,
        },
    });
    child.unref();
    if (!child.pid)
        throw new Error("could not start the css injector");
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
        if (await answering(port))
            return { pid: child.pid, port };
        if (!running(child.pid))
            throw new Error("the css injector exited during start");
        await sleep(40);
    }
    throw new Error("the css injector did not start within 10s");
}
async function warmUp(port, secret) {
    const headers = { cookie: `${inject_1.SESSION_COOKIE}=${secret}` };
    try {
        const page = await fetch(`http://127.0.0.1:${port}/`, {
            headers: { ...headers, accept: "text/html" },
        });
        const html = await page.text();
        const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((m) => m[1]);
        await Promise.all(assets.slice(0, 4).map((asset) => fetch(new URL(asset, `http://127.0.0.1:${port}/`), { headers })
            .then((r) => r.arrayBuffer())
            .catch(() => null)));
    }
    catch { }
}
async function stopServer() {
    const state = readState();
    if (!state)
        return false;
    const pids = [state.injectorPid, state.pid].filter((pid) => Boolean(pid) && running(pid));
    await Promise.all(pids.map(control_1.kill));
    node_fs_1.default.rmSync(exports.STATE_FILE, { force: true });
    return pids.length > 0;
}
function origin(state) {
    return `http://127.0.0.1:${state.injectorPort}/`;
}
function windowUrl(state, workbench) {
    return (0, inject_1.enterUrl)(origin(state), state.secret, workbench);
}
