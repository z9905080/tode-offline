"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sshOpen = sshOpen;
exports.sshForward = sshForward;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const ssh_1 = require("@zenbu-labs/pixel/ssh");
const launch_1 = require("./launch");
const profile_1 = require("./profile");
const paths_1 = require("./runtime/paths");
const REMOTE_BUNDLES_DIR = "${XDG_DATA_HOME:-$HOME/.local/share}/tode/bundles";
async function sshOpen(target, options) {
    const session = await (0, ssh_1.connectSsh)({
        target,
        bundle: writeBundle(options.palette, options.version, options.remotePath),
        remoteBase: REMOTE_BUNDLES_DIR,
        status: (line) => process.stderr.write(`ssh: ${line}\n`),
    });
    const pane = new launch_1.Pane({
        split: options.split,
        size: options.size,
        proxy: session.view.proxy,
        partition: session.view.partition,
    });
    pane.open(session.url);
    return pane.exited();
}
function sshForward(target, args) {
    const { destination, hostArgs } = (0, ssh_1.resolveSshTarget)(target);
    const tode = '"$HOME/.local/bin/tode"';
    const hint = `tode is not installed on ${destination}, run: tode --ssh ${target}`;
    const command = [
        `[ -x ${tode} ] || { echo '${hint}' >&2; exit 127; };`,
        `exec ${tode}`,
        ...args.map(shellQuote),
    ].join(" ");
    const result = (0, node_child_process_1.spawnSync)("ssh", [...hostArgs, destination, command], { stdio: "inherit" });
    return result.status ?? 1;
}
function writeBundle(palette, version, remotePath) {
    const dir = node_path_1.default.join(paths_1.STATE_DIR, "ssh-bundle");
    node_fs_1.default.rmSync(dir, { recursive: true, force: true });
    node_fs_1.default.mkdirSync(dir, { recursive: true });
    const write = (name, contents, executable = false) => {
        const file = node_path_1.default.join(dir, name);
        node_fs_1.default.writeFileSync(file, contents);
        if (executable)
            node_fs_1.default.chmodSync(file, 0o755);
    };
    write("manifest.json", `${JSON.stringify({ name: "tode" })}\n`);
    write("version", `${version}\n`);
    write("palette.json", `${JSON.stringify(palette)}\n`);
    stageProfile(dir);
    write("ensure", `#!/bin/sh
set -e
tode="$HOME/.local/bin/tode"
want="$(cat "$(dirname "$0")/version")"
have="$("$tode" --version 2>/dev/null || true)"
if [ "$want" = dev ]; then
  [ -n "$have" ] || curl -fsSL https://tode.sh/install/dev | bash
elif [ "$have" != "$want" ]; then
  curl -fsSL "https://tode.sh/install/v/$want" | bash
fi
"$tode" --help 2>/dev/null | grep -q -- --serve || {
  echo "the tode on this server ($("$tode" --version 2>/dev/null)) does not support --serve" >&2
  exit 1
}
`, true);
    write("setup", `#!/bin/sh
set -e
./ensure
"$HOME/.local/bin/tode" --serve --prepare --palette "$(pwd)/palette.json" --import "$(pwd)/profile"
`, true);
    write("start", `#!/bin/sh
set -e
./ensure
here="$(pwd)"
cd "$HOME"
exec "$HOME/.local/bin/tode" --serve --palette "$here/palette.json"${remotePath ? ` ${shellQuote(remotePath)}` : ""}
`, true);
    return dir;
}
function stageProfile(bundleDir) {
    const profile = node_path_1.default.join(bundleDir, "profile");
    node_fs_1.default.mkdirSync(profile, { recursive: true });
    for (const file of ["settings.json", "keybindings.json", "tasks.json"]) {
        try {
            node_fs_1.default.copyFileSync(node_path_1.default.join(profile_1.USER_DIR, file), node_path_1.default.join(profile, file));
        }
        catch { }
    }
    try {
        node_fs_1.default.cpSync(node_path_1.default.join(profile_1.USER_DIR, "snippets"), node_path_1.default.join(profile, "snippets"), {
            recursive: true,
        });
    }
    catch { }
    node_fs_1.default.writeFileSync(node_path_1.default.join(profile, "extensions.txt"), `${extensionIds().join("\n")}\n`);
}
function extensionIds() {
    try {
        const listed = JSON.parse(node_fs_1.default.readFileSync(node_path_1.default.join(profile_1.EXTENSIONS_DIR, "extensions.json"), "utf8"));
        if (!Array.isArray(listed))
            return [];
        return listed
            .filter((entry) => typeof entry?.identifier?.id === "string")
            .map((entry) => typeof entry.version === "string"
            ? `${entry.identifier.id}@${entry.version}`
            : entry.identifier.id);
    }
    catch {
        return [];
    }
}
function shellQuote(value) {
    return `'${value.replaceAll("'", `'\\''`)}'`;
}
