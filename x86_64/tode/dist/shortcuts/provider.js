"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.providerFor = providerFor;
const ghostty_1 = require("./backends/ghostty");
const kitty_1 = require("./backends/kitty");
const PROVIDERS = [ghostty_1.ghosttyProvider, kitty_1.kittyProvider];
function providerFor(env = process.env) {
    return PROVIDERS.find((provider) => provider.detect(env)) ?? null;
}
