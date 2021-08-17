import { createServer, Server } from 'http';
import { Socket } from 'net';
import * as express from 'express';
import { dirname, join } from 'path';
import {
  getRoot, getConfig, openBrowser,
  showMessage, statusButton
} from '../../extension';
import { initWebSocket, resurrect, killHeart, sendMessage } from './websocket';

const PUBLIC_DIR = '/liveLy_public';
const BLANK_HTML = '/liveLy_blank.html';

const sockets = new Set<Socket>();
let app: express.Express, server: Server;
// Directory of active file, used for requesting assets.
let virtualDir = '';
let serverRunning = false;

export function setVirtualDir(path: string) { virtualDir = dirname(path) }
export function getVirtualDir() { return virtualDir }
export function isServerRunning() { return serverRunning }

function initApp(getRoot: () => string | undefined) {
  if (typeof app !== 'undefined') return app;
  // Folder /src/client/assets will be transferred to /static.
  const staticDir = join(__dirname, 'static');
  app = express();
  app.get('/*', (req, res) => {
    const fileRel = req.url;
    if (fileRel === '/') { res.sendFile(join(staticDir, 'index.html')); return }
    // Request for the placeholder html file.
    if (fileRel === BLANK_HTML) {
      res.sendFile(join(staticDir, BLANK_HTML));
      return;
    }
    // Requests for lively-reload assets has urls starting with a predefined
    // arbitrary directory.
    if (fileRel.startsWith(PUBLIC_DIR)) {
      const assetRel = fileRel.slice(PUBLIC_DIR.length);
      res.sendFile(join(staticDir, assetRel));
      return;
    }
    const root = getRoot();
    // If root then send the file from the root as iframe location has been set
    // to the relative path.
    // If there is only one file opened then return assets based on that file.
    const dir = root || virtualDir;
    dir && res.sendFile(join(dir, fileRel));
  });
}

export async function reloadServer() { sendMessage('reloadFull') }

export async function startServer() {
  const port = await getConfig('port');
  const host = 'http://127.0.0.1:' + port;
  initApp(getRoot);
  openBrowser(host);
  // https://github.com/websockets/ws#external-https-server
  server = createServer(app);
  server.on('connection', socket => (
    sockets.add(socket),
    socket.once('close', () => sockets.delete(socket))
  ));
  server.listen(port, () => showMessage(`Server started on ${host}.`, 'info'));
  server.once('error', ({code}: { code: string }) => {
    showMessage('Server error: ' + code, 'error');
    closeServer();
  });
  initWebSocket(server);
  serverRunning = true;
  resurrect();
  statusButton.setLoading();
}

export async function closeServer() {
  // Stop sending alive signals.
  killHeart();
  server.close();
  serverRunning = false;
  sockets.forEach(socket => socket.destroy());
  sockets.clear();
  statusButton.setDoStart();
  setVirtualDir('');
}