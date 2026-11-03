"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runOnboarding = runOnboarding;
const firstrun_1 = require("./import/firstrun");
const wizard_1 = require("./shortcuts/wizard");
async function runOnboarding(pane, finalize, palette) {
    let shortcuts;
    const shortcutsStage = async () => {
        if (shortcuts === undefined)
            shortcuts = await (0, wizard_1.shortcutsFirstRunStage)(finalize, palette);
        return shortcuts;
    };
    const afterImport = async () => (await shortcutsStage())?.url ?? finalize();
    const importStage = await (0, firstrun_1.importFirstRunStage)(afterImport, palette);
    const first = importStage ?? (await shortcutsStage());
    if (!first)
        return;
    pane.open(first.url);
    const walk = async (stage) => {
        await Promise.race([stage.done, pane.exited()]);
        if (stage.served())
            stage.shown();
        stage.close();
    };
    await walk(first);
    if (importStage && shortcuts)
        await walk(shortcuts);
}
