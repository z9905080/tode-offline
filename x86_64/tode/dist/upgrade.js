"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_INSTALL_ROOT = void 0;
exports.installed = installed;
exports.latest = latest;
exports.release = release;
exports.upgrade = upgrade;
const node_child_process_1 = require("node:child_process");
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const control_1 = require("./app/control");
const server_1 = require("./codeserver/server");
const paths_1 = require("./runtime/paths");
Object.defineProperty(exports, "DEFAULT_INSTALL_ROOT", { enumerable: true, get: function () { return paths_1.DEFAULT_INSTALL_ROOT; } });
const fetch_1 = require("./runtime/fetch");
const ORIGIN = process.env.TODE_RELEASE_ORIGIN ?? "https://tode.sh/install";
function readTrimmed(file) {
    try {
        return node_fs_1.default.readFileSync(file, "utf8").trim() || null;
    }
    catch {
        return null;
    }
}
function installed() {
    const version = readTrimmed(node_path_1.default.join(paths_1.INSTALL_ROOT, "VERSION"));
    const channel = readTrimmed(node_path_1.default.join(paths_1.INSTALL_ROOT, "CHANNEL"));
    if (!version || !channel)
        return null;
    return { version, channel };
}
function buildFor(manifest) {
    const target = (0, fetch_1.targetTriple)();
    const build = manifest.platforms?.[target];
    if (!build) {
        throw new Error(`tode ${manifest.version} has no build for ${target}`);
    }
    return { version: manifest.version, channel: manifest.channel, platform: target, ...build };
}
async function latest(channel) {
    const url = channel === "stable" ? `${ORIGIN}/latest.json` : `${ORIGIN}/${channel}/latest.json`;
    const response = await fetch(url);
    if (!response.ok)
        throw new Error(`could not read ${url} (${response.status})`);
    return buildFor((await response.json()));
}
/** A pinned version's manifest, for `tode upgrade --version`. */
async function release(version) {
    const url = `${ORIGIN}/v/${version}/manifest.json`;
    const response = await fetch(url);
    if (!response.ok)
        throw new Error(`no release ${version} (${response.status} from ${url})`);
    return buildFor((await response.json()));
}
async function fetchBuild(build, onProgress) {
    const response = await fetch(build.url);
    if (!response.ok || !response.body) {
        throw new Error(`download failed (${response.status} from ${build.url})`);
    }
    const dir = node_fs_1.default.mkdtempSync(node_path_1.default.join(node_path_1.default.dirname(paths_1.INSTALL_ROOT), ".tode-upgrade-"));
    const tarball = node_path_1.default.join(dir, build.file);
    const hash = node_crypto_1.default.createHash("sha256");
    const file = node_fs_1.default.createWriteStream(tarball);
    let read = 0;
    for await (const chunk of response.body) {
        hash.update(chunk);
        read += chunk.byteLength;
        if (!file.write(chunk))
            await new Promise((r) => file.once("drain", () => r()));
        if (build.size)
            onProgress?.(read / build.size);
    }
    await new Promise((resolve, reject) => {
        file.end((error) => (error ? reject(error) : resolve()));
    });
    const got = hash.digest("hex");
    if (got !== build.sha256) {
        node_fs_1.default.rmSync(dir, { recursive: true, force: true });
        throw new Error(`download corrupted: expected ${build.sha256}, got ${got}`);
    }
    return tarball;
}
function swapIn(tarball, root) {
    const staging = `${root}.new`;
    node_fs_1.default.rmSync(staging, { recursive: true, force: true });
    node_fs_1.default.mkdirSync(staging, { recursive: true });
    (0, node_child_process_1.execFileSync)("tar", ["-xzf", tarball, "-C", staging, "--strip-components", "1"]);
    if (!node_fs_1.default.existsSync(node_path_1.default.join(staging, "dist", "main.js"))) {
        node_fs_1.default.rmSync(staging, { recursive: true, force: true });
        throw new Error("the new tarball is missing dist/main.js");
    }
    const previous = `${root}.old`;
    node_fs_1.default.rmSync(previous, { recursive: true, force: true });
    if (node_fs_1.default.existsSync(root))
        node_fs_1.default.renameSync(root, previous);
    node_fs_1.default.renameSync(staging, root);
    node_fs_1.default.rmSync(previous, { recursive: true, force: true });
}
function writeReceipt(build) {
    node_fs_1.default.mkdirSync(paths_1.STATE_DIR, { recursive: true });
    node_fs_1.default.writeFileSync(node_path_1.default.join(paths_1.STATE_DIR, "install.json"), `${JSON.stringify({
        version: build.version,
        channel: build.channel,
        target: build.platform,
        root: paths_1.INSTALL_ROOT,
        installed: new Date().toISOString(),
    }, null, 2)}\n`);
}
async function upgrade(options = {}) {
    const here = installed();
    if (!here)
        return { kind: "not-an-install", root: paths_1.INSTALL_ROOT };
    options.onStage?.("checking", 0);
    const build = options.version ? await release(options.version) : await latest(here.channel);
    if (build.version === here.version && !options.version) {
        return { kind: "current", version: here.version, channel: here.channel };
    }
    if (options.check)
        return { kind: "available", from: here.version, build };
    if (options.confirm) {
        const windows = await (0, control_1.openWindows)();
        if ((windows.count > 0 || windows.unknown) && !(await options.confirm(build, windows))) {
            return { kind: "cancelled", build };
        }
    }
    const tarball = await fetchBuild(build, (f) => options.onStage?.("downloading", f));
    options.onStage?.("installing", 0);
    await (0, control_1.shutdownDaemons)();
    await (0, server_1.stopServer)();
    try {
        swapIn(tarball, paths_1.INSTALL_ROOT);
    }
    finally {
        node_fs_1.default.rmSync(node_path_1.default.dirname(tarball), { recursive: true, force: true });
    }
    writeReceipt(build);
    const shim = node_path_1.default.join(process.env.XDG_BIN_HOME ?? node_path_1.default.join(process.env.HOME ?? "", ".local", "bin"), "tode");
    const shipped = node_path_1.default.join(paths_1.INSTALL_ROOT, "bin", "tode");
    if (node_fs_1.default.existsSync(shim) && node_fs_1.default.existsSync(shipped)) {
        node_fs_1.default.copyFileSync(shipped, shim);
        node_fs_1.default.chmodSync(shim, 0o755);
    }
    return { kind: "upgraded", from: here.version, build };
}
