"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const express_1 = require("express");
const path_1 = require("path");
const fs_1 = require("fs");
const extension_1 = require("../../extension");
const modifyHTML_1 = require("./modifyHTML");
const configs = vscode_1.workspace.getConfiguration('lively-reload');
class ServerEvents {
    constructor(app, server, sockets) {
        this.app = app;
        this.server = server;
        this.sockets = sockets;
    }
    startServer() {
        var _a;
        const [port, dir] = ['port', 'dir'].map(prop => configs.get(prop));
        const root = (_a = vscode_1.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0].uri.fsPath;
        const startMessage = 'Server started on 127.0.0.1:' + port + '.';
        if (!root) {
            vscode_1.window.showErrorMessage('No directory found.');
            return;
        }
        this.app.get('/', (_req, res) => __awaiter(this, void 0, void 0, function* () {
            const content = fs_1.readFileSync(path_1.join(root, dir, 'index.html'), 'utf8');
            const injectedContent = modifyHTML_1.default(content);
            res.send(injectedContent);
        }));
        this.app.use(express_1.static(path_1.join(root, dir)));
        this.server.listen(port, () => (vscode_1.window.showInformationMessage(startMessage, { title: 'Dismiss' })));
        // openUrl('http://127.0.0.1:' + port);
        extension_1.statusButton.setLoading();
    }
    closeServer() {
        this.server.close();
        this.sockets.forEach(socket => socket.destroy());
        setTimeout(() => console.log(this.sockets), 2000);
        extension_1.statusButton.setDoStart();
    }
}
exports.default = ServerEvents;
//# sourceMappingURL=serverHandler.js.map