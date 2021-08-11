import * as WebSocket from 'ws';
import { IncomingMessage } from 'http';
import { Socket } from 'net';
import {
  getActiveFile, getConfig,
  statusButton, focusContent
} from '../../extension';
import { isServerRunning, setVirtualDir } from './handleServer';

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

export function handleConnection(
  req: IncomingMessage,
  socket: Socket,
  head: Buffer
) {
  const wsServer = new WebSocket.Server({ noServer: true });
  wsServer.on('connect', ws => {
    ws.on('message', (msg: string) => handleMessage(msg, ws));
    ws.on('close', () => handleClose(ws));
  });
  wsServer.handleUpgrade(req, socket, head, callback);
  function callback(ws: WebSocket) { wsServer.emit('connect', ws) }
}

async function handleMessage(msg: string, ws: WebSocket) {
  const { task, data } = JSON.parse(msg);
  if (task === 'connect') {
    webSockets.add(ws);
    const activeFile = await getActiveFile();
    activeFile && sendMessage('switchHTML', activeFile);
    statusButton.setDoClose();
    return;
  }
  if (task === 'focus') {
    const { position, filePath} = data;
    focusContent(position, filePath);
    return;
  }
  if (task === 'virtualPath') { setVirtualDir(data); }
}

async function handleClose(ws: WebSocket) {
  webSockets.delete(ws);
  if (webSockets.size !== 0 || !isServerRunning()) return;
  statusButton.setLoading();
}