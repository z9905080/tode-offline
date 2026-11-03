"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.THEME_NAME = void 0;
exports.semanticColors = semanticColors;
exports.surfaces = surfaces;
exports.paletteFingerprint = paletteFingerprint;
exports.generateTheme = generateTheme;
exports.themeFingerprint = themeFingerprint;
const node_crypto_1 = __importDefault(require("node:crypto"));
const color_1 = require("./color");
exports.THEME_NAME = "Terminal Code";
/** Which ansi slot best represents a hue, judged by angle rather than by index,
 * because plenty of terminal themes do not put red in slot one. */
function nearestHue(palette, degrees, background) {
    const target = (degrees * Math.PI) / 180;
    let best = palette[0];
    let bestScore = Infinity;
    for (const color of palette) {
        const { c, h } = (0, color_1.toOklch)(color);
        if (c < 0.02)
            continue;
        const delta = Math.abs(Math.atan2(Math.sin(h - target), Math.cos(h - target)));
        const score = delta - Math.min((0, color_1.contrast)(color, background), 8) * 0.02;
        if (score < bestScore) {
            bestScore = score;
            best = color;
        }
    }
    return best;
}
/** The bright half of the palette reads better on an editor surface than the dim
 * half, so accents are chosen from slots eight to fifteen where they exist. */
