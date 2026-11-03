"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const CHANNEL = "tode:message";
const deliver = (message) => electron_1.ipcRenderer.send(CHANNEL, message);
pixel.onTheme((theme) => deliver({ type: "theme", colors: theme }));
if (window === window.top) {
    const send = () => {
        try {
            const nav = performance.getEntriesByType("navigation")[0];
            const marks = {};
            for (const mark of performance.getEntriesByType("mark")) {
                if (mark.name.startsWith("code/"))
                    marks[mark.name] = Math.round(mark.startTime);
            }
            if (Object.keys(marks).length === 0)
                return;
            deliver({
                type: "timing",
                page: {
                    at: Date.now(),
                    origin: Math.round(performance.timeOrigin),
                    responseEnd: Math.round(nav?.responseEnd ?? 0),
                    domInteractive: Math.round(nav?.domInteractive ?? 0),
                    loadEnd: Math.round(nav?.loadEventEnd ?? 0),
                    marks,
                },
            });
        }
        catch { }
    };
    let done = false;
    const settle = () => {
        if (done)
            return;
        done = true;
        setTimeout(send, 50);
    };
    const poll = setInterval(() => {
        if (performance.getEntriesByName("code/didStartWorkbench").length) {
            clearInterval(poll);
            settle();
        }
    }, 25);
    setTimeout(() => {
        clearInterval(poll);
        settle();
    }, 30000);
}
