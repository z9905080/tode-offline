"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supportsKittyGraphics = supportsKittyGraphics;
exports.select = select;
const node_fs_1 = __importDefault(require("node:fs"));
/** Kitty graphics needs a terminal that speaks the protocol. Ghostty and
 * kitty do; anything else (including the editor's own terminal) gets plain
 * text. Env-derived, because a protocol probe costs a tty round-trip. */
function supportsKittyGraphics(env = process.env) {
    if (env.TERM_PROGRAM === "ghostty" || env.GHOSTTY_RESOURCES_DIR)
        return true;
    if (env.KITTY_WINDOW_ID)
        return true;
    return (env.TERM ?? "").includes("kitty");
}
/** One png as a kitty-graphics transmit-and-display, sized to sit inline:
 * one row tall, two cells wide, cursor moving past it like text. */
function kittyInline(png) {
    let data;
    try {
        data = node_fs_1.default.readFileSync(png).toString("base64");
    }
    catch {
        return null;
    }
    const chunks = [];
    for (let at = 0; at < data.length; at += 4096)
        chunks.push(data.slice(at, at + 4096));
    return chunks
        .map((chunk, index) => {
        const first = index === 0 ? "a=T,f=100,r=1,c=2,C=1," : "";
        const more = index === chunks.length - 1 ? "m=0" : "m=1";
        return `\x1b_G${first}${more};${chunk}\x1b\\`;
    })
        .join("");
}
const HIDE = "\x1b[?25l";
const SHOW = "\x1b[?25h";
const CLEAR_EOL = "\x1b[0K";
async function select(title, items) {
    const out = process.stdout;
    const icons = supportsKittyGraphics();
    const iconCells = icons && items.some((item) => item.iconPng) ? 3 : 0;
    // marker at column 1, icon after it, label after that — every write lands
    // on an absolute column, so nothing depends on how far an image moved the
    // cursor and the initial paint and repaints agree exactly
    const markerColumn = 1;
    const iconColumn = 3;
    const labelColumn = 3 + (iconCells ? iconCells : 0);
    let at = 0;
    const marker = (index) => (index === at ? "❯" : " ");
    const label = (index) => index === at ? `\x1b[1m${items[index].label}\x1b[0m` : `\x1b[2m${items[index].label}\x1b[0m`;
    out.write(`\x1b[1m${title}\x1b[0m\n\n`);
    for (let index = 0; index < items.length; index++) {
        out.write(`\x1b[${markerColumn}G${marker(index)}`);
        if (iconCells && items[index].iconPng) {
            const image = kittyInline(items[index].iconPng);
            if (image)
                out.write(`\x1b[${iconColumn}G${image}`);
        }
        out.write(`\x1b[${labelColumn}G${label(index)}\n`);
    }
    out.write(HIDE);
    const rowUp = (index) => items.length - index;
    const repaint = (index) => {
        out.write(`\x1b[${rowUp(index)}A` +
            `\x1b[${markerColumn}G${marker(index)}` +
            `\x1b[${labelColumn}G${CLEAR_EOL}${label(index)}` +
            `\x1b[${rowUp(index)}B\x1b[1G`);
    };
    const move = (to) => {
        const from = at;
        at = Math.max(0, Math.min(items.length - 1, to));
        if (at === from)
            return;
        repaint(from);
        repaint(at);
    };
    const stdin = process.stdin;
    stdin.setRawMode?.(true);
    stdin.resume();
    const picked = await new Promise((resolve) => {
        const onData = (bytes) => {
            const key = bytes.toString();
            if (key === "\r" || key === "\n")
                return finish(at);
            if (key === "\x03" || key === "\x1b" || key === "q")
                return finish(null);
            if (key === "\x1b[A" || key === "\x10")
                move(at - 1); // up, ctrl+p
            else if (key === "\x1b[B" || key === "\x0e")
                move(at + 1); // down, ctrl+n
            else if (/^[1-9]$/.test(key)) {
                const index = Number(key) - 1;
                if (index < items.length)
                    return finish(index);
            }
        };
        const finish = (value) => {
            stdin.off("data", onData);
            resolve(value);
        };
        stdin.on("data", onData);
    });
    stdin.setRawMode?.(false);
    stdin.pause();
    out.write(SHOW);
    return picked;
}
