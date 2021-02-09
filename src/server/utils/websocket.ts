import { Server } from 'ws';
import { IncomingMessage } from 'http';
import { Socket } from 'net';
import { statusButton } from '../../extension';

const wsServer = new Server({ noServer: true });
const webSockets = new Set<any>();

wsServer.on('connect', ws => (
  ws.on('message', (msg: string) => msg === 'connect' && (webSockets.add(ws), statusButton.setDoClose())),
  ws.on('close', () => webSockets.delete(ws))
));

export function handleConnection(req: IncomingMessage, socket: Socket, head: Buffer) {
  wsServer.handleUpgrade(req, socket, head, ws => wsServer.emit('connect', ws));
}

export function sendMessage(data: string | { task: string, data?: string }) {
  const msg = { type: 'string', data };
  typeof data === 'object' && (msg.type = 'object', msg.data = JSON.stringify(data));
  webSockets.forEach(ws => ws.send(JSON.stringify(msg)));
}