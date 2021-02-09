"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.editorOnChange = exports.editorOnSave = void 0;
const vscode_1 = require("vscode");
const server_1 = require("../../server");
function editorOnSave() {
    server_1.webSocket.sendMessage({ task: 'reload' });
}
exports.editorOnSave = editorOnSave;
function editorOnChange(event) {
    var _a;
    if (!event.contentChanges.length)
        return;
    const root = (_a = vscode_1.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0].uri.fsPath;
    if (!root)
        return;
    const file = event.document.fileName;
    if (!file.startsWith(root))
        return;
    const content = event.document.getText();
    console.log('to be handling');
    handleFileChange(file, content);
}
exports.editorOnChange = editorOnChange;
function handleFileChange(file, content) {
    const msg = {};
    const fileName = file.match(/(?<=\\)[^\\]+(?=\.[^.\\]+$)/)[0];
    if (file.endsWith('.css')) {
        msg.task = 'injectCSS';
        msg.data = JSON.stringify({ fileName, content });
    }
    if (file.endsWith('.html')) {
        msg.task = 'injectHTML';
        content = server_1.modifyHTML(content);
        const livelyContainer = content.match(/<div id="lively-container"[\s\S]+<\/div>/)[0];
        msg.data = livelyContainer;
    }
    msg.task && server_1.webSocket.sendMessage(msg);
}
//# sourceMappingURL=editor.js.map