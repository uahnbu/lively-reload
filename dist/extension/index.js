"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = exports.subscriptions = exports.statusButton = exports.openUrl = void 0;
const vscode_1 = require("vscode");
const editor_1 = require("./utils/editor");
const statusButton_1 = require("./utils/statusButton");
exports.statusButton = statusButton_1.default;
const subscriptions_1 = require("./utils/subscriptions");
exports.subscriptions = subscriptions_1.default;
var cmd_1 = require("./utils/cmd");
Object.defineProperty(exports, "openUrl", { enumerable: true, get: function () { return cmd_1.openUrl; } });
function activate(context) {
    statusButton_1.default.load();
    vscode_1.workspace.onDidChangeTextDocument(editor_1.editorOnChange);
    vscode_1.workspace.onDidSaveTextDocument(editor_1.editorOnSave);
    for (const subscription of subscriptions_1.default) {
        context.subscriptions.push(subscription);
    }
}
exports.activate = activate;
`╭───────╮
 │   *   │
 ╰───────╯`;
//# sourceMappingURL=index.js.map