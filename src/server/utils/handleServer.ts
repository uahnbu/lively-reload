import { Server } from 'http';
import { Socket } from 'net';
import { Express, static as staticDir } from 'express';
import { join } from 'path';
import { getConfig, getRoot, statusButton, openUrl, showMessage } from '../../extension';
import { sendMessage, resurrect, killHeart } from './websocket';

let app: Express;
let server: Server;
let sockets: Set<Socket>;
let serverRunning = false;

export function isServerRunning() { return serverRunning }
export function initServerHandler(myApp: Express, myServer: Server, mySockets: Set<Socket>) {
  app = myApp, server = myServer, sockets = mySockets;
}

export function reloadServer() { sendMessage('reloadFull') }
export function startServer() {
  const root = getRoot();
  const port = getConfig('port');
  const startMessage = 'Server started on http://127.0.0.1:' + port + '.';
  app.use(staticDir(join(__dirname, 'assets')));
  root && app.use(staticDir(root));
  server.listen(port, () => showMessage(startMessage, 'info', { title: 'Dismiss' }));
  serverRunning = true;
  getConfig('openBrowser') && openUrl('http://127.0.0.1:' + port);
  resurrect();
  statusButton.setLoading();
}

export function closeServer() {
  killHeart();
  server.close();
  sockets.forEach(socket => socket.destroy());
  serverRunning = false;
  statusButton.setDoStart();
}