function semanticColors(palette) {
    const bright = palette.ansi.slice(9, 15);
    const pool = bright.some((color) => (0, color_1.toOklch)(color).c > 0.02)
        ? bright
        : palette.ansi.slice(1, 7);
    const bg = palette.background;
    return {
        red: nearestHue(pool, 29, bg),
        green: nearestHue(pool, 142, bg),
        yellow: nearestHue(pool, 90, bg),
        blue: nearestHue(pool, 264, bg),
        magenta: nearestHue(pool, 328, bg),
        cyan: nearestHue(pool, 195, bg),
    };
}
function surfaces(background, foreground) {
    return {
        editor: background,
        raised: (0, color_1.shade)(background, 6),
        sunken: (0, color_1.shade)(background, -10),
        overlay: (0, color_1.shade)(background, 20),
        border: (0, color_1.mix)(background, foreground, 0.14),
        hover: (0, color_1.mix)(background, foreground, 0.08),
        active: (0, color_1.mix)(background, foreground, 0.16),
    };
}
function paletteFingerprint(palette) {
    const parts = [palette.background, palette.foreground, ...palette.ansi].map(color_1.hex).join("");
    return node_crypto_1.default.createHash("sha256").update(parts).digest("hex").slice(0, 16);
}
function generateTheme(palette, options = {}) {
    const bg = palette.background;
    const fg = palette.foreground;
    const dark = (0, color_1.isDark)(bg);
    const s = surfaces(bg, fg);
    const accent = semanticColors(palette);
    const clear = options.transparent === true;
    const CLEAR = "#00000000";
    const surface = (color) => (clear ? CLEAR : (0, color_1.hex)(color));
    const tint = (color, alpha) => (clear ? (0, color_1.withAlpha)(fg, alpha) : (0, color_1.hex)(color));
    const on = (color, target = 4.5) => (0, color_1.hex)((0, color_1.legible)(color, s.editor, target));
    const muted = (0, color_1.hex)((0, color_1.mix)(fg, bg, 0.4));
    const faint = (0, color_1.hex)((0, color_1.mix)(fg, bg, 0.62));
    const primary = (0, color_1.legible)(accent.blue, s.editor, 3);
    const colors = {
        focusBorder: (0, color_1.withAlpha)(primary, 0.6),
        foreground: (0, color_1.hex)(fg),
        descriptionForeground: muted,
        errorForeground: on(accent.red),
        "widget.border": (0, color_1.hex)(s.border),
        "widget.shadow": (0, color_1.withAlpha)((0, color_1.shade)(bg, -24), 0.4),
        "selection.background": (0, color_1.withAlpha)(primary, 0.35),
        "icon.foreground": muted,
        "sash.hoverBorder": (0, color_1.withAlpha)(primary, 0.7),
        "editor.background": surface(s.editor),
        "editor.foreground": (0, color_1.hex)(fg),
        "editorLineNumber.foreground": (0, color_1.hex)((0, color_1.mix)(fg, bg, 0.68)),
        "editorLineNumber.activeForeground": (0, color_1.hex)(fg),
        "editorCursor.foreground": (0, color_1.hex)(primary),
        "editor.selectionBackground": (0, color_1.withAlpha)(primary, 0.3),
        "editor.inactiveSelectionBackground": (0, color_1.withAlpha)(primary, 0.16),
        "editor.selectionHighlightBackground": (0, color_1.withAlpha)(primary, 0.16),
        "editor.wordHighlightBackground": (0, color_1.withAlpha)(primary, 0.14),
        "editor.wordHighlightStrongBackground": (0, color_1.withAlpha)(accent.green, 0.16),
        "editor.findMatchBackground": (0, color_1.withAlpha)(accent.yellow, 0.4),
        "editor.findMatchHighlightBackground": (0, color_1.withAlpha)(accent.yellow, 0.22),
        "editor.lineHighlightBackground": tint(s.raised, 0.06),
        "editor.rangeHighlightBackground": (0, color_1.withAlpha)(primary, 0.1),
        "editorWhitespace.foreground": (0, color_1.withAlpha)(fg, 0.15),
        "editorIndentGuide.background1": (0, color_1.withAlpha)(fg, 0.1),
        "editorIndentGuide.activeBackground1": (0, color_1.withAlpha)(fg, 0.26),
        "editorRuler.foreground": (0, color_1.hex)(s.border),
        "editorBracketMatch.background": (0, color_1.withAlpha)(primary, 0.2),
        "editorBracketMatch.border": (0, color_1.withAlpha)(primary, 0.5),
        "editorError.foreground": on(accent.red),
        "editorWarning.foreground": on(accent.yellow),
        "editorInfo.foreground": on(accent.blue),
        "editorGutter.addedBackground": on(accent.green, 3),
        "editorGutter.modifiedBackground": on(accent.blue, 3),
        "editorGutter.deletedBackground": on(accent.red, 3),
        "editorOverviewRuler.border": "#00000000",
        "editorLink.activeForeground": (0, color_1.hex)(primary),
        "editorWidget.background": (0, color_1.hex)(s.overlay),
        "editorWidget.border": (0, color_1.hex)(s.border),
        "editorSuggestWidget.background": (0, color_1.hex)(s.overlay),
        "editorSuggestWidget.border": (0, color_1.hex)(s.border),
        "editorSuggestWidget.selectedBackground": (0, color_1.hex)(s.active),
        "editorSuggestWidget.highlightForeground": (0, color_1.hex)(primary),
        "editorHoverWidget.background": (0, color_1.hex)(s.overlay),
        "editorHoverWidget.border": (0, color_1.hex)(s.border),
        "quickInput.background": (0, color_1.hex)(s.overlay),
        "quickInput.foreground": (0, color_1.hex)(fg),
        "quickInputList.focusBackground": (0, color_1.hex)(s.active),
        "quickInputTitle.background": (0, color_1.hex)(s.overlay),
        "pickerGroup.foreground": muted,
        "pickerGroup.border": (0, color_1.hex)(s.border),
        "sideBar.background": surface(s.sunken),
        "sideBar.foreground": (0, color_1.hex)((0, color_1.mix)(fg, bg, 0.12)),
        "sideBar.border": (0, color_1.hex)(s.border),
        "sideBarTitle.foreground": muted,
        "sideBarSectionHeader.background": surface(s.sunken),
        "sideBarSectionHeader.foreground": muted,
        "sideBarSectionHeader.border": (0, color_1.hex)(s.border),
        "activityBar.background": surface(s.sunken),
        "activityBar.foreground": (0, color_1.hex)(fg),
        "activityBar.inactiveForeground": faint,
        "activityBar.border": (0, color_1.hex)(s.border),
        "activityBarBadge.background": (0, color_1.hex)(primary),
        "activityBarBadge.foreground": (0, color_1.hex)((0, color_1.isDark)(primary) ? [255, 255, 255] : [0, 0, 0]),
        "statusBar.background": surface(s.sunken),
        "statusBar.foreground": muted,
        "statusBar.border": (0, color_1.hex)(s.border),
        "statusBar.noFolderBackground": surface(s.sunken),
        "statusBar.debuggingBackground": (0, color_1.hex)(accent.yellow),
        "statusBar.debuggingForeground": (0, color_1.hex)((0, color_1.isDark)(accent.yellow) ? [255, 255, 255] : [0, 0, 0]),
        "statusBarItem.remoteBackground": surface(s.sunken),
        "statusBarItem.remoteForeground": muted,
        "statusBarItem.hoverBackground": tint(s.hover, 0.1),
        "titleBar.activeBackground": surface(s.sunken),
        "titleBar.activeForeground": muted,
        "titleBar.inactiveBackground": surface(s.sunken),
        "titleBar.inactiveForeground": faint,
        "titleBar.border": (0, color_1.hex)(s.border),
        "panel.background": surface(s.editor),
        "panel.border": (0, color_1.hex)(s.border),
        "panelTitle.activeForeground": (0, color_1.hex)(fg),
        "panelTitle.inactiveForeground": faint,
        "panelTitle.activeBorder": (0, color_1.hex)(primary),
        "editorGroupHeader.tabsBackground": surface(s.sunken),
        "editorGroupHeader.tabsBorder": (0, color_1.hex)(s.border),
        "editorGroupHeader.noTabsBackground": surface(s.sunken),
        "editorGroup.border": (0, color_1.hex)(s.border),
        "tab.activeBackground": tint(s.editor, 0.1),
        "tab.activeForeground": (0, color_1.hex)(fg),
        "tab.inactiveBackground": surface(s.sunken),
        "tab.inactiveForeground": faint,
        "tab.border": (0, color_1.hex)(s.border),
        "tab.activeBorderTop": (0, color_1.hex)(primary),
        "tab.hoverBackground": tint(s.hover, 0.06),
        "tab.unfocusedActiveBackground": tint(s.sunken, 0.05),
        "list.activeSelectionBackground": tint(s.active, 0.16),
        "list.activeSelectionForeground": (0, color_1.hex)(fg),
        "list.inactiveSelectionBackground": tint(s.hover, 0.1),
        "list.hoverBackground": tint(s.hover, 0.08),
        "list.focusBackground": tint(s.active, 0.16),
        "list.highlightForeground": (0, color_1.hex)(primary),
        "list.errorForeground": on(accent.red),
        "list.warningForeground": on(accent.yellow),
        "tree.indentGuidesStroke": (0, color_1.withAlpha)(fg, 0.16),
        "input.background": (0, color_1.hex)(s.raised),
        "input.foreground": (0, color_1.hex)(fg),
        "input.border": (0, color_1.hex)(s.border),
        "input.placeholderForeground": faint,
        "inputOption.activeBorder": (0, color_1.hex)(primary),
        "inputValidation.errorBackground": (0, color_1.hex)((0, color_1.mix)(bg, accent.red, 0.3)),
        "inputValidation.errorBorder": on(accent.red, 3),
        "dropdown.background": (0, color_1.hex)(s.overlay),
        "dropdown.foreground": (0, color_1.hex)(fg),
        "dropdown.border": (0, color_1.hex)(s.border),
        "button.background": (0, color_1.hex)(primary),
        "button.foreground": (0, color_1.hex)((0, color_1.isDark)(primary) ? [255, 255, 255] : [0, 0, 0]),
        "button.hoverBackground": (0, color_1.hex)((0, color_1.shade)(primary, 12)),
        "button.secondaryBackground": (0, color_1.hex)(s.active),
        "button.secondaryForeground": (0, color_1.hex)(fg),
        "badge.background": (0, color_1.hex)(s.active),
        "badge.foreground": (0, color_1.hex)(fg),
        "progressBar.background": (0, color_1.hex)(primary),
        "scrollbar.shadow": "#00000000",
        "scrollbarSlider.background": (0, color_1.withAlpha)(fg, 0.14),
        "scrollbarSlider.hoverBackground": (0, color_1.withAlpha)(fg, 0.22),
        "scrollbarSlider.activeBackground": (0, color_1.withAlpha)(fg, 0.3),
        "minimap.background": surface(s.editor),
        "menu.background": (0, color_1.hex)(s.overlay),
        "menu.foreground": (0, color_1.hex)(fg),
        "menu.border": (0, color_1.hex)(s.border),
        "menu.selectionBackground": (0, color_1.hex)(s.active),
        "menubar.selectionBackground": (0, color_1.hex)(s.hover),
        "notificationCenterHeader.background": (0, color_1.hex)(s.overlay),
        "notifications.background": (0, color_1.hex)(s.overlay),
        "notifications.border": (0, color_1.hex)(s.border),
        "gitDecoration.modifiedResourceForeground": on(accent.yellow, 3),
        "gitDecoration.deletedResourceForeground": on(accent.red, 3),
        "gitDecoration.untrackedResourceForeground": on(accent.green, 3),
        "gitDecoration.ignoredResourceForeground": faint,
        "gitDecoration.conflictingResourceForeground": on(accent.magenta, 3),
        "peekView.border": (0, color_1.hex)(primary),
        "peekViewEditor.background": (0, color_1.hex)(s.raised),
        "peekViewResult.background": (0, color_1.hex)(s.sunken),
        "peekViewTitle.background": (0, color_1.hex)(s.sunken),
        "breadcrumb.foreground": faint,
        "breadcrumb.focusForeground": (0, color_1.hex)(fg),
        "breadcrumb.background": surface(s.editor),
        "terminal.background": surface(s.editor),
        "terminal.foreground": (0, color_1.hex)(fg),
        "terminalCursor.foreground": (0, color_1.hex)(primary),
        "terminal.selectionBackground": (0, color_1.withAlpha)(primary, 0.3),
        "terminal.border": (0, color_1.hex)(s.border),
        // special case da sticky headers
        "editorStickyScroll.background": clear ? (0, color_1.withAlpha)(bg, 0.85) : (0, color_1.hex)(s.editor),
        "editorStickyScrollHover.background": clear ? (0, color_1.withAlpha)(fg, 0.1) : (0, color_1.hex)(s.hover),
        "sideBarStickyScroll.background": clear ? (0, color_1.withAlpha)(bg, 0.85) : (0, color_1.hex)(s.sunken),
        "panelStickyScroll.background": clear ? (0, color_1.withAlpha)(bg, 0.85) : (0, color_1.hex)(s.editor),
    };
    const ANSI_NAMES = [
        "Black",
        "Red",
        "Green",
        "Yellow",
        "Blue",
        "Magenta",
        "Cyan",
        "White",
        "BrightBlack",
        "BrightRed",
        "BrightGreen",
        "BrightYellow",
        "BrightBlue",
        "BrightMagenta",
        "BrightCyan",
        "BrightWhite",
    ];
    palette.ansi.forEach((color, index) => {
        colors[`terminal.ansi${ANSI_NAMES[index]}`] = (0, color_1.hex)(color);
    });
    const token = (scopes, color, style) => ({
        scope: scopes,
        settings: { foreground: on(color), ...(style ? { fontStyle: style } : {}) },
    });
    const tokenColors = [
        {
            scope: ["comment", "punctuation.definition.comment"],
            settings: { foreground: (0, color_1.hex)((0, color_1.legible)((0, color_1.mix)(fg, bg, 0.5), s.editor, 3)), fontStyle: "italic" },
        },
        token(["keyword", "storage", "storage.type", "keyword.control"], accent.red),
        token(["string", "string.quoted", "punctuation.definition.string"], accent.green),
        token(["constant.numeric", "constant.language", "constant.character"], accent.magenta),
        token(["entity.name.function", "support.function", "meta.function-call"], accent.blue),
        token(["entity.name.type", "entity.name.class", "support.class", "support.type"], accent.yellow),
        token(["variable", "meta.definition.variable.name", "variable.other.readwrite"], fg),
        token(["variable.parameter"], (0, color_1.mix)(fg, accent.cyan, 0.5)),
        token(["entity.name.tag"], accent.red),
        token(["entity.other.attribute-name"], accent.yellow),
        token(["support.type.property-name", "meta.object-literal.key"], accent.cyan),
        token(["punctuation", "meta.brace"], (0, color_1.mix)(fg, bg, 0.3)),
        token(["invalid"], accent.red),
        {
            scope: ["markup.heading"],
            settings: { foreground: on(accent.blue), fontStyle: "bold" },
        },
        { scope: ["markup.italic"], settings: { fontStyle: "italic" } },
        { scope: ["markup.bold"], settings: { fontStyle: "bold" } },
    ];
    return {
        name: exports.THEME_NAME,
        type: dark ? "dark" : "light",
        semanticHighlighting: true,
        colors,
        tokenColors,
    };
}
/** Names the extension folder for a theme that did not come from a palette —
 * a theme document handed over as a file or inline gets the same treatment a
 * generated one does. */
function themeFingerprint(theme) {
    return node_crypto_1.default.createHash("sha256").update(JSON.stringify(theme)).digest("hex").slice(0, 16);
}
