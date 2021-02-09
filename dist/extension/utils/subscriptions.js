"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLOSE_COMMAND = exports.START_COMMAND = void 0;
const vscode_1 = require("vscode");
const server_1 = require("../../server");
exports.START_COMMAND = 'lively-reload.startLively';
exports.CLOSE_COMMAND = 'lively-reload.closeLively';
const subscriptions = [
    vscode_1.commands.registerCommand(exports.START_COMMAND, () => server_1.startServer()),
    vscode_1.commands.registerCommand(exports.CLOSE_COMMAND, () => server_1.closeServer())
];
exports.default = subscriptions;
//# sourceMappingURL=subscriptions.js.map