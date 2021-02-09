import { Server } from 'ws';
import { IncomingMessage } from 'http';
import { Socket } from 'net';
import { statusButton } from '../../extension';

export default class WebSocket {
  wss = new Server({ noServer: true })
  ws: any

  constructor() {
    this.wss.on('connect', ws => ws.on('message', (msg: string) => msg === 'connect' && (
      this.ws = ws,
      statusButton.setDoClose()
    )));
  }

  serverUpgrade(req: IncomingMessage, socket: Socket, head: Buffer) {
    this.wss.handleUpgrade(req, socket, head, ws => this.wss.emit('connect', ws));
  }

  sendMessage(data: string | { task: string, data?: string }) {
    const msg = { type: 'string', data };
    typeof data === 'object' && (msg.type = 'object', msg.data = JSON.stringify(data));
    this.ws.send(JSON.stringify(msg));
  }
}