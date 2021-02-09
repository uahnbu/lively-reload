"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openUrl = void 0;
const vscode_1 = require("vscode");
const child_process_1 = require("child_process");
function openUrl(url) {
    const cmd = { darwin: 'open', win32: 'start' }[process.platform] || 'xdg-open';
    return child_process_1.exec(cmd + ' ' + vscode_1.Uri.parse(url.replace(/"/g, '\\"')));
}
exports.openUrl = openUrl;
//# sourceMappingURL=cmd.js.map