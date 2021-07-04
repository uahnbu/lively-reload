import { Server } from 'http';
import { Socket } from 'net';
import { Express, static as staticDir } from 'express';
import { join } from 'path';
import {
  getConfig,
  getRoot,
  statusButton,
  openBrowser,
  showMessage
} from '../../extension';
import { sendMessage, resurrect, killHeart } from './websocket';

let app: Express, server: Server, sockets: Set<Socket>;
let serverRunning = false;

export function isServerRunning() { return serverRunning }
export function initServerHandler(myApp: Express, myServer: Server, mySockets: Set<Socket>) {
  app = myApp, server = myServer, sockets = mySockets
}

export function reloadServer() { sendMessage('reloadFull') }
export function startServer() {
  const root = getRoot();
  const port = getConfig('port');
  app.use(staticDir(join(__dirname, 'static')));
  root && app.use(staticDir(root));
  openBrowser('http://127.0.0.1:' + port);
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

export function closeServer() {
  killHeart();
  server.close();
  serverRunning = false;
  sockets.forEach(socket => socket.destroy());
  statusButton.setDoStart();
}