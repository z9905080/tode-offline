"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CODE_SERVER_VERSION = void 0;
exports.codeServerRoot = codeServerRoot;
exports.installedCodeServer = installedCodeServer;
exports.narrateFetch = narrateFetch;
exports.ensureCodeServer = ensureCodeServer;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const paths_1 = require("../runtime/paths");
const fetch_1 = require("../runtime/fetch");
exports.CODE_SERVER_VERSION = "4.132.0";
const CODE_SERVER_BUILDS = {
    "darwin-x64": {
        asset: "macos-amd64",
        sha256: "eddc7a8ea9d4575ae3e4813c624f7e012be191a0670d2e5187a6301fd59f6307",
        size: 230542235,
    },
    "darwin-arm64": {
        asset: "macos-arm64",
        sha256: "449814f6637faaf9b68544f7bce560f5ec500de688815d5c7f9afa7a51577992",
        size: 211120710,
    },
    "linux-x64": {
        asset: "linux-amd64",
        sha256: "a38d26f4cb81f768feddff79e2937fd3f39c83d3da8be3da7225e1087e62e4ed",
        size: 238758593,
    },
    "linux-arm64": {
        asset: "linux-arm64",
        sha256: "ade569a677d1c04ee66ef153382b7e15bf261f955407663c7ddc6b87f9ee29fc",
        size: 232503176,
    },
};
function codeServerRoot(version = exports.CODE_SERVER_VERSION) {
    return node_path_1.default.join(paths_1.DATA_DIR, "code-server", version);
}
function binAt(root) {
    const bin = node_path_1.default.join(root, "bin", "code-server");
    return node_fs_1.default.existsSync(bin) ? bin : null;
}
function installedCodeServer() {
    const configured = process.env.TODE_CODE_SERVER;
    if (configured)
        return configured;
    return binAt(codeServerRoot());
}
function narrateFetch(label) {
    let announced = false;
    let lastPercent = -1;
    return (fraction) => {
        if (!announced) {
            process.stderr.write(`tode: fetching ${label}\n`);
            announced = true;
        }
        const percent = Math.round(fraction * 100);
        if (percent === lastPercent)
            return;
        lastPercent = percent;
        process.stderr.write(`\r  ${percent}%${percent === 100 ? "\n" : ""}`);
    };
}
async function ensureCodeServer(onProgress) {
    const already = installedCodeServer();
    if (already)
        return already;
    const build = CODE_SERVER_BUILDS[(0, fetch_1.targetTriple)()];
    if (!build)
        throw new Error(`no pinned code-server build for ${(0, fetch_1.targetTriple)()}`);
    const url = `https://github.com/coder/code-server/releases/download/` +
        `v${exports.CODE_SERVER_VERSION}/code-server-${exports.CODE_SERVER_VERSION}-${build.asset}.tar.gz`;
    const root = codeServerRoot();
    const tarball = `${root}.tar.gz`;
    await (0, fetch_1.fetchVerified)(url, build.sha256, build.size, tarball, onProgress);
    (0, fetch_1.unpack)(tarball, root);
    node_fs_1.default.rmSync(tarball, { force: true });
    const bin = binAt(root);
    if (!bin)
        throw new Error(`unpacked code-server ${exports.CODE_SERVER_VERSION} but it has no bin/code-server`);
    return bin;
}
