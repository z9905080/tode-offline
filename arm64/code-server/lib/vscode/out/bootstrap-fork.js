/*!--------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */

var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
    return extendStatics(d, b);
};

export function __extends(d, b) {
    if (typeof b !== "function" && b !== null)
        throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

export var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    }
    return __assign.apply(this, arguments);
}

export function __rest(s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
}

export function __decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}

export function __param(paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
}

export function __esDecorate(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};

export function __runInitializers(thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};

export function __propKey(x) {
    return typeof x === "symbol" ? x : "".concat(x);
};

export function __setFunctionName(f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};

export function __metadata(metadataKey, metadataValue) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
}

export function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

export function __generator(thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
}

export var __createBinding = Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
});

export function __exportStar(m, o) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(o, p)) __createBinding(o, m, p);
}

export function __values(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}

export function __read(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
}

/** @deprecated */
export function __spread() {
    for (var ar = [], i = 0; i < arguments.length; i++)
        ar = ar.concat(__read(arguments[i]));
    return ar;
}

/** @deprecated */
export function __spreadArrays() {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
}

export function __spreadArray(to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
}

export function __await(v) {
    return this instanceof __await ? (this.v = v, this) : new __await(v);
}

export function __asyncGenerator(thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
}

export function __asyncDelegator(o) {
    var i, p;
    return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
    function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: false } : f ? f(v) : v; } : f; }
}

export function __asyncValues(o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
}

export function __makeTemplateObject(cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};

var __setModuleDefault = Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
};

var ownKeys = function(o) {
    ownKeys = Object.getOwnPropertyNames || function (o) {
        var ar = [];
        for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
        return ar;
    };
    return ownKeys(o);
};

export function __importStar(mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
    __setModuleDefault(result, mod);
    return result;
}

export function __importDefault(mod) {
    return (mod && mod.__esModule) ? mod : { default: mod };
}

export function __classPrivateFieldGet(receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}

export function __classPrivateFieldSet(receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
}

export function __classPrivateFieldIn(state, receiver) {
    if (receiver === null || (typeof receiver !== "object" && typeof receiver !== "function")) throw new TypeError("Cannot use 'in' operator on non-object");
    return typeof state === "function" ? receiver === state : state.has(receiver);
}

export function __addDisposableResource(env, value, async) {
    if (value !== null && value !== void 0) {
        if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
        var dispose, inner;
        if (async) {
            if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
            dispose = value[Symbol.asyncDispose];
        }
        if (dispose === void 0) {
            if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
            dispose = value[Symbol.dispose];
            if (async) inner = dispose;
        }
        if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
        if (inner) dispose = function() { try { inner.call(this); } catch (e) { return Promise.reject(e); } };
        env.stack.push({ value: value, dispose: dispose, async: async });
    }
    else if (async) {
        env.stack.push({ async: true });
    }
    return value;

}

var _SuppressedError = typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

export function __disposeResources(env) {
    function fail(e) {
        env.error = env.hasError ? new _SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
        env.hasError = true;
    }
    var r, s = 0;
    function next() {
        while (r = env.stack.pop()) {
            try {
                if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
                if (r.dispose) {
                    var result = r.dispose.call(r.value);
                    if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) { fail(e); return next(); });
                }
                else s |= 1;
            }
            catch (e) {
                fail(e);
            }
        }
        if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
        if (env.hasError) throw env.error;
    }
    return next();
}

export function __rewriteRelativeImportExtension(path, preserveJsx) {
    if (typeof path === "string" && /^\.\.?\//.test(path)) {
        return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function (m, tsx, d, ext, cm) {
            return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : (d + ext + "." + cm.toLowerCase() + "js");
        });
    }
    return path;
}

