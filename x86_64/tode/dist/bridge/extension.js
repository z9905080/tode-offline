"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bridgeMain = bridgeMain;
function bridgeMain(ctx) {
    const fs = require("fs");
    const net = require("net");
    const os = require("os");
    const path = require("path");
    const vscode = require("vscode");
    const LIVE_THEME_FILE = ctx.liveThemeFile;
    const QUIT_HINT = ctx.quitHint;
    const STARTUP_OPEN_FILE = ctx.startupOpenFile;
    const DAEMON_SOCKET = ctx.daemonSocket;
    const TRANSPARENCY_SETTING = ctx.transparencySetting;
    const VIEW_COMMANDS = { scm: "workbench.view.scm" };
    function focusView(view) {
        const command = VIEW_COMMANDS[view];
        if (command)
            void vscode.commands.executeCommand(command);
    }
    function applyStartupOpen() {
        let parsed;
        try {
            parsed = JSON.parse(fs.readFileSync(STARTUP_OPEN_FILE, "utf8"));
        }
        catch {
            return;
        }
        try {
            fs.rmSync(STARTUP_OPEN_FILE, { force: true });
        }
        catch { }
        if (!parsed || Date.now() - (parsed.at || 0) > 120000)
            return;
        void open({ files: [], folders: [], add: false, ...parsed, wait: false }, () => { });
    }
    const NL = String.fromCharCode(10);
    function quitTode() {
        void vscode.env.openExternal(vscode.Uri.parse("pixel://quit"));
    }
    function transparencyOn() {
        return vscode.workspace.getConfiguration().get(TRANSPARENCY_SETTING) === true;
    }
    function syncTransparencyContext() {
        void vscode.commands.executeCommand("setContext", "tode.transparent", transparencyOn());
    }
    function tellWindowProcess(on) {
        const connection = net.connect(DAEMON_SOCKET);
        connection.on("error", () => { });
        connection.on("connect", () => {
            connection.end(JSON.stringify({ cmd: "transparency", on }) + NL);
        });
    }
    function setTransparency(on) {
        return vscode.workspace.getConfiguration().update(TRANSPARENCY_SETTING, on, vscode.ConfigurationTarget.Global);
    }
    function offerReload() {
        const on = transparencyOn();
        void vscode.window
            .showInformationMessage(on
            ? "Transparency is enabled. Reload the window for it to take effect."
            : "Transparency is disabled. Reload the window for it to take effect.", "Reload Window")
            .then((picked) => {
            if (picked)
                tellWindowProcess(on);
        });
    }
    function applyThemeDocument(theme) {
        if (!theme || typeof theme !== "object")
            return;
        const cfg = vscode.workspace.getConfiguration();
        const target = vscode.ConfigurationTarget.Global;
        if (theme.colors) {
            cfg.update("workbench.colorCustomizations", theme.colors, target);
        }
        if (theme.tokenColors) {
            cfg.update("editor.tokenColorCustomizations", { textMateRules: theme.tokenColors }, target);
        }
    }
    function applyLiveTheme() {
        let theme;
        try {
            theme = JSON.parse(fs.readFileSync(LIVE_THEME_FILE, "utf8"));
        }
        catch {
            return;
        }
        applyThemeDocument(theme);
    }
    function persistLiveTheme(theme) {
        try {
            fs.mkdirSync(path.dirname(LIVE_THEME_FILE), { recursive: true });
            fs.writeFileSync(`${LIVE_THEME_FILE}.tmp`, JSON.stringify(theme) + NL);
            fs.renameSync(`${LIVE_THEME_FILE}.tmp`, LIVE_THEME_FILE);
        }
        catch { }
    }
    function watchLiveTheme() {
        applyLiveTheme();
        const dir = path.dirname(LIVE_THEME_FILE);
        const name = path.basename(LIVE_THEME_FILE);
        let timer = null;
        let watcher = null;
        try {
            fs.mkdirSync(dir, { recursive: true });
            watcher = fs.watch(dir, { persistent: false }, (_event, filename) => {
                if (filename && filename !== name)
                    return;
                if (timer)
                    clearTimeout(timer);
                timer = setTimeout(applyLiveTheme, 30);
            });
        }
        catch { }
        return () => {
            if (timer)
                clearTimeout(timer);
            if (watcher)
                watcher.close();
        };
    }
    function socketPath() {
        const stateHome = process.env.XDG_STATE_HOME && path.isAbsolute(process.env.XDG_STATE_HOME)
            ? process.env.XDG_STATE_HOME
            : path.join(os.homedir(), ".local", "state");
        const dir = path.join(stateHome, "tode", "ipc");
        fs.mkdirSync(dir, { recursive: true });
        return path.join(dir, `w${process.pid}-${Date.now()}.sock`);
    }
    function workspaceUri(target) {
        const folders = vscode.workspace.workspaceFolders;
        if (folders && folders.length > 0)
            return folders[0].uri.with({ path: target });
        if (vscode.env.remoteAuthority) {
            return vscode.Uri.from({
                scheme: "vscode-remote",
                authority: vscode.env.remoteAuthority,
                path: target,
            });
        }
        return vscode.Uri.file(target);
    }
    function sameUri(a, b) {
        return a.toString() === b.toString();
    }
    function alreadyOpen(uri) {
        const folders = vscode.workspace.workspaceFolders || [];
        return folders.some((folder) => sameUri(folder.uri, uri));
    }
    async function open(request, acknowledge) {
        if (request.transparency !== undefined) {
            await setTransparency(request.transparency);
            acknowledge();
            return;
        }
        if (request.theme) {
            applyThemeDocument(request.theme);
            persistLiveTheme(request.theme);
            return;
        }
        if (request.view)
            focusView(request.view);
        if (request.diff && request.diff.length === 2) {
            const left = vscode.Uri.file(request.diff[0]);
            const right = vscode.Uri.file(request.diff[1]);
            await vscode.commands.executeCommand("vscode.diff", left, right);
        }
        const opened = [];
        for (const file of request.files || []) {
            // like vim: a file that does not exist yet opens as a buffer bound to
            // its path — the untitled scheme keeps the path as the save target
            const uri = fs.existsSync(file.path)
                ? vscode.Uri.file(file.path)
                : vscode.Uri.file(file.path).with({ scheme: "untitled" });
            const document = await vscode.workspace.openTextDocument(uri);
            const editor = await vscode.window.showTextDocument(document, { preview: false });
            opened.push(document.uri.toString());
            if (file.line) {
                const line = Math.max(0, file.line - 1);
                const column = Math.max(0, (file.column || 1) - 1);
                const at = new vscode.Position(line, column);
                editor.selection = new vscode.Selection(at, at);
                editor.revealRange(new vscode.Range(at, at), vscode.TextEditorRevealType.InCenter);
            }
        }
        const wanted = (request.folders || []).map(workspaceUri).filter((uri) => {
            return !alreadyOpen(uri);
        });
        if (wanted.length === 0) {
            if (request.wait && opened.length > 0)
                await untilClosed(opened);
            acknowledge();
            return;
        }
        acknowledge();
        for (const uri of wanted) {
            if (request.add) {
                const at = (vscode.workspace.workspaceFolders || []).length;
                vscode.workspace.updateWorkspaceFolders(at, 0, { uri });
            }
            else {
                await vscode.commands.executeCommand("vscode.openFolder", uri, { forceNewWindow: false });
            }
        }
    }
    function untilClosed(uris) {
        const waiting = uris.slice();
        const anyStillOpen = () => {
            const open = {};
            for (const group of vscode.window.tabGroups.all) {
                for (const tab of group.tabs) {
                    const input = tab.input;
                    if (input?.uri)
                        open[input.uri.toString()] = true;
                    if (input?.modified)
                        open[input.modified.toString()] = true;
                }
            }
            return waiting.some((uri) => open[uri]);
        };
        if (!anyStillOpen())
            return Promise.resolve();
        return new Promise((resolve) => {
            const subscription = vscode.window.tabGroups.onDidChangeTabs(() => {
                if (anyStillOpen())
                    return;
                subscription.dispose();
                resolve();
            });
        });
    }
    function activate(context) {
        context.subscriptions.push(vscode.commands.registerCommand("tode.quit", quitTode));
        context.subscriptions.push(vscode.commands.registerCommand("tode.enableTransparency", () => setTransparency(true)), vscode.commands.registerCommand("tode.disableTransparency", () => setTransparency(false)), vscode.workspace.onDidChangeConfiguration((event) => {
            if (!event.affectsConfiguration(TRANSPARENCY_SETTING))
                return;
            syncTransparencyContext();
            offerReload();
        }));
        syncTransparencyContext();
        let confirmShowing = false;
        context.subscriptions.push(vscode.commands.registerCommand("tode.confirmQuit", () => {
            if (confirmShowing)
                return;
            confirmShowing = true;
            vscode.window
                .showErrorMessage("Do you want to quit terminal-code?", { modal: true }, "Quit")
                .then((picked) => {
                confirmShowing = false;
                if (picked === "Quit")
                    quitTode();
            }, () => {
                confirmShowing = false;
            });
        }));
        // er don't know if we want this think about it
        let hintShowing = false;
        context.subscriptions.push(vscode.commands.registerCommand("tode.quitHint", () => {
            if (hintShowing)
                return;
            hintShowing = true;
            const done = () => {
                hintShowing = false;
            };
            vscode.window.showErrorMessage(QUIT_HINT, { modal: true }).then(done, done);
        }));
        // huh?
        applyStartupOpen();
        const stopWatchingSettings = watchLiveTheme();
        context.subscriptions.push({ dispose: stopWatchingSettings });
        const sock = socketPath();
        const server = net.createServer((connection) => {
            let buffer = "";
            connection.on("data", (chunk) => {
                buffer += chunk.toString("utf8");
                const newline = buffer.indexOf(NL);
                if (newline < 0)
                    return;
                const line = buffer.slice(0, newline);
                buffer = "";
                let request;
                try {
                    request = JSON.parse(line);
                }
                catch {
                    connection.end(JSON.stringify({ ok: false, error: "bad request" }) + NL);
                    return;
                }
                let answered = false;
                const acknowledge = () => {
                    if (answered)
                        return;
                    answered = true;
                    connection.end(JSON.stringify({ ok: true }) + NL);
                };
                Promise.resolve(open(request, acknowledge)).then(acknowledge, (error) => {
                    if (answered)
                        return;
                    answered = true;
                    connection.end(JSON.stringify({ ok: false, error: String(error) }) + NL);
                });
            });
            connection.on("error", () => { });
        });
        server.on("error", () => { });
        server.listen(sock, () => {
            context.environmentVariableCollection.replace("TODE_IPC", sock);
        });
        context.subscriptions.push({
            dispose: () => {
                try {
                    server.close();
                }
                catch { }
                try {
                    fs.rmSync(sock, { force: true });
                }
                catch { }
            },
        });
    }
    module.exports.activate = activate;
    module.exports.deactivate = () => { };
}
