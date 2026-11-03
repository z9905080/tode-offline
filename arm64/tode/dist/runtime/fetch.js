"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.targetTriple = targetTriple;
exports.unpack = unpack;
exports.fetchVerified = fetchVerified;
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_child_process_1 = require("node:child_process");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
function targetTriple() {
    return `${process.platform === "darwin" ? "darwin" : "linux"}-${process.arch === "arm64" ? "arm64" : "x64"}`;
}
function unpack(tarball, root) {
    const staging = `${root}.unpacking`;
    node_fs_1.default.rmSync(staging, { recursive: true, force: true });
    node_fs_1.default.mkdirSync(staging, { recursive: true });
    (0, node_child_process_1.execFileSync)("tar", ["-xzf", tarball, "-C", staging, "--strip-components", "1"]);
    node_fs_1.default.rmSync(root, { recursive: true, force: true });
    node_fs_1.default.mkdirSync(node_path_1.default.dirname(root), { recursive: true });
    node_fs_1.default.renameSync(staging, root);
}
async function fetchVerified(url, sha256, size, tarball, onProgress) {
    const response = await fetch(url);
    if (!response.ok || !response.body) {
        throw new Error(`download failed (${response.status} from ${url})`);
    }
    node_fs_1.default.mkdirSync(node_path_1.default.dirname(tarball), { recursive: true });
    const hash = node_crypto_1.default.createHash("sha256");
    const file = node_fs_1.default.createWriteStream(tarball);
    let read = 0;
    for await (const chunk of response.body) {
        hash.update(chunk);
        read += chunk.byteLength;
        if (!file.write(chunk))
            await new Promise((resolve) => file.once("drain", () => resolve()));
        if (size)
            onProgress?.(read / size);
    }
    await new Promise((resolve, reject) => {
        file.end((error) => (error ? reject(error) : resolve()));
    });
    const got = hash.digest("hex");
    if (got !== sha256) {
        node_fs_1.default.rmSync(tarball, { force: true });
        throw new Error(`download corrupted: expected ${sha256}, got ${got}`);
    }
    return tarball;
}
