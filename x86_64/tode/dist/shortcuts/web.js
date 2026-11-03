"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startManager = startManager;
const node_fs_1 = __importDefault(require("node:fs"));
const node_http_1 = __importDefault(require("node:http"));
const node_path_1 = __importDefault(require("node:path"));
const pages_1 = require("../webui/pages");
function logoDataUri(name) {
    for (let dir = __dirname;; dir = node_path_1.default.dirname(dir)) {
        const candidate = node_path_1.default.join(dir, "assets", "logos", `${name}.png`);
        if (node_fs_1.default.existsSync(candidate)) {
            return `data:image/png;base64,${node_fs_1.default.readFileSync(candidate).toString("base64")}`;
        }
        if (node_path_1.default.dirname(dir) === dir)
            return null;
    }
}
function managerState(deps) {
    return {
        rows: deps.rows(),
        terminalName: deps.terminalName,
        reloadHint: deps.reloadHint,
        intro: deps.intro === true,
        continues: deps.continues === true,
        logos: { terminal: logoDataUri(deps.terminalName.toLowerCase()), editor: logoDataUri("tode") },
    };
}
function body(request) {
    return new Promise((resolve) => {
        let read = "";
        request.on("data", (chunk) => (read += chunk));
        request.on("end", () => resolve(read));
    });
}
function startManager(deps) {
    (0, pages_1.ensurePagesBuilt)();
    let finish;
    const done = new Promise((resolve) => (finish = resolve));
    let served = false;
    const server = node_http_1.default.createServer(async (request, response) => {
        const ok = (payload, type = "application/json") => {
            response.writeHead(200, { "content-type": type });
            response.end(typeof payload === "string" ? payload : JSON.stringify(payload));
        };
        try {
            if (request.method === "GET" && request.url === "/state") {
                return ok(managerState(deps));
            }
            const got = (0, pages_1.servePage)("shortcuts", deps.palette, request, response);
            if (got === "page")
                served = true;
            if (got)
                return;
            const sent = JSON.parse((await body(request)) || "{}");
            if (request.url === "/taken") {
                const chord = deps.normalize(String(sent.chord ?? ""));
                if (!chord)
                    return ok({ ok: false, warning: `${sent.chord} does not parse as a chord` });
                const info = chord === sent.id
                    ? null
                    : deps.taken(chord, String(sent.id ?? ""), sent.command ? String(sent.command) : undefined, sent.side === "terminal" || sent.side === "editor" ? sent.side : undefined);
                if (info) {
                    return ok({
                        ok: false,
                        warning: `${chord} is already bound to ${info.holder}`,
                        claim: info.claim ?? null,
                        chord,
                    });
                }
                return ok({ ok: true, chord });
            }
            if (request.url === "/decide") {
                const decision = sent.decision;
                if (decision?.choice === "editor" && decision.key) {
                    const key = deps.normalize(decision.key);
                    if (!key) {
                        return ok({
                            ok: false,
                            warning: `${decision.key} does not parse`,
                            rows: deps.rows(),
                        });
                    }
                    decision.key = key;
                }
                deps.decide(String(sent.id), sent.kind === "claim" ? "claim" : sent.kind === "import" ? "import" : "terminal", decision, sent.side === "claim" ? "claim" : "own", sent.action ? { command: String(sent.action), when: sent.guard ? String(sent.guard) : undefined } : undefined);
                return ok({ ok: true, rows: deps.rows() });
            }
            if (request.url === "/confirm") {
                const confirmed = deps.confirm();
                return ok({ ok: true, note: confirmed.note });
            }
            if (request.url === "/done") {
                const next = deps.next ? await deps.next() : null;
                ok({ ok: true, next });
                finish();
                return;
            }
            response.writeHead(404);
            response.end();
        }
        catch (error) {
            response.writeHead(500, { "content-type": "application/json" });
            response.end(JSON.stringify({ ok: false, warning: String(error) }));
        }
    });
    return new Promise((resolve) => {
        server.listen(0, "127.0.0.1", () => {
            const address = server.address();
            const port = typeof address === "object" && address ? address.port : 0;
            resolve({ port, done, close: () => server.close(), served: () => served });
        });
    });
}
