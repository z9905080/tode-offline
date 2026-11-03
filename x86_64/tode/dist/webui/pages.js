"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensurePagesBuilt = ensurePagesBuilt;
exports.pageHtml = pageHtml;
exports.servePage = servePage;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const tokens_1 = require("./tokens");
/** The pages are vite-built react apps: src/pages/<name> compiles to plain
 * html, one js and one css in assets/pages/<name> (npm run build:pages). A
 * checkout rebuilds them on demand when the sources are newer than the build;
 * an installed tode has no sources and just serves what shipped. */
const PAGES = ["shortcuts", "import"];
function findUp(relative) {
    for (let dir = __dirname;; dir = node_path_1.default.dirname(dir)) {
        const candidate = node_path_1.default.join(dir, relative);
        if (node_fs_1.default.existsSync(candidate))
            return candidate;
        if (node_path_1.default.dirname(dir) === dir)
            return null;
    }
}
function newestMtime(dir) {
    let newest = 0;
    for (const entry of node_fs_1.default.readdirSync(dir, { withFileTypes: true })) {
        const full = node_path_1.default.join(dir, entry.name);
        const stamp = entry.isDirectory() ? newestMtime(full) : node_fs_1.default.statSync(full).mtimeMs;
        if (stamp > newest)
            newest = stamp;
    }
    return newest;
}
/** In a checkout, rebuild the pages when a source moved past the build. The
 * check is mtimes over src/pages, so an untouched tree costs a few stats and
 * never starts vite. */
function ensurePagesBuilt() {
    const config = findUp("vite.config.mts");
    if (!config)
        return; // no sources around: serve what shipped
    const root = node_path_1.default.dirname(config);
    const sources = node_path_1.default.join(root, "src", "pages");
    if (!node_fs_1.default.existsSync(sources))
        return;
    let builtAt = Infinity;
    for (const page of PAGES) {
        try {
            builtAt = Math.min(builtAt, node_fs_1.default.statSync(node_path_1.default.join(root, "assets", "pages", page, "index.html")).mtimeMs);
        }
        catch {
            builtAt = 0;
        }
    }
    if (builtAt > Math.max(newestMtime(sources), node_fs_1.default.statSync(config).mtimeMs))
        return;
    (0, node_child_process_1.execFileSync)("npm", ["run", "-s", "build:pages"], { cwd: root, stdio: "ignore" });
}
function pageDir(name) {
    const found = findUp(node_path_1.default.join("assets", "pages", name, "index.html"));
    if (!found)
        throw new Error(`the ${name} page is not built — run: npm run build:pages`);
    return node_path_1.default.dirname(found);
}
// if its a transform we need can't it be a vite plugin
function pageHtml(name, palette) {
    const html = node_fs_1.default.readFileSync(node_path_1.default.join(pageDir(name), "index.html"), "utf8");
    const tokens = `<style id="tode-tokens">${(0, tokens_1.cssTokens)(palette)}</style>`;
    return html.includes("</head>") ? html.replace("</head>", `${tokens}</head>`) : `${tokens}${html}`;
}
const TYPES = {
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
};
/** Answers the GET side of a page server: "/" is the built html, "/assets/*"
 * its js and css. Returns what was served so callers can track first paint,
 * or null when the request is not the page's (the POST api, typically). */
function servePage(name, palette, request, response) {
    if (request.method !== "GET")
        return null;
    const url = (request.url ?? "/").split("?")[0];
    if (url === "/" || url === "/index.html") {
        response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        response.end(pageHtml(name, palette));
        return "page";
    }
    const asset = /^\/assets\/([A-Za-z0-9._-]+)$/.exec(url);
    if (!asset || asset[1].includes(".."))
        return null;
    const file = node_path_1.default.join(pageDir(name), "assets", asset[1]);
    let data;
    try {
        data = node_fs_1.default.readFileSync(file);
    }
    catch {
        response.writeHead(404);
        response.end();
        return "asset";
    }
    response.writeHead(200, {
        "content-type": TYPES[node_path_1.default.extname(asset[1])] ?? "application/octet-stream",
        "content-length": String(data.byteLength),
    });
    response.end(data);
    return "asset";
}
