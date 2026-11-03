"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.editorIconPng = editorIconPng;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const paths_1 = require("../runtime/paths");
function readProduct(appDir) {
    try {
        return JSON.parse(node_fs_1.default.readFileSync(node_path_1.default.join(appDir, "Contents", "Resources", "app", "product.json"), "utf8"));
    }
    catch {
        return null;
    }
}
function slug(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}
function appDirs() {
    const roots = ["/Applications", node_path_1.default.join(node_os_1.default.homedir(), "Applications")];
    return roots.flatMap((root) => {
        try {
            return node_fs_1.default
                .readdirSync(root)
                .filter((entry) => entry.endsWith(".app"))
                .map((entry) => node_path_1.default.join(root, entry));
        }
        catch {
            return [];
        }
    });
}
function macBundleFor(editorName) {
    const wanted = slug(editorName);
    for (const dir of appDirs()) {
        const product = readProduct(dir);
        if (!product)
            continue;
        const names = [product.nameShort, product.nameLong, product.applicationName].filter(Boolean);
        if (names.some((name) => slug(name) === wanted))
            return dir;
    }
    return null;
}
function macIcns(appDir) {
    const resources = node_path_1.default.join(appDir, "Contents", "Resources");
    try {
        const plist = node_fs_1.default.readFileSync(node_path_1.default.join(appDir, "Contents", "Info.plist"), "utf8");
        const declared = /<key>CFBundleIconFile<\/key>\s*<string>([^<]+)<\/string>/.exec(plist)?.[1];
        if (declared) {
            const file = declared.endsWith(".icns") ? declared : `${declared}.icns`;
            const full = node_path_1.default.join(resources, file);
            if (node_fs_1.default.existsSync(full))
                return full;
        }
    }
    catch { }
    try {
        const found = node_fs_1.default.readdirSync(resources).find((entry) => entry.endsWith(".icns"));
        return found ? node_path_1.default.join(resources, found) : null;
    }
    catch {
        return null;
    }
}
function linuxIconFor(editorName) {
    const wanted = slug(editorName);
    const dataDirs = [
        node_path_1.default.join(node_os_1.default.homedir(), ".local", "share", "applications"),
        "/usr/share/applications",
        "/var/lib/flatpak/exports/share/applications",
    ];
    for (const dir of dataDirs) {
        let entries = [];
        try {
            entries = node_fs_1.default.readdirSync(dir).filter((entry) => entry.endsWith(".desktop"));
        }
        catch {
            continue;
        }
        for (const entry of entries) {
            let body = "";
            try {
                body = node_fs_1.default.readFileSync(node_path_1.default.join(dir, entry), "utf8");
            }
            catch {
                continue;
            }
            const name = /^Name=(.+)$/m.exec(body)?.[1];
            const icon = /^Icon=(.+)$/m.exec(body)?.[1];
            if (!name || !icon || slug(name) !== wanted)
                continue;
            if (icon.startsWith("/") && node_fs_1.default.existsSync(icon))
                return icon;
            for (const size of ["64x64", "48x48", "128x128", "32x32"]) {
                const candidate = `/usr/share/icons/hicolor/${size}/apps/${icon}.png`;
                if (node_fs_1.default.existsSync(candidate))
                    return candidate;
            }
            const pixmap = `/usr/share/pixmaps/${icon}.png`;
            if (node_fs_1.default.existsSync(pixmap))
                return pixmap;
        }
    }
    return null;
}
function editorIconPng(editorName) {
    if (process.platform === "linux")
        return linuxIconFor(editorName);
    if (process.platform !== "darwin")
        return null;
    const bundle = macBundleFor(editorName);
    if (!bundle)
        return null;
    const icns = macIcns(bundle);
    if (!icns)
        return null;
    let stamp = 0;
    try {
        stamp = Math.floor(node_fs_1.default.statSync(icns).mtimeMs);
    }
    catch { }
    const cached = node_path_1.default.join(paths_1.CACHE_DIR, "app-icons", `${slug(editorName)}-${stamp}.png`);
    if (node_fs_1.default.existsSync(cached))
        return cached;
    try {
        node_fs_1.default.mkdirSync(node_path_1.default.dirname(cached), { recursive: true });
        (0, node_child_process_1.execFileSync)("sips", ["-z", "64", "64", "-s", "format", "png", icns, "--out", cached], { stdio: "ignore" });
        return node_fs_1.default.existsSync(cached) ? cached : null;
    }
    catch {
        return null;
    }
}
