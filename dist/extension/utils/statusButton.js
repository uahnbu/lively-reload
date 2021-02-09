"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const subscriptions_1 = require("./subscriptions");
const statusButton = {
    button: vscode_1.window.createStatusBarItem(vscode_1.StatusBarAlignment.Left),
    load() {
        this.setDoStart();
        this.button.show();
    },
    setDoStart() {
        this.button.text = '$(star-empty) Go Lively';
        this.button.tooltip = 'Click to start lively server';
        this.button.command = subscriptions_1.START_COMMAND;
    },
    setLoading() {
        this.button.text = '$(star-half) Waiting...';
        this.button.tooltip = 'Click to close lively server';
        this.button.command = subscriptions_1.CLOSE_COMMAND;
    },
    setDoClose() {
        this.button.text = '$(star-full) Connected';
    }
};
exports.default = statusButton;
//# sourceMappingURL=statusButton.js.map