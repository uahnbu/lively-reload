import { Server } from 'ws';
import { IncomingMessage } from 'http';
import { Socket } from 'net';
import { getActiveFile, statusButton } from '../../extension';
import { isServerRunning } from './handleServer';

const wsServer = new Server({ noServer: true });
const webSockets = new Set<any>();

wsServer.on('connect', ws => (
  ws.on('message', (msg: string) => {
    if (msg === 'connect') {
      const activeFile = getActiveFile();
      webSockets.add(ws);
      activeFile && sendMessage('switchHTML', activeFile);
      statusButton.setDoClose();
    }
  }),
  ws.on('close', () => (
    webSockets.delete(ws),
    !webSockets.size && isServerRunning() && statusButton.setLoading()
  ))
));

export function sendMessage(task: string, data: any = null) {
  data = JSON.stringify(data);
  webSockets.forEach(ws => ws.send(JSON.stringify({ task, data })));
}
export function handleConnection(req: IncomingMessage, socket: Socket, head: Buffer) {
  wsServer.handleUpgrade(req, socket, head, ws => wsServer.emit('connect', ws));
}