export default {
    __extends: __extends,
    __assign: __assign,
    __rest: __rest,
    __decorate: __decorate,
    __param: __param,
    __esDecorate: __esDecorate,
    __runInitializers: __runInitializers,
    __propKey: __propKey,
    __setFunctionName: __setFunctionName,
    __metadata: __metadata,
    __awaiter: __awaiter,
    __generator: __generator,
    __createBinding: __createBinding,
    __exportStar: __exportStar,
    __values: __values,
    __read: __read,
    __spread: __spread,
    __spreadArrays: __spreadArrays,
    __spreadArray: __spreadArray,
    __await: __await,
    __asyncGenerator: __asyncGenerator,
    __asyncDelegator: __asyncDelegator,
    __asyncValues: __asyncValues,
    __makeTemplateObject: __makeTemplateObject,
    __importStar: __importStar,
    __importDefault: __importDefault,
    __classPrivateFieldGet: __classPrivateFieldGet,
    __classPrivateFieldSet: __classPrivateFieldSet,
    __classPrivateFieldIn: __classPrivateFieldIn,
    __addDisposableResource: __addDisposableResource,
    __disposeResources: __disposeResources,
    __rewriteRelativeImportExtension: __rewriteRelativeImportExtension,
};

function v(e){let t=[];typeof e=="number"&&t.push("code/timeOrigin",e);function a(o,r){t.push(o,r?.startTime??Date.now())}function p(){let o=[];for(let r=0;r<t.length;r+=2)o.push({name:t[r],startTime:t[r+1]});return o}function s(o){if(typeof o>"u"){let r=t.length>=2&&t[0]==="code/timeOrigin",n=r?t[1]:void 0;t.length=0,r&&t.push("code/timeOrigin",n)}else for(let r=t.length-2;r>=0;r-=2)t[r]===o&&t.splice(r,2)}return{mark:a,getMarks:p,clearMarks:s}}function M(){if(typeof performance=="object"&&typeof performance.mark=="function"&&!performance.nodeTiming)return typeof performance.timeOrigin!="number"&&!performance.timing?v():{mark(e,t){performance.mark(e,t)},clearMarks(e){performance.clearMarks(e)},getMarks(){let e=performance.timeOrigin;typeof e!="number"&&(e=(performance.timing.navigationStart||performance.timing.redirectStart||performance.timing.fetchStart)??0);let t=[{name:"code/timeOrigin",startTime:Math.round(e)}];for(let a of performance.getEntriesByType("mark"))t.push({name:a.name,startTime:Math.round(e+a.startTime)});return t}};if(typeof process=="object"){let e=performance?.timeOrigin;return v(e)}else return console.trace("perf-util loaded in UNKNOWN environment"),v()}function x(e){return e.MonacoPerformanceMarks||(e.MonacoPerformanceMarks=M()),e.MonacoPerformanceMarks}var _=x(globalThis),m=_.mark,Q=_.clearMarks,Z=_.getMarks;import*as d from"node:path";import{Buffer as U}from"node:buffer";import{createRequire as V}from"node:module";var S=V(import.meta.url),N=process.platform==="win32";process.platform==="linux"&&(U.poolSize=8*1024);Error.stackTraceLimit=100;if(!process.env.VSCODE_HANDLES_SIGPIPE){let e=!1;process.on("SIGPIPE",()=>{e||(e=!0,console.error(new Error("Unexpected SIGPIPE")))})}function j(){try{typeof process.env.VSCODE_CWD!="string"&&(process.env.VSCODE_CWD=process.cwd()),process.platform==="win32"&&process.chdir(d.dirname(process.execPath))}catch(e){console.error(e)}}j();function G(){if(!process.env.ELECTRON_RUN_AS_NODE&&!process.versions.electron||process.env.VSCODE_DEV)return;let e=s=>{if(N&&s.length>=2&&s.charCodeAt(1)===58){let o=s.charCodeAt(0);if(o>=65&&o<=90||o>=97&&o<=122)return s[0].toLowerCase()+s.slice(1)}return s},t=e(d.join(import.meta.dirname,"../node_modules")),a=S("node:module"),p=a._resolveLookupPaths;a._resolveLookupPaths=function(s,o){let r=p(s,o);if(Array.isArray(r)){for(let n=0,i=r.length;n<i;n++)if(e(r[n])===t){r.splice(n,0,`${r[n]}.asar`);break}}return r}}G();function C(e){if(!process.env.VSCODE_DEV)return;if(!e)throw new Error("Missing injectPath");S("node:module").register("./bootstrap-import.js",{parentURL:import.meta.url,data:e})}function b(){if(typeof process?.versions?.electron=="string")return;let e=S("module"),t=e.globalPaths,a=e._resolveLookupPaths;e._resolveLookupPaths=function(s,o){let r=a(s,o);if(Array.isArray(r)){let n=0;for(;n<r.length&&r[r.length-1-n]===t[t.length-1-n];)n++;return r.slice(0,r.length-n)}return r};let p=e._nodeModulePaths;e._nodeModulePaths=function(s){let o=p(s);if(!N)return o;let r=n=>n.length>=3&&n.endsWith(":\\");if(r(s)||(o=o.filter(n=>!r(d.dirname(n)))),process.env.HOMEDRIVE&&process.env.HOMEPATH){let n=d.dirname(d.join(process.env.HOMEDRIVE,process.env.HOMEPATH)),i=l=>d.relative(l,n).length===0;i(s)||(o=o.filter(l=>!i(d.dirname(l))))}return o}}import*as E from"node:fs";import{register as B}from"node:module";import{dirname as q,join as H}from"node:path";import{createRequire as F}from"node:module";var k=F(import.meta.url),g={BUILD_INSERT_PRODUCT_CONFIGURATION:"BUILD_INSERT_PRODUCT_CONFIGURATION"};g.BUILD_INSERT_PRODUCT_CONFIGURATION&&(g=k("../product.json"));var O={"name":"code-server","version":"1.132.0","private":true,"overrides":{"node-gyp-build":"4.8.1","kerberos@2.1.1":{"node-addon-api":"7.1.0"},"yauzl":"^3.3.1"},"allowScripts":{"kerberos@2.1.1":true,"koffi@3.1.2":false,"node-pty@1.2.0-beta.13":true,"@parcel/watcher@2.5.6":true,"@vscode/deviceid@0.1.5":true,"@vscode/fs-copyfile@2.0.0":true,"@vscode/native-watchdog@1.4.6":true,"@vscode/spdlog@0.15.8":true,"@vscode/windows-registry@1.2.0":true,"ssh2":false,"@vscode/sqlite3@5.1.12-vscode":true,"cpu-features":false,"@vscode/windows-ca-certs@0.3.4":true,"@vscode/windows-process-tree@0.8.0":true},"type":"module"};O.BUILD_INSERT_PACKAGE_CONFIGURATION&&(O=k("../package.json"));var L={};if(process.env.VSCODE_DEV)try{L=k("../product.overrides.json"),g=Object.assign(g,L)}catch{}var D=g,A=O;globalThis._VSCODE_PRODUCT_JSON={...D};globalThis._VSCODE_PACKAGE_JSON={...A};globalThis._VSCODE_FILE_ROOT=import.meta.dirname;function J(){if(!process.env.ELECTRON_RUN_AS_NODE&&!process.versions.electron)return;let e=`
	import { createRequire, isBuiltin } from 'node:module';
	import { pathToFileURL, fileURLToPath } from 'node:url';
	import { appendFileSync } from 'node:fs';

	let asarRequire;
	let resourcesPath;
	let trace;

	function setupTrace(sink) {
		if (!sink) { return; }
		const prefix = '[asar-resolve] ';
		if (sink === '1' || sink === 'true' || sink === 'on' || sink === 'stderr') {
			trace = msg => { try { process.stderr.write(prefix + msg + '\\n'); } catch { /* ignore */ } };
		} else {
			// Any other value is treated as a log file path to append to.
			trace = msg => { try { appendFileSync(sink, prefix + msg + '\\n'); } catch { /* ignore */ } };
		}
		trace('tracing enabled (node ' + process.versions.node + '); resourcesPath=' + resourcesPath);
	}

	// True only for *bare package specifiers* \u2014 the exact inputs Node routes to
	// its PACKAGE_RESOLVE (node_modules walk / self-reference / 'exports'/'main').
	//  - relative ('./', '../') and absolute ('/') paths -> new URL(specifier, base)
	//  - '#name' subpath imports                         -> PACKAGE_IMPORTS_RESOLVE
	//  - URL-scheme specifiers ('file:', 'data:', 'node:', 'electron:', ...) -> used verbatim
	function isBarePackageSpecifier(specifier) {
		if (specifier === '') { return false; }
		const c = specifier[0];
		if (c === '.' || c === '/' || c === '#') { return false; }
		return !URL.canParse(specifier);
	}

	// Electron injects a synthetic 'electron' module (also reachable via the
	// 'electron/main', 'electron/common' and 'electron/renderer' aliases) that
	// the loader resolves to the 'electron:' URL scheme rather than a real file.
	// 'node:module#isBuiltin' does not recognize it, so we detect it explicitly
	// and treat it like a Node built-in: it lives in the runtime, never in
	// 'node_modules', and must never be redirected into the archive.
	function isElectronBuiltin(specifier) {
		return specifier === 'electron' || specifier.startsWith('electron/');
	}

	function normalizeDriveLetter(path) {
		if (process.platform === 'win32'
			&& path.length >= 2
			&& (path.charCodeAt(0) >= 65 && path.charCodeAt(0) <= 90 || path.charCodeAt(0) >= 97 && path.charCodeAt(0) <= 122)
			&& path.charCodeAt(1) === 58) {
			return path[0].toLowerCase() + path.slice(1);
		}
		return path;
	}

	// Extract the package name from a bare specifier, e.g.
	// 'foo/lib/x.js' -> 'foo', '@scope/bar/baz' -> '@scope/bar'.
	function packageNameOf(specifier) {
		if (specifier[0] === '@') {
			const firstSlash = specifier.indexOf('/');
			if (firstSlash === -1) { return specifier; }
			const secondSlash = specifier.indexOf('/', firstSlash + 1);
			return secondSlash === -1 ? specifier : specifier.slice(0, secondSlash);
		}
		const slash = specifier.indexOf('/');
		return slash === -1 ? specifier : specifier.slice(0, slash);
	}

	export async function initialize({ resourcesPath: resPath, asarPath, traceSink }) {
		if (asarPath) {
			resourcesPath = normalizeDriveLetter(resPath);
			// A require rooted at the archive: 'require.resolve("./<module>")'
			// resolves into '<asarPath>/<module>' (top-level layout). The leading
			// './' is required so resolution is relative to the archive root rather
			// than a bare-specifier node_modules walk (the archive directory is
			// named node_modules.asar, so a bare walk would never find it).
			asarRequire = createRequire(asarPath + '/x.js');
		}
		setupTrace(traceSink);
	}

	export async function resolve(specifier, context, nextResolve) {
		if (specifier === 'fs') {
			if (trace) { trace('map "fs" -> node:original-fs (from ' + context.parentURL + ')'); }
			return {
				format: 'builtin',
				shortCircuit: true,
				url: 'node:original-fs'
			};
		}

		if (asarRequire && context.parentURL && isBarePackageSpecifier(specifier) && !isBuiltin(specifier) && !isElectronBuiltin(specifier)) {
			let parentPath;
			try { parentPath = normalizeDriveLetter(fileURLToPath(context.parentURL)); } catch { parentPath = undefined; }
			if (parentPath && parentPath.startsWith(resourcesPath)) {
				if (trace) { trace('resolve "' + specifier + '" from "' + context.parentURL + '"'); }
				// Try the default resolution first so an importer that ships its own
				// dependencies (e.g. a built-in extension that bundles a different copy
				// of a package) resolves against its own, closer 'node_modules' instead
				// of being redirected into the app archive. The archive stands in for
				// the application's own (farthest) 'node_modules', so it must only be
				// consulted once the default walk has found nothing.
				let defaultResult;
				let defaultError;
				try {
					defaultResult = await nextResolve(specifier, context);
				} catch (err) {
					defaultError = err;
				}

				// Only accept a default resolution that lands INSIDE the application
				// tree (a closer copy under 'resources/app', e.g. one bundled by a
				// built-in extension). A resolution ABOVE the app root must not win
				// over the archive: when the app is nested inside a larger tree (e.g.
				// '@vscode/test-electron' downloads the packaged app under the repo's
				// own 'node_modules'), the default node_modules walk can escape the app
				// and find a stale / ABI-mismatched copy. The archive stands in for the
				// application's own 'node_modules' and must take precedence over
				// anything outside 'resources/app'.
				if (defaultResult) {
					let resolvedPath;
					try { resolvedPath = normalizeDriveLetter(fileURLToPath(defaultResult.url)); } catch { resolvedPath = undefined; }
					if (!resolvedPath || resolvedPath.startsWith(resourcesPath)) {
						if (trace) { trace('  default -> ' + defaultResult.url + ' (in app, ACCEPT)'); }
						return defaultResult;
					}
					if (trace) { trace('  default -> ' + defaultResult.url + ' (outside app, reject)'); }
				} else if (trace) {
					trace('  default -> <none> (' + (defaultError && (defaultError.code || defaultError.message)) + ')');
				}

				// Locate the package inside the archive via its package.json (this is
				// resolution-condition independent), so we can re-root resolution
				// inside it below.
				let packageJsonPath;
				try {
					packageJsonPath = asarRequire.resolve('./' + packageNameOf(specifier) + '/package.json');
				} catch {
					// The package is part of neither 'resources/app' (the default
					// resolution above did not land inside the app) nor the archive.
					// Do NOT fall back to a copy from an outer 'node_modules' (e.g. a
					// parent checkout the app is nested under): the application must
					// resolve its own dependencies exclusively from its own resources.
					// Surface the original resolution error so a missing/misplaced
					// dependency fails loudly instead of silently loading a foreign copy.
					if (trace) { trace('  archive: package "' + packageNameOf(specifier) + '" NOT in archive -> throw'); }
					throw defaultError ?? new Error("Cannot find package '" + specifier + "' within the application resources");
				}
				if (trace) { trace('  archive pkg.json -> ' + packageJsonPath); }
				// Re-run the default ESM resolution rooted *inside* the archived
				// package (via its package.json) so Node resolves the request as a
				// package self-reference, applying the real 'exports'/'main' fields and
				// ESM conditions ('import' over 'require').
				try {
					const selfRef = await nextResolve(specifier, { ...context, parentURL: pathToFileURL(packageJsonPath).href });
					// A package without an 'exports' field does not self-reference: Node
					// falls back to a 'node_modules' walk from the package dir that can
					// climb *out* of the archive into an outer 'node_modules' (e.g. the
					// checkout the app is nested under). Only accept a result that stays
					// inside the app resources; otherwise fall back to the direct,
					// escape-proof archive resolution below.
					let selfRefPath;
					try { selfRefPath = normalizeDriveLetter(fileURLToPath(selfRef.url)); } catch { selfRefPath = undefined; }
					if (selfRefPath && selfRefPath.startsWith(resourcesPath)) {
						if (trace) { trace('  self-ref -> ' + selfRef.url + ' (in app, ACCEPT)'); }
						return selfRef;
					}
					if (trace) { trace('  self-ref -> ' + selfRef.url + ' (escaped app, reject)'); }
				} catch (err) {
					// Fall through to direct resolution below.
					if (trace) { trace('  self-ref -> <throw> (' + (err && (err.code || err.message)) + ')'); }
				}
				const resolved = asarRequire.resolve('./' + specifier);
				const url = pathToFileURL(resolved).href;
				if (trace) { trace('  direct -> ' + url + ' (ACCEPT)'); }
				return { url, shortCircuit: true };
			} else if (trace) {
				trace('defer "' + specifier + '" (parent outside app resources: ' + context.parentURL + ')');
			}
		}

		// Defer to the next hook in the chain, which would be the
		// Node.js default resolve if this is the last user-specified loader.
		return nextResolve(specifier, context);
	}`,t=process.env.VSCODE_ASAR_TRACE||void 0,a=q(import.meta.dirname);B(`data:text/javascript;base64,${Buffer.from(e).toString("base64")}`,import.meta.url,{data:process.env.VSCODE_DEV?{}:{resourcesPath:a,asarPath:H(a,"node_modules.asar"),traceSink:t}})}J();var R;function $(){return R||(R=W()),R}async function W(){m("code/willLoadNls");let e,t;if(process.env.VSCODE_NLS_CONFIG)try{e=JSON.parse(process.env.VSCODE_NLS_CONFIG),e?.languagePack?.messagesFile?t=e.languagePack.messagesFile:e?.defaultMessagesFile&&(t=e.defaultMessagesFile),globalThis._VSCODE_NLS_LANGUAGE=e?.resolvedLanguage}catch(a){console.error(`Error reading VSCODE_NLS_CONFIG from environment: ${a}`)}if(!(process.env.VSCODE_DEV||!t)){try{globalThis._VSCODE_NLS_MESSAGES=JSON.parse((await E.promises.readFile(t)).toString())}catch(a){if(console.error(`Error reading NLS messages file ${t}: ${a}`),e?.languagePack?.corruptMarkerFile)try{await E.promises.writeFile(e.languagePack.corruptMarkerFile,"corrupted")}catch(p){console.error(`Error writing corrupted NLS marker file: ${p}`)}if(e?.defaultMessagesFile&&e.defaultMessagesFile!==t)try{globalThis._VSCODE_NLS_MESSAGES=JSON.parse((await E.promises.readFile(e.defaultMessagesFile)).toString())}catch(p){console.error(`Error reading default NLS messages file ${e.defaultMessagesFile}: ${p}`)}}return m("code/didLoadNls"),e}}async function w(){await $()}m("code/fork/start");function z(){function a(i){let l=[],h=[];if(i.length)for(let u=0;u<i.length;u++){let c=i[u];if(typeof c>"u")c="undefined";else if(c instanceof Error){let f=c;f.stack?c=f.stack:c=f.toString()}h.push(c)}try{let u=JSON.stringify(h,function(c,f){if(s(f)||Array.isArray(f)){if(l.indexOf(f)!==-1)return"[Circular]";l.push(f)}return f});return u.length>1e5?"Output omitted for a large object that exceeds the limits":u}catch(u){return`Output omitted for an object that cannot be inspected ('${u.toString()}')`}}function p(i){try{process.send&&process.send(i)}catch{}}function s(i){return typeof i=="object"&&i!==null&&!Array.isArray(i)&&!(i instanceof RegExp)&&!(i instanceof Date)}function o(i,l){p({type:"__$console",severity:i,arguments:l})}function r(i,l){Object.defineProperty(console,i,{set:()=>{},get:()=>function(){o(l,a(arguments))}})}function n(i,l){let h=process[i],u=h.write,c="";Object.defineProperty(h,"write",{set:()=>{},get:()=>(f,y,I)=>{c+=f.toString(y);let P=c.length>1048576?c.length:c.lastIndexOf(`
`);P!==-1&&(console[l](c.slice(0,P)),c=c.slice(P+1)),u.call(h,f,y,I)}})}process.env.VSCODE_VERBOSE_LOGGING==="true"?(r("info","log"),r("log","log"),r("warn","warn"),r("error","error")):(console.log=function(){},console.warn=function(){},console.info=function(){},r("error","error")),n("stderr","error"),n("stdout","log")}function K(){process.on("uncaughtException",function(e){console.error("Uncaught Exception: ",e)}),process.on("unhandledRejection",function(e){console.error("Unhandled Promise Rejection: ",e)})}function X(){let e=Number(process.env.VSCODE_PARENT_PID);typeof e=="number"&&!isNaN(e)&&setInterval(function(){try{process.kill(e,0)}catch{process.exit()}},5e3)}function Y(){let e=process.env.VSCODE_CRASH_REPORTER_PROCESS_TYPE;if(e)try{process.crashReporter&&typeof process.crashReporter.addExtraParameter=="function"&&process.crashReporter.addExtraParameter("processType",e)}catch(t){console.error(t)}}Y();b();process.env.VSCODE_DEV_INJECT_NODE_MODULE_LOOKUP_PATH&&C(process.env.VSCODE_DEV_INJECT_NODE_MODULE_LOOKUP_PATH);process.send&&process.env.VSCODE_PIPE_LOGGING==="true"&&z();process.env.VSCODE_HANDLES_UNCAUGHT_ERRORS||K();process.env.VSCODE_PARENT_PID&&X();await w();await import([`./${process.env.VSCODE_ESM_ENTRYPOINT}.js`].join("/"));
