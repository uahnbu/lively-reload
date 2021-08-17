import { Server } from 'http';
import {
  getActiveHtmlData, getConfig,
  statusButton, focusContent
} from '../../extension';
import { isServerRunning } from './handleServer';
import WebSocket = require('ws');

const webSockets = new Set<any>();
let heartBeat: NodeJS.Timeout;

export function resurrect() {
  heartBeat = setInterval(beat, 200);
  async function beat() { sendMessage('alive', await getConfig(['debug'])) }
}

export function killHeart() { clearInterval(heartBeat) }
export function sendMessage(task: string, data: any = null) {
  webSockets.forEach(ws => ws.send(JSON.stringify({ task, data })));
}

export async function initWebSocket(server: Server) {
  const { Server: WebSocketServer } = await import('ws');
  const wsServer = new WebSocketServer({server});
  wsServer.on('connection', ws => {
    ws.on('message', (msg: string) => handleMessage(msg, ws));
    ws.on('close', () => handleClose(ws));
  });
}

async function handleMessage(msg: string, ws: WebSocket) {
  const { task, data } = JSON.parse(msg);
  if (task === 'connect') {
    webSockets.add(ws);
    const activeFile = await getActiveHtmlData();
    activeFile && sendMessage('switchHTML', activeFile);
    statusButton.setDoClose();
    return;
  }
  if (task === 'focus') {
    const { position, filePath} = data;
    focusContent(position, filePath);
    return;
  }
}

async function handleClose(ws: WebSocket) {
  webSockets.delete(ws);
  if (webSockets.size !== 0 || !isServerRunning()) return;
  statusButton.setLoading();
}