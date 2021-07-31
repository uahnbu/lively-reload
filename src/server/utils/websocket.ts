import { Server } from 'ws';
import { IncomingMessage } from 'http';
import { Socket } from 'net';
import { getActiveFile, getConfig, statusButton } from '../../extension';
import { isServerRunning } from './handleServer';
import WebSocket = require('ws');

const wsServer = new Server({ noServer: true });
const webSockets = new Set<any>();
let heartBeat: NodeJS.Timeout;

wsServer.on('connect', ws => {
  ws.on('message', async (msg: string) => {
    if (msg !== 'connect') return;
    webSockets.add(ws);
    const activeFile = await getActiveFile();
    activeFile && sendMessage('switchHTML', activeFile);
    statusButton.setDoClose();
  });
  ws.on('close', () => (
    webSockets.delete(ws),
    webSockets.size === 0 && isServerRunning() && statusButton.setLoading()
  ));
});

export function resurrect() {
  heartBeat = setInterval(beat, 200);
  async function beat() {
    sendMessage('alive', await getConfig(['debug']));
  }
}

export function killHeart() { clearInterval(heartBeat) }

export function sendMessage(task: string, data: any = null) {
  webSockets.forEach(ws => ws.send(JSON.stringify({ task, data })));
}

export function handleConnection(
  req: IncomingMessage,
  socket: Socket,
  head: Buffer
) {
  wsServer.handleUpgrade(req, socket, head, callback);
  function callback(ws: WebSocket) { wsServer.emit('connect', ws) }
}