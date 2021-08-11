import { createServer, IncomingMessage, Server } from 'http';
import { Socket } from 'net';
import * as express from 'express';
import { dirname, join } from 'path';
import {
  getRoot, getConfig, openBrowser,
  showMessage, statusButton
} from '../../extension';
import {
  handleConnection, resurrect,
  killHeart, sendMessage
} from './websocket';

const sockets: Set<Socket> = new Set;
let app: express.Express, server: Server;
let virtualDir = '';
let serverRunning = false;

export function setVirtualDir(path: string) { virtualDir = dirname(path) }
export function isServerRunning() { return serverRunning }

async function initApp(getRoot: () => string | undefined) {
  if (typeof app !== 'undefined') return app;
  const staticDir = join(__dirname, 'static');
  app = express();
  app.get('/*', (req, res) => {
    console.log(req);
    if (req.url === '/') {
      console.log('Url: /');
      res.sendFile(join(staticDir, 'index.html')); return }
    if (req.url.startsWith('/lively_assets')) {
      const assetRel = req.url.slice('/lively_assets'.length);
      console.log('Destination: ', join(staticDir, assetRel));
      res.sendFile(join(staticDir, assetRel));
      return;
    }
    const root = getRoot();
    if (root) {
      const { referer } = req.headers;
      console.log('referer: ', referer);
      console.log('virtualDir: ', virtualDir);
      console.log('Destination: ', join((!referer && virtualDir) || root, req.url));
      res.sendFile(join((!referer && virtualDir) || root, req.url));
      return;
    }
    console.log('No root');
    virtualDir && res.sendFile(join(virtualDir, req.url));
  });
}

export async function reloadServer() { sendMessage('reloadFull') }

export async function startServer() {
  const port = await getConfig('port');
  initApp(getRoot);
  openBrowser('http://127.0.0.1:' + port);
  server = createServer(app),
  server.on('connection', socket => (
    sockets.add(socket),
    socket.once('close', () => sockets.delete(socket))
  ));
  type UpgradeArgs = [IncomingMessage, Socket, Buffer];
  server.on('upgrade', (...args: UpgradeArgs) => handleConnection(...args));
  server.listen(port, () => showMessage(
    'Server started on http://127.0.0.1:' + port + '.',
    'info'
  ));
  server.once('error', ({code}: { code: string }) => {
    showMessage('Server error: ' + code, 'error');
    closeServer();
  })
  serverRunning = true;
  resurrect();
  statusButton.setLoading();
}

export async function closeServer() {
  killHeart();
  server.close();
  serverRunning = false;
  sockets.forEach(socket => socket.destroy());
  sockets.clear();
  statusButton.setDoStart();
}