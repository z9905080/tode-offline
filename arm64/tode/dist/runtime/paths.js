"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOGS_DIR = exports.CACHE_DIR = exports.STATE_DIR = exports.DATA_DIR = exports.DEFAULT_INSTALL_ROOT = exports.INSTALL_ROOT = void 0;
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const HOME = node_os_1.default.homedir();
function base(variable, fallback) {
    const value = process.env[variable];
    return value && node_path_1.default.isAbsolute(value) ? value : node_path_1.default.join(HOME, fallback);
}
// hm
const DATA_HOME = base("XDG_DATA_HOME", ".local/share");
const STATE_HOME = base("XDG_STATE_HOME", ".local/state");
const CACHE_HOME = base("XDG_CACHE_HOME", ".cache");
exports.INSTALL_ROOT = process.env.TODE_INSTALL_ROOT && node_path_1.default.isAbsolute(process.env.TODE_INSTALL_ROOT)
    ? process.env.TODE_INSTALL_ROOT
    : node_path_1.default.resolve(__dirname, "..", "..");
exports.DEFAULT_INSTALL_ROOT = node_path_1.default.join(HOME, ".local", "lib", "tode");
exports.DATA_DIR = node_path_1.default.join(DATA_HOME, "tode");
exports.STATE_DIR = node_path_1.default.join(STATE_HOME, "tode");
exports.CACHE_DIR = node_path_1.default.join(CACHE_HOME, "tode");
exports.LOGS_DIR = node_path_1.default.join(exports.STATE_DIR, "logs");
