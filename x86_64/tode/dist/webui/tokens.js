"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cssTokens = cssTokens;
const color_1 = require("../theme/color");
/** The one set of ui tokens every tode page draws with, derived from the
 * terminal's own palette — the shortcuts manager and the first-run import
 * screen must read as the same program. */
function cssTokens(p) {
    return `:root {
    --bg: ${(0, color_1.hex)(p.background)};
    --fg: ${(0, color_1.hex)(p.foreground)};
    --red: ${(0, color_1.hex)(p.ansi[1])};
    --green: ${(0, color_1.hex)(p.ansi[2])};
    --yellow: ${(0, color_1.hex)(p.ansi[3])};
    --cyan: ${(0, color_1.hex)(p.ansi[6])};
    --dim: color-mix(in srgb, var(--fg) 52%, var(--bg));
    --faint: color-mix(in srgb, var(--fg) 32%, var(--bg));
    --line: color-mix(in srgb, var(--fg) 22%, var(--bg));
    --clash: color-mix(in srgb, var(--red) 55%, var(--line));
    --soft: color-mix(in srgb, var(--fg) 45%, var(--bg));
    --lift: color-mix(in srgb, var(--fg) 7%, var(--bg));
  }`;
}
