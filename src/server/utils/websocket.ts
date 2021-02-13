import { Server } from 'ws';
import { IncomingMessage } from 'http';
import { Socket } from 'net';
import { statusButton } from '../../extension';
import { isServerRunning } from './handleServer';

const wsServer = new Server({ noServer: true });
const webSockets = new Set<any>();
const initMsg: { task?: string, data?: any } = {};

wsServer.on('connect', ws => (
  ws.on('message', (msg: string) => msg === 'connect' && (
    webSockets.add(ws),
    initMsg.task && sendMessage(initMsg.task, initMsg.data),
    statusButton.setDoClose()
  )),
  ws.on('close', () => (
    webSockets.delete(ws),
    !webSockets.size && isServerRunning() && statusButton.setLoading()
  ))
));

export function setInitPong(task: string, data?: any) { initMsg.task = task, initMsg.data = data }
export function sendMessage(task: string, data?: any) {
  data = JSON.stringify(data);
  webSockets.forEach(ws => ws.send(JSON.stringify({ task, data })));
}
export function handleConnection(req: IncomingMessage, socket: Socket, head: Buffer) {
  wsServer.handleUpgrade(req, socket, head, ws => wsServer.emit('connect', ws));
}