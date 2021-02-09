"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const extension_1 = require("../../extension");
class WebSocket {
    constructor() {
        this.wss = new ws_1.Server({ noServer: true });
        this.wss.on('connect', ws => ws.on('message', (msg) => msg === 'connect' && (this.ws = ws,
            extension_1.statusButton.setDoClose())));
    }
    serverUpgrade(req, socket, head) {
        this.wss.handleUpgrade(req, socket, head, ws => this.wss.emit('connect', ws));
    }
    sendMessage(data) {
        const msg = { type: 'string', data };
        typeof data === 'object' && (msg.type = 'object', msg.data = JSON.stringify(data));
        this.ws.send(JSON.stringify(msg));
    }
}
exports.default = WebSocket;
//# sourceMappingURL=websocket.js.map