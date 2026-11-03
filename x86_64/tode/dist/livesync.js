"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRawColors = parseRawColors;
const osc_1 = require("./terminal/osc");
function parseRawColors(text) {
    let raw;
    try {
        raw = JSON.parse(text);
    }
    catch {
        return null;
    }
    if (!raw.background || !raw.foreground)
        return null;
    return (0, osc_1.withFallbacks)({
        background: raw.background,
        foreground: raw.foreground,
        ansi: raw.ansi ?? new Array(16).fill(null),
    });
}
