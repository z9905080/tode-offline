"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startImportPage = startImportPage;
const node_fs_1 = __importDefault(require("node:fs"));
const node_http_1 = __importDefault(require("node:http"));
const pages_1 = require("../webui/pages");
function iconDataUri(png) {
    if (!png)
        return null;
    try {
        return `data:image/png;base64,${node_fs_1.default.readFileSync(png).toString("base64")}`;
    }
    catch {
        return null;
    }
}
function importState(deps) {
    return {
        editors: deps.editors.map((editor) => ({
            name: editor.name,
            icon: iconDataUri(editor.iconPng),
        })),
    };
}
function body(request) {
    return new Promise((resolve) => {
        let data = "";
        request.on("data", (chunk) => (data += chunk));
        request.on("end", () => resolve(data));
    });
}
function startImportPage(deps) {
    (0, pages_1.ensurePagesBuilt)();
    let finish;
    const done = new Promise((resolve) => (finish = resolve));
    let served = false;
    const server = node_http_1.default.createServer(async (request, response) => {
        const ok = (payload) => {
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify(payload));
        };
        try {
            if (request.method === "GET" && request.url === "/state") {
                return ok(importState(deps));
            }
            const got = (0, pages_1.servePage)("import", deps.palette, request, response);
            if (got === "page")
                served = true;
            if (got)
                return;
            const sent = JSON.parse((await body(request)) || "{}");
            if (request.url === "/import") {
                const name = String(sent.name ?? "");
                if (!deps.editors.some((editor) => editor.name === name)) {
                    return ok({ ok: false, warning: `${name} is not one of the choices` });
                }
                return ok({ ok: true, rows: deps.run(name) });
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
