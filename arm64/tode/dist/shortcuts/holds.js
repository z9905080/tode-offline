"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeEditorHolds = makeEditorHolds;
const store_1 = require("./store");
const profile_1 = require("../profile");
const imported_1 = require("./imported");
const vscode_keymap_1 = require("./vscode-keymap");
function makeEditorHolds() {
    const own = new Map();
    const record = (binding, claimant) => {
        if (!binding.key || !binding.command || binding.command.startsWith("-"))
            return;
        if ((0, profile_1.removalMasked)(binding.key, binding.command))
            return;
        const chord = (0, vscode_keymap_1.canonicalChord)(binding.key);
        const list = own.get(chord) ?? [];
        list.push({ command: binding.command, guard: binding.when, claimant });
        own.set(chord, list);
    };
    for (const binding of (0, profile_1.foreignBindings)())
        record(binding, "imported");
    for (const binding of (0, profile_1.todeKeybindings)())
        record(binding, "terminal-code");
    for (const binding of (0, store_1.overrideBindings)())
        record(binding, "terminal-code");
    for (const binding of (0, store_1.claimBindings)())
        record(binding, "terminal-code");
    return (chord) => {
        const held = [...(own.get((0, vscode_keymap_1.canonicalChord)(chord)) ?? [])];
        for (const claim of (0, imported_1.extensionClaims)(chord)) {
            held.push({
                command: claim.command,
                guard: claim.when,
                claimant: claim.claimant,
                describes: claim.describes,
            });
        }
        const fallback = (0, vscode_keymap_1.defaultBinding)(chord);
        if (fallback && !(0, profile_1.removalMasked)(chord, fallback.command)) {
            held.push({ command: fallback.command, guard: fallback.when, claimant: "terminal-code" });
        }
        const seen = new Set();
        const unique = held.filter((hold) => seen.has(hold.command) ? false : (seen.add(hold.command), true));
        return [...unique.filter((hold) => !hold.guard), ...unique.filter((hold) => !!hold.guard)];
    };
}
