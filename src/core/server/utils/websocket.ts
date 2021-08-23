import type { Server } from 'http';
import type WebSocket from 'ws';

const webSockets = new Set<any>();
let heartBeat: NodeJS.Timeout;

export async function resurrect() {
  const { getConfig } = await import('../../extension');
  const aliveData = { debug: getConfig('debug') };
  let aliveTimer = 0;
  heartBeat = setInterval(beat, 20);
  function beat() {
    if (++aliveTimer === 100) {
      aliveTimer = 0;
      aliveData.debug = getConfig('debug');
    }
    sendMessage('alive', aliveData);
  }
}

// Stop sending alive signals.
export function killHeart() { clearInterval(heartBeat) }

export function sendMessage(task: string, data: any = null) {
  webSockets.forEach(ws => ws.send(JSON.stringify({ task, data })));
}

export async function initWebSocket(server: Server) {
  const { default: {Server} } = await import('ws');
  const wsServer = new Server({server});
  wsServer.on('connection', ws => {
    ws.on('message', (msg: string) => handleMessage(msg, ws));
    ws.on('close', () => handleClose(ws));
  });
}

async function handleMessage(msg: string, ws: WebSocket) {
  const { task, data } = JSON.parse(msg);
  if (task === 'connect') {
    webSockets.add(ws);
    const {
      getActiveHtmlData,
      setStatusButtonDoClose
    } = await import('../../extension');
    const activeFile = await getActiveHtmlData();
    activeFile && sendMessage('switchHTML', activeFile);
    setStatusButtonDoClose();
    return;
  }
  if (task === 'focus') {
    const { position, filePath} = data;
    const { focusContent } = await import('../../extension');
    focusContent(position, filePath);
    return;
  }
}

async function handleClose(ws: WebSocket) {
  webSockets.delete(ws);
  const { isServerRunning } = await import('./handleServer');
  if (webSockets.size !== 0 || !isServerRunning()) return;
  const { setStatusButtonLoading } = await import('../../extension');
  setStatusButtonLoading();
}