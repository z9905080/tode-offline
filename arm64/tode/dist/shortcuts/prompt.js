"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrap = wrap;
function columns() {
    return Math.max(process.stdout.columns ?? 80, 40);
}
function wrap(text, indent) {
    const width = Math.max(columns() - indent.length - 1, 20);
    const lines = [];
    let line = "";
    for (const word of text.split(/\s+/)) {
        if (line && line.length + 1 + word.length > width) {
            lines.push(indent + line);
            line = word;
        }
        else {
            line = line ? `${line} ${word}` : word;
        }
    }
    if (line)
        lines.push(indent + line);
    return lines;
